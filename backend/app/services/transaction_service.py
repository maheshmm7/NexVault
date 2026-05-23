from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.transaction import Transaction
from app.models.source import PaymentSource
from app.models.credit_pool import CreditPool
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from datetime import datetime, timezone, timedelta
from decimal import Decimal


def _get_linked_pool(db: Session, source: PaymentSource):
    if source.type == "credit_card":
        if source.credit_pool_id:
            return db.query(CreditPool).filter(CreditPool.id == source.credit_pool_id).first()
        elif source.shared_group_id:
            return db.query(CreditPool).filter(
                CreditPool.id == source.shared_group_id,
                CreditPool.pool_type == "implicit"
            ).first()
    return None


def validate_balance_limits(source: PaymentSource, expected_card_outstanding: Decimal = None, expected_pool_utilized: Decimal = None, pool: CreditPool = None, expected_balance: Decimal = None):
    if source.type == "credit_card":
        if expected_card_outstanding is not None:
            if expected_card_outstanding < 0:
                raise HTTPException(status_code=400, detail="Transaction results in negative outstanding balance.")
            
            card_ceiling = source.card_ceiling_limit or source.credit_limit or Decimal("0.00")
            if expected_card_outstanding > card_ceiling:
                raise HTTPException(status_code=400, detail="Insufficient operational credit (card ceiling reached).")
                
            if pool and expected_pool_utilized is not None:
                pool_limit = pool.total_limit or Decimal("0.00")
                if expected_pool_utilized < 0:
                    raise HTTPException(status_code=400, detail="Transaction results in negative pool utilized limit.")
                if expected_pool_utilized > pool_limit:
                    raise HTTPException(status_code=400, detail="Insufficient available credit in shared pool.")
                    
                card_remaining = card_ceiling - expected_card_outstanding
                pool_avail = pool_limit - expected_pool_utilized
                actual_spendable = min(card_remaining, pool_avail)
                if actual_spendable < 0:
                    raise HTTPException(status_code=400, detail="Insufficient actual spending power (pool or card ceiling reached).")
    else:
        if expected_balance is not None and expected_balance < 0:
            raise HTTPException(status_code=400, detail="Insufficient balance in selected account.")


# Helper to format currency values to remove trailing .00 if they are whole numbers, matching premium warnings
def _format_currency(amount: Decimal) -> str:
    if amount % 1 == 0:
        return f"{amount:.0f}"
    else:
        return f"{amount:.2f}"


def _sync_pool_limits_tentative(db: Session, pool_id: str):
    from sqlalchemy import or_
    pool = db.query(CreditPool).filter(CreditPool.id == pool_id).first()
    if not pool:
        return None
    
    linked_cards = db.query(PaymentSource).filter(
        PaymentSource.type == "credit_card",
        or_(PaymentSource.credit_pool_id == pool_id, PaymentSource.shared_group_id == pool_id)
    ).all()
    
    total_utilized = Decimal("0.00")
    for card in linked_cards:
        total_utilized += (card.card_outstanding or Decimal("0.00"))
        
    total_limit = pool.total_limit or Decimal("0.00")
    new_avail = total_limit - total_utilized
    
    if new_avail < 0 or new_avail > total_limit or total_utilized < 0 or total_utilized > total_limit:
        raise HTTPException(status_code=400, detail="Transaction violates shared pool credit limit invariants.")
        
    pool.utilized_limit = total_utilized
    pool.available_limit = new_avail
    
    db.add(pool)
    db.flush()
    return pool


