import pytest
from decimal import Decimal
from fastapi import HTTPException
from app.services.transaction_service import validate_balance_limits
from app.models.source import PaymentSource
from app.models.credit_pool import CreditPool

def test_actual_spendable_with_pool():
    # Setup
    source = PaymentSource(
        type="credit_card",
        credit_limit=Decimal("50000"),
        card_ceiling_limit=Decimal("40000")
    )
    pool = CreditPool(
        total_limit=Decimal("100000")
    )
    
    # Expected outstanding and utilized
    expected_card_outstanding = Decimal("30000")
    expected_pool_utilized = Decimal("95000")
    
    # 1. card remaining = 40000 - 30000 = 10000
    # 2. pool available = 100000 - 95000 = 5000
    # 3. actual spendable = min(10000, 5000) = 5000
    
    # A transaction of 6000 would exceed the pool limit
    with pytest.raises(HTTPException) as excinfo:
        validate_balance_limits(
            source=source,
            expected_card_outstanding=expected_card_outstanding + Decimal("6000"),
            expected_pool_utilized=expected_pool_utilized + Decimal("6000"),
            pool=pool
        )
    assert excinfo.value.status_code == 400
    assert "Insufficient available credit in shared pool." in excinfo.value.detail or "Insufficient actual spending power" in excinfo.value.detail

    # A transaction of 4000 should pass
    try:
        validate_balance_limits(
            source=source,
            expected_card_outstanding=expected_card_outstanding + Decimal("4000"),
            expected_pool_utilized=expected_pool_utilized + Decimal("4000"),
            pool=pool
        )
    except HTTPException:
        pytest.fail("Transaction of 4000 should not raise an exception")

def test_actual_spendable_without_pool():
    source = PaymentSource(
        type="credit_card",
        credit_limit=Decimal("50000"),
        card_ceiling_limit=Decimal("40000")
    )
    
    expected_card_outstanding = Decimal("30000")
    
    # Card remaining = 10000
    with pytest.raises(HTTPException) as excinfo:
        validate_balance_limits(
            source=source,
            expected_card_outstanding=expected_card_outstanding + Decimal("15000"),
            expected_pool_utilized=None,
            pool=None
        )
    assert excinfo.value.status_code == 400
    assert "Insufficient operational credit" in excinfo.value.detail
    
    # Transacion of 5000 should pass
    try:
        validate_balance_limits(
            source=source,
            expected_card_outstanding=expected_card_outstanding + Decimal("5000"),
            expected_pool_utilized=None,
            pool=None
        )
    except HTTPException:
        pytest.fail("Transaction of 5000 should not raise an exception")
