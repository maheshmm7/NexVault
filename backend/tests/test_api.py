"""
Vaultify API Test Suite
Covers all Phase 2 & 3 requirements:
  - Auth (signup, login, JWT)
  - Categories CRUD + user isolation
  - Payment Sources CRUD + balance tracking
  - Transactions CRUD + balance reversion on delete
  - Coupons CRUD + status filtering
  - Analytics: summary, category distribution, trends
"""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base
from app.api.deps import get_db

# ── Test DB setup ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# ── Helpers ────────────────────────────────────────────────────────
USER_EMAIL = "test@vaultify.com"
USER_PASSWORD = "securepass123"
USER2_EMAIL = "other@vaultify.com"

def get_token(email=USER_EMAIL, password=USER_PASSWORD) -> str:
    r = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════════════════════════
# 1. AUTH
# ══════════════════════════════════════════════════════════════════
def test_signup():
    r = client.post("/api/v1/users/signup", json={"email": USER_EMAIL, "password": USER_PASSWORD})
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == USER_EMAIL
    assert "id" in data

def test_signup_duplicate_email():
    r = client.post("/api/v1/users/signup", json={"email": USER_EMAIL, "password": USER_PASSWORD})
    assert r.status_code == 400

def test_login():
    r = client.post("/api/v1/auth/login", data={"username": USER_EMAIL, "password": USER_PASSWORD})
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"

def test_login_wrong_password():
    r = client.post("/api/v1/auth/login", data={"username": USER_EMAIL, "password": "wrong"})
    assert r.status_code == 400