def validate_historical_balances(db: Session, affected_source_ids: list, user_id: str, tz_name: str = "UTC"):
    sources_to_validate = set()
    pools_to_validate = {}
    
    for sid in affected_source_ids:
        source = db.query(PaymentSource).filter(PaymentSource.id == sid).first()
        if not source:
            continue
        sources_to_validate.add(source)
        
        pool = _get_linked_pool(db, source)
        if pool:
            pools_to_validate[pool.id] = pool
            from sqlalchemy import or_
            pool_cards = db.query(PaymentSource).filter(
                PaymentSource.type == "credit_card",
                or_(PaymentSource.credit_pool_id == pool.id, PaymentSource.shared_group_id == pool.id)
            ).all()
            for c in pool_cards:
                sources_to_validate.add(c)
                
    if not sources_to_validate:
        return

    sources_by_id = {s.id: s for s in sources_to_validate}
    source_ids = list(sources_by_id.keys())

    all_txs = db.query(Transaction).filter(
        Transaction.source_id.in_(source_ids)
    ).all()
    
    txs_by_source = {sid: [] for sid in source_ids}
    for t in all_txs:
        txs_by_source[t.source_id].append(t)
        
    initial_outstanding = {}
    initial_balance = {}
    
    for sid, source in sources_by_id.items():
        txs = txs_by_source[sid]
        sum_deltas = Decimal("0.00")
        for t in txs:
            if source.type == "credit_card":
                if t.type == "expense":
                    sum_deltas += t.amount
                elif t.type in ("income", "repayment"):
                    sum_deltas -= t.amount
            else:
                if t.type == "expense":
                    sum_deltas -= t.amount
                elif t.type in ("income", "repayment"):
                    sum_deltas += t.amount
                    
        if source.type == "credit_card":
            initial_outstanding[sid] = (source.card_outstanding or Decimal("0.00")) - sum_deltas
        else:
            initial_balance[sid] = (source.balance or Decimal("0.00")) - sum_deltas

    def get_sort_key(tx: Transaction):
        ts = tx.timestamp
        if ts is not None:
            if ts.tzinfo is not None:
                ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            ts = datetime.min
        
        ca = tx.created_at
        if ca is not None:
            if ca.tzinfo is not None:
                ca = ca.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            ca = datetime.min
            
        return (ts, ca, tx.id or "")

    sorted_txs = sorted(all_txs, key=get_sort_key)

    running_outstanding = {sid: initial_outstanding.get(sid, Decimal("0.00")) for sid in source_ids if sources_by_id[sid].type == "credit_card"}
    running_balance = {sid: initial_balance.get(sid, Decimal("0.00")) for sid in source_ids if sources_by_id[sid].type != "credit_card"}

    running_pool_utilized = {}
    
    def get_pool_util(pid):
        util = Decimal("0.00")
        for sid, s in sources_by_id.items():
            if s.type == "credit_card" and (s.credit_pool_id == pid or s.shared_group_id == pid):
                util += running_outstanding.get(sid, Decimal("0.00"))
        return util

    for pid in pools_to_validate.keys():
        running_pool_utilized[pid] = get_pool_util(pid)

    for t in sorted_txs:
        sid = t.source_id
        source = sources_by_id[sid]
        # Convert UTC timestamp to user local timezone for error reporting
        tx_time = t.timestamp
        if tx_time is not None:
            if tx_time.tzinfo is None:
                tx_time = tx_time.replace(tzinfo=timezone.utc)
            from zoneinfo import ZoneInfo
            try:
                local_dt = tx_time.astimezone(ZoneInfo(tz_name))
            except Exception:
                local_dt = tx_time
            date_str = local_dt.strftime('%d/%m/%Y')
        else:
            date_str = "N/A"
        amount_str = _format_currency(t.amount)
        
        if source.type == "credit_card":
            old_outstanding = running_outstanding[sid]
            card_ceiling = source.card_ceiling_limit or source.credit_limit or Decimal("0.00")
            old_available = card_ceiling - old_outstanding
            
            if t.type == "expense":
                running_outstanding[sid] += t.amount
            elif t.type in ("income", "repayment"):
                running_outstanding[sid] -= t.amount
                
            if running_outstanding[sid] < 0:
                raise HTTPException(status_code=400, detail="Transaction results in negative outstanding balance.")
                
            if running_outstanding[sid] > card_ceiling:
                raise HTTPException(
                    status_code=400,
                    detail=f"Limit exceeded: Your available credit limit on {date_str} was ₹{_format_currency(old_available)}, which is insufficient for this ₹{amount_str} transaction."
                )
                
            pool = None
            if source.credit_pool_id and source.credit_pool_id in pools_to_validate:
                pool = pools_to_validate[source.credit_pool_id]
            elif source.shared_group_id and source.shared_group_id in pools_to_validate:
                pool = pools_to_validate[source.shared_group_id]
                
            if pool:
                old_pool_util = running_pool_utilized.get(pool.id, Decimal("0.00"))
                pool_limit = pool.total_limit or Decimal("0.00")
                old_pool_avail = pool_limit - old_pool_util
                
                running_pool_utilized[pool.id] = get_pool_util(pool.id)
                
                if running_pool_utilized[pool.id] < 0:
                    raise HTTPException(status_code=400, detail="Transaction results in negative pool utilized limit.")
                    
                if running_pool_utilized[pool.id] > pool_limit:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Shared pool limit exceeded: The available pool limit on {date_str} was ₹{_format_currency(old_pool_avail)}, which is insufficient for this ₹{amount_str} transaction."
                    )
                    
                card_remaining = card_ceiling - running_outstanding[sid]
                pool_avail = pool_limit - running_pool_utilized[pool.id]
                actual_spendable = min(card_remaining, pool_avail)
                if actual_spendable < 0:
                    old_actual_spendable = min(old_available, old_pool_avail)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Spending power exceeded: Your actual spendable credit on {date_str} was ₹{_format_currency(old_actual_spendable)}, which is insufficient for this ₹{amount_str} transaction."
                    )
        else:
            old_balance = running_balance[sid]
            if t.type == "expense":
                running_balance[sid] -= t.amount
            elif t.type in ("income", "repayment"):
                running_balance[sid] += t.amount
                
            if running_balance[sid] < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient funds: Your balance on {date_str} was ₹{_format_currency(old_balance)}, which is insufficient for this ₹{amount_str} transaction."
                )


