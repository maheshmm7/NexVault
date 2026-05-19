from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services import transaction_service

router = APIRouter()

@router.get("/", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(
            Transaction.timestamp.desc(),
            Transaction.created_at.desc(),
            Transaction.id.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction_in: TransactionCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return transaction_service.create_transaction(
        db=db,
        transaction_in=transaction_in,
        user_id=current_user.id
    )

@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: str,
    transaction_in: TransactionUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return transaction_service.update_transaction(
        db=db,
        tx_id=tx_id,
        transaction_in=transaction_in,
        user_id=current_user.id
    )

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    transaction_service.delete_transaction(
        db=db,
        tx_id=tx_id,
        user_id=current_user.id
    )
    return {"message": "Transaction deleted successfully"}
