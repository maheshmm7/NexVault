from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.source import PaymentSource
from app.models.credit_pool import CreditPool
from app.schemas.source import PaymentSourceCreate, PaymentSourceUpdate, PaymentSourceResponse

router = APIRouter()


def _derive_card_limits(src: PaymentSource, db: Session):
    if src.type != "credit_card":
        return
    
    ceiling = src.card_ceiling_limit if src.card_ceiling_limit is not None else (src.credit_limit or Decimal("0.00"))
    outstanding = src.card_outstanding or Decimal("0.00")
    card_avail = ceiling - outstanding
    
    pool = None
    if src.credit_pool_id:
        pool = db.query(CreditPool).filter(CreditPool.id == src.credit_pool_id).first()
    elif src.shared_group_id:
        pool = db.query(CreditPool).filter(CreditPool.id == src.shared_group_id, CreditPool.pool_type == "implicit").first()
        
    if pool:
        pool_avail = pool.available_limit or Decimal("0.00")
        derived_avail = min(card_avail, pool_avail)
        src.available_limit = max(Decimal("0.00"), derived_avail)
    else:
        src.available_limit = max(Decimal("0.00"), card_avail)
        
    src.actual_spendable = src.available_limit


@router.get("/", response_model=List[PaymentSourceResponse])
def get_sources(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    sources = db.query(PaymentSource).filter(PaymentSource.user_id == current_user.id).all()
    
    for src in sources:
        _derive_card_limits(src, db)

    return sources


@router.post("/", response_model=PaymentSourceResponse)
def create_source(
    source_in: PaymentSourceCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from app.services.demo_service import cleanup_demo_data_if_needed
    cleanup_demo_data_if_needed(db, current_user.id)

    source_data = source_in.model_dump()

    # Validate linked pool if provided
    if source_data.get("credit_pool_id"):
        pool = db.query(CreditPool).filter(
            CreditPool.id == source_data["credit_pool_id"],
            CreditPool.user_id == current_user.id
        ).first()
        if not pool:
            raise HTTPException(status_code=404, detail="Credit pool not found")

    if source_data["type"] == "credit_card":
        # Backwards compatibility: treat balance as card_outstanding for credit cards
        if "balance" in source_data and source_data.get("card_outstanding") is None:
            source_data["card_outstanding"] = source_data["balance"]

        # Validate that credit_limit is greater than zero to prevent operational lockouts
        credit_limit = source_data.get("credit_limit")
        if credit_limit is None or Decimal(str(credit_limit)) <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="A usable credit limit greater than zero is required to set up a credit card."
            )

        # Apply standard credit card limit logic to both independent and linked cards
        card_ceiling = source_data.get("card_ceiling_limit")
        if card_ceiling is None or Decimal(str(card_ceiling)) <= Decimal("0.00"):
            card_ceiling = credit_limit
            source_data["card_ceiling_limit"] = card_ceiling

        available_limit = source_data.get("available_limit")
        if available_limit is None:
            outstanding = source_data.get("card_outstanding") or Decimal("0.00")
            source_data["available_limit"] = Decimal(str(card_ceiling)) - Decimal(str(outstanding))

    new_source = PaymentSource(
        **source_data,
        user_id=current_user.id
    )

    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    
    if new_source.credit_pool_id:
        from app.services.transaction_service import sync_pool_limits
        sync_pool_limits(db, new_source.credit_pool_id)

    _derive_card_limits(new_source, db)
        
    return new_source


@router.put("/{source_id}", response_model=PaymentSourceResponse)
def update_source(
    source_id: str,
    source_in: PaymentSourceUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):

    source = db.query(PaymentSource).filter(
        PaymentSource.id == source_id,
        PaymentSource.user_id == current_user.id
    ).first()

    if not source:
        raise HTTPException(
            status_code=404,
            detail="Payment source not found"
        )

    update_data = source_in.model_dump(exclude_unset=True)

    # Handle pool linking/unlinking
    if "credit_pool_id" in update_data:
        new_pool_id = update_data["credit_pool_id"]
        if new_pool_id:
            # Linking to a pool — validate it exists
            pool = db.query(CreditPool).filter(
                CreditPool.id == new_pool_id,
                CreditPool.user_id == current_user.id
            ).first()
            if not pool:
                raise HTTPException(status_code=404, detail="Credit pool not found")
        else:
            # Unlinking from pool - card keeps its own ceiling and available limit
            pass

    # Ensure available_limit recalculation matches card_ceiling_limit
    if source.type == "credit_card":
        if "balance" in update_data and "card_outstanding" not in update_data:
            update_data["card_outstanding"] = update_data["balance"]

        new_ceiling = update_data.get("card_ceiling_limit")
        new_credit = update_data.get("credit_limit")
        outstanding = update_data.get("card_outstanding", source.card_outstanding or Decimal("0.00"))

        if new_credit is not None and Decimal(str(new_credit)) <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Credit limit must be greater than zero for credit cards."
            )

        if new_ceiling is not None and Decimal(str(new_ceiling)) <= Decimal("0.00"):
            new_ceiling = new_credit if new_credit is not None else source.credit_limit
            update_data["card_ceiling_limit"] = new_ceiling
        
        if new_ceiling is not None:
            update_data["available_limit"] = Decimal(str(new_ceiling)) - Decimal(str(outstanding))
        elif new_credit is not None and source.card_ceiling_limit is None:
            update_data["available_limit"] = Decimal(str(new_credit)) - Decimal(str(outstanding))

    old_pool_id = source.credit_pool_id

    for field, value in update_data.items():
        setattr(source, field, value)

    db.commit()
    db.refresh(source)

    from app.services.transaction_service import sync_pool_limits
    if old_pool_id:
        sync_pool_limits(db, old_pool_id)
    if source.credit_pool_id and source.credit_pool_id != old_pool_id:
        sync_pool_limits(db, source.credit_pool_id)

    _derive_card_limits(source, db)

    return source


@router.delete("/{source_id}")
def delete_source(source_id: str, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    source = db.query(PaymentSource).filter(PaymentSource.id == source_id, PaymentSource.user_id == current_user.id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Payment source not found")
    
    pool_id = source.credit_pool_id
    
    # Cascade delete all transactions associated with this source
    from app.models.transaction import Transaction
    db.query(Transaction).filter(Transaction.source_id == source_id, Transaction.user_id == current_user.id).delete(synchronize_session=False)

    db.delete(source)
    db.commit()

    if pool_id:
        from app.services.transaction_service import sync_pool_limits
        sync_pool_limits(db, pool_id)

    return {"message": "Payment source deleted successfully"}
