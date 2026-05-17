from datetime import timedelta
import datetime
import secrets
import hashlib
import resend
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import ForgotPasswordRequest, ResetPasswordRequest

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


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(deps.get_db)
):
    # Always return a success response to prevent user enumeration attacks
    success_response = {"message": "If your email is registered, you will receive a reset link shortly."}
    
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return success_response

    # Generate a cryptographically secure random token
    token = secrets.token_urlsafe(32)
    # Store only the SHA-256 hash of the token for XSS/injection protection
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Store token and set 15 minutes expiry
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
    
    # Email HTML Template
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
          <a href="{reset_link}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">Reset Password</a>
        </div>
        <p style="color: #cbd5e1; line-height: 1.6; font-size: 14px; text-align: center; word-break: break-all;">
          Or copy and paste this link in your browser:<br/>
          <a href="{reset_link}" target="_blank" style="color: #6366f1; text-decoration: underline;">{reset_link}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">This reset link will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email and your password will remain unchanged.</p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
        <p>© 2026 NEXVAULT. All rights reserved.</p>
      </div>
    </div>
    """

    # Deliver via Resend
    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": "NEXVAULT <onboarding@resend.dev>",
                "to": payload.email,
                "subject": "Reset Your NEXVAULT Password",
                "html": email_html
            })
        except Exception as e:
            # Fallback console log print for extreme safety
            print("FAILED to send Resend email, fallback print (development):", e)
            print("RESET LINK URL:", reset_link)
    else:
        # Development mode fallback: print directly in console logs
        print("RESEND_API_KEY is missing. Printing reset URL in logs for development:")
        print("RESET LINK URL:", reset_link)

    return success_response


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(deps.get_db)
):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long")

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
