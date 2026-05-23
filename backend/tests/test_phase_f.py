import os
os.environ["DATABASE_URL"] = "sqlite:///./test_phase_f.db"

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
from app.services.insights_engine import INSIGHT_THRESHOLDS

engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_phase_f.db"):
        try:
            os.remove("./test_phase_f.db")
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
        email="phase_f@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Phase F User"
    )
    db_session.add(test_user)
    db_session.commit()
    
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "phase_f@test.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_shared_exposure_utilization_analytics(client: TestClient, test_user_headers: dict):
    # Create Shared Pool
    pool_resp = client.post(
        "/api/v1/credit-pools/",
        headers=test_user_headers,
        json={
            "name": "Phase F Pool",
            "total_limit": 50000.00,
            "statement_day": 1,
            "due_day": 20
        }
    )
    pool_id = pool_resp.json()["id"]

    # Create Card linked to pool
    card_resp = client.post(
        "/api/v1/sources/",
        headers=test_user_headers,
        json={
            "name": "Phase F Card",
            "type": "credit_card",
            "credit_limit": 30000.00,
            "credit_pool_id": pool_id,
            "statement_day": 1,
            "due_day": 20
        }
    )
    card_id = card_resp.json()["id"]

    # Add transaction to exhaust pool by 45000 (which exceeds the card's individual limit)
    # Wait, if we try to add 45000 on the card, it should fail. So we add 28000 on the card.
    tx1_resp = client.post(
        "/api/v1/transactions/",
        headers=test_user_headers,
        json={
            "amount": 28000.00,
            "type": "expense",
            "source_id": card_id,
            "category_id": "dummy",
            "notes": "Big Purchase",
            "timestamp": datetime.now().isoformat()
        }
    )
    assert tx1_resp.status_code == 200

    # Add another card linked to same pool and max it out to exhaust shared limit
    card2_resp = client.post(
        "/api/v1/sources/",
        headers=test_user_headers,
        json={
            "name": "Phase F Card 2",
            "type": "credit_card",
            "credit_limit": 30000.00,
            "credit_pool_id": pool_id,
            "statement_day": 1,
            "due_day": 20
        }
    )
    card2_id = card2_resp.json()["id"]
    
    tx2_resp = client.post(
        "/api/v1/transactions/",
        headers=test_user_headers,
        json={
            "amount": 18000.00, # total pool utilized = 28k + 18k = 46k (92% pool utilization)
            "type": "expense",
            "source_id": card2_id,
            "category_id": "dummy",
            "notes": "Another Purchase",
            "timestamp": datetime.now().isoformat()
        }
    )
    assert tx2_resp.status_code == 200

    # 1. Test Utilization Analytics separates card and shared
    util_resp = client.get("/api/v1/analytics/credit-utilization", headers=test_user_headers)
    assert util_resp.status_code == 200
    util_data = util_resp.json()
    assert "card_level" in util_data
    assert "shared_exposure_level" in util_data

    shared = next(p for p in util_data["shared_exposure_level"] if p["shared_group"] == "Phase F Pool")
    assert float(shared["shared_utilized_limit"]) == 46000.00
    assert float(shared["shared_utilization_percent"]) == 92.0 # 46k / 50k
    
    card1 = next(c for c in util_data["card_level"] if c["card_name"] == "Phase F Card")
    assert float(card1["card_outstanding"]) == 28000.00
    assert float(card1["utilization_percent"]) == 93.3 # 28k / 30k
    
    # 2. Test Smart Insights Engine triggers warnings
    insights_resp = client.get("/api/v1/analytics/insights", headers=test_user_headers)
    alerts = insights_resp.json()["alerts"]
    
    # Expect shared utilization warning (92% > 85%)
    shared_alert = next((a for a in alerts if a["related_entity_id"] == pool_id), None)
    assert shared_alert is not None
    assert shared_alert["severity"] == "critical"
    assert shared_alert["category"] == "credit_utilization"
    
    # Expect card 1 utilization warning (93.3% > 80%)
    card1_alert = next((a for a in alerts if a["related_entity_id"] == card_id and a["category"] == "card_utilization"), None)
    assert card1_alert is not None

def test_emi_analytics(client: TestClient, test_user_headers: dict):
    # Let's get the card id used in the previous step
    card_resp = client.get("/api/v1/sources/", headers=test_user_headers)
    card_id = next(c["id"] for c in card_resp.json() if c["name"] == "Phase F Card")

    # Create a bank account for income
    bank_resp = client.post(
        "/api/v1/sources/",
        headers=test_user_headers,
        json={
            "name": "Salary Bank",
            "type": "bank",
            "balance": 0.0
        }
    )
    bank_id = bank_resp.json()["id"]

    # Add an income to have a base for EMI utilization ratio
    salary_resp = client.post(
        "/api/v1/transactions/",
        headers=test_user_headers,
        json={
            "amount": 100000.00,
            "type": "income",
            "source_id": bank_id,
            "category_id": "dummy_income",
            "notes": "Salary",
            "timestamp": datetime.now().isoformat()
        }
    )
    assert salary_resp.status_code == 200

    # Create an EMI obligation directly
    tx_resp = client.get("/api/v1/transactions/", headers=test_user_headers)
    
    emi_resp = client.post(
        "/api/v1/emi/",
        headers=test_user_headers,
        json={
            "name": "Test EMI",
            "principal_amount": 28000.00,
            "principal_remaining": 28000.00,
            "monthly_emi": 2800.00,
            "tenure_months": 10,
            "interest_rate": 0.0,
            "linked_card_id": card_id
        }
    )
    assert emi_resp.status_code == 200
    assert emi_resp.status_code == 200
    
    # Test EMI Analytics Endpoint
    emi_analytics = client.get("/api/v1/analytics/emi-analytics", headers=test_user_headers)
    assert emi_analytics.status_code == 200
    data = emi_analytics.json()
    
    assert data["total_outstanding_debt"] == 28000.00
    assert data["monthly_emi_burden"] == 2800.00
    assert data["active_emi_count"] == 1
    assert data["highest_emi_obligation"]["amount"] == 2800.00
    
    # 2800 / 100000 = 0.028 -> 2.8% ratio
    assert round(data["emi_utilization_ratio"], 3) == 0.028
    
    assert len(data["upcoming_emis"]) == 1
    assert data["upcoming_emis"][0]["monthly_emi"] == 2800.00
