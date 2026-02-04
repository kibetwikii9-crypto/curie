"""Authentication routes for login and user management."""
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import Token, UserCreate, UserResponse
from app.models import User as UserModel, Business
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_user,
    get_user_by_email,
    verify_token,
)
from app.middleware.rate_limiter import limiter, get_rate_limit

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserModel:
    """Get current authenticated user from JWT token."""
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user = get_user_by_email(db, email=email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_user_business_id(current_user: UserModel, db: Session) -> int | None:
    """
    Get the business_id for the current user.
    
    - Admin users: return None (can access all businesses)
    - Business owners and agents: return their business_id
    
    If user has business_id set, returns it.
    If user is business_owner but business_id is None, tries to find business by owner_id.
    If found, updates user's business_id and returns it.
    
    Returns:
        business_id if user is linked to a business, None for admin users
    """
    if current_user.role == "admin":
        return None  # Admin can access all businesses
    
    # If user already has business_id, return it
    if current_user.business_id is not None:
        return current_user.business_id
    
    # Fallback: If user is business_owner but business_id is None, try to find business by owner_id
    if current_user.role == "business_owner":
        business = db.query(Business).filter(Business.owner_id == current_user.id).first()
        if business:
            # Update user's business_id for future requests
            current_user.business_id = business.id
            db.add(current_user)
            db.commit()
            db.refresh(current_user)
            return business.id
    
    # If no business found, return None (will cause queries to return empty results)
    return None


@router.post("/login", response_model=Token)
@limiter.limit(get_rate_limit("public_strict"))  # 10/minute - Prevent brute force
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login endpoint - returns JWT token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_rate_limit("public_strict"))  # 10/minute - Prevent spam accounts
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user.
    
    For regular sign-ups (role='agent' or not specified):
    - Automatically creates a Business
    - Assigns user as 'business_owner' role
    - Links user to the created Business
    
    For admin sign-ups (role='admin'):
    - No Business is created
    - User is not linked to any Business
    """
    # Check if user already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Determine role: if not admin, make them business_owner
    # Admin role should only be set via script or explicit admin sign-up code
    final_role = user_data.role
    if final_role == "agent" or (final_role not in ["admin", "business_owner", "agent"]):
        # Regular sign-up: make them business_owner and auto-create Business
        final_role = "business_owner"
    
    # Create user (will auto-create Business if role is business_owner)
    user = create_user(
        db,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        role=final_role,
    )
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information."""
    return current_user

