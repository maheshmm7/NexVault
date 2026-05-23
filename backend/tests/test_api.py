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

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]

client = TestClient(app)

# ── Helpers ────────────────────────────────────────────────────────
USER_EMAIL = "test@vaultify.com"
USER_PASSWORD = "SecurePass@123"
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
    client.cookies.clear()
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
    assert len(r.json()) == 8  # User2 has the 8 default seeded categories


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
# 6b. CREDIT POOLS & SYNCHRONIZATION
# ══════════════════════════════════════════════════════════════════
def test_credit_pool_sync_lifecycle():
    email = "pool_user@vaultify.com"
    password = "SecurePass@123"
    client.post("/api/v1/users/signup", json={"email": email, "password": password})
    token = get_token(email, password)
    
    # 1. Create a Credit Pool
    pool_r = client.post("/api/v1/credit-pools/", json={
        "name": "Super Shared Pool",
        "total_limit": 100000.00,
        "statement_day": 5,
        "due_day": 25
    }, headers=auth_headers(token))
    assert pool_r.status_code == 200
    pool = pool_r.json()
    pool_id = pool["id"]
    assert float(pool["total_limit"]) == 100000.00
    assert float(pool["utilized_limit"]) == 0.00
    assert float(pool["available_limit"]) == 100000.00

    # Create a Category for transactions
    cat_r = client.post("/api/v1/categories/", json={
        "name": "Food & Dining", "type": "expense", "color": "#EF4444", "icon": "utensils"
    }, headers=auth_headers(token))
    assert cat_r.status_code == 200
    category_id = cat_r.json()["id"]

    # 2. Create Card 1 linked to pool
    card1_r = client.post("/api/v1/sources/", json={
        "name": "Freedom Card",
        "type": "credit_card",
        "balance": 15000.00,  # utilized balance
        "credit_limit": 40000.00,
        "available_limit": 25000.00,
        "credit_pool_id": pool_id,
        "billing_date": "05",
        "due_date": "25"
    }, headers=auth_headers(token))
    assert card1_r.status_code == 200
    card1_id = card1_r.json()["id"]

    # Verify pool synchronized utilized balance = 15000
    pool_r = client.get(f"/api/v1/credit-pools/", headers=auth_headers(token))
    pool_data = next(p for p in pool_r.json() if p["id"] == pool_id)
    assert float(pool_data["utilized_limit"]) == 15000.00
    assert float(pool_data["available_limit"]) == 85000.00

    # 3. Create Card 2 linked to pool
    card2_r = client.post("/api/v1/sources/", json={
        "name": "Swiggy Card",
        "type": "credit_card",
        "balance": 5000.00,  # utilized balance
        "credit_limit": 50000.00,
        "available_limit": 45000.00,
        "credit_pool_id": pool_id,
        "billing_date": "05",
        "due_date": "25"
    }, headers=auth_headers(token))
    assert card2_r.status_code == 200

    # Verify pool synchronized utilized balance = 20000 (15000 + 5000)
    pool_r = client.get(f"/api/v1/credit-pools/", headers=auth_headers(token))
    pool_data = next(p for p in pool_r.json() if p["id"] == pool_id)
    assert float(pool_data["utilized_limit"]) == 20000.00
    assert float(pool_data["available_limit"]) == 80000.00

    # 4. Add a transaction on Card 1 (expense of 2,000)
    tx_r = client.post("/api/v1/transactions/", json={
        "source_id": card1_id,
        "category_id": category_id,
        "amount": "2000.00",
        "type": "expense",
        "notes": "Pool Card Transaction"
    }, headers=auth_headers(token))
    assert tx_r.status_code == 200
    tx_id = tx_r.json()["id"]

    # Verify pool utilized balance is updated to 22000
    pool_r = client.get(f"/api/v1/credit-pools/", headers=auth_headers(token))
    pool_data = next(p for p in pool_r.json() if p["id"] == pool_id)
    assert float(pool_data["utilized_limit"]) == 22000.00
    assert float(pool_data["available_limit"]) == 78000.00

    # 5. Delete transaction
    client.delete(f"/api/v1/transactions/{tx_id}", headers=auth_headers(token))

    # Verify pool utilized reverted to 20000
    pool_r = client.get(f"/api/v1/credit-pools/", headers=auth_headers(token))
    pool_data = next(p for p in pool_r.json() if p["id"] == pool_id)
    assert float(pool_data["utilized_limit"]) == 20000.00
    assert float(pool_data["available_limit"]) == 80000.00


# ══════════════════════════════════════════════════════════════════
# 7. DEMO DATA SEEDING
# ══════════════════════════════════════════════════════════════════
def test_seed_demo_data_new_user():
    """Fresh user can seed demo data"""
    seed_email = "seed@vaultify.com"
    r = client.post("/api/v1/users/signup", json={"email": seed_email, "password": "SecurePass@982"})
    assert r.status_code == 201, f"Signup failed: {r.text}"
    token = get_token(seed_email, "SecurePass@982")

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
    token = get_token(seed_email, "SecurePass@982")
    r = client.post("/api/v1/users/seed-demo-data", headers=auth_headers(token))
    assert r.status_code == 400
