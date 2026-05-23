from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.emi_obligation import EMIObligation
from app.schemas.emi_obligation import EMIObligationCreate, EMIObligationUpdate, EMIObligationResponse

router = APIRouter()

@router.get("/", response_model=List[EMIObligationResponse])
def get_emis(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    return db.query(EMIObligation).filter(EMIObligation.user_id == current_user.id).all()

@router.post("/", response_model=EMIObligationResponse)
def create_emi(
    emi_in: EMIObligationCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from app.services.demo_service import cleanup_demo_data_if_needed
    cleanup_demo_data_if_needed(db, current_user.id)
    
    emi_data = emi_in.model_dump()
    new_emi = EMIObligation(**emi_data, user_id=current_user.id)
    db.add(new_emi)
    db.commit()
    db.refresh(new_emi)
    return new_emi

@router.put("/{emi_id}", response_model=EMIObligationResponse)
def update_emi(
    emi_id: str,
    emi_in: EMIObligationUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    emi = db.query(EMIObligation).filter(
        EMIObligation.id == emi_id,
        EMIObligation.user_id == current_user.id
    ).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI Obligation not found")

    update_data = emi_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emi, field, value)

    db.commit()
    db.refresh(emi)
    return emi

@router.delete("/{emi_id}")
def delete_emi(
    emi_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    emi = db.query(EMIObligation).filter(
        EMIObligation.id == emi_id,
        EMIObligation.user_id == current_user.id
    ).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI Obligation not found")

    db.delete(emi)
    db.commit()
    return {"message": "EMI Obligation deleted successfully"}


@router.post("/{emi_id}/pay", response_model=EMIObligationResponse)
def pay_emi_installment(
    emi_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Record an EMI installment payment:
    - Increments paid_installments
    - Decrements principal_remaining by monthly_emi
    - Restores revolving credit based on credit_restoration_type
    - Auto-completes EMI when all installments are paid
    """
    from app.models.source import PaymentSource
    from app.services.transaction_service import sync_pool_limits
    from decimal import Decimal
    from datetime import datetime, timedelta

    emi = db.query(EMIObligation).filter(
        EMIObligation.id == emi_id,
        EMIObligation.user_id == current_user.id
    ).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI Obligation not found")

    if emi.emi_status == "completed":
        raise HTTPException(status_code=400, detail="This EMI is already fully paid.")

    # Increment paid installments
    emi.paid_installments = (emi.paid_installments or 0) + 1

    # Decrement principal remaining
    emi_amount = emi.monthly_emi or Decimal("0.00")
    emi.principal_remaining = max(
        Decimal("0.00"),
        (emi.principal_remaining or Decimal("0.00")) - emi_amount
    )

    # Check if EMI is now complete
    if emi.paid_installments >= emi.tenure_months:
        emi.emi_status = "completed"
        emi.principal_remaining = Decimal("0.00")

    # Advance next_due_date by 1 month
    if emi.next_due_date and emi.emi_status != "completed":
        try:
            current_due = datetime.strptime(emi.next_due_date, "%Y-%m-%d")
            next_month = current_due.month % 12 + 1
            next_year = current_due.year + (1 if current_due.month == 12 else 0)
            day = min(current_due.day, 28)
            emi.next_due_date = datetime(next_year, next_month, day).strftime("%Y-%m-%d")
        except Exception:
            pass

    # Credit restoration logic based on restoration type
    card = db.query(PaymentSource).filter(PaymentSource.id == emi.linked_card_id).first()
    if card and card.type == "credit_card":
        restoration_type = emi.credit_restoration_type or "monthly_restore"

        if restoration_type == "immediate_restore" or restoration_type == "monthly_restore":
            # Restore the EMI amount back to available limit
            card_limit = card.credit_limit or Decimal("0.00")
            new_available = min(card_limit, (card.available_limit or Decimal("0.00")) + emi_amount)
            card.available_limit = new_available

        # 'deferred_restore' does nothing until EMI completes
        if restoration_type == "deferred_restore" and emi.emi_status == "completed":
            card_limit = card.credit_limit or Decimal("0.00")
            new_available = min(card_limit, (card.available_limit or Decimal("0.00")) + (emi.principal_amount or Decimal("0.00")))
            card.available_limit = new_available

        db.commit()

        # Re-sync pool if linked
        if card.credit_pool_id:
            sync_pool_limits(db, card.credit_pool_id)
    else:
        db.commit()

    db.refresh(emi)
    return emi

