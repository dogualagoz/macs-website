"""
Girdi sınırları: sıralama allowlist'i, sayfalama tavanı ve dosya yükleme.
"""

import io

import pytest

from routers import uploads


# --------------------------------------------------------------------------
# sort_by allowlist
# --------------------------------------------------------------------------

def test_unknown_sort_field_is_rejected(client):
    response = client.get("/events", params={"sort_by": "hashed_password"})
    assert response.status_code == 400


def test_allowed_sort_field_works(client):
    response = client.get("/events", params={"sort_by": "title"})
    assert response.status_code == 200


# --------------------------------------------------------------------------
# Sayfalama tavanı
# --------------------------------------------------------------------------

@pytest.mark.parametrize("path", ["/events", "/sponsors/"])
def test_limit_above_cap_is_rejected(client, path):
    response = client.get(path, params={"limit": 1_000_000})
    assert response.status_code == 422


def test_negative_skip_is_rejected(client):
    response = client.get("/events", params={"skip": -1})
    assert response.status_code == 422


# --------------------------------------------------------------------------
# Dosya yükleme
# --------------------------------------------------------------------------

PNG_HEADER = b"\x89PNG\r\n\x1a\n"


def test_upload_requires_authentication(client):
    response = client.post(
        "/api/upload/",
        files={"file": ("a.png", io.BytesIO(PNG_HEADER + b"rest"), "image/png")},
    )
    assert response.status_code == 401


def test_upload_rejects_non_image_extension(client, make_user, auth_header):
    user = make_user(email="uploader@example.com", role="moderator")
    response = client.post(
        "/api/upload/",
        files={"file": ("script.sh", io.BytesIO(b"#!/bin/sh\n"), "text/plain")},
        headers=auth_header(user),
    )
    assert response.status_code == 400


def test_upload_rejects_content_that_is_not_really_an_image(client, make_user, auth_header):
    """Uzantıyı .png yapmak yeterli olmamalı; imza da eşleşmeli."""
    user = make_user(email="uploader2@example.com", role="moderator")
    response = client.post(
        "/api/upload/",
        files={"file": ("sahte.png", io.BytesIO(b"MZ\x90\x00 not a png"), "image/png")},
        headers=auth_header(user),
    )
    assert response.status_code == 400
    assert "resim" in response.json()["detail"].lower()


def test_upload_rejects_oversized_file(client, make_user, auth_header, monkeypatch):
    user = make_user(email="uploader3@example.com", role="moderator")
    monkeypatch.setattr(uploads, "MAX_UPLOAD_SIZE", 1024)

    payload = PNG_HEADER + b"\x00" * 4096
    response = client.post(
        "/api/upload/",
        files={"file": ("buyuk.png", io.BytesIO(payload), "image/png")},
        headers=auth_header(user),
    )
    assert response.status_code == 413


def test_upload_accepts_valid_png(client, make_user, auth_header, tmp_path, monkeypatch):
    user = make_user(email="uploader4@example.com", role="moderator")
    monkeypatch.setattr(uploads, "UPLOAD_DIR", str(tmp_path))

    response = client.post(
        "/api/upload/",
        files={"file": ("gecerli.png", io.BytesIO(PNG_HEADER + b"payload"), "image/png")},
        headers=auth_header(user),
    )

    assert response.status_code == 200, response.text
    assert response.json()["url"].startswith("/uploads/")
    assert len(list(tmp_path.iterdir())) == 1


def test_rejected_upload_leaves_no_file_behind(client, make_user, auth_header, tmp_path, monkeypatch):
    user = make_user(email="uploader5@example.com", role="moderator")
    monkeypatch.setattr(uploads, "UPLOAD_DIR", str(tmp_path))

    client.post(
        "/api/upload/",
        files={"file": ("sahte.png", io.BytesIO(b"not a png at all"), "image/png")},
        headers=auth_header(user),
    )

    assert list(tmp_path.iterdir()) == []
