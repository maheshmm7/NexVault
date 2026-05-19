from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    return db.query(Category).filter(Category.user_id == current_user.id).all()

@router.post("/", response_model=CategoryResponse)
def create_category(category_in: CategoryCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    new_cat = Category(**category_in.model_dump(), user_id=current_user.id)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: str, category_in: CategoryUpdate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cat, field, value)
        
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/{cat_id}")
def delete_category(cat_id: str, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if cat.name.lower() == "others":
        raise HTTPException(status_code=400, detail="Cannot delete default 'Others' category")

    # Find or create a default 'Others' category of the same type for this user
    default_cat = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.name == "Others",
        Category.type == cat.type
    ).first()

    if not default_cat:
        default_cat = Category(
            name="Others",
            type=cat.type,
            color="#64748b",
            icon="archive",
            is_custom=False,
            user_id=current_user.id
        )
        db.add(default_cat)
        db.flush()

    # Reassign transactions to default_cat
    from app.models.transaction import Transaction
    db.query(Transaction).filter(
        Transaction.category_id == cat_id,
        Transaction.user_id == current_user.id
    ).update({Transaction.category_id: default_cat.id}, synchronize_session=False)

    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}