def sync_pool_limits(db: Session, pool_id: str):
    from sqlalchemy import or_
    pool = db.query(CreditPool).filter(CreditPool.id == pool_id).first()
    if not pool:
        return None
    
    linked_cards = db.query(PaymentSource).filter(
        PaymentSource.type == "credit_card",
        or_(PaymentSource.credit_pool_id == pool_id, PaymentSource.shared_group_id == pool_id)
    ).all()
    
    total_utilized = Decimal("0.00")
    for card in linked_cards:
        total_utilized += (card.card_outstanding or Decimal("0.00"))
        
    total_limit = pool.total_limit or Decimal("0.00")
    new_avail = total_limit - total_utilized
    
    if new_avail < 0 or new_avail > total_limit or total_utilized < 0 or total_utilized > total_limit:
        raise HTTPException(status_code=400, detail="Transaction violates shared pool credit limit invariants.")
        
    pool.utilized_limit = total_utilized
    pool.available_limit = new_avail
    
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return pool


def _apply_balance_delta(source: PaymentSource, tx_type: str, amount: Decimal, sign: int, pool: CreditPool = None):
    if source.type == "credit_card":
        outstanding = source.card_outstanding or Decimal("0.00")
        
        if tx_type == "expense":
            new_outstanding = outstanding + (sign * amount)
        elif tx_type in ("income", "repayment"):
            new_outstanding = outstanding - (sign * amount)
        else:
            new_outstanding = outstanding
            
        card_ceiling = source.card_ceiling_limit or source.credit_limit or Decimal("0.00")
        
        if new_outstanding < 0 or new_outstanding > card_ceiling:
            raise HTTPException(status_code=400, detail="Transaction violates card operational ceiling invariants.")
            
        source.card_outstanding = new_outstanding
        source.available_limit = card_ceiling - new_outstanding
    else:
        bal = source.balance or Decimal("0.00")
        if tx_type == "expense":
            source.balance = bal - (sign * amount)
        elif tx_type in ("income", "repayment"):
            source.balance = bal + (sign * amount)


