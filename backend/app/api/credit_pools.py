from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.credit_pool import CreditPool
from app.models.source import PaymentSource
from app.schemas.credit_pool import CreditPoolCreate, CreditPoolUpdate, CreditPoolResponse

router = APIRouter()


@router.get("/", response_model=List[CreditPoolResponse])
def get_credit_pools(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    pools = db.query(CreditPool).filter(
        CreditPool.user_id == current_user.id,
        CreditPool.pool_type != "implicit"
    ).all()
    from app.services.transaction_service import sync_pool_limits
    for pool in pools:
        sync_pool_limits(db, pool.id)
    return pools


@router.get("/{pool_id}", response_model=CreditPoolResponse)
def get_credit_pool(
    pool_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    pool = db.query(CreditPool).filter(
        CreditPool.id == pool_id,
        CreditPool.user_id == current_user.id
    ).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Credit pool not found")
    from app.services.transaction_service import sync_pool_limits
    sync_pool_limits(db, pool.id)
    return pool


@router.post("/", response_model=CreditPoolResponse)
def create_credit_pool(
    pool_in: CreditPoolCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    pool_data = pool_in.model_dump()

    # Phase C: Allow onboarding with outstanding balances
    utilized = pool_data.get("utilized_limit") or Decimal("0.00")
    pool_data["utilized_limit"] = utilized
    pool_data["available_limit"] = Decimal(str(pool_data["total_limit"])) - utilized

    new_pool = CreditPool(**pool_data, user_id=current_user.id)
    db.add(new_pool)
    db.commit()
    db.refresh(new_pool)
    from app.services.transaction_service import sync_pool_limits
    sync_pool_limits(db, new_pool.id)
    return new_pool


@router.put("/{pool_id}", response_model=CreditPoolResponse)
def update_credit_pool(
    pool_id: str,
    pool_in: CreditPoolUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    pool = db.query(CreditPool).filter(
        CreditPool.id == pool_id,
        CreditPool.user_id == current_user.id
    ).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Credit pool not found")

    update_data = pool_in.model_dump(exclude_unset=True)

    # Phase C: Recalculate available_limit if total or utilized changes
    if "total_limit" in update_data or "utilized_limit" in update_data:
        new_total = Decimal(str(update_data.get("total_limit", pool.total_limit or Decimal("0.00"))))
        new_utilized = Decimal(str(update_data.get("utilized_limit", pool.utilized_limit or Decimal("0.00"))))
        update_data["available_limit"] = new_total - new_utilized

    for field, value in update_data.items():
        setattr(pool, field, value)

    db.commit()
    db.refresh(pool)
    from app.services.transaction_service import sync_pool_limits
    sync_pool_limits(db, pool.id)
    return pool


@router.delete("/{pool_id}")
def delete_credit_pool(
    pool_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    pool = db.query(CreditPool).filter(
        CreditPool.id == pool_id,
        CreditPool.user_id == current_user.id
    ).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Credit pool not found")

    # Phase E: Convert to implicit shared group instead of hard deleting
    pool.pool_type = "implicit"

    linked_cards = db.query(PaymentSource).filter(
        PaymentSource.credit_pool_id == pool_id,
        PaymentSource.user_id == current_user.id
    ).all()

    for card in linked_cards:
        # Keep credit_pool_id intact, just silently group them under the implicit pool
        card.shared_group_id = pool.id

    db.commit()
    return {"message": "Credit pool converted to implicit shared group. Shared exposure preserved."}
