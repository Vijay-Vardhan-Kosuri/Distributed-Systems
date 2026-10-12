"""
User Management and RBAC Directory
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.base import User, UserRole
from backend.app.schemas.schemas import UserResponse, UserCreate
from backend.app.core.security import require_admin, hash_password, get_current_user
from backend.app.services.audit_service import audit_service

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Lists all user accounts (Admin only)."""
    return db.query(User).all()

@router.post("", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Creates a new user account with role assignment (Admin only)."""
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=UserRole(user_in.role),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit_service.record_action(
        db, current_user.username, current_user.role.value,
        "CREATE_USER", "USER", str(new_user.id),
        f"Created user {new_user.username} with role {new_user.role.value}"
    )

    return new_user
