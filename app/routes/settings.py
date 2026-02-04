"""Settings API routes."""
import logging
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.database import get_db
from app.models import User as UserModel, Business, NotificationPreference
from app.routes.auth import get_current_user, get_user_business_id
from app.services.auth import get_password_hash

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])


# ========== PYDANTIC MODELS ==========

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class BusinessSettingsUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    settings: Optional[dict] = None


class NotificationPreferenceUpdate(BaseModel):
    category: str
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


# ========== PROFILE ENDPOINTS ==========

@router.get("/profile")
async def get_profile(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "business_id": current_user.business_id,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
    }


@router.put("/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile."""
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    
    if profile_data.email is not None:
        # Check if email is already taken
        existing_user = db.query(UserModel).filter(
            UserModel.email == profile_data.email,
            UserModel.id != current_user.id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        
        current_user.email = profile_data.email
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "business_id": current_user.business_id,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
    }


@router.post("/password")
async def change_password(
    password_data: PasswordChange,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change user password."""
    from app.services.auth import verify_password
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash and update new password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "message": "Password updated successfully"}


# ========== BUSINESS SETTINGS ENDPOINTS ==========

@router.get("/business")
async def get_business_settings(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get business settings."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business settings require a business account"
        )
    
    business = db.query(Business).filter(Business.id == business_id).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    settings = {}
    if business.settings:
        try:
            settings = json.loads(business.settings)
        except:
            settings = {}
    
    return {
        "id": business.id,
        "name": business.name,
        "owner_id": business.owner_id,
        "settings": settings,
        "created_at": business.created_at.isoformat(),
        "updated_at": business.updated_at.isoformat(),
    }


@router.put("/business")
async def update_business_settings(
    business_data: BusinessSettingsUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update business settings."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business settings require a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    business = db.query(Business).filter(Business.id == business_id).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Update fields
    if business_data.name is not None:
        business.name = business_data.name
    
    # Update settings JSON
    if business_data.settings or business_data.timezone or business_data.language:
        current_settings = {}
        if business.settings:
            try:
                current_settings = json.loads(business.settings)
            except:
                current_settings = {}
        
        if business_data.timezone:
            current_settings["timezone"] = business_data.timezone
        if business_data.language:
            current_settings["language"] = business_data.language
        if business_data.settings:
            current_settings.update(business_data.settings)
        
        business.settings = json.dumps(current_settings)
    
    business.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(business)
    
    settings = {}
    if business.settings:
        try:
            settings = json.loads(business.settings)
        except:
            settings = {}
    
    return {
        "id": business.id,
        "name": business.name,
        "owner_id": business.owner_id,
        "settings": settings,
        "created_at": business.created_at.isoformat(),
        "updated_at": business.updated_at.isoformat(),
    }


# ========== NOTIFICATION PREFERENCES ENDPOINTS ==========

@router.get("/notifications/preferences")
async def get_notification_preferences(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification preferences."""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).all()
    
    return [
        {
            "id": pref.id,
            "user_id": pref.user_id,
            "category": pref.category,
            "email_enabled": pref.email_enabled,
            "in_app_enabled": pref.in_app_enabled,
            "sms_enabled": pref.sms_enabled,
            "quiet_hours_start": pref.quiet_hours_start,
            "quiet_hours_end": pref.quiet_hours_end,
            "created_at": pref.created_at.isoformat(),
            "updated_at": pref.updated_at.isoformat(),
        }
        for pref in preferences
    ]


@router.post("/notifications/preferences")
async def create_notification_preference(
    pref_data: NotificationPreferenceUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create notification preference."""
    # Check if preference already exists
    existing_pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id,
        NotificationPreference.category == pref_data.category
    ).first()
    
    if existing_pref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preference for this category already exists"
        )
    
    preference = NotificationPreference(
        user_id=current_user.id,
        category=pref_data.category,
        email_enabled=pref_data.email_enabled if pref_data.email_enabled is not None else True,
        in_app_enabled=pref_data.in_app_enabled if pref_data.in_app_enabled is not None else True,
        sms_enabled=pref_data.sms_enabled if pref_data.sms_enabled is not None else False,
        quiet_hours_start=pref_data.quiet_hours_start,
        quiet_hours_end=pref_data.quiet_hours_end,
    )
    
    db.add(preference)
    db.commit()
    db.refresh(preference)
    
    return {
        "id": preference.id,
        "user_id": preference.user_id,
        "category": preference.category,
        "email_enabled": preference.email_enabled,
        "in_app_enabled": preference.in_app_enabled,
        "sms_enabled": preference.sms_enabled,
        "quiet_hours_start": preference.quiet_hours_start,
        "quiet_hours_end": preference.quiet_hours_end,
        "created_at": preference.created_at.isoformat(),
        "updated_at": preference.updated_at.isoformat(),
    }


@router.put("/notifications/preferences/{category}")
async def update_notification_preference(
    category: str,
    pref_data: NotificationPreferenceUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notification preference."""
    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id,
        NotificationPreference.category == category
    ).first()
    
    if not preference:
        # Create if doesn't exist
        preference = NotificationPreference(
            user_id=current_user.id,
            category=category,
        )
        db.add(preference)
    
    # Update fields
    if pref_data.email_enabled is not None:
        preference.email_enabled = pref_data.email_enabled
    if pref_data.in_app_enabled is not None:
        preference.in_app_enabled = pref_data.in_app_enabled
    if pref_data.sms_enabled is not None:
        preference.sms_enabled = pref_data.sms_enabled
    if pref_data.quiet_hours_start is not None:
        preference.quiet_hours_start = pref_data.quiet_hours_start
    if pref_data.quiet_hours_end is not None:
        preference.quiet_hours_end = pref_data.quiet_hours_end
    
    preference.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(preference)
    
    return {
        "id": preference.id,
        "user_id": preference.user_id,
        "category": preference.category,
        "email_enabled": preference.email_enabled,
        "in_app_enabled": preference.in_app_enabled,
        "sms_enabled": preference.sms_enabled,
        "quiet_hours_start": preference.quiet_hours_start,
        "quiet_hours_end": preference.quiet_hours_end,
        "created_at": preference.created_at.isoformat(),
        "updated_at": preference.updated_at.isoformat(),
    }


@router.delete("/notifications/preferences/{category}")
async def delete_notification_preference(
    category: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete notification preference."""
    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id,
        NotificationPreference.category == category
    ).first()
    
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    db.delete(preference)
    db.commit()
    
    return {"success": True, "message": "Preference deleted successfully"}
