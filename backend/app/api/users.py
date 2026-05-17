from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserSettings
from app.models.source import PaymentSource
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.coupon import Coupon
from datetime import datetime, timedelta
import json

router = APIRouter()

DEFAULT_CATEGORIES = [
    {"name": "Food & Dining",   "type": "expense", "color": "#EF4444", "icon": "utensils"},
    {"name": "Housing",         "type": "expense", "color": "#3B82F6", "icon": "home"},
    {"name": "Transport",       "type": "expense", "color": "#F59E0B", "icon": "car"},
    {"name": "Shopping",        "type": "expense", "color": "#8B5CF6", "icon": "bag"},
    {"name": "Entertainment",   "type": "expense", "color": "#EC4899", "icon": "film"},
    {"name": "Health",          "type": "expense", "color": "#10B981", "icon": "heart"},
    {"name": "Salary",          "type": "income",  "color": "#22C55E", "icon": "briefcase"},
    {"name": "Others",          "type": "expense", "color": "#6B7280", "icon": "circle"},
]


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_obj = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user_obj)
    db.flush()  # get user_obj.id

    # Seed default categories for every new user
    for cat_data in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_obj.id, **cat_data))

    db.commit()
    db.refresh(user_obj)
    return user_obj


@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(deps.get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if user_in.email and user_in.email != current_user.email:
        email_exists = db.query(User).filter(User.email == user_in.email).first()
        if email_exists:
            raise HTTPException(status_code=400, detail="Email is already registered.")
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.display_name is not None:
        current_user.display_name = user_in.display_name
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url

    if user_in.new_password:
        if not user_in.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password.")
        if not verify_password(user_in.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
        current_user.hashed_password = get_password_hash(user_in.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/seed-demo-data")
def seed_demo_data(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Idempotently seeds demo data. Rejected if user already has real payment sources."""
    from app.services.demo_service import cleanup_demo_data_if_needed

    existing_sources = db.query(PaymentSource).filter(
        PaymentSource.user_id == current_user.id
    ).first()

    if existing_sources:
        raise HTTPException(
            status_code=400,
            detail="Demo data already exists. Cannot seed again."
        )

    # Reuse existing categories (created on signup)
    def get_cat(name: str):
        return db.query(Category).filter(
            Category.user_id == current_user.id,
            Category.name == name,
        ).first()

    cat_food    = get_cat("Food & Dining")
    cat_housing = get_cat("Housing")
    cat_salary  = get_cat("Salary")
    cat_shopping = get_cat("Shopping")

    # If categories don't exist (edge case), create them
    if not cat_salary:
        cat_salary = Category(user_id=current_user.id, name="Salary", type="income", color="#22C55E", icon="briefcase")
        db.add(cat_salary)
    if not cat_food:
        cat_food = Category(user_id=current_user.id, name="Food & Dining", type="expense", color="#EF4444", icon="utensils")
        db.add(cat_food)
    if not cat_housing:
        cat_housing = Category(user_id=current_user.id, name="Housing", type="expense", color="#3B82F6", icon="home")
        db.add(cat_housing)
    if not cat_shopping:
        cat_shopping = Category(user_id=current_user.id, name="Shopping", type="expense", color="#8B5CF6", icon="bag")
        db.add(cat_shopping)

    db.flush()

    # Payment sources
    src_checking = PaymentSource(
        user_id=current_user.id, name="Checking Account",
        type="bank", balance=5200.00,
        bank_name="HDFC Bank", account_subtype="savings", account_number_last4="4821",
        is_demo=True
    )
    src_wallet = PaymentSource(
        user_id=current_user.id, name="PhonePe Wallet",
        type="wallet", balance=840.00,
        upi_id="demo@phonepe",
        is_demo=True
    )
    src_card = PaymentSource(
        user_id=current_user.id, name="Rewards Credit Card",
        type="credit_card",
        credit_limit=100000.00, available_limit=72500.00,
        balance=0.00, network="visa", account_number_last4="1234",
        is_demo=True
    )
    db.add_all([src_checking, src_wallet, src_card])
    db.flush()

    # Transactions
    now = datetime.now()
    transactions = [
        Transaction(user_id=current_user.id, source_id=src_checking.id, category_id=cat_salary.id,
                    amount=45000.00, type="income",  notes="Monthly Salary",     timestamp=now - timedelta(days=20), is_demo=True),
        Transaction(user_id=current_user.id, source_id=src_checking.id, category_id=cat_housing.id,
                    amount=12000.00, type="expense", notes="Rent — May 2026",    timestamp=now - timedelta(days=18), is_demo=True),
        Transaction(user_id=current_user.id, source_id=src_card.id,     category_id=cat_food.id,
                    amount=1850.00,  type="expense", notes="BigBasket Grocery",  timestamp=now - timedelta(days=10), is_demo=True),
        Transaction(user_id=current_user.id, source_id=src_card.id,     category_id=cat_food.id,
                    amount=320.00,   type="expense", notes="Zomato",             timestamp=now - timedelta(days=6), is_demo=True),
        Transaction(user_id=current_user.id, source_id=src_card.id,     category_id=cat_shopping.id,
                    amount=4599.00,  type="expense", notes="Amazon — Headphones",timestamp=now - timedelta(days=3), is_demo=True),
        Transaction(user_id=current_user.id, source_id=src_wallet.id,   category_id=cat_food.id,
                    amount=210.00,   type="expense", notes="Swiggy",             timestamp=now - timedelta(days=1), is_demo=True),
    ]
    db.add_all(transactions)

    # Coupons
    coupons = [
        Coupon(user_id=current_user.id, title="Swiggy 30% Off", code="SWIGGY30",
               category="Food", expiry_date=now + timedelta(days=10), status="active", is_demo=True),
        Coupon(user_id=current_user.id, title="Amazon Gift Card", code="AMZN-GIFT-50",
               pin="8821", category="Shopping", expiry_date=now + timedelta(days=30), status="active", is_demo=True),
        Coupon(user_id=current_user.id, title="Uber Eats ₹100 Off", code="EATS100",
               category="Food", expiry_date=now - timedelta(days=3), status="expired", is_demo=True),
    ]
    db.add_all(coupons)

    db.commit()
    return {"message": "Demo data seeded successfully"}


# ─── Settings Persistence ─────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "currency": "INR",
    "theme": "dark",
    "notifications": {
        "billReminders": True,
        "couponExpiry": True,
        "monthlySummaries": True,
        "creditUtilization": True,
    },
    "couponPreferences": {
        "expiryReminderDays": 3,
        "autoHideExpired": True,
        "autoMarkExpired": True,
    },
    "dateTimePreferences": {
        "dateFormat": "dd/MM/yyyy",
        "timeFormat": "12h",
        "weekStart": "Monday",
    },
}


@router.get("/me/settings", response_model=dict)
def get_user_settings(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Return the current user's saved settings, falling back to defaults."""
    if current_user.settings_json:
        try:
            stored = json.loads(current_user.settings_json)
            # Merge with defaults so new keys are always present
            merged = {**DEFAULT_SETTINGS, **stored}
            return merged
        except (json.JSONDecodeError, TypeError):
            pass
    return DEFAULT_SETTINGS


@router.put("/me/settings", response_model=dict)
def update_user_settings(
    settings_in: UserSettings,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Persist the user's settings. Merges with existing stored settings."""
    # Load existing
    existing: dict = DEFAULT_SETTINGS.copy()
    if current_user.settings_json:
        try:
            existing.update(json.loads(current_user.settings_json))
        except (json.JSONDecodeError, TypeError):
            pass

    # Merge incoming (model_dump excludes unset keys when exclude_unset=True)
    incoming = settings_in.model_dump(exclude_unset=True)
    existing.update(incoming)

    current_user.settings_json = json.dumps(existing)
    db.commit()
    return existing
