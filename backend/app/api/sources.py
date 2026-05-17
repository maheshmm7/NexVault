from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.source import PaymentSource
from app.schemas.source import PaymentSourceCreate, PaymentSourceUpdate, PaymentSourceResponse

router = APIRouter()

@router.get("/", response_model=List[PaymentSourceResponse])
def get_sources(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    return db.query(PaymentSource).filter(PaymentSource.user_id == current_user.id).all()

@router.post("/", response_model=PaymentSourceResponse)
def create_source(
    source_in: PaymentSourceCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):

    source_data = source_in.model_dump()

    # Smart Credit Card Logic
    if source_data["type"] == "credit_card":

        credit_limit = source_data.get("credit_limit") or Decimal("0.00")

        available_limit = source_data.get("available_limit")

        # If user doesn't enter available limit,
        # assume full limit is available
        if available_limit is None:
            source_data["available_limit"] = credit_limit

    new_source = PaymentSource(
        **source_data,
        user_id=current_user.id
    )

    db.add(new_source)

    db.commit()

    db.refresh(new_source)

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

    # Smart Credit Card Update Logic
    if source.type == "credit_card":

        if (
            "credit_limit" in update_data and
            "available_limit" not in update_data
        ):

            old_limit = source.credit_limit or Decimal("0.00")

            old_available = source.available_limit or Decimal("0.00")

            difference = Decimal(update_data["credit_limit"]) - old_limit

            update_data["available_limit"] = (
                old_available + difference
            )

    for field, value in update_data.items():
        setattr(source, field, value)

    db.commit()

    db.refresh(source)

    return source

@router.delete("/{source_id}")
def delete_source(source_id: str, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    source = db.query(PaymentSource).filter(PaymentSource.id == source_id, PaymentSource.user_id == current_user.id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Payment source not found")
    
    db.delete(source)
    db.commit()
    return {"message": "Payment source deleted successfully"}