def test_get_me():
    token = get_token()
    r = client.get("/api/v1/users/me", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["email"] == USER_EMAIL

def test_protected_route_without_token():
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════
# 2. CATEGORIES
# ══════════════════════════════════════════════════════════════════
cat_id = None

def test_create_category():
    global cat_id
    token = get_token()
    r = client.post("/api/v1/categories/", json={
        "name": "Food & Dining", "type": "expense", "color": "#EF4444", "icon": "utensils"
    }, headers=auth_headers(token))
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Food & Dining"
    assert data["type"] == "expense"
    cat_id = data["id"]

def test_list_categories():
    token = get_token()
    r = client.get("/api/v1/categories/", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_update_category():
    token = get_token()
    r = client.put(f"/api/v1/categories/{cat_id}", json={"color": "#FF0000"}, headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["color"] == "#FF0000"

def test_category_user_isolation():
    """User2 cannot see or modify User1's categories"""
    client.post("/api/v1/users/signup", json={"email": USER2_EMAIL, "password": USER_PASSWORD})
    token2 = get_token(USER2_EMAIL)
    r = client.get("/api/v1/categories/", headers=auth_headers(token2))
    assert r.status_code == 200
    assert len(r.json()) == 0  # User2 has no categories


# ══════════════════════════════════════════════════════════════════
# 3. PAYMENT SOURCES
# ══════════════════════════════════════════════════════════════════
src_id = None

def test_create_source():
    global src_id
    token = get_token()
    r = client.post("/api/v1/sources/", json={
        "name": "Chase Checking", "type": "bank", "balance": "1000.00"
    }, headers=auth_headers(token))
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Chase Checking"
    assert float(data["balance"]) == 1000.0
    src_id = data["id"]

def test_list_sources():
    token = get_token()
    r = client.get("/api/v1/sources/", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_update_source():
    token = get_token()
    r = client.put(f"/api/v1/sources/{src_id}", json={"name": "Chase Checking Updated"}, headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["name"] == "Chase Checking Updated"


# ══════════════════════════════════════════════════════════════════
# 4. TRANSACTIONS + BALANCE TRACKING
# ══════════════════════════════════════════════════════════════════
tx_id = None
income_cat_id = None

def test_create_income_category():
    global income_cat_id
    token = get_token()
    r = client.post("/api/v1/categories/", json={
        "name": "Salary", "type": "income", "color": "#10B981"
    }, headers=auth_headers(token))
    assert r.status_code == 200
    income_cat_id = r.json()["id"]

def test_create_expense_transaction_updates_balance():
    global tx_id
    token = get_token()
    r = client.post("/api/v1/transactions/", json={
        "source_id": src_id,
        "category_id": cat_id,
        "amount": "250.00",
        "type": "expense",
        "notes": "Groceries"
    }, headers=auth_headers(token))
    assert r.status_code == 200
    tx_id = r.json()["id"]

    # Verify balance was decremented
    src = client.get(f"/api/v1/sources/", headers=auth_headers(token)).json()
    balance = float(next(s["balance"] for s in src if s["id"] == src_id))
    assert balance == 750.0, f"Expected 750.0, got {balance}"

def test_create_income_transaction_updates_balance():
    token = get_token()
    r = client.post("/api/v1/transactions/", json={
        "source_id": src_id,
        "category_id": income_cat_id,
        "amount": "500.00",
        "type": "income",
        "notes": "Paycheck"
    }, headers=auth_headers(token))
    assert r.status_code == 200

    src = client.get("/api/v1/sources/", headers=auth_headers(token)).json()
    balance = float(next(s["balance"] for s in src if s["id"] == src_id))
    assert balance == 1250.0, f"Expected 1250.0, got {balance}"

def test_list_transactions():
    token = get_token()
    r = client.get("/api/v1/transactions/", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) >= 2

def test_transaction_user_isolation():
    token2 = get_token(USER2_EMAIL)
    r = client.get("/api/v1/transactions/", headers=auth_headers(token2))
    assert r.status_code == 200
    assert len(r.json()) == 0

def test_delete_transaction_reverts_balance():
    token = get_token()
    # Check balance before
    src_before = float(next(s["balance"] for s in client.get("/api/v1/sources/", headers=auth_headers(token)).json() if s["id"] == src_id))

    r = client.delete(f"/api/v1/transactions/{tx_id}", headers=auth_headers(token))
    assert r.status_code == 200

    # Balance should have reverted (+250 since it was an expense)
    src_after = float(next(s["balance"] for s in client.get("/api/v1/sources/", headers=auth_headers(token)).json() if s["id"] == src_id))
    assert src_after == src_before + 250.0, f"Expected {src_before + 250.0}, got {src_after}"

def test_transaction_wrong_source_rejected():
    """User2 cannot create a transaction on User1's source"""
    token2 = get_token(USER2_EMAIL)
    r = client.post("/api/v1/transactions/", json={
        "source_id": src_id,  # User1's source
        "category_id": cat_id,
        "amount": "100.00",
        "type": "expense"
    }, headers=auth_headers(token2))
    assert r.status_code == 404  # source not found for user2


# ══════════════════════════════════════════════════════════════════
# 5. COUPONS
# ══════════════════════════════════════════════════════════════════
coupon_id = None

def test_create_coupon():
    global coupon_id
    token = get_token()
    r = client.post("/api/v1/coupons/", json={
        "title": "Amazon 20% Off",
        "code": "AMZN20",
        "pin": "1234",
        "category": "Shopping",
        "status": "active"
    }, headers=auth_headers(token))
    assert r.status_code == 200
    data = r.json()
    assert data["code"] == "AMZN20"
    assert data["status"] == "active"
    coupon_id = data["id"]

def test_list_coupons():
    token = get_token()
    r = client.get("/api/v1/coupons/", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_list_coupons_by_status():
    token = get_token()
    r = client.get("/api/v1/coupons/?status=active", headers=auth_headers(token))
    assert r.status_code == 200
    assert all(c["status"] == "active" for c in r.json())

def test_update_coupon_to_used():
    token = get_token()
    r = client.put(f"/api/v1/coupons/{coupon_id}", json={"status": "used"}, headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["status"] == "used"

def test_coupon_user_isolation():
    token2 = get_token(USER2_EMAIL)
    r = client.get("/api/v1/coupons/", headers=auth_headers(token2))
    assert r.status_code == 200
    assert len(r.json()) == 0

def test_delete_coupon():
    token = get_token()
    r = client.delete(f"/api/v1/coupons/{coupon_id}", headers=auth_headers(token))
    assert r.status_code == 200
    # Verify it's gone
    r = client.get("/api/v1/coupons/", headers=auth_headers(token))
    assert all(c["id"] != coupon_id for c in r.json())


# ══════════════════════════════════════════════════════════════════
# 6. ANALYTICS
# ══════════════════════════════════════════════════════════════════
def test_analytics_summary():
    token = get_token()
    r = client.get("/api/v1/analytics/summary", headers=auth_headers(token))
    assert r.status_code == 200
    data = r.json()
    assert "total_balance" in data
    assert "monthly_income" in data
    assert "monthly_expense" in data
    assert isinstance(data["total_balance"], float)

def test_analytics_category_distribution():
    token = get_token()
    r = client.get("/api/v1/analytics/category-distribution", headers=auth_headers(token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_analytics_trends():
    token = get_token()
    r = client.get("/api/v1/analytics/trends", headers=auth_headers(token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_analytics_user_isolation():
    """User2's analytics must not include User1's data"""
    token2 = get_token(USER2_EMAIL)
    r = client.get("/api/v1/analytics/summary", headers=auth_headers(token2))
    assert r.status_code == 200
    assert r.json()["total_balance"] == 0.0
    assert r.json()["monthly_income"] == 0.0


# ══════════════════════════════════════════════════════════════════
# 7. DEMO DATA SEEDING
# ══════════════════════════════════════════════════════════════════
def test_seed_demo_data_new_user():
    """Fresh user can seed demo data"""
    seed_email = "seed@vaultify.com"
    client.post("/api/v1/users/signup", json={"email": seed_email, "password": "pass1234"})
    token = get_token(seed_email, "pass1234")

    r = client.post("/api/v1/users/seed-demo-data", headers=auth_headers(token))
    assert r.status_code == 200

    # Verify data was created
    src_r = client.get("/api/v1/sources/", headers=auth_headers(token))
    assert len(src_r.json()) >= 2

    tx_r = client.get("/api/v1/transactions/", headers=auth_headers(token))
    assert len(tx_r.json()) >= 3

    cpn_r = client.get("/api/v1/coupons/", headers=auth_headers(token))
    assert len(cpn_r.json()) >= 1

def test_seed_demo_data_idempotent():
    """Seeding twice should be rejected"""
    seed_email = "seed@vaultify.com"
    token = get_token(seed_email, "pass1234")
    r = client.post("/api/v1/users/seed-demo-data", headers=auth_headers(token))
    assert r.status_code == 400
