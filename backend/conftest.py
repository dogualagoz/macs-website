"""
Test ortamı kurulumu.

Bu dosya backend/ kökünde duruyor ki pytest backend/ dizinini sys.path'e
eklesin ve testler main, database, models gibi modülleri import edebilsin.
"""

import os
import tempfile

# Uygulama modülleri import edilmeden ÖNCE ayarlanmalı: database.py ve
# security.py bu değerleri import anında okuyor.
TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "macs_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
os.environ["ADMIN_SECRET_KEY"] = "test-admin-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import main  # noqa: E402
from database import Base, get_db  # noqa: E402
from models.users import User  # noqa: E402
from rate_limit import limiter  # noqa: E402
from security import get_password_hash, create_access_token  # noqa: E402

engine = create_engine(
    os.environ["DATABASE_URL"],
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def _fresh_database():
    """Her test kendi boş şemasıyla başlasın."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _disable_rate_limiting():
    """
    Rate limit'ler ayrı testlerde doğrulanıyor; diğer testlerde arka arkaya
    gelen istekleri 429'a düşürmemeli.
    """
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    main.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()


@pytest.fixture
def make_user(db):
    """Belirtilen rol ve onay durumuyla kullanıcı oluşturur."""

    def _make(email="user@example.com", role="moderator", status="approved", is_active=True):
        user = User(
            email=email,
            full_name="Test Kullanıcı",
            hashed_password=get_password_hash("parola123"),
            role=role,
            status=status,
            is_active=is_active,
            failed_login_attempts=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make


@pytest.fixture
def auth_header():
    """Verilen kullanıcı için Authorization başlığı üretir."""

    def _header(user):
        token = create_access_token(data={"sub": user.email, "role": user.role})
        return {"Authorization": f"Bearer {token}"}

    return _header
