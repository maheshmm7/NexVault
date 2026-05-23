"""
Phase D Integration Tests:
- Billing cycle severities and rollover
- Repayment rejection (over-repayment)
- Reconciliation audit logging
- EMI progression
- Invariant protections
"""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test_phase_d.db"

import pytest
from datetime import date, datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base
from app.api.deps import get_db

# ── Test DB setup ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test_phase_d.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_phase_d.db"):
        try:
            os.remove("./test_phase_d.db")
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

USER_EMAIL = "phased@vaultify.com"
USER_PASSWORD = "SecurePass@982"


@pytest.fixture(scope="module")
def auth_headers(client):
    r = client.post("/api/v1/users/signup", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "name": "Phase D Tester"
    })
    r = client.post("/api/v1/auth/login", data={
        "username": USER_EMAIL,
        "password": USER_PASSWORD
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─── AUTH SETUP ────────────────────────────────────────────────────

def test_signup(client):
    client.cookies.clear()
    r = client.post("/api/v1/users/signup", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "name": "Phase D Tester"
    })
    assert r.status_code == 201

def test_login(client):
    r = client.post("/api/v1/auth/login", data={
        "username": USER_EMAIL,
        "password": USER_PASSWORD
    })
    assert r.status_code == 200


# ─── BILLING ENGINE TESTS ─────────────────────────────────────────

def test_basic_cycle_calculation():
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 5, 20), 19, 12)

    assert result["active_statement_date"] == date(2026, 5, 19)
    assert result["active_due_date"] == date(2026, 6, 12)
    assert result["days_until_due"] == (date(2026, 6, 12) - date(2026, 5, 20)).days
    assert result["is_overdue"] == False

def test_overdue_detection():
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 6, 15), 19, 12)
    assert result["is_overdue"] == True
    assert result["days_past_due"] > 0

def test_cycle_before_statement_day():
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 5, 10), 19, 12)
    assert result["active_statement_date"] == date(2026, 4, 19)
    assert result["active_due_date"] == date(2026, 5, 12)

def test_due_day_after_statement_day():
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 5, 10), 5, 25)
    assert result["active_statement_date"] == date(2026, 5, 5)
    assert result["active_due_date"] == date(2026, 5, 25)

def test_end_of_month_clamping():
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 6, 15), 31, 28)
    assert result["next_statement_date"].day <= 30

def test_february_clamping():
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 3, 5), 31, 28)
    assert result["active_statement_date"] == date(2026, 2, 28)

def test_active_cycle_not_skipped():
    """
    CRITICAL: Validates the exact bug reported by the user.
    Today=May 20, statement_day=19, due_day=12.
    
    Active cycle: statement May 19 → due Jun 12 (23 days away)
    Future cycle: statement Jun 19 → due Jul 12 (53 days away)
    
    The engine MUST return Jun 12, NOT Jul 12.
    """
    from app.utils.billing import calculate_billing_cycle
    result = calculate_billing_cycle(date(2026, 5, 20), 19, 12)

    # Active cycle must be June 12, NOT July 12
    assert result["active_due_date"] == date(2026, 6, 12), (
        f"Active due should be Jun 12, got {result['active_due_date']}"
    )
    assert result["days_until_due"] == 23, (
        f"Days remaining should be 23, got {result['days_until_due']}"
    )

    # Future cycle should be July 12
    assert result["next_future_due_date"] == date(2026, 7, 12), (
        f"Next future due should be Jul 12, got {result['next_future_due_date']}"
    )

    # Must NOT be overdue
    assert result["is_overdue"] == False

    # Statement cycle must be May 19
    assert result["active_statement_date"] == date(2026, 5, 19)
    assert result["next_statement_date"] == date(2026, 6, 19)


# ─── REPAYMENT VALIDATION TESTS ───────────────────────────────────

def test_repayment_rejects_over_outstanding(client, auth_headers):
    """Repayment exceeding outstanding balance must be rejected."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "TestRepayCard",
        "type": "credit_card",
        "credit_limit": 10000,
        "available_limit": 10000,
        "balance": 0
    })
    assert r.status_code == 200
    card = r.json()

    r = client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "repayment",
        "amount": 1000,
        "source_id": card["id"],
        "description": "Overpay test"
    })
    assert r.status_code == 400

def test_repayment_restores_credit(client, auth_headers):
    """A valid repayment must restore available credit."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "RepayRestoreCard",
        "type": "credit_card",
        "credit_limit": 20000,
        "available_limit": 15000,
        "balance": 5000
    })
    assert r.status_code == 200
    card = r.json()

    r = client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "repayment",
        "amount": 3000,
        "source_id": card["id"],
        "description": "Partial repayment"
    })
    assert r.status_code == 200

    r = client.get("/api/v1/sources/", headers=auth_headers)
    card_after = [s for s in r.json() if s["id"] == card["id"]][0]
    assert float(card_after["available_limit"]) == 18000.0

