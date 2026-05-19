from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.api import deps
from app.core.security import get_password_hash, verify_password, validate_password_strength
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserSettings, DeleteAccountRequest, UserSignupResponse, VerifyEmailRequest
from app.models.source import PaymentSource
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.coupon import Coupon
from app.models.session import UserSession
from app.models.notification import Notification
from app.core.rate_limit import limiter
from app.core.config import settings
from datetime import datetime, timedelta, timezone
from jose import jwt
import json
import io
import csv
import zipfile
import secrets
import string
import hashlib

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


def generate_recovery_code() -> str:
    def group(length=4):
        chars = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(chars) for _ in range(length))
    return f"NVX-{group()}-{group()}-{group()}"


def send_verification_email(email: str, code: str):
    email_html = f"""
    <div style="font-family: 'Outfit', 'Inter', sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.05em;">NEXVAULT</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">Secure Wealth Infrastructure</p>
      </div>
      <div style="background-color: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px; text-align: center;">Verify Your Email Address</h2>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">Hello,</p>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">Thank you for registering an account on NEXVAULT. Please use the following verification code to verify your email address. This code is valid for 15 minutes:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-family: monospace; background-color: #0f172a; color: #6366f1; padding: 12px 24px; font-size: 28px; font-weight: 700; border-radius: 8px; border: 1px solid #334155; letter-spacing: 0.25em; display: inline-block;">{code}</span>
        </div>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 14px; text-align: center;">
          If you did not create a NEXVAULT account, please ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
        <p>© 2026 NEXVAULT. All rights reserved.</p>
      </div>
    </div>
    """
    from app.utils.email import send_smtp_email
    import logging
    logger = logging.getLogger("app.api.users")
    try:
        send_smtp_email(
            to_email=email,
            subject="Verify Your NEXVAULT Account",
            html_content=email_html
        )
    except Exception as e:
        logger.error(f"SMTP delivery failed during onboarding email verification: {str(e)}")
        if not settings.COOKIE_SECURE:
            print("[DEVELOPMENT ONLY FALLBACK] SMTP failed. Printing verification code in console:")
            print("VERIFICATION CODE FOR USER:", email, "IS:", code)

@router.post("/signup", response_model=UserSignupResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    try:
        validate_password_strength(user_in.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    recovery_code = generate_recovery_code()
    
    # Generate 6-digit email verification code
    v_code = "".join(secrets.choice(string.digits) for _ in range(6))
    v_code_hash = hashlib.sha256(v_code.encode()).hexdigest()
    v_code_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    user_obj = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        recovery_code_hash=get_password_hash(recovery_code),
        is_verified=False,
        verification_code_hash=v_code_hash,
        verification_code_expires_at=v_code_expires
    )
    db.add(user_obj)
    db.flush()  # get user_obj.id

    # Seed default categories for every new user
    for cat_data in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_obj.id, **cat_data))

    db.commit()
    db.refresh(user_obj)
    
    # Send verification email
    send_verification_email(user_obj.email, v_code)
    
    # Attach dynamic field for single-use serialization
    user_obj.recovery_code = recovery_code
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
        try:
            validate_password_strength(user_in.new_password)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
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


@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_user_account(
    req: DeleteAccountRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Permanently deletes the currently authenticated user's account and all linked records.
    Verifies current password before proceeding.
    """
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Account deletion aborted."
        )

    try:
        # Cascade-delete in priority order to prevent foreign key constraint issues
        db.query(Transaction).filter(Transaction.user_id == current_user.id).delete()
        db.query(PaymentSource).filter(PaymentSource.user_id == current_user.id).delete()
        db.query(Category).filter(Category.user_id == current_user.id).delete()
        db.query(Coupon).filter(Coupon.user_id == current_user.id).delete()
        db.delete(current_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account due to a database error: {str(e)}"
        )

    return {"message": "Account successfully deleted."}


@router.post("/me/clear-data", status_code=status.HTTP_200_OK)
def clear_financial_data(
    req: DeleteAccountRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Clears all financial data (transactions, payment sources, coupons) for the current user.
    Preserves account, settings, and custom categories.
    """
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Data clearing aborted."
        )

    try:
        # Delete only transaction, payment source, and coupon data
        db.query(Transaction).filter(Transaction.user_id == current_user.id).delete()
        db.query(PaymentSource).filter(PaymentSource.user_id == current_user.id).delete()
        db.query(Coupon).filter(Coupon.user_id == current_user.id).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear financial data due to a database error: {str(e)}"
        )

    return {"message": "All financial data has been cleared."}