def create_transaction(db: Session, transaction_in: TransactionCreate, user_id: str, tz_name: str = "UTC") -> Transaction:
    from app.services.demo_service import cleanup_demo_data_if_needed
    cleanup_demo_data_if_needed(db, user_id)

    # Enforce onboarding date boundary
    from app.models.user import User
    from zoneinfo import ZoneInfo
    user_obj = db.query(User).filter(User.id == user_id).first()
    if user_obj and user_obj.created_at:
        try:
            user_local_created = user_obj.created_at.astimezone(ZoneInfo(tz_name))
        except Exception:
            user_local_created = user_obj.created_at
            
        dt = transaction_in.timestamp
        if dt:
            if dt.tzinfo is None:
                dt_utc = dt.replace(tzinfo=timezone.utc)
            else:
                dt_utc = dt.astimezone(timezone.utc)
            try:
                tx_local = dt_utc.astimezone(ZoneInfo(tz_name))
            except Exception:
                tx_local = dt_utc
                
            if tx_local.date() < user_local_created.date():
                raise HTTPException(
                    status_code=400,
                    detail=f"Prior transaction blocked: You onboarded on {user_local_created.strftime('%d/%m/%Y')}. Transactions prior to your onboarding date are not accepted to preserve ledger and balance integrity."
                )

    source = db.query(PaymentSource).filter(
        PaymentSource.id == transaction_in.source_id,
        PaymentSource.user_id == user_id
    ).first()

    if not source:
        raise HTTPException(status_code=404, detail="Payment source not found")

    pool = _get_linked_pool(db, source)

    if transaction_in.type == "expense":
        if source.type == "credit_card":
            expected_card_outstanding = (source.card_outstanding or Decimal("0.00")) + transaction_in.amount
            expected_pool_utilized = (pool.utilized_limit or Decimal("0.00")) + transaction_in.amount if pool else None
            validate_balance_limits(source, expected_card_outstanding=expected_card_outstanding, expected_pool_utilized=expected_pool_utilized, pool=pool)
        else:
            expected_balance = (source.balance or Decimal("0.00")) - transaction_in.amount
            validate_balance_limits(source, expected_balance=expected_balance)
    elif transaction_in.type in ("income", "repayment"):
        if source.type == "credit_card":
            expected_card_outstanding = (source.card_outstanding or Decimal("0.00")) - transaction_in.amount
            expected_pool_utilized = (pool.utilized_limit or Decimal("0.00")) - transaction_in.amount if pool else None
            validate_balance_limits(source, expected_card_outstanding=expected_card_outstanding, expected_pool_utilized=expected_pool_utilized, pool=pool)
        else:
            expected_balance = (source.balance or Decimal("0.00")) + transaction_in.amount
            validate_balance_limits(source, expected_balance=expected_balance)

    tx_data = transaction_in.model_dump()
    dt = tx_data.get("timestamp")
    if dt:
        if dt.tzinfo is None:
            tx_data["timestamp"] = dt.replace(tzinfo=timezone.utc)
        else:
            tx_data["timestamp"] = dt.astimezone(timezone.utc)
    else:
        tx_data["timestamp"] = datetime.now(timezone.utc)

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

    _apply_balance_delta(source, transaction_in.type, transaction_in.amount, sign=+1, pool=pool)
    pool_id_to_sync = pool.id if pool else None
    if pool_id_to_sync:
        _sync_pool_limits_tentative(db, pool_id_to_sync)

    new_tx = Transaction(**tx_data, user_id=user_id)
    db.add(new_tx)
    
    try:
        db.flush()
        validate_historical_balances(db, [source.id], user_id, tz_name=tz_name)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    db.refresh(new_tx)
    db.refresh(source)
    if pool_id_to_sync:
        pool = db.query(CreditPool).filter(CreditPool.id == pool_id_to_sync).first()
        if pool:
            db.refresh(pool)
            
    try:
        check_and_trigger_notifications(db, user_id, source, pool=pool)
    except Exception:
        pass
    return new_tx


