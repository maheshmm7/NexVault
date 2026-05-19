from typing import Generator
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.db.database import SessionLocal
from app.core.config import settings
from app.models.user import User
from app.schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False  # Make it optional so cookie check handles the auth first
)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    # 1. Try to read token from HTTPOnly cookie
    token = request.cookies.get("access_token")

    # 2. Fallback to Authorization Header if cookie is missing (Swagger / CLI client support)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    from app.models.session import UserSession
    from datetime import datetime, timezone
    
    jti = payload.get("jti")
    if jti:
        session_record = db.query(UserSession).filter(UserSession.session_token == jti).first()
        if not session_record or not session_record.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been terminated or is invalid",
            )
        # Update last active timestamp
        session_record.last_active_at = datetime.now(timezone.utc)
        db.commit()
        
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_user_timezone(request: Request) -> str:
    tz = request.headers.get("X-User-Timezone") or "UTC"
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    try:
        ZoneInfo(tz)
        return tz
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return "UTC"
