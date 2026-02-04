"""Users and Roles API routes."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import User as UserModel, Role, Permission, RolePermission, UserRole, Business
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])


# ========== PYDANTIC MODELS ==========

class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "agent"
    business_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    business_id: Optional[int]
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = []


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_system: bool
    permissions: List[dict]

    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]

    class Config:
        from_attributes = True


# ========== USER ENDPOINTS ==========

@router.get("/", response_model=List[UserResponse])
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of users in the business."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User management requires a business account"
        )
    
    # Check permissions (only admin and business_owner can view users)
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    query = db.query(UserModel).filter(UserModel.business_id == business_id)
    
    if search:
        query = query.filter(
            (UserModel.email.ilike(f"%{search}%")) |
            (UserModel.full_name.ilike(f"%{search}%"))
        )
    
    if role:
        query = query.filter(UserModel.role == role)
    
    offset = (page - 1) * limit
    users = query.order_by(UserModel.created_at.desc()).offset(offset).limit(limit).all()
    
    return users


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new user."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User creation requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    from app.services.auth import create_user as create_user_service
    user = create_user_service(
        db,
        email=user_data.email,
        password="temp_password_123",  # Should send invitation email with password reset
        full_name=user_data.full_name,
        role=user_data.role or "agent",
        business_id=business_id,
    )
    
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user by ID."""
    business_id = get_user_business_id(current_user, db)
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if business_id and user.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if current_user.role not in ["admin", "business_owner"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user."""
    business_id = get_user_business_id(current_user, db)
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if business_id and user.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if current_user.role not in ["admin", "business_owner"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Update fields
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    if user_data.role is not None and current_user.role in ["admin", "business_owner"]:
        user.role = user_data.role
    if user_data.is_active is not None and current_user.role in ["admin", "business_owner"]:
        user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete user."""
    business_id = get_user_business_id(current_user, db)
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if business_id and user.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    return None


# ========== ROLE ENDPOINTS ==========

@router.get("/roles/", response_model=List[RoleResponse])
async def get_roles(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all roles."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Role).filter(
        (Role.business_id == business_id) | (Role.is_system == True)
    )
    roles = query.all()
    
    result = []
    for role in roles:
        permissions = db.query(Permission).join(RolePermission).filter(
            RolePermission.role_id == role.id
        ).all()
        result.append({
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "is_system": role.is_system,
            "permissions": [{"id": p.id, "name": p.name} for p in permissions]
        })
    
    return result


@router.get("/permissions/", response_model=List[PermissionResponse])
async def get_permissions(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all permissions."""
    permissions = db.query(Permission).all()
    return permissions


@router.post("/roles/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new custom role."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role creation requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Create role
    role = Role(
        business_id=business_id,
        name=role_data.name,
        description=role_data.description,
        is_system=False,
    )
    db.add(role)
    db.flush()
    
    # Assign permissions
    if role_data.permission_ids:
        for permission_id in role_data.permission_ids:
            role_permission = RolePermission(
                role_id=role.id,
                permission_id=permission_id
            )
            db.add(role_permission)
    
    db.commit()
    db.refresh(role)
    
    # Get permissions
    permissions = db.query(Permission).join(RolePermission).filter(
        RolePermission.role_id == role.id
    ).all()
    
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "permissions": [{"id": p.id, "name": p.name} for p in permissions]
    }


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a custom role."""
    business_id = get_user_business_id(current_user, db)
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check permissions
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system roles"
        )
    
    if business_id and role.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Update role
    role.name = role_data.name
    role.description = role_data.description
    
    # Update permissions
    db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
    
    if role_data.permission_ids:
        for permission_id in role_data.permission_ids:
            role_permission = RolePermission(
                role_id=role.id,
                permission_id=permission_id
            )
            db.add(role_permission)
    
    db.commit()
    db.refresh(role)
    
    # Get permissions
    permissions = db.query(Permission).join(RolePermission).filter(
        RolePermission.role_id == role.id
    ).all()
    
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "permissions": [{"id": p.id, "name": p.name} for p in permissions]
    }


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a custom role."""
    business_id = get_user_business_id(current_user, db)
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check permissions
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles"
        )
    
    if business_id and role.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    db.delete(role)
    db.commit()
    return None


@router.post("/{user_id}/roles/{role_id}", status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    user_id: int,
    role_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a role to a user."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role assignment requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Check user exists
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user or user.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check role exists
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if assignment already exists
    existing = db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.role_id == role_id
    ).first()
    
    if existing:
        return {"success": True, "message": "Role already assigned"}
    
    # Create assignment
    user_role = UserRole(user_id=user_id, role_id=role_id)
    db.add(user_role)
    db.commit()
    
    return {"success": True, "message": "Role assigned successfully"}


@router.delete("/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_user(
    user_id: int,
    role_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a role from a user."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role removal requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Check user exists
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user or user.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove assignment
    db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.role_id == role_id
    ).delete()
    
    db.commit()
    return None


@router.post("/bulk/toggle-active")
async def bulk_toggle_active(
    user_ids: List[int],
    is_active: bool,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk toggle user active status."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User management requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    users = db.query(UserModel).filter(
        UserModel.id.in_(user_ids),
        UserModel.business_id == business_id
    ).all()
    
    updated_count = 0
    for user in users:
        if user.id != current_user.id:  # Don't deactivate yourself
            user.is_active = is_active
            updated_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{updated_count} users {'activated' if is_active else 'deactivated'}",
        "updated_count": updated_count
    }


@router.get("/stats")
async def get_user_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user statistics."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User management requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    from sqlalchemy import func
    from collections import defaultdict
    
    # Total users
    total_users = db.query(func.count(UserModel.id)).filter(
        UserModel.business_id == business_id
    ).scalar()
    
    # Active users
    active_users = db.query(func.count(UserModel.id)).filter(
        UserModel.business_id == business_id,
        UserModel.is_active == True
    ).scalar()
    
    # Users by role
    role_counts = db.query(
        UserModel.role,
        func.count(UserModel.id)
    ).filter(
        UserModel.business_id == business_id
    ).group_by(UserModel.role).all()
    
    by_role = defaultdict(int)
    for role, count in role_counts:
        by_role[role] = count
    
    # Recent users (last 7 days)
    from datetime import datetime, timedelta
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_users = db.query(func.count(UserModel.id)).filter(
        UserModel.business_id == business_id,
        UserModel.created_at >= seven_days_ago
    ).scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "by_role": dict(by_role),
        "recent_users": recent_users,
    }

