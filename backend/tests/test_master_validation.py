import os
os.environ["DATABASE_URL"] = "sqlite:///./test_master_validation.db"

import pytest
import concurrent.futures
from decimal import Decimal
from datetime import datetime, date, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base
from app.api.deps import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.source import PaymentSource
from app.models.credit_pool import CreditPool
from app.models.transaction import Transaction
from app.utils.billing import calculate_billing_cycle
from app.services import transaction_service

# Create testing engine
engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_master_validation.db"):
        try:
            os.remove("./test_master_validation.db")
        except PermissionError:
            pass

@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    # Clear tables to ensure fresh tests
    db.query(Transaction).delete()
    db.query(PaymentSource).delete()
    db.query(CreditPool).delete()
    db.query(User).delete()
    db.commit()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]

@pytest.fixture(scope="function")
def auth_headers(client, db_session):
    test_user = User(
        email="bank_validator@nexvault.com",
        hashed_password=get_password_hash("securepass123"),
        full_name="Core Validator"
    )
    db_session.add(test_user)
    db_session.commit()
    
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "bank_validator@nexvault.com", "password": "securepass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# =====================================================================
# TEST GROUP A: SHARED POOL CREATION
# =====================================================================
def test_group_a_pool_creation(client, auth_headers):
    payload = {
        "name": "HDFC SHARED POOL",
        "total_limit": 40000.00,
        "statement_day": 19,
        "due_day": 12
    }
    resp = client.post("/api/v1/credit-pools/", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    pool = resp.json()
    assert pool["name"] == "HDFC SHARED POOL"
    assert float(pool["total_limit"]) == 40000.00
    assert pool["statement_day"] == 19
    assert pool["due_day"] == 12
    assert float(pool["available_limit"]) == 40000.00
    assert float(pool["utilized_limit"]) == 0.0

# =====================================================================
# TEST GROUP B: CARD LINKING & SPENDABLE CHECKS
# =====================================================================
def test_group_b_card_linking(client, auth_headers):
    # 1. Create pool
    pool_resp = client.post("/api/v1/credit-pools/", json={
        "name": "HDFC SHARED POOL",
        "total_limit": 40000.00,
        "statement_day": 19,
        "due_day": 12
    }, headers=auth_headers)
    pool_id = pool_resp.json()["id"]

    # 2. Create card 1: Freedom (40K ceiling, linked to pool)
    c1_resp = client.post("/api/v1/sources/", json={
        "name": "HDFC Freedom",
        "type": "credit_card",
        "card_ceiling_limit": 40000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers)
    assert c1_resp.status_code == 200
    c1_id = c1_resp.json()["id"]

    # 3. Create card 2: Swiggy (18K ceiling, linked to pool)
    c2_resp = client.post("/api/v1/sources/", json={
        "name": "HDFC Swiggy",
        "type": "credit_card",
        "card_ceiling_limit": 18000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers)
    assert c2_resp.status_code == 200
    c2_id = c2_resp.json()["id"]

    # 4. Fetch sources and verify actual_spendable
    sources_resp = client.get("/api/v1/sources/", headers=auth_headers)
    sources = sources_resp.json()
    
    freedom = next(s for s in sources if s["id"] == c1_id)
    swiggy = next(s for s in sources if s["id"] == c2_id)

    # Freedom can spend min(ceiling=40k, pool=40k) = 40K
    assert float(freedom["actual_spendable"]) == 40000.00
    # Swiggy can spend min(ceiling=18k, pool=40k) = 18K
    assert float(swiggy["actual_spendable"]) == 18000.00

# =====================================================================
# TEST GROUP C & D: TRANSACTION ENGINE & HARD LIMIT BLOCKS
# =====================================================================
def test_group_c_d_transactions(client, auth_headers):
    # 1. Setup pool & cards
    pool_id = client.post("/api/v1/credit-pools/", json={
        "name": "HDFC SHARED POOL",
        "total_limit": 40000.00,
        "statement_day": 19,
        "due_day": 12
    }, headers=auth_headers).json()["id"]

    c1_id = client.post("/api/v1/sources/", json={
        "name": "HDFC Freedom",
        "type": "credit_card",
        "card_ceiling_limit": 40000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers).json()["id"]

    c2_id = client.post("/api/v1/sources/", json={
        "name": "HDFC Swiggy",
        "type": "credit_card",
        "card_ceiling_limit": 18000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers).json()["id"]

    # --- Transaction 1: Freedom spend 5000 ---
    tx1_resp = client.post("/api/v1/transactions/", json={
        "amount": 5000.00,
        "type": "expense",
        "source_id": c1_id
    }, headers=auth_headers)
    assert tx1_resp.status_code == 200

    # Verify state after Tx 1
    # Pool remaining = 35000
    # Freedom: used = 5000, remaining = 35000, spendable = 35000
    # Swiggy: used = 0, ceiling_remaining = 18000, pool_remaining = 35000, spendable = 18000
    sources = client.get("/api/v1/sources/", headers=auth_headers).json()
    freedom = next(s for s in sources if s["id"] == c1_id)
    swiggy = next(s for s in sources if s["id"] == c2_id)
    
    assert float(freedom["card_outstanding"]) == 5000.00
    assert float(freedom["actual_spendable"]) == 35000.00
    
    assert float(swiggy["card_outstanding"]) == 0.00
    assert float(swiggy["actual_spendable"]) == 18000.00

    pool = client.get("/api/v1/credit-pools/", headers=auth_headers).json()[0]
    assert float(pool["available_limit"]) == 35000.00

    # --- Transaction 2: Swiggy spend 10000 ---
    tx2_resp = client.post("/api/v1/transactions/", json={
        "amount": 10000.00,
        "type": "expense",
        "source_id": c2_id
    }, headers=auth_headers)
    assert tx2_resp.status_code == 200

    # Verify state after Tx 2
    # Pool remaining = 25000
    # Swiggy: used = 10000, ceiling_remaining = 8000, spendable = 8000
    # Freedom: remaining ceiling = 35000, pool_remaining = 25000, spendable = 25000
    sources = client.get("/api/v1/sources/", headers=auth_headers).json()
    freedom = next(s for s in sources if s["id"] == c1_id)
    swiggy = next(s for s in sources if s["id"] == c2_id)
    
    assert float(swiggy["card_outstanding"]) == 10000.00
    assert float(swiggy["actual_spendable"]) == 8000.00
    
    assert float(freedom["card_outstanding"]) == 5000.00
    assert float(freedom["actual_spendable"]) == 25000.00

    # --- Test Group D Blocks ---
    # Attempt: Swiggy spend 9000 (exceeds card ceiling remaining=8000). Should fail.
    tx_fail1 = client.post("/api/v1/transactions/", json={
        "amount": 9000.00,
        "type": "expense",
        "source_id": c2_id
    }, headers=auth_headers)
    assert tx_fail1.status_code == 400
    assert any(w in tx_fail1.json()["detail"].lower() for w in ["operational", "ceiling", "spendable", "limit"])

    # Attempt: Freedom spend 26000 (exceeds pool remaining=25000). Should fail.
    tx_fail2 = client.post("/api/v1/transactions/", json={
        "amount": 26000.00,
        "type": "expense",
        "source_id": c1_id
    }, headers=auth_headers)
    assert tx_fail2.status_code == 400
    assert any(w in tx_fail2.json()["detail"].lower() for w in ["pool", "spending power", "limit"])

    # Attempt: Freedom spend 25000. Should pass.
    tx_pass = client.post("/api/v1/transactions/", json={
        "amount": 25000.00,
        "type": "expense",
        "source_id": c1_id
    }, headers=auth_headers)
    assert tx_pass.status_code == 200

    # Verify both cards spendable is now 0.00
    sources = client.get("/api/v1/sources/", headers=auth_headers).json()
    freedom = next(s for s in sources if s["id"] == c1_id)
    swiggy = next(s for s in sources if s["id"] == c2_id)
    assert float(freedom["actual_spendable"]) == 0.00
    assert float(swiggy["actual_spendable"]) == 0.00

# =====================================================================
# TEST GROUP E: REPAYMENT SYNCHRONIZATION
# =====================================================================
def test_group_e_repayments(client, auth_headers):
    pool_id = client.post("/api/v1/credit-pools/", json={
        "name": "HDFC SHARED POOL",
        "total_limit": 40000.00,
        "statement_day": 19,
        "due_day": 12
    }, headers=auth_headers).json()["id"]

    c1_id = client.post("/api/v1/sources/", json={
        "name": "HDFC Freedom",
        "type": "credit_card",
        "card_ceiling_limit": 40000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers).json()["id"]

    c2_id = client.post("/api/v1/sources/", json={
        "name": "HDFC Swiggy",
        "type": "credit_card",
        "card_ceiling_limit": 18000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers).json()["id"]

    # Spend 10000 on Swiggy, 10000 on Freedom
    client.post("/api/v1/transactions/", json={"amount": 10000.00, "type": "expense", "source_id": c1_id}, headers=auth_headers)
    client.post("/api/v1/transactions/", json={"amount": 10000.00, "type": "expense", "source_id": c2_id}, headers=auth_headers)

    # State before repayment: Pool remaining = 20000. Freedom spendable = 20000. Swiggy spendable = 8000.
    # Repay 5000 on Swiggy
    repay_resp = client.post("/api/v1/transactions/", json={
        "amount": 5000.00,
        "type": "repayment",
        "source_id": c2_id
    }, headers=auth_headers)
    assert repay_resp.status_code == 200

    # Verify pool available is restored instantly to 25000
    # Freedom spendable should rise to 25000
    # Swiggy spendable should rise to 13000 (ceiling remaining = 18000 - 5000 = 13000, pool available = 25000 -> min(13000, 25000) = 13000)
    sources = client.get("/api/v1/sources/", headers=auth_headers).json()
    freedom = next(s for s in sources if s["id"] == c1_id)
    swiggy = next(s for s in sources if s["id"] == c2_id)

    assert float(freedom["actual_spendable"]) == 25000.00
    assert float(swiggy["actual_spendable"]) == 13000.00
    
    pool = client.get("/api/v1/credit-pools/", headers=auth_headers).json()[0]
    assert float(pool["available_limit"]) == 25000.00

# =====================================================================
# TEST GROUP F: BILLING ENGINE
# =====================================================================
def test_group_f_billing_engine():
    # statement_day = 19, due_day = 12
    # Assume current date is 20 May 2026
    curr_date = date(2026, 5, 20)
    
    cycle = calculate_billing_cycle(
        current_date_or_dt=curr_date,
        statement_day=19,
        due_day=12,
        outstanding=Decimal("5000.00")
    )
    
    # Timeline check:
    # 19 May -> statement generated
    # 12 Jun -> payment due for statement of 19 May
    # 19 Jun -> next statement
    # 12 Jul -> next due
    
    assert cycle["active_statement_date"] == date(2026, 5, 19)
    assert cycle["active_due_date"] == date(2026, 6, 12)
    assert cycle["next_statement_date"] == date(2026, 6, 19)
    assert cycle["next_future_due_date"] == date(2026, 7, 12)
    assert cycle["is_overdue"] is False
    assert cycle["days_until_due"] == 23 # 20 May to 12 June is 23 days

# =====================================================================
# TEST GROUP G & H: ANALYTICS & INSIGHTS ENGINE
# =====================================================================
def test_group_g_h_analytics_insights(client, auth_headers):
    pool_id = client.post("/api/v1/credit-pools/", json={
        "name": "HDFC SHARED POOL",
        "total_limit": 40000.00,
        "statement_day": 19,
        "due_day": 12
    }, headers=auth_headers).json()["id"]

    c1_id = client.post("/api/v1/sources/", json={
        "name": "HDFC Freedom",
        "type": "credit_card",
        "card_ceiling_limit": 40000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers).json()["id"]

    # 1. Utilized 30000 / 40000 = 75% (triggers warning alert > 70%)
    client.post("/api/v1/transactions/", json={"amount": 30000.00, "type": "expense", "source_id": c1_id}, headers=auth_headers)

    analytics_resp = client.get("/api/v1/analytics/credit-utilization", headers=auth_headers)
    assert analytics_resp.status_code == 200
    util = analytics_resp.json()
    
    card_data = next(c for c in util["card_level"] if c["card_name"] == "HDFC Freedom")
    assert float(card_data["card_limit"]) == 40000.00
    assert float(card_data["card_outstanding"]) == 30000.00
    assert float(card_data["actual_spendable"]) == 10000.00
    
    pool_data = next(p for p in util["shared_exposure_level"] if p["shared_group"] == "HDFC SHARED POOL")
    assert float(pool_data["shared_total_limit"]) == 40000.00
    assert float(pool_data["shared_utilized_limit"]) == 30000.00
    assert float(pool_data["shared_utilization_percent"]) == 75.0

    insights_resp = client.get("/api/v1/analytics/insights", headers=auth_headers)
    alerts = insights_resp.json()["alerts"]
    
    # Assert pool alert is generated
    pool_alert = next((a for a in alerts if a["related_entity_id"] == pool_id), None)
    assert pool_alert is not None
    assert pool_alert["severity"] == "warning"
    assert "High Shared Exposure" in pool_alert["title"]

# =====================================================================
# TEST GROUP J: POOL DELETION
# =====================================================================
def test_group_j_pool_deletion(client, auth_headers):
    pool_id = client.post("/api/v1/credit-pools/", json={
        "name": "HDFC SHARED POOL",
        "total_limit": 40000.00,
        "statement_day": 19,
        "due_day": 12
    }, headers=auth_headers).json()["id"]

    c1_id = client.post("/api/v1/sources/", json={
        "name": "HDFC Freedom",
        "type": "credit_card",
        "card_ceiling_limit": 40000.00,
        "credit_limit": 40000.00,
        "credit_pool_id": pool_id
    }, headers=auth_headers).json()["id"]

    # Delete Pool
    del_resp = client.delete(f"/api/v1/credit-pools/{pool_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # Verify pool is hidden from CreditPool API
    pools = client.get("/api/v1/credit-pools/", headers=auth_headers).json()
    assert not any(p["id"] == pool_id for p in pools)

    # Verify card still has shared_group_id mapped for implicit shared calculations
    sources = client.get("/api/v1/sources/", headers=auth_headers).json()
    freedom = next(s for s in sources if s["id"] == c1_id)
    assert freedom["shared_group_id"] == pool_id
    # Spendable remains correct (independent card ceiling limits)
    assert float(freedom["actual_spendable"]) == 40000.00

# =====================================================================
# TEST GROUP K: EDGE CASES
# =====================================================================
def test_group_k_edge_cases(client, auth_headers):
    c_id = client.post("/api/v1/sources/", json={
        "name": "Isolated Card",
        "type": "credit_card",
        "card_ceiling_limit": 50000.00,
        "credit_limit": 50000.00
    }, headers=auth_headers).json()["id"]

    # 1. Repayment larger than outstanding balance (negative card_outstanding) -> must fail
    rep_large = client.post("/api/v1/transactions/", json={
        "amount": 1000.00,
        "type": "repayment",
        "source_id": c_id
    }, headers=auth_headers)
    assert rep_large.status_code == 400
    assert "negative" in rep_large.json()["detail"].lower()

    # 2. Negative transaction amount -> must fail (handled by pydantic validator or API)
    neg_tx = client.post("/api/v1/transactions/", json={
        "amount": -50.00,
        "type": "expense",
        "source_id": c_id
    }, headers=auth_headers)
    assert neg_tx.status_code in [400, 422] # Pydantic validator failure or domain exception

    # 3. Duplicate transactions filter (two transactions within 5 seconds with same parameters)
    # Tx 1
    tx1 = client.post("/api/v1/transactions/", json={
        "amount": 2000.00,
        "type": "expense",
        "source_id": c_id
    }, headers=auth_headers)
    assert tx1.status_code == 200
    tx1_id = tx1.json()["id"]

    # Tx 2 (Duplicate) - should return existing tx ID instead of throwing error or creating new
    tx2 = client.post("/api/v1/transactions/", json={
        "amount": 2000.00,
        "type": "expense",
        "source_id": c_id
    }, headers=auth_headers)
    assert tx2.status_code == 200
    assert tx2.json()["id"] == tx1_id

# =====================================================================
# TEST GROUP M: CONCURRENCY
# =====================================================================
def test_group_m_concurrency(auth_headers):
    # Standard DB session for setup
    db = TestingSessionLocal()
    
    # Create a clean pool (40K)
    pool = CreditPool(
        name="Concurrent Pool",
        total_limit=Decimal("40000.00"),
        utilized_limit=Decimal("0.00"),
        available_limit=Decimal("40000.00"),
        statement_day=19,
        due_day=12,
        user_id=db.query(User).first().id
    )
    db.add(pool)
    db.commit()
    db.refresh(pool)
    
    card1 = PaymentSource(
        name="Card A",
        type="credit_card",
        card_ceiling_limit=Decimal("30000.00"),
        credit_limit=Decimal("30000.00"),
        credit_pool_id=pool.id,
        user_id=pool.user_id,
        card_outstanding=Decimal("0.00"),
        available_limit=Decimal("30000.00")
    )
    card2 = PaymentSource(
        name="Card B",
        type="credit_card",
        card_ceiling_limit=Decimal("30000.00"),
        credit_limit=Decimal("30000.00"),
        credit_pool_id=pool.id,
        user_id=pool.user_id,
        card_outstanding=Decimal("0.00"),
        available_limit=Decimal("30000.00")
    )
    db.add_all([card1, card2])
    db.commit()
    db.refresh(card1)
    db.refresh(card2)
    user_id = pool.user_id
    db.close()

    # Now run simultaneous transactions of 25K each.
    # Total limit is 40K, so combined they should exceed the pool limit.
    # One of them MUST fail due to DB serialization / constraints.
    def execute_tx(card_id):
        # We need a fresh session for each thread to simulate real API requests
        session = TestingSessionLocal()
        try:
            # Emulate transaction_service inside thread
            # Get fresh references
            src = session.query(PaymentSource).filter(PaymentSource.id == card_id).first()
            pl = session.query(CreditPool).filter(CreditPool.id == src.credit_pool_id).first()
            
            # Check limits
            expected_card = src.card_outstanding + Decimal("25000.00")
            expected_pool = pl.utilized_limit + Decimal("25000.00")
            
            transaction_service.validate_balance_limits(
                src, expected_card_outstanding=expected_card, expected_pool_utilized=expected_pool, pool=pl
            )
            
            transaction_service._apply_balance_delta(src, "expense", Decimal("25000.00"), 1, pl)
            transaction_service.sync_pool_limits(session, pl.id)
            
            tx = Transaction(
                user_id=user_id,
                source_id=card_id,
                amount=Decimal("25000.00"),
                type="expense",
                timestamp=datetime.now(timezone.utc)
            )
            session.add(tx)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            return False
        finally:
            session.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(execute_tx, card1.id), executor.submit(execute_tx, card2.id)]
        results = [f.result() for f in futures]
    
    # Only one of them should succeed, because total pool is 40K and each wants 25K (combined 50K)
    assert True in results
    assert False in results


# =====================================================================
# TEST GROUP N: ONBOARDING DATE BOUNDARY ENFORCEMENT
# =====================================================================
def test_onboarding_date_boundary_enforcement(client, db_session):
    from app.models.user import User
    from app.core.security import get_password_hash
    
    # 1. Create a user who onboarded/registered on 2026-05-20
    test_user = User(
        email="onboarding_tester@nexvault.com",
        hashed_password=get_password_hash("securepass123"),
        full_name="Onboarding Tester",
        created_at=datetime(2026, 5, 20, 10, 0, 0, tzinfo=timezone.utc)
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)
    
    # Login to get authorization token
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "onboarding_tester@nexvault.com", "password": "securepass123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-User-Timezone": "UTC"}
    
    # 2. Create a bank payment source for this user
    src_resp = client.post("/api/v1/sources/", json={
        "name": "HDFC Bank Account",
        "type": "bank",
        "balance": 10000.00
    }, headers=headers)
    assert src_resp.status_code == 200
    src_id = src_resp.json()["id"]
    
    # 3. Try to add an expense transaction dated 2026-05-19 (BEFORE onboarding date 2026-05-20).
    # This must be rejected by the backend boundary shield!
    tx_fail = client.post("/api/v1/transactions/", json={
        "amount": 500.00,
        "type": "expense",
        "source_id": src_id,
        "timestamp": "2026-05-19T14:30:00Z"
    }, headers=headers)
    
    assert tx_fail.status_code == 400
    assert "Prior transaction blocked" in tx_fail.json()["detail"]
    assert "onboarded on 20/05/2026" in tx_fail.json()["detail"]
    
    # 4. Try to add an expense transaction dated 2026-05-20 (ON onboarding date).
    # This must be accepted successfully.
    tx_on_date = client.post("/api/v1/transactions/", json={
        "amount": 500.00,
        "type": "expense",
        "source_id": src_id,
        "timestamp": "2026-05-20T14:30:00Z"
    }, headers=headers)
    assert tx_on_date.status_code == 200
    tx_on_id = tx_on_date.json()["id"]
    
    # 5. Try to add an expense transaction dated 2026-05-22 (AFTER onboarding date).
    # This must be accepted successfully.
    tx_after_date = client.post("/api/v1/transactions/", json={
        "amount": 500.00,
        "type": "expense",
        "source_id": src_id,
        "timestamp": "2026-05-22T14:30:00Z"
    }, headers=headers)
    assert tx_after_date.status_code == 200
    tx_after_id = tx_after_date.json()["id"]
    
    # 6. Try to update the transaction on onboarding date (2026-05-20) to a date BEFORE onboarding (2026-05-18).
    # This update must be rejected as well.
    tx_update_fail = client.put(f"/api/v1/transactions/{tx_on_id}", json={
        "timestamp": "2026-05-18T10:00:00Z"
    }, headers=headers)
    assert tx_update_fail.status_code == 400
    assert "Prior transaction blocked" in tx_update_fail.json()["detail"]


# =====================================================================
# TEST GROUP onboarding_date_anchor: DYNAMIC LEDGER ANCHOR ADJUSTMENT
# =====================================================================
def test_dynamic_ledger_anchor_adjustment(client, db_session):
    # 1. Sign up user
    user_payload = {
        "email": "anchor_tester@nexvault.com",
        "password": "SecurePass@123",
        "full_name": "Anchor Tester"
    }
    client.post("/api/v1/users/signup", json=user_payload)
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "anchor_tester@nexvault.com", "password": "SecurePass@123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-User-Timezone": "UTC"}
    
    # Get initial user details to check onboarding date (created_at)
    user_me = client.get("/api/v1/users/me", headers=headers).json()
    
    # 2. Try to update created_at to a future date
    future_date = "2029-12-31T00:00:00Z"
    update_resp = client.put("/api/v1/users/me", json={"created_at": future_date}, headers=headers)
    assert update_resp.status_code == 400
    assert "cannot be set in the future" in update_resp.json()["detail"].lower()
    
    # 3. Create a payment source and add a transaction on a specific date (e.g. 2026-05-20)
    # But first, set the anchor date to 2026-05-15 (a valid past date)
    past_date_valid = "2026-05-15T00:00:00Z"
    update_resp = client.put("/api/v1/users/me", json={"created_at": past_date_valid}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["created_at"].startswith("2026-05-15")
    
    # Add a payment source
    src_resp = client.post("/api/v1/sources/", json={
        "name": "Checkings",
        "type": "bank",
        "balance": 1000.00
    }, headers=headers)
    src_id = src_resp.json()["id"]
    
    # Add transaction on 2026-05-18
    tx_resp = client.post("/api/v1/transactions/", json={
        "amount": 100.00,
        "type": "expense",
        "source_id": src_id,
        "timestamp": "2026-05-18T12:00:00Z"
    }, headers=headers)
    assert tx_resp.status_code == 200
    
    # 4. Attempt to move anchor date to 2026-05-20 (which is AFTER the oldest transaction on 2026-05-18)
    invalid_future_anchor = "2026-05-20T00:00:00Z"
    update_resp2 = client.put("/api/v1/users/me", json={"created_at": invalid_future_anchor}, headers=headers)
    assert update_resp2.status_code == 400
    assert "recorded on" in update_resp2.json()["detail"].lower()
    
    # 5. Move anchor date to 2026-05-17 (which is BEFORE or ON the oldest transaction on 2026-05-18)
    valid_anchor = "2026-05-17T00:00:00Z"
    update_resp3 = client.put("/api/v1/users/me", json={"created_at": valid_anchor}, headers=headers)
    assert update_resp3.status_code == 200
    assert update_resp3.json()["created_at"].startswith("2026-05-17")

