from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.transaction import Transaction
from app.models.source import PaymentSource
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from datetime import datetime, timezone, timedelta
from decimal import Decimal


def validate_balance_limits(source: PaymentSource, expected_balance: Decimal):
    """
    Validates if the expected balance violates the payment source type's financial rules.
    Currently:
      - Credit cards are excluded from this validation (credit limit rules apply).
      - All other debit-style accounts (bank, wallet, cash, debit_card) must have expected_balance >= 0.
    This can be easily extended to support overdraft or credit validation.
    """
    if source.type == "credit_card":
        # Future-proofing: credit card limits can be validated here if needed
        return

    # Debit-style accounts cannot go below 0
    if expected_balance < 0:
        raise HTTPException(status_code=400, detail="Insufficient balance in selected account.")


def _apply_balance_delta(source: PaymentSource, tx_type: str, amount: Decimal, sign: int):
    """
    Apply a balance delta to a payment source atomically using SQL expressions.
    sign=+1 to apply (add effect), sign=-1 to revert (remove effect).

    For credit_card: adjusts available_limit
    For all others: adjusts balance
    """
    if source.type == "credit_card":
        if tx_type == "expense":
            # Expense on CC reduces available limit
            source.available_limit = PaymentSource.available_limit - (sign * amount)
        elif tx_type == "income":
            # Payment/income on CC restores available limit
            source.available_limit = PaymentSource.available_limit + (sign * amount)
    else:
        if tx_type == "expense":
            source.balance = PaymentSource.balance - (sign * amount)
        elif tx_type == "income":
            source.balance = PaymentSource.balance + (sign * amount)


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

    # 2. Validate sufficient funds for debit-style accounts
    if transaction_in.type == "expense":
        validate_balance_limits(source, (source.balance or Decimal("0.00")) - transaction_in.amount)

    # 3. Normalize naive transaction input datetimes to UTC prior to SQL storage
    tx_data = transaction_in.model_dump()
    dt = tx_data.get("timestamp")
    if dt:
        if dt.tzinfo is None:
            tx_data["timestamp"] = dt.replace(tzinfo=timezone.utc)
        else:
            tx_data["timestamp"] = dt.astimezone(timezone.utc)
    else:
        tx_data["timestamp"] = datetime.now(timezone.utc)

    # 4. Duplicate Transaction Prevention
    # Check for existing duplicate transaction (identical fields within 5 seconds window)
    duplicate_window = timedelta(seconds=5)
    tx_time = tx_data["timestamp"]
    
    existing_duplicate = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.source_id == transaction_in.source_id,
        Transaction.category_id == transaction_in.category_id,
        Transaction.amount == transaction_in.amount,
        Transaction.type == transaction_in.type,
        Transaction.timestamp >= tx_time - duplicate_window,
        Transaction.timestamp <= tx_time + duplicate_window
    ).first()

    if existing_duplicate:
        return existing_duplicate

    # 5. Update the source balance atomically
    _apply_balance_delta(source, transaction_in.type, transaction_in.amount, sign=+1)

    # 6. Build and persist the transaction
    new_tx = Transaction(**tx_data, user_id=user_id)
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    db.refresh(source)
    try:
        check_and_trigger_notifications(db, user_id, source)
    except Exception:
        pass
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

    # Normalize timestamp to UTC if provided in updates
    dt = update_data.get("timestamp")
    if dt:
        if dt.tzinfo is None:
            update_data["timestamp"] = dt.replace(tzinfo=timezone.utc)
        else:
            update_data["timestamp"] = dt.astimezone(timezone.utc)

    # Determine effective values (new or fallback to existing)
    new_source_id = update_data.get("source_id", tx.source_id)
    new_type = update_data.get("type", tx.type)
    new_amount = update_data.get("amount", tx.amount)

    # Fetch old source
    old_source = db.query(PaymentSource).filter(PaymentSource.id == tx.source_id).first()
    if not old_source:
        raise HTTPException(status_code=404, detail="Original payment source not found")

    # Fetch new source
    if new_source_id == tx.source_id:
        new_source = old_source
    else:
        new_source = db.query(PaymentSource).filter(
            PaymentSource.id == new_source_id,
            PaymentSource.user_id == user_id
        ).first()
        if not new_source:
            raise HTTPException(status_code=404, detail="New payment source not found")

    # Calculate expected balances for validation
    if old_source.id == new_source.id:
        expected_bal = old_source.balance or Decimal("0.00")
        # Revert old
        if tx.type == "expense":
            expected_bal += tx.amount
        elif tx.type == "income":
            expected_bal -= tx.amount
        # Apply new
        if new_type == "expense":
            expected_bal -= new_amount
        elif new_type == "income":
            expected_bal += new_amount
        
        validate_balance_limits(old_source, expected_bal)
    else:
        # Revert old on old_source
        expected_old_bal = old_source.balance or Decimal("0.00")
        if tx.type == "expense":
            expected_old_bal += tx.amount
        elif tx.type == "income":
            expected_old_bal -= tx.amount
        
        validate_balance_limits(old_source, expected_old_bal)

        # Apply new on new_source
        expected_new_bal = new_source.balance or Decimal("0.00")
        if new_type == "expense":
            expected_new_bal -= new_amount
        elif new_type == "income":
            expected_new_bal += new_amount
        
        validate_balance_limits(new_source, expected_new_bal)

    # --- Step 1: Revert old effect on old source ---
    _apply_balance_delta(old_source, tx.type, tx.amount, sign=-1)

    # --- Step 2: Apply new effect on new (or same) source ---
    _apply_balance_delta(new_source, new_type, new_amount, sign=+1)

    # --- Step 3: Apply field updates to transaction ---
    for field, value in update_data.items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    db.refresh(old_source)
    if new_source != old_source:
        db.refresh(new_source)
    try:
        check_and_trigger_notifications(db, user_id, new_source)
    except Exception:
        pass
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
    if source:
        db.refresh(source)


def check_and_trigger_notifications(db: Session, user_id: str, source: PaymentSource):
    from app.models.notification import Notification
    
    if source.type == "credit_card":
        limit = source.limit or Decimal("0")
        avail = source.available_limit or Decimal("0")
        if limit > 0 and avail < (limit * Decimal("0.1")):
            percent_used = ((limit - avail) / limit) * 100
            title = f"High Credit Utilization: {source.name}"
            message = f"You have used {percent_used:.1f}% of your credit limit on {source.name}. Available limit is low."
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.title == title,
                Notification.is_read == False
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    type="warning"
                ))
                db.commit()
    else:
        balance = source.balance or Decimal("0")
        if balance < 1000:
            title = f"Low Balance Alert: {source.name}"
            message = f"Your balance in {source.name} is {balance:.2f}, which is below the threshold of 1,000.00."
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.title == title,
                Notification.is_read == False
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    type="warning"
                ))
                db.commit()
