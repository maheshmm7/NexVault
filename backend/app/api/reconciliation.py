from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.api import deps
from app.models.user import User
from app.models.source import PaymentSource
from app.models.credit_pool import CreditPool
from app.models.transaction import Transaction
from app.models.reconciliation import ReconciliationLog

router = APIRouter()


class ReconciliationRequest(BaseModel):
    source_id: Optional[str] = None
    pool_id: Optional[str] = None
    new_value: Decimal
    reason: str


class ReconciliationLogResponse(BaseModel):
    id: str
    user_id: str
    source_id: Optional[str] = None
    pool_id: Optional[str] = None
    previous_value: float
    new_value: float
    reason: str
    timestamp: datetime

    class Config:
        from_attributes = True


@router.get("/logs", response_model=List[ReconciliationLogResponse])
def get_reconciliation_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Retrieve all audit-safe reconciliation adjustment logs for the user."""
    logs = db.query(ReconciliationLog).filter(
        ReconciliationLog.user_id == current_user.id
    ).order_by(ReconciliationLog.timestamp.desc()).all()
    return logs


@router.post("/adjust", response_model=ReconciliationLogResponse)
def reconcile_balance(
    req: ReconciliationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Reconciliation Mode: adjust a card or pool's utilized balance with an immutable audit log.
    Only allowed when transactions exist (otherwise direct editing is fine).
    Enforces hard invariants before committing.
    """
    if not req.source_id and not req.pool_id:
        raise HTTPException(status_code=400, detail="Must specify either source_id or pool_id.")

    if not req.reason or len(req.reason.strip()) < 3:
        raise HTTPException(status_code=400, detail="Reconciliation reason is required (min 3 chars).")

    if req.source_id:
        source = db.query(PaymentSource).filter(
            PaymentSource.id == req.source_id,
            PaymentSource.user_id == current_user.id
        ).first()
        if not source:
            raise HTTPException(status_code=404, detail="Payment source not found.")
        if source.type != "credit_card":
            raise HTTPException(status_code=400, detail="Reconciliation only applies to credit cards.")

        # Check if transactions exist — if not, direct editing is allowed (no reconciliation needed)
        has_txns = db.query(Transaction).filter(
            Transaction.source_id == req.source_id,
            Transaction.user_id == current_user.id
        ).first()
        if not has_txns:
            raise HTTPException(
                status_code=400,
                detail="No transactions exist. Use direct editing instead of reconciliation mode."
            )

        credit_limit = source.credit_limit or Decimal("0.00")
        previous_value = credit_limit - (source.available_limit or Decimal("0.00"))
        new_utilized = req.new_value
        new_available = credit_limit - new_utilized

        # Enforce hard invariants
        if new_available < 0 or new_available > credit_limit or new_utilized < 0 or new_utilized > credit_limit:
            raise HTTPException(status_code=400, detail="Reconciliation violates card credit limit invariants.")

        source.available_limit = new_available

        log = ReconciliationLog(
            user_id=current_user.id,
            source_id=req.source_id,
            previous_value=previous_value,
            new_value=new_utilized,
            reason=req.reason.strip()
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        # Re-sync pool if linked
        if source.credit_pool_id:
            from app.services.transaction_service import sync_pool_limits
            sync_pool_limits(db, source.credit_pool_id)

        return log

    elif req.pool_id:
        pool = db.query(CreditPool).filter(
            CreditPool.id == req.pool_id,
            CreditPool.user_id == current_user.id
        ).first()
        if not pool:
            raise HTTPException(status_code=404, detail="Credit pool not found.")

        previous_value = pool.utilized_limit or Decimal("0.00")

        raise HTTPException(
            status_code=400,
            detail="Pool balances are derived from linked card states. Reconcile individual cards instead."
        )
