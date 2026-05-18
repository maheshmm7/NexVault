from datetime import timedelta
import datetime
import secrets
import hashlib
import html
import logging
from app.utils.email import send_smtp_email

logger = logging.getLogger("app.api.auth")
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import ForgotPasswordRequest, ResetPasswordRequest, RecoverAccountRequest, RegenerateRecoveryCodeRequest

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    # ─── HTTPOnly Secure Cookie Injection ─────────────────────────────────────
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
    }

@router.post("/logout")
def logout(response: Response):
    # ─── Terminate Session & Expire Auth Cookie ──────────────────────────────
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    return {"message": "Logged out successfully"}


def process_password_reset_flow(db: Session, email: str) -> None:
    """
    Decoupled service function that executes the password reset token generation,
    storage, template rendering, escaping, and SMTP transactional email delivery.
    Structured cleanly to allow future per-user/per-IP rate limiting or decorators.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return

    # Generate a cryptographically secure random token
    token = secrets.token_urlsafe(32)
    # Store only the SHA-256 hash of the token for XSS/injection protection
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Store token and set 15 minutes expiry
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
    
    # Safe HTML Escaping to prevent injection in templated contents
    escaped_reset_link = html.escape(reset_link)
    escaped_email = html.escape(user.email)

    # Email HTML Template (visually preserving original dark-themed style)
    email_html = f"""
    <div style="font-family: 'Outfit', 'Inter', sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.05em;">NEXVAULT</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">Secure Wealth Infrastructure</p>
      </div>
      <div style="background-color: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px; text-align: center;">Password Reset Request</h2>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">Hello,</p>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">We received a request to reset the password for your NEXVAULT account. Click the button below to secure your new credentials:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{escaped_reset_link}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">Reset Password</a>
        </div>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 14px; text-align: center; word-break: break-all;">
          Or copy and paste this link in your browser:<br/>
          <a href="{escaped_reset_link}" target="_blank" style="color: #6366f1; text-decoration: underline;">{escaped_reset_link}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">This reset link will expire in <strong>15 minutes</strong>. If you did not make this request for {escaped_email}, you can safely ignore this email and your password will remain unchanged.</p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
        <p>© 2026 NEXVAULT. All rights reserved.</p>
      </div>
    </div>
    """

    try:
        send_smtp_email(
            to_email=user.email,
            subject="Reset Your NEXVAULT Password",
            html_content=email_html
        )
    except Exception as e:
        # Logging hygiene: Never include sensitive SMTP credentials, raw tokens, or recovery codes in logs.
        logger.error(f"SMTP delivery failed during forgot-password flow: {str(e)}")
        
        # Controlled Development Fallback: only print when COOKIE_SECURE is False (dev env)
        if not settings.COOKIE_SECURE:
            print("[DEVELOPMENT ONLY FALLBACK] SMTP failed. Printing reset link in console:")
            print("RESET LINK URL:", reset_link)
        else:
            raise RuntimeError("Email delivery transport failed.")


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(deps.get_db)
):
    # Always return a success response to prevent user enumeration attacks
    success_response = {"message": "If your email is registered, you will receive a reset link shortly."}
    
    try:
        process_password_reset_flow(db, payload.email)
    except Exception:
        # Logging hygiene: Never expose full exception traces to public responses
        pass

    return success_response


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(deps.get_db)
):
    try:
        security.validate_password_strength(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Hash the incoming token using SHA-256 to lookup the user
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    # Timezone-aware expiration verification
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
        
    if expires_at < now:
        # Expired token -> Invalidate it immediately
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")

    # Hash the new password and commit
    user.hashed_password = security.get_password_hash(payload.new_password)
    
    # Invalidate token immediately upon single-use fulfillment
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in with your new credentials."}


@router.post("/recover-account")
def recover_account(
    payload: RecoverAccountRequest,
    db: Session = Depends(deps.get_db)
):
    """
    Beta-stage Account Recovery:
    Validates a cryptographically strong NVX-XXXX-XXXX-XXXX recovery code.
    If valid, resets the user password, invalidates old reset states,
    regenerates a new recovery code, hashes it, and returns the new code.
    
    Abuse & Throttling readiness hooks:
    - Future middleware rate-limiting decorator ready
    - Attempt counting checks can be bound to IP/email keys in Redis/DB
    """
    # ─── Throttling & Abuse Prevention Hook ──────────────────────────────
    # TODO: Implement rate limiting middleware decorator here, e.g. @limiter.limit("5/minute")
    
    try:
        security.validate_password_strength(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.recovery_code_hash:
        # Prevent account enumeration: return general invalid error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or recovery code")
        
    # Verify the timing-safe recovery code hash
    if not security.verify_password(payload.recovery_code, user.recovery_code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or recovery code")
        
    # Valid recovery! Proceed to reset password and invalidate old credentials
    user.hashed_password = security.get_password_hash(payload.new_password)
    
    # Invalidate forgot password reset tokens
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    
    # Generate and swap in a brand new recovery code (Single-Use Invalidation)
    from app.api.users import generate_recovery_code
    new_recovery_code = generate_recovery_code()
    user.recovery_code_hash = security.get_password_hash(new_recovery_code)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during account recovery")
        
    return {
        "message": "Account recovered successfully. Your password has been updated.",
        "new_recovery_code": new_recovery_code
    }


@router.post("/regenerate-recovery-code")
def regenerate_recovery_code(
    payload: RegenerateRecoveryCodeRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Authenticated Regeneration of the Recovery Code.
    Verifies the user's current password, regenerates a cryptographically strong code,
    hashes it, stores it, immediately invalidates the old hash, and returns the new code once.
    """
    if not security.verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password confirmation"
        )
        
    from app.api.users import generate_recovery_code
    new_recovery_code = generate_recovery_code()
    
    current_user.recovery_code_hash = security.get_password_hash(new_recovery_code)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during recovery code regeneration"
        )
        
    return {
        "message": "Recovery code regenerated successfully.",
        "new_recovery_code": new_recovery_code
    }
