"""
Authentication Middleware
=========================
FastAPI dependencies for protecting routes that require authentication.

Usage in endpoints:
    @app.get("/api/protected")
    def protected_route(current_user: User = Depends(get_current_user)):
        return {"message": f"Hello {current_user.name}"}

    @app.get("/api/admin-only")
    def admin_route(current_user: User = Depends(require_admin)):
        return {"message": "Admin access granted"}
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session

from app.models.database import User
from app.services.auth import validate_access_token, get_user_by_id

# Security scheme for Swagger docs
security = HTTPBearer(auto_error=False)


def get_session():
    """Import dynamically to avoid circular imports."""
    from app.main import get_session as main_get_session
    return main_get_session


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    Dependency that extracts and validates the current user from JWT token.

    Raises:
        HTTPException 401: If token is missing or invalid
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    payload = validate_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = int(payload.get("sub", 0))
    user = get_user_by_id(session, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """
    Dependency that returns the current user if authenticated, or None if not.
    Use this for routes that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = validate_access_token(token)

    if not payload:
        return None

    user_id = int(payload.get("sub", 0))
    return get_user_by_id(session, user_id)


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires the user to be an admin.

    Raises:
        HTTPException 403: If user is not an admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )

    return current_user


async def require_worker(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires the user to have a worker profile.

    Raises:
        HTTPException 403: If user is not a worker
    """
    if not current_user.is_worker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Worker profile required. Please register as a worker first."
        )

    return current_user


def get_user_id(current_user: User = Depends(get_current_user)) -> int:
    """
    Simple dependency that returns just the user ID.
    Useful when you only need the ID for database queries.
    """
    return current_user.id