def update_transaction(db: Session, tx_id: str, transaction_in: TransactionUpdate, user_id: str, tz_name: str = "UTC") -> Transaction:
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == user_id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = transaction_in.model_dump(exclude_unset=True)

    dt = update_data.get("timestamp")
    if dt:
        if dt.tzinfo is None:
            dt_utc = dt.replace(tzinfo=timezone.utc)
        else:
            dt_utc = dt.astimezone(timezone.utc)
        update_data["timestamp"] = dt_utc

        # Enforce onboarding date boundary
        from app.models.user import User
        from zoneinfo import ZoneInfo
        user_obj = db.query(User).filter(User.id == user_id).first()
        if user_obj and user_obj.created_at:
            try:
                user_local_created = user_obj.created_at.astimezone(ZoneInfo(tz_name))
            except Exception:
                user_local_created = user_obj.created_at
                
            try:
                tx_local = dt_utc.astimezone(ZoneInfo(tz_name))
            except Exception:
                tx_local = dt_utc
                
            if tx_local.date() < user_local_created.date():
                raise HTTPException(
                    status_code=400,
                    detail=f"Prior transaction blocked: You onboarded on {user_local_created.strftime('%d/%m/%Y')}. Transactions prior to your onboarding date are not accepted to preserve ledger and balance integrity."
                )

    new_source_id = update_data.get("source_id", tx.source_id)
    new_type = update_data.get("type", tx.type)
    new_amount = update_data.get("amount", tx.amount)

    old_source = db.query(PaymentSource).filter(PaymentSource.id == tx.source_id).first()
    if not old_source:
        raise HTTPException(status_code=404, detail="Original payment source not found")
    old_pool = _get_linked_pool(db, old_source)

    if new_source_id == tx.source_id:
        new_source = old_source
        new_pool = old_pool
    else:
        new_source = db.query(PaymentSource).filter(
            PaymentSource.id == new_source_id,
            PaymentSource.user_id == user_id
        ).first()
        if not new_source:
            raise HTTPException(status_code=404, detail="New payment source not found")
        new_pool = _get_linked_pool(db, new_source)

    if old_source.id == new_source.id:
        if old_source.type == "credit_card":
            expected_card = (old_source.card_outstanding or Decimal("0.00"))
            if tx.type == "expense": expected_card -= tx.amount
            elif tx.type in ("income", "repayment"): expected_card += tx.amount
            
            if new_type == "expense": expected_card += new_amount
            elif new_type in ("income", "repayment"): expected_card -= new_amount
            
            expected_pool = None
            if old_pool:
                expected_pool = (old_pool.utilized_limit or Decimal("0.00"))
                if tx.type == "expense": expected_pool -= tx.amount
                elif tx.type in ("income", "repayment"): expected_pool += tx.amount
                if new_type == "expense": expected_pool += new_amount
                elif new_type in ("income", "repayment"): expected_pool -= new_amount
            
            validate_balance_limits(old_source, expected_card_outstanding=expected_card, expected_pool_utilized=expected_pool, pool=old_pool)
        else:
            expected_bal = old_source.balance or Decimal("0.00")
            if tx.type == "expense": expected_bal += tx.amount
            elif tx.type in ("income", "repayment"): expected_bal -= tx.amount
            
            if new_type == "expense": expected_bal -= new_amount
            elif new_type in ("income", "repayment"): expected_bal += new_amount
            validate_balance_limits(old_source, expected_balance=expected_bal)
    else:
        # Check Old Revert
        if old_source.type == "credit_card":
            expected_old_card = (old_source.card_outstanding or Decimal("0.00"))
            if tx.type == "expense": expected_old_card -= tx.amount
            elif tx.type in ("income", "repayment"): expected_old_card += tx.amount
            
            expected_old_pool = None
            if old_pool:
                expected_old_pool = (old_pool.utilized_limit or Decimal("0.00"))
                if tx.type == "expense": expected_old_pool -= tx.amount
                elif tx.type in ("income", "repayment"): expected_old_pool += tx.amount
            validate_balance_limits(old_source, expected_card_outstanding=expected_old_card, expected_pool_utilized=expected_old_pool, pool=old_pool)
        else:
            expected_old_bal = old_source.balance or Decimal("0.00")
            if tx.type == "expense": expected_old_bal += tx.amount
            elif tx.type in ("income", "repayment"): expected_old_bal -= tx.amount
            validate_balance_limits(old_source, expected_balance=expected_old_bal)
            
        # Check New Apply
        if new_source.type == "credit_card":
            expected_new_card = (new_source.card_outstanding or Decimal("0.00"))
            if new_type == "expense": expected_new_card += new_amount
            elif new_type in ("income", "repayment"): expected_new_card -= new_amount
            
            expected_new_pool = None
            if new_pool:
                expected_new_pool = (new_pool.utilized_limit or Decimal("0.00"))
                if new_type == "expense": expected_new_pool += new_amount
                elif new_type in ("income", "repayment"): expected_new_pool -= new_amount
            validate_balance_limits(new_source, expected_card_outstanding=expected_new_card, expected_pool_utilized=expected_new_pool, pool=new_pool)
        else:
            expected_new_bal = new_source.balance or Decimal("0.00")
            if new_type == "expense": expected_new_bal -= new_amount
            elif new_type in ("income", "repayment"): expected_new_bal += new_amount
            validate_balance_limits(new_source, expected_balance=expected_new_bal)

    try:
        _apply_balance_delta(old_source, tx.type, tx.amount, sign=-1, pool=old_pool)
        if old_pool:
            _sync_pool_limits_tentative(db, old_pool.id)

        _apply_balance_delta(new_source, new_type, new_amount, sign=+1, pool=new_pool)
        if new_pool:
            _sync_pool_limits_tentative(db, new_pool.id)

        for field, value in update_data.items():
            setattr(tx, field, value)

        db.flush()
        affected_sids = list(set([old_source.id, new_source.id]))
        validate_historical_balances(db, affected_sids, user_id, tz_name=tz_name)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    db.refresh(tx)
    db.refresh(old_source)
    if old_pool: db.refresh(old_pool)
    if new_source != old_source: db.refresh(new_source)
    if new_pool and new_pool != old_pool: db.refresh(new_pool)
    return tx


