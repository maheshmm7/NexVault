from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponResponse

router = APIRouter()

@router.get("/", response_model=List[CouponResponse])
def get_coupons(status: str = None, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    query = db.query(Coupon).filter(Coupon.user_id == current_user.id)
    if status:
        query = query.filter(Coupon.status == status)
    return query.order_by(Coupon.created_at.desc()).all()

@router.post("/", response_model=CouponResponse)
def create_coupon(coupon_in: CouponCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    new_coupon = Coupon(**coupon_in.model_dump(), user_id=current_user.id)
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon

@router.put("/{coupon_id}", response_model=CouponResponse)
def update_coupon(coupon_id: str, coupon_in: CouponUpdate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id, Coupon.user_id == current_user.id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    update_data = coupon_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(coupon, field, value)
        
    db.commit()
    db.refresh(coupon)
    return coupon

@router.delete("/{coupon_id}")
def delete_coupon(coupon_id: str, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id, Coupon.user_id == current_user.id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted successfully"}
