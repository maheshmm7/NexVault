import re
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

COMMON_PASSWORD_BLACKLIST = {
    "password123", "12345678", "qwerty123", "admin123",
    "password", "123456", "1234567", "123456789"
}

def validate_password_strength(password: str) -> None:
    """
    Validates password strength under strict security guidelines.
    Rejections are concise and security-conscious, avoiding granular leakage.
    Enforces minimum 8 chars, uppercase, lowercase, digits, special characters,
    lightweight common blacklist, and repeated/sequential pattern penalties.
    """
    # 1. Length check
    if len(password) < 8:
        raise ValueError(
            "Password does not meet the security complexity requirements. "
            "It must be at least 8 characters long."
        )

    # 2. Blacklist check
    if password.lower() in COMMON_PASSWORD_BLACKLIST:
        raise ValueError(
            "Password does not meet the security complexity requirements. "
            "Please avoid extremely common passwords."
        )

    # 3. Character requirement check
    if (
        not re.search(r"[A-Z]", password)
        or not re.search(r"[a-z]", password)
        or not re.search(r"[0-9]", password)
        or not re.search(r"[^A-Za-z0-9]", password)
    ):
        raise ValueError(
            "Password does not meet the security complexity requirements. "
            "It must include uppercase, lowercase, numbers, and special characters."
        )

    # 4. Repeated pattern checks (e.g. "AAAA", "1111")
    if re.search(r"(.)\1{3,}", password):
        raise ValueError(
            "Password does not meet the security complexity requirements. "
            "Please avoid highly repetitive character patterns."
        )

    # 5. Sequential pattern checks (e.g. "abcd", "1234")
    lower = password.lower()
    for i in range(len(lower) - 3):
        c1 = ord(lower[i])
        c2 = ord(lower[i+1])
        c3 = ord(lower[i+2])
        c4 = ord(lower[i+3])
        if c2 == c1 + 1 and c3 == c2 + 1 and c4 == c3 + 1:
            raise ValueError(
                "Password does not meet the security complexity requirements. "
                "Please avoid simple sequential character patterns."
            )

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
