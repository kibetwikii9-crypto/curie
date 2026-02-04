"""Notifications API routes."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Notification, NotificationPreference, User as UserModel
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ========== PYDANTIC MODELS ==========

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    category: Optional[str]
    is_read: bool
    action_url: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


# ========== NOTIFICATION ENDPOINTS ==========

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = None,
    category: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's notifications."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    if category:
        query = query.filter(Notification.category == category)
    
    offset = (page - 1) * limit
    notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    
    return notifications


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {"count": count}


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return None


@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    
    return None


# ========== PREFERENCE ENDPOINTS ==========

@router.get("/preferences/", response_model=List[dict])
async def get_preferences(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification preferences."""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).all()
    
    return [{
        "category": p.category,
        "email_enabled": p.email_enabled,
        "in_app_enabled": p.in_app_enabled,
        "sms_enabled": p.sms_enabled,
        "quiet_hours_start": p.quiet_hours_start,
        "quiet_hours_end": p.quiet_hours_end,
    } for p in preferences]


@router.put("/preferences/{category}", response_model=dict)
async def update_preference(
    category: str,
    preference_data: NotificationPreferenceUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notification preference for a category."""
    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id,
        NotificationPreference.category == category
    ).first()
    
    if not preference:
        preference = NotificationPreference(
            user_id=current_user.id,
            category=category,
        )
        db.add(preference)
    
    if preference_data.email_enabled is not None:
        preference.email_enabled = preference_data.email_enabled
    if preference_data.in_app_enabled is not None:
        preference.in_app_enabled = preference_data.in_app_enabled
    if preference_data.sms_enabled is not None:
        preference.sms_enabled = preference_data.sms_enabled
    if preference_data.quiet_hours_start is not None:
        preference.quiet_hours_start = preference_data.quiet_hours_start
    if preference_data.quiet_hours_end is not None:
        preference.quiet_hours_end = preference_data.quiet_hours_end
    
    db.commit()
    db.refresh(preference)
    
    return {
        "category": preference.category,
        "email_enabled": preference.email_enabled,
        "in_app_enabled": preference.in_app_enabled,
        "sms_enabled": preference.sms_enabled,
        "quiet_hours_start": preference.quiet_hours_start,
        "quiet_hours_end": preference.quiet_hours_end,
    }


# ========== DELETE & BULK OPERATIONS ==========

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return None


@router.post("/bulk/delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_notifications(
    notification_ids: List[int],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk delete notifications."""
    db.query(Notification).filter(
        Notification.id.in_(notification_ids),
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    
    return None


@router.post("/delete-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_read(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all read notifications."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == True
    ).delete(synchronize_session=False)
    db.commit()
    
    return None


# ========== STATS ENDPOINT ==========

@router.get("/stats/dashboard")
async def get_notification_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification statistics."""
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Total notifications
    total = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id
    ).scalar() or 0
    
    # Unread notifications
    unread = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).scalar() or 0
    
    # Read notifications
    read = total - unread
    
    # Today's notifications
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.created_at >= today_start
    ).scalar() or 0
    
    # This week's notifications
    week_start = datetime.utcnow() - timedelta(days=7)
    this_week = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.created_at >= week_start
    ).scalar() or 0
    
    # By category
    category_stats = db.query(
        Notification.category,
        func.count(Notification.id).label('count')
    ).filter(
        Notification.user_id == current_user.id
    ).group_by(Notification.category).all()
    
    by_category = {cat: count for cat, count in category_stats if cat}
    
    # By type
    type_stats = db.query(
        Notification.type,
        func.count(Notification.id).label('count')
    ).filter(
        Notification.user_id == current_user.id
    ).group_by(Notification.type).all()
    
    by_type = {t: count for t, count in type_stats}
    
    return {
        "total": total,
        "unread": unread,
        "read": read,
        "today": today,
        "this_week": this_week,
        "by_category": by_category,
        "by_type": by_type,
    }


# ========== CREATE NOTIFICATION (for testing/admin) ==========

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    category: Optional[str] = None
    action_url: Optional[str] = None


@router.post("/create", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new notification (for testing/admin)."""
    business_id = get_user_business_id(current_user, db)
    
    notification = Notification(
        business_id=business_id,
        user_id=current_user.id,
        type=notification_data.type,
        title=notification_data.title,
        message=notification_data.message,
        category=notification_data.category,
        action_url=notification_data.action_url,
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