@router.get("/me/export")
def export_user_data(
    format: str = "json",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Exports the current authenticated user's complete data in either JSON or ZIP-compressed CSV formats.
    Safety: Never exposes passwords, password hashes, or security metadata.
    """
    # Fetch all user data
    sources = db.query(PaymentSource).filter(PaymentSource.user_id == current_user.id).all()
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    coupons = db.query(Coupon).filter(Coupon.user_id == current_user.id).all()

    # Load settings JSON safely
    settings_data = {}
    if current_user.settings_json:
        try:
            settings_data = json.loads(current_user.settings_json)
        except Exception:
            pass

    # Build safe user profile metadata
    profile = {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

    if format.lower() == "json":
        # Package and sanitize data
        export_data = {
            "profile": profile,
            "settings": settings_data,
            "accounts": [
                {
                    "name": s.name,
                    "type": s.type,
                    "balance": float(s.balance),
                    "credit_limit": float(s.credit_limit) if s.credit_limit is not None else None,
                    "available_limit": float(s.available_limit) if s.available_limit is not None else None,
                    "billing_date": s.billing_date,
                    "due_date": s.due_date,
                    "network": s.network,
                    "account_number_last4": s.account_number_last4,
                    "bank_name": s.bank_name,
                    "account_subtype": s.account_subtype,
                    "ifsc_code": s.ifsc_code,
                    "upi_id": s.upi_id,
                    "linked_bank_name": s.linked_bank_name,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in sources
            ],
            "categories": [
                {
                    "name": c.name,
                    "type": c.type,
                    "color": c.color,
                    "icon": c.icon,
                }
                for c in categories
            ],
            "transactions": [
                {
                    "amount": float(t.amount),
                    "type": t.type,
                    "notes": t.notes,
                    "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                    "is_recurring": t.is_recurring,
                    "recurring_interval": t.recurring_interval,
                }
                for t in transactions
            ],
            "coupons": [
                {
                    "name": cp.name,
                    "code": cp.code,
                    "discount": float(cp.discount),
                    "expiry_date": cp.expiry_date,
                    "is_used": cp.is_used,
                    "created_at": cp.created_at.isoformat() if cp.created_at else None,
                }
                for cp in coupons
            ]
        }
        
        headers = {
            "Content-Disposition": 'attachment; filename="nexvault-data-export.json"'
        }
        return JSONResponse(content=export_data, headers=headers)

    elif format.lower() == "csv":
        # Create CSV files inside an in-memory ZIP archive
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            
            # Helper to write list of dicts to CSV string
            def dicts_to_csv(data_list, headers):
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(headers)
                for item in data_list:
                    writer.writerow([item.get(h) for h in headers])
                return output.getvalue()

            # 1. Profile CSV
            profile_csv = dicts_to_csv([profile], ["email", "full_name", "display_name", "created_at"])
            zip_file.writestr("profile.csv", profile_csv)

            # 2. Accounts CSV
            accounts_data = [
                {
                    "name": s.name,
                    "type": s.type,
                    "balance": float(s.balance),
                    "credit_limit": float(s.credit_limit) if s.credit_limit is not None else "",
                    "available_limit": float(s.available_limit) if s.available_limit is not None else "",
                    "billing_date": s.billing_date or "",
                    "due_date": s.due_date or "",
                    "network": s.network or "",
                    "account_number_last4": s.account_number_last4 or "",
                    "bank_name": s.bank_name or "",
                    "account_subtype": s.account_subtype or "",
                    "upi_id": s.upi_id or "",
                    "created_at": s.created_at.isoformat() if s.created_at else "",
                }
                for s in sources
            ]
            accounts_csv = dicts_to_csv(
                accounts_data, 
                ["name", "type", "balance", "credit_limit", "available_limit", "billing_date", "due_date", "network", "account_number_last4", "bank_name", "account_subtype", "upi_id", "created_at"]
            )
            zip_file.writestr("accounts.csv", accounts_csv)

            # 3. Categories CSV
            categories_data = [
                {"name": c.name, "type": c.type, "color": c.color, "icon": c.icon}
                for c in categories
            ]
            categories_csv = dicts_to_csv(categories_data, ["name", "type", "color", "icon"])
            zip_file.writestr("categories.csv", categories_csv)

            # 4. Transactions CSV
            transactions_data = [
                {
                    "amount": float(t.amount),
                    "type": t.type,
                    "notes": t.notes or "",
                    "timestamp": t.timestamp.isoformat() if t.timestamp else "",
                    "is_recurring": t.is_recurring,
                    "recurring_interval": t.recurring_interval or "",
                }
                for t in transactions
            ]
            transactions_csv = dicts_to_csv(transactions_data, ["amount", "type", "notes", "timestamp", "is_recurring", "recurring_interval"])
            zip_file.writestr("transactions.csv", transactions_csv)

            # 5. Coupons CSV
            coupons_data = [
                {
                    "name": cp.name,
                    "code": cp.code,
                    "discount": float(cp.discount),
                    "expiry_date": cp.expiry_date or "",
                    "is_used": cp.is_used,
                    "created_at": cp.created_at.isoformat() if cp.created_at else "",
                }
                for cp in coupons
            ]
            coupons_csv = dicts_to_csv(coupons_data, ["name", "code", "discount", "expiry_date", "is_used", "created_at"])
            zip_file.writestr("coupons.csv", coupons_csv)

        zip_buffer.seek(0)
        
        headers = {
            "Content-Disposition": 'attachment; filename="nexvault-data-export.zip"'
        }
        return StreamingResponse(
            io.BytesIO(zip_buffer.getvalue()), 
            media_type="application/zip", 
            headers=headers
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format. Supported formats are 'json' and 'csv'."
        )


@router.get("/me/sessions")
def get_user_sessions(
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    current_jti = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            current_jti = payload.get("jti")
        except Exception:
            pass

    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).order_by(UserSession.last_active_at.desc()).all()

    return [
        {
            "id": s.id,
            "ip_address": s.ip_address,
            "device_name": s.device_name,
            "os_name": s.os_name,
            "browser_name": s.browser_name,
            "last_active_at": s.last_active_at,
            "created_at": s.created_at,
            "is_current": s.session_token == current_jti
        }
        for s in sessions
    ]


@router.delete("/me/sessions/{session_id}")
def revoke_user_session(
    session_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    session_record = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_record.is_active = False
    db.commit()
    return {"message": "Session revoked successfully"}


@router.delete("/me/sessions")
def revoke_all_other_sessions(
    request: Request,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    current_jti = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            current_jti = payload.get("jti")
        except Exception:
            pass

    query = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    )
    if current_jti:
        query = query.filter(UserSession.session_token != current_jti)

    other_sessions = query.all()
    for s in other_sessions:
        s.is_active = False
        
    db.commit()
    return {"message": "All other sessions revoked successfully"}


@router.post("/me/verify-email")
@limiter.limit("5/minute")
def verify_email(
    request: Request,
    payload: VerifyEmailRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    if current_user.is_verified:
        return {"message": "Email is already verified."}
        
    if not current_user.verification_code_hash or not current_user.verification_code_expires_at:
        raise HTTPException(status_code=400, detail="No verification code has been requested.")
        
    now = datetime.now(timezone.utc)
    expires_at = current_user.verification_code_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at < now:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    input_hash = hashlib.sha256(payload.code.encode()).hexdigest()
    if input_hash != current_user.verification_code_hash:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    current_user.is_verified = True
    current_user.verification_code_hash = None
    current_user.verification_code_expires_at = None
    db.commit()
    
    return {"message": "Email verified successfully."}


@router.post("/me/resend-verification")
@limiter.limit("3/minute")
def resend_verification_email_endpoint(
    request: Request,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    if current_user.is_verified:
        return {"message": "Email is already verified."}
        
    v_code = "".join(secrets.choice(string.digits) for _ in range(6))
    v_code_hash = hashlib.sha256(v_code.encode()).hexdigest()
    v_code_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    current_user.verification_code_hash = v_code_hash
    current_user.verification_code_expires_at = v_code_expires
    db.commit()
    
    send_verification_email(current_user.email, v_code)
    
    return {"message": "Verification code resent successfully."}
