"""
Yetki zincirini koruyan testler.

Denetimde çıkan üç kritik bulgu buradaydı:
  - public /register doğrudan onaylı moderator hesabı açıyordu
  - get_current_user role ve status alanlarını hiç okumuyordu
  - içerik uçlarında rol kontrolü yoktu

Bu testler aynı açığın sessizce geri gelmesini engellemek için var.
"""

from models.users import User


# --------------------------------------------------------------------------
# Kayıt: yeni hesaplar yetkisiz açılmalı
# --------------------------------------------------------------------------

def test_register_creates_pending_account_without_privileges(client, db):
    response = client.post("/auth/register", json={
        "email": "yeni@example.com",
        "full_name": "Yeni Kullanıcı",
        "password": "parola123",
    })

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "pending"

    created = db.query(User).filter(User.email == "yeni@example.com").first()
    assert created.status == "pending"


def test_pending_account_cannot_log_in(client):
    client.post("/auth/register", json={
        "email": "bekleyen@example.com",
        "full_name": "Bekleyen Kullanıcı",
        "password": "parola123",
    })

    response = client.post("/auth/login", data={
        "username": "bekleyen@example.com",
        "password": "parola123",
    })

    assert response.status_code == 403
    assert "onaylanmad" in response.json()["detail"].lower()


def test_self_registered_account_cannot_create_events(client, auth_header, db):
    client.post("/auth/register", json={
        "email": "sizma@example.com",
        "full_name": "Sızma Denemesi",
        "password": "parola123",
    })
    user = db.query(User).filter(User.email == "sizma@example.com").first()

    response = client.post(
        "/events",
        json={"title": "İzinsiz Etkinlik", "start_time": "2026-01-01T10:00:00"},
        headers=auth_header(user),
    )

    assert response.status_code == 403


# --------------------------------------------------------------------------
# get_current_user: onay ve aktiflik kontrolleri
# --------------------------------------------------------------------------

def test_approved_user_can_read_own_profile(client, make_user, auth_header):
    user = make_user(status="approved")
    response = client.get("/users/me", headers=auth_header(user))
    assert response.status_code == 200
    assert response.json()["email"] == user.email


def test_rejected_user_is_denied(client, make_user, auth_header):
    user = make_user(email="reddedilen@example.com", status="rejected")
    response = client.get("/users/me", headers=auth_header(user))
    assert response.status_code == 403


def test_inactive_user_is_denied(client, make_user, auth_header):
    user = make_user(email="pasif@example.com", is_active=False)
    response = client.get("/users/me", headers=auth_header(user))
    assert response.status_code == 401


def test_missing_token_is_denied(client):
    assert client.get("/users/me").status_code == 401


# --------------------------------------------------------------------------
# Rol ayrımı: moderator içerik yönetir, admin geri alınamaz işlemleri yapar
# --------------------------------------------------------------------------

def test_moderator_can_create_event(client, make_user, auth_header):
    moderator = make_user(email="moderator@example.com", role="moderator")

    response = client.post(
        "/events",
        json={"title": "Moderator Etkinliği", "start_time": "2026-05-01T10:00:00"},
        headers=auth_header(moderator),
    )

    assert response.status_code == 201, response.text


def test_moderator_cannot_hard_delete_event(client, make_user, auth_header):
    admin = make_user(email="admin@example.com", role="admin")
    moderator = make_user(email="mod2@example.com", role="moderator")

    created = client.post(
        "/events",
        json={"title": "Silinecek", "start_time": "2026-05-01T10:00:00"},
        headers=auth_header(admin),
    )
    event_id = created.json()["id"]

    response = client.delete(f"/events/{event_id}/hard", headers=auth_header(moderator))
    assert response.status_code == 403


def test_admin_can_hard_delete_event(client, make_user, auth_header):
    admin = make_user(email="admin2@example.com", role="admin")

    created = client.post(
        "/events",
        json={"title": "Kalıcı Silinecek", "start_time": "2026-05-01T10:00:00"},
        headers=auth_header(admin),
    )
    event_id = created.json()["id"]

    response = client.delete(f"/events/{event_id}/hard", headers=auth_header(admin))
    assert response.status_code == 204


def test_anonymous_cannot_create_event(client):
    response = client.post(
        "/events",
        json={"title": "Anonim Etkinlik", "start_time": "2026-05-01T10:00:00"},
    )
    assert response.status_code == 401


def test_moderator_cannot_list_users(client, make_user, auth_header):
    moderator = make_user(email="mod3@example.com", role="moderator")
    response = client.get("/users", headers=auth_header(moderator))
    assert response.status_code == 403


# --------------------------------------------------------------------------
# Admin onay akışı: pending hesabı kullanılabilir hale getirmenin tek yolu
# --------------------------------------------------------------------------

def test_admin_can_approve_pending_account(client, make_user, auth_header, db):
    admin = make_user(email="admin3@example.com", role="admin")
    client.post("/auth/register", json={
        "email": "onay@example.com",
        "full_name": "Onay Bekleyen",
        "password": "parola123",
    })
    pending = db.query(User).filter(User.email == "onay@example.com").first()

    response = client.patch(
        f"/users/{pending.id}/access",
        json={"status": "approved"},
        headers=auth_header(admin),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    login = client.post("/auth/login", data={
        "username": "onay@example.com",
        "password": "parola123",
    })
    assert login.status_code == 200


def test_admin_cannot_change_own_access(client, make_user, auth_header):
    admin = make_user(email="admin4@example.com", role="admin")
    response = client.patch(
        f"/users/{admin.id}/access",
        json={"role": "moderator"},
        headers=auth_header(admin),
    )
    assert response.status_code == 400
