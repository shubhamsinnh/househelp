"""
Authentication Service
======================
Handles JWT token generation, validation, and user session management.

JWT (JSON Web Token) Flow:
1. User sends OTP -> OTP verified -> We create JWT tokens
2. Access Token (short-lived, 15 min) -> Used for API requests
3. Refresh Token (long-lived, 7 days) -> Used to get new access tokens

SECURITY NOTES:
- Access tokens are stateless (no database lookup needed)
- Refresh tokens are stored in database for revocation support
- Always use HTTPS in production
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Tuple, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from pydantic import BaseModel

from app.models.database import User


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# IMPORTANT: In production, set SECRET_KEY as an environment variable!
# Generate a secure key: openssl rand -hex 32
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ---------------------------------------------------------------------------
# Token Schemas
# ---------------------------------------------------------------------------
class TokenPayload(BaseModel):
    """Data stored inside the JWT token."""
    sub: str           # Subject (user_id as string)
    phone: str         # Phone number
    role: str          # "employer", "worker", or "admin"
    is_worker: bool    # True if user has a worker profile
    exp: datetime      # Expiration time
    type: str          # "access" or "refresh"


class TokenResponse(BaseModel):
    """What we return to the client after successful auth."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int    # Seconds until access token expires
    user: dict         # Basic user info


# ---------------------------------------------------------------------------
# Token Generation
# ---------------------------------------------------------------------------
def create_access_token(user: User) -> str:
    """Create a short-lived access token for API requests."""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user.id),
        "phone": user.phone,
        "role": user.role,
        "is_worker": user.is_worker,
        "exp": expire,
        "type": "access"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user: User) -> str:
    """Create a long-lived refresh token for getting new access tokens."""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": str(user.id),
        "phone": user.phone,
        "exp": expire,
        "type": "refresh"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_tokens(user: User) -> TokenResponse:
    """Create both access and refresh tokens for a user."""
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "phone": user.phone,
            "name": user.name,
            "city": user.city,
            "role": user.role,
            "is_worker": user.is_worker,
            "worker_id": user.worker_id
        }
    )


# ---------------------------------------------------------------------------
# Token Validation
# ---------------------------------------------------------------------------
def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns the payload if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def validate_access_token(token: str) -> Optional[dict]:
    """Validate an access token specifically."""
    payload = decode_token(token)

    if not payload:
        return None

    if payload.get("type") != "access":
        return None

    return payload


def validate_refresh_token(token: str) -> Optional[dict]:
    """Validate a refresh token specifically."""
    payload = decode_token(token)

    if not payload:
        return None

    if payload.get("type") != "refresh":
        return None

    return payload


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------
def get_or_create_user(session: Session, phone: str) -> Tuple[User, bool]:
    """
    Get existing user or create a new one after OTP verification.

    Returns:
        (user: User, is_new: bool)
    """
    # Try to find existing user
    user = session.exec(
        select(User).where(User.phone == phone)
    ).first()

    if user:
        return user, False

    # Create new user
    user = User(phone=phone)
    session.add(user)
    session.commit()
    session.refresh(user)

    return user, True


def get_user_by_id(session: Session, user_id: int) -> Optional[User]:
    """Get a user by their ID."""
    return session.get(User, user_id)


def get_user_from_token(session: Session, token: str) -> Optional[User]:
    """Extract and return the user from a valid access token."""
    payload = validate_access_token(token)

    if not payload:
        return None

    user_id = int(payload.get("sub", 0))
    return get_user_by_id(session, user_id)


def refresh_access_token(session: Session, refresh_token: str) -> Optional[TokenResponse]:
    """
    Use a refresh token to get a new access token.
    Returns new tokens if valid, None if invalid/expired.
    """
    payload = validate_refresh_token(refresh_token)

    if not payload:
        return None

    user_id = int(payload.get("sub", 0))
    user = get_user_by_id(session, user_id)

    if not user:
        return None

    return create_tokens(user)


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------
def extract_token_from_header(authorization: str) -> Optional[str]:
    """
    Extract the token from the Authorization header.
    Expected format: "Bearer <token>"
    """
    if not authorization:
        return None

    parts = authorization.split()

    if len(parts) != 2:
        return None

    if parts[0].lower() != "bearer":
        return None

    return parts[1]
