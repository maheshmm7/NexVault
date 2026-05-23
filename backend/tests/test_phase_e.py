import os
os.environ["DATABASE_URL"] = "sqlite:///./test_phase_e.db"

import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base
from app.api.deps import get_db
from app.core.security import get_password_hash

engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_phase_e.db"):
        try:
            os.remove("./test_phase_e.db")
        except PermissionError:
            pass

@pytest.fixture(scope="module")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module")
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

@pytest.fixture(scope="module")
def test_user_headers(client, db_session):
    from app.models.user import User
    
    test_user = User(
        email="phase_e@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Phase E User"
    )
    db_session.add(test_user)
    db_session.commit()
    
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "phase_e@test.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_billing_states_and_cycle_resolution():
    from app.utils.billing import calculate_billing_cycle
    
    # Example: statement 19, due 12
    # Today: 20 May
    today = date(2026, 5, 20)
    cycle = calculate_billing_cycle(today, statement_day=19, due_day=12, outstanding=Decimal("5000.00"))
    
    # Active statement should be 19 May
    assert cycle["active_statement_date"] == date(2026, 5, 19)
    # Active due date should be 12 Jun
    assert cycle["active_due_date"] == date(2026, 6, 12)
    # Next statement should be 19 Jun
    assert cycle["next_statement_date"] == date(2026, 6, 19)
    # Next future due should be 12 Jul
    assert cycle["next_future_due_date"] == date(2026, 7, 12)
    # Billing state should be upcoming
    assert cycle["billing_state"] == "upcoming"
    assert not cycle["is_overdue"]
    assert not cycle["is_settled"]
    
    # Test settled
    cycle_settled = calculate_billing_cycle(today, 19, 12, Decimal("0.00"))
    assert cycle_settled["billing_state"] == "settled"
    assert cycle_settled["is_settled"]

    # Test due soon (within 5 days)
    # Due is 12 Jun, today is 8 Jun (4 days left)
    today_soon = date(2026, 6, 8)
    cycle_soon = calculate_billing_cycle(today_soon, 19, 12, Decimal("500.00"))
    assert cycle_soon["billing_state"] == "due_soon"

    # Test overdue
    # Due is 12 Jun, today is 13 Jun
    today_overdue = date(2026, 6, 13)
    cycle_overdue = calculate_billing_cycle(today_overdue, 19, 12, Decimal("500.00"))
    assert cycle_overdue["billing_state"] == "overdue"
    assert cycle_overdue["is_overdue"]

    # Test critical overdue (30+ days)
    # Due is 12 Jun, today is 15 Jul
    today_crit = date(2026, 7, 15)
    cycle_crit = calculate_billing_cycle(today_crit, 19, 12, Decimal("500.00"))
    assert cycle_crit["billing_state"] in ["overdue", "critical_overdue"]


def test_shared_exposure_and_pool_deletion(client: TestClient, test_user_headers: dict):
    # 1. Create a shared pool (40K)
    pool_resp = client.post(
        "/api/v1/credit-pools/",
        headers=test_user_headers,
        json={
            "name": "Family Pool",
            "total_limit": 40000.00,
            "statement_day": 1,
            "due_day": 20
        }
    )
    assert pool_resp.status_code == 200
    pool_id = pool_resp.json()["id"]

    # 2. Create Freedom Card (40K ceiling)
    card1_resp = client.post(
        "/api/v1/sources/",
        headers=test_user_headers,
        json={
            "name": "Freedom",
            "type": "credit_card",
            "credit_limit": 40000.00,
            "credit_pool_id": pool_id
        }
    )
    assert card1_resp.status_code == 200
    card1_id = card1_resp.json()["id"]
    
    # 3. Create Swiggy Card (18K ceiling)
    card2_resp = client.post(
        "/api/v1/sources/",
        headers=test_user_headers,
        json={
            "name": "Swiggy",
            "type": "credit_card",
            "credit_limit": 18000.00,
            "credit_pool_id": pool_id
        }
    )
    assert card2_resp.status_code == 200
    card2_id = card2_resp.json()["id"]

    # 4. Verify initial actual_spendable values
    # Pool available = 40K
    # Freedom ceiling = 40K -> spendable = min(40, 40) = 40K
    # Swiggy ceiling = 18K -> spendable = min(18, 40) = 18K
    sources_resp = client.get("/api/v1/sources/", headers=test_user_headers)
    sources = sources_resp.json()
    freedom = next(s for s in sources if s["id"] == card1_id)
    swiggy = next(s for s in sources if s["id"] == card2_id)
    assert float(freedom["actual_spendable"]) == 40000.00
    assert float(swiggy["actual_spendable"]) == 18000.00

    # 5. Delete Pool -> should convert to implicit
    del_resp = client.delete(f"/api/v1/credit-pools/{pool_id}", headers=test_user_headers)
    assert del_resp.status_code == 200

    # 6. Verify pool is hidden from get_credit_pools
    pools_resp = client.get("/api/v1/credit-pools/", headers=test_user_headers)
    pools = pools_resp.json()
    assert not any(p["id"] == pool_id for p in pools)

    # 7. Verify actual_spendable values STILL hold after pool deletion (via implicit group)
    sources_resp_2 = client.get("/api/v1/sources/", headers=test_user_headers)
    sources_2 = sources_resp_2.json()
    freedom_2 = next(s for s in sources_2 if s["id"] == card1_id)
    swiggy_2 = next(s for s in sources_2 if s["id"] == card2_id)
    
    assert float(freedom_2["actual_spendable"]) == 40000.00
    assert float(swiggy_2["actual_spendable"]) == 18000.00
    assert freedom_2["shared_group_id"] == pool_id
    assert swiggy_2["shared_group_id"] == pool_id