def test_repayment_excluded_from_income_analytics(client, auth_headers):
    """Repayments should not appear in income analytics."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "AnalyticsTestCard",
        "type": "credit_card",
        "credit_limit": 50000,
        "available_limit": 40000,
        "balance": 0
    })
    card = r.json()

    client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "repayment",
        "amount": 5000,
        "source_id": card["id"],
        "description": "Repay"
    })

    r = client.get("/api/v1/analytics/summary", headers=auth_headers)
    assert r.status_code == 200
    summary = r.json()
    # monthly_income should not include repayments
    assert summary["monthly_income"] == 0.0


# ─── RECONCILIATION SAFETY TESTS ──────────────────────────────────

def test_reconciliation_requires_transactions(client, auth_headers):
    """Cannot use reconciliation mode if no transactions exist on the source."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "ReconTestCard",
        "type": "credit_card",
        "credit_limit": 30000,
        "available_limit": 30000,
        "balance": 0
    })
    card = r.json()

    r = client.post("/api/v1/reconciliation/adjust", headers=auth_headers, json={
        "source_id": card["id"],
        "new_value": 5000,
        "reason": "Sync with bank statement"
    })
    assert r.status_code == 400
    assert "direct editing" in r.json()["detail"].lower()

def test_reconciliation_creates_audit_log(client, auth_headers):
    """After transactions exist, reconciliation must create an audit log."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "AuditLogCard",
        "type": "credit_card",
        "credit_limit": 25000,
        "available_limit": 25000,
        "balance": 0
    })
    card = r.json()

    client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "expense",
        "amount": 5000,
        "source_id": card["id"],
        "description": "Purchase"
    })

    r = client.post("/api/v1/reconciliation/adjust", headers=auth_headers, json={
        "source_id": card["id"],
        "new_value": 7000,
        "reason": "Bank statement shows 7000 outstanding"
    })
    assert r.status_code == 200
    log = r.json()
    assert float(log["previous_value"]) == 5000.0
    assert float(log["new_value"]) == 7000.0
    assert "bank statement" in log["reason"].lower()

    r = client.get("/api/v1/reconciliation/logs", headers=auth_headers)
    assert r.status_code == 200
    logs = r.json()
    assert len(logs) >= 1


# ─── EMI PROGRESSION TESTS ────────────────────────────────────────

def test_emi_payment_increments_installments(client, auth_headers):
    """Paying an EMI installment must increment paid_installments."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "EMITestCard",
        "type": "credit_card",
        "credit_limit": 100000,
        "available_limit": 50000,
        "balance": 0
    })
    card = r.json()

    r = client.post("/api/v1/emi/", headers=auth_headers, json={
        "name": "Laptop EMI",
        "principal_amount": 60000,
        "principal_remaining": 60000,
        "monthly_emi": 5000,
        "tenure_months": 12,
        "interest_rate": 0,
        "linked_card_id": card["id"],
        "next_due_date": "2026-06-15",
        "emi_status": "active"
    })
    assert r.status_code == 200
    emi = r.json()

    r = client.post(f"/api/v1/emi/{emi['id']}/pay", headers=auth_headers)
    assert r.status_code == 200
    updated = r.json()
    assert updated["paid_installments"] == 1
    assert float(updated["principal_remaining"]) == 55000.0

def test_emi_auto_completes(client, auth_headers):
    """EMI should auto-complete when all installments are paid."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "ShortEMICard",
        "type": "credit_card",
        "credit_limit": 1000,
        "available_limit": 1000,
        "balance": 0
    })
    card = r.json()

    r = client.post("/api/v1/emi/", headers=auth_headers, json={
        "name": "Short EMI",
        "principal_amount": 300,
        "principal_remaining": 300,
        "monthly_emi": 100,
        "tenure_months": 3,
        "interest_rate": 0,
        "linked_card_id": card["id"],
        "next_due_date": "2026-06-01",
        "emi_status": "active"
    })
    emi = r.json()

    for _ in range(3):
        r = client.post(f"/api/v1/emi/{emi['id']}/pay", headers=auth_headers)
        assert r.status_code == 200

    final = r.json()
    assert final["emi_status"] == "completed"
    assert float(final["principal_remaining"]) == 0.0
    assert final["paid_installments"] == 3


# ─── INVARIANT PROTECTION TESTS ───────────────────────────────────

def test_card_available_cannot_go_negative(client, auth_headers):
    """Spending more than available must be rejected."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "InvariantCard",
        "type": "credit_card",
        "credit_limit": 5000,
        "available_limit": 2000,
        "balance": 3000
    })
    card = r.json()

    r = client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "expense",
        "amount": 3000,
        "source_id": card["id"],
        "description": "Over-limit spend"
    })
    assert r.status_code == 400

def test_deletion_rollback_invariant(client, auth_headers):
    """Deleting a repayment when the card was already re-spent shouldn't violate limits."""
    r = client.post("/api/v1/sources/", headers=auth_headers, json={
        "name": "DeletionCard",
        "type": "credit_card",
        "credit_limit": 10000,
        "available_limit": 10000,
        "balance": 0
    })
    card = r.json()

    # Spend 5000
    r = client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "expense",
        "amount": 5000,
        "source_id": card["id"],
        "description": "Spend"
    })
    tx_expense = r.json()

    # Repay 3000
    r = client.post("/api/v1/transactions/", headers=auth_headers, json={
        "type": "repayment",
        "amount": 3000,
        "source_id": card["id"],
        "description": "Pay back"
    })
    tx_repay = r.json()

    # Delete the expense first → restoring 5000 would make available 13000 > 10000 limit
    r = client.delete(f"/api/v1/transactions/{tx_expense['id']}", headers=auth_headers)
    assert r.status_code == 400
