from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.transaction import Transaction
from app.models.source import PaymentSource
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from datetime import datetime, timezone
from decimal import Decimal


def _apply_balance_delta(source: PaymentSource, tx_type: str, amount: Decimal, sign: int):
    """
    Apply a balance delta to a payment source.
    sign=+1 to apply (add effect), sign=-1 to revert (remove effect).

    For credit_card: adjusts available_limit
    For all others: adjusts balance
    """
    if source.type == "credit_card":
        if tx_type == "expense":
            # Expense on CC reduces available limit
            source.available_limit = (source.available_limit or Decimal("0")) - (sign * amount)
        elif tx_type == "income":
            # Payment/income on CC restores available limit
            source.available_limit = (source.available_limit or Decimal("0")) + (sign * amount)
    else:
        if tx_type == "expense":
            source.balance = (source.balance or Decimal("0")) - (sign * amount)
        elif tx_type == "income":
            source.balance = (source.balance or Decimal("0")) + (sign * amount)


def create_transaction(db: Session, transaction_in: TransactionCreate, user_id: str) -> Transaction:
    from app.services.demo_service import cleanup_demo_data_if_needed
    cleanup_demo_data_if_needed(db, user_id)

    # 1. Fetch the payment source — enforces user isolation
    source = db.query(PaymentSource).filter(
        PaymentSource.id == transaction_in.source_id,
        PaymentSource.user_id == user_id
    ).first()

    if not source:
        raise HTTPException(status_code=404, detail="Payment source not found")

    # 2. Update the source balance atomically
    _apply_balance_delta(source, transaction_in.type, transaction_in.amount, sign=+1)

    # 3. Build and persist the transaction
    tx_data = transaction_in.model_dump()
    tx_data["timestamp"] = tx_data.get("timestamp") or datetime.now(timezone.utc)

    new_tx = Transaction(**tx_data, user_id=user_id)
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx


def update_transaction(db: Session, tx_id: str, transaction_in: TransactionUpdate, user_id: str) -> Transaction:
    """
    Update a transaction with full balance revert + reapply logic.
    - Reverts the old balance effect on the old source
    - Applies the new balance effect on the new (or same) source
    """
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == user_id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = transaction_in.model_dump(exclude_unset=True)

    # Determine effective values (new or fallback to existing)
    new_source_id = update_data.get("source_id", tx.source_id)
    new_type = update_data.get("type", tx.type)
    new_amount = update_data.get("amount", tx.amount)

    # --- Step 1: Revert old effect on old source ---
    old_source = db.query(PaymentSource).filter(
        PaymentSource.id == tx.source_id
    ).first()
    if old_source:
        _apply_balance_delta(old_source, tx.type, tx.amount, sign=-1)

    # --- Step 2: Apply new effect on new (or same) source ---
    if new_source_id == tx.source_id:
        new_source = old_source
    else:
        new_source = db.query(PaymentSource).filter(
            PaymentSource.id == new_source_id,
            PaymentSource.user_id == user_id
        ).first()
        if not new_source:
            # Revert our revert before raising
            if old_source:
                _apply_balance_delta(old_source, tx.type, tx.amount, sign=+1)
            raise HTTPException(status_code=404, detail="New payment source not found")

    _apply_balance_delta(new_source, new_type, new_amount, sign=+1)

    # --- Step 3: Apply field updates to transaction ---
    for field, value in update_data.items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, tx_id: str, user_id: str):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == user_id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    source = db.query(PaymentSource).filter(PaymentSource.id == tx.source_id).first()
    if source:
        # Revert balance on deletion
        _apply_balance_delta(source, tx.type, tx.amount, sign=-1)

    db.delete(tx)
    db.commit()