def delete_transaction(db: Session, tx_id: str, user_id: str, tz_name: str = "UTC"):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == user_id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    source = db.query(PaymentSource).filter(PaymentSource.id == tx.source_id).first()
    pool = _get_linked_pool(db, source) if source else None

    if source:
        if source.type == "credit_card":
            expected_card = (source.card_outstanding or Decimal("0.00"))
            if tx.type == "expense": expected_card -= tx.amount
            elif tx.type in ("income", "repayment"): expected_card += tx.amount
            
            expected_pool = None
            if pool:
                expected_pool = (pool.utilized_limit or Decimal("0.00"))
                if tx.type == "expense": expected_pool -= tx.amount
                elif tx.type in ("income", "repayment"): expected_pool += tx.amount
            
            validate_balance_limits(source, expected_card_outstanding=expected_card, expected_pool_utilized=expected_pool, pool=pool)
        else:
            expected_bal = (source.balance or Decimal("0.00"))
            if tx.type == "expense": expected_bal += tx.amount
            elif tx.type in ("income", "repayment"): expected_bal -= tx.amount
            validate_balance_limits(source, expected_balance=expected_bal)

    try:
        if source:
            _apply_balance_delta(source, tx.type, tx.amount, sign=-1, pool=pool)
            if pool:
                _sync_pool_limits_tentative(db, pool.id)

        db.delete(tx)
        db.flush()

        if source:
            validate_historical_balances(db, [source.id], user_id, tz_name=tz_name)

        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    if source:
        db.refresh(source)
        if pool:
            pool = db.query(CreditPool).filter(CreditPool.id == pool.id).first()
            if pool:
                db.refresh(pool)



def check_and_trigger_notifications(db: Session, user_id: str, source: PaymentSource, pool: CreditPool = None):
    from app.models.notification import Notification
    
    if source.type == "credit_card":
        if pool:
            limit = pool.total_limit or Decimal("0")
            avail = pool.available_limit or Decimal("0")
        else:
            limit = source.card_ceiling_limit or source.credit_limit or Decimal("0")
            avail = source.available_limit or Decimal("0")
        
        if limit > 0 and avail < (limit * Decimal("0.1")):
            percent_used = ((limit - avail) / limit) * 100
            pool_name = pool.name if pool else source.name
            title = f"High Credit Utilization: {pool_name}"
            message = f"You have used {percent_used:.1f}% of your credit limit on {pool_name}. Available limit is low."
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
