"""Handoff and Agent Workspace API routes."""
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel

from app.database import get_db
from app.models import Handoff, SLA, Escalation, Conversation, User as UserModel
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/handoff", tags=["handoff"])


# ========== PYDANTIC MODELS ==========

class HandoffCreate(BaseModel):
    conversation_id: int
    reason: Optional[str] = None
    priority: str = "medium"


class HandoffUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_user_id: Optional[int] = None


class HandoffResponse(BaseModel):
    id: int
    business_id: int
    conversation_id: int
    assigned_to_user_id: Optional[int]
    status: str
    priority: str
    reason: Optional[str]
    assigned_at: Optional[str]
    resolved_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ========== HANDOFF ENDPOINTS ==========

@router.get("/", response_model=List[HandoffResponse])
async def get_handoffs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: bool = Query(False),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of handoffs."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Handoff access requires a business account"
        )
    
    query = db.query(Handoff).filter(Handoff.business_id == business_id)
    
    if status:
        query = query.filter(Handoff.status == status)
    
    if priority:
        query = query.filter(Handoff.priority == priority)
    
    if assigned_to_me:
        query = query.filter(Handoff.assigned_to_user_id == current_user.id)
    
    offset = (page - 1) * limit
    handoffs = query.order_by(Handoff.created_at.desc()).offset(offset).limit(limit).all()
    
    return handoffs


@router.post("/", response_model=HandoffResponse, status_code=status.HTTP_201_CREATED)
async def create_handoff(
    handoff_data: HandoffCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new handoff."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Handoff creation requires a business account"
        )
    
    # Verify conversation exists and belongs to business
    conversation = db.query(Conversation).filter(
        Conversation.id == handoff_data.conversation_id,
        Conversation.business_id == business_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Create handoff
    handoff = Handoff(
        business_id=business_id,
        conversation_id=handoff_data.conversation_id,
        status="pending",
        priority=handoff_data.priority,
        reason=handoff_data.reason,
    )
    
    db.add(handoff)
    db.commit()
    db.refresh(handoff)
    
    return handoff


@router.put("/{handoff_id}", response_model=HandoffResponse)
async def update_handoff(
    handoff_id: int,
    handoff_data: HandoffUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update handoff."""
    business_id = get_user_business_id(current_user, db)
    
    handoff = db.query(Handoff).filter(
        Handoff.id == handoff_id,
        Handoff.business_id == business_id
    ).first()
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found"
        )
    
    if handoff_data.status:
        handoff.status = handoff_data.status
        if handoff_data.status == "resolved":
            handoff.resolved_at = datetime.utcnow()
    
    if handoff_data.priority:
        handoff.priority = handoff_data.priority
    
    if handoff_data.assigned_to_user_id is not None:
        handoff.assigned_to_user_id = handoff_data.assigned_to_user_id
        if handoff_data.assigned_to_user_id:
            handoff.assigned_at = datetime.utcnow()
    
    db.commit()
    db.refresh(handoff)
    
    return handoff


@router.get("/{handoff_id}", response_model=HandoffResponse)
async def get_handoff(
    handoff_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single handoff by ID."""
    business_id = get_user_business_id(current_user, db)
    
    handoff = db.query(Handoff).filter(
        Handoff.id == handoff_id,
        Handoff.business_id == business_id
    ).first()
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found"
        )
    
    return handoff


@router.delete("/{handoff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_handoff(
    handoff_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a handoff."""
    business_id = get_user_business_id(current_user, db)
    
    handoff = db.query(Handoff).filter(
        Handoff.id == handoff_id,
        Handoff.business_id == business_id
    ).first()
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found"
        )
    
    db.delete(handoff)
    db.commit()
    return None


@router.post("/{handoff_id}/assign/{user_id}")
async def assign_handoff(
    handoff_id: int,
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a handoff to a user."""
    business_id = get_user_business_id(current_user, db)
    
    handoff = db.query(Handoff).filter(
        Handoff.id == handoff_id,
        Handoff.business_id == business_id
    ).first()
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found"
        )
    
    # Verify user exists and belongs to business
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.business_id == business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    handoff.assigned_to_user_id = user_id
    handoff.assigned_at = datetime.utcnow()
    handoff.status = "assigned"
    
    db.commit()
    db.refresh(handoff)
    
    return {"success": True, "message": "Handoff assigned successfully"}


@router.post("/{handoff_id}/unassign")
async def unassign_handoff(
    handoff_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unassign a handoff."""
    business_id = get_user_business_id(current_user, db)
    
    handoff = db.query(Handoff).filter(
        Handoff.id == handoff_id,
        Handoff.business_id == business_id
    ).first()
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found"
        )
    
    handoff.assigned_to_user_id = None
    handoff.assigned_at = None
    handoff.status = "pending"
    
    db.commit()
    db.refresh(handoff)
    
    return {"success": True, "message": "Handoff unassigned successfully"}


@router.post("/bulk/assign")
async def bulk_assign_handoffs(
    handoff_ids: List[int],
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk assign handoffs to a user."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Handoff management requires a business account"
        )
    
    # Verify user exists
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.business_id == business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    handoffs = db.query(Handoff).filter(
        Handoff.id.in_(handoff_ids),
        Handoff.business_id == business_id
    ).all()
    
    updated_count = 0
    for handoff in handoffs:
        handoff.assigned_to_user_id = user_id
        handoff.assigned_at = datetime.utcnow()
        handoff.status = "assigned"
        updated_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{updated_count} handoffs assigned successfully",
        "updated_count": updated_count
    }


@router.get("/stats/dashboard")
async def get_handoff_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get handoff statistics for dashboard."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Handoff access requires a business account"
        )
    
    from collections import defaultdict
    
    # Total handoffs
    total_handoffs = db.query(func.count(Handoff.id)).filter(
        Handoff.business_id == business_id
    ).scalar()
    
    # By status
    status_counts = db.query(
        Handoff.status,
        func.count(Handoff.id)
    ).filter(
        Handoff.business_id == business_id
    ).group_by(Handoff.status).all()
    
    by_status = defaultdict(int)
    for status_val, count in status_counts:
        by_status[status_val] = count
    
    # By priority
    priority_counts = db.query(
        Handoff.priority,
        func.count(Handoff.id)
    ).filter(
        Handoff.business_id == business_id
    ).group_by(Handoff.priority).all()
    
    by_priority = defaultdict(int)
    for priority_val, count in priority_counts:
        by_priority[priority_val] = count
    
    # Recent handoffs (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_handoffs = db.query(func.count(Handoff.id)).filter(
        Handoff.business_id == business_id,
        Handoff.created_at >= seven_days_ago
    ).scalar()
    
    # Average resolution time
    resolved_handoffs = db.query(Handoff).filter(
        Handoff.business_id == business_id,
        Handoff.resolved_at.isnot(None)
    ).all()
    
    avg_resolution_minutes = 0
    if resolved_handoffs:
        total_minutes = sum(
            (h.resolved_at - h.created_at).total_seconds() / 60
            for h in resolved_handoffs
        )
        avg_resolution_minutes = round(total_minutes / len(resolved_handoffs), 2)
    
    return {
        "total_handoffs": total_handoffs,
        "by_status": dict(by_status),
        "by_priority": dict(by_priority),
        "recent_handoffs": recent_handoffs,
        "avg_resolution_minutes": avg_resolution_minutes,
        "pending_count": by_status.get("pending", 0),
        "assigned_count": by_status.get("assigned", 0),
        "in_progress_count": by_status.get("in_progress", 0),
        "resolved_count": by_status.get("resolved", 0),
    }


@router.get("/sla/", response_model=List[dict])
async def get_sla_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get SLA metrics."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SLA access requires a business account"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    slas = db.query(SLA).filter(
        SLA.business_id == business_id,
        SLA.created_at >= start_date
    ).all()
    
    total = len(slas)
    response_breached = sum(1 for s in slas if s.response_time_breached)
    resolution_breached = sum(1 for s in slas if s.resolution_time_breached)
    
    avg_response_time = sum(s.actual_response_time or 0 for s in slas) / total if total > 0 else 0
    avg_resolution_time = sum(s.actual_resolution_time or 0 for s in slas) / total if total > 0 else 0
    
    return {
        "total_handoffs": total,
        "response_breach_rate": (response_breached / total * 100) if total > 0 else 0,
        "resolution_breach_rate": (resolution_breached / total * 100) if total > 0 else 0,
        "avg_response_time_minutes": round(avg_response_time, 2),
        "avg_resolution_time_minutes": round(avg_resolution_time, 2),
    }


# ========== ESCALATION ENDPOINTS ==========

class EscalationCreate(BaseModel):
    handoff_id: int
    to_user_id: int
    reason: Optional[str] = None


class EscalationResponse(BaseModel):
    id: int
    business_id: int
    handoff_id: int
    from_user_id: Optional[int]
    to_user_id: Optional[int]
    reason: Optional[str]
    escalated_at: str
    resolved_at: Optional[str]
    
    class Config:
        from_attributes = True


@router.post("/escalations/", response_model=EscalationResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation(
    escalation_data: EscalationCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an escalation."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Escalation creation requires a business account"
        )
    
    # Verify handoff exists
    handoff = db.query(Handoff).filter(
        Handoff.id == escalation_data.handoff_id,
        Handoff.business_id == business_id
    ).first()
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found"
        )
    
    # Verify to_user exists
    to_user = db.query(UserModel).filter(
        UserModel.id == escalation_data.to_user_id,
        UserModel.business_id == business_id
    ).first()
    
    if not to_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Create escalation
    escalation = Escalation(
        business_id=business_id,
        handoff_id=escalation_data.handoff_id,
        from_user_id=current_user.id,
        to_user_id=escalation_data.to_user_id,
        reason=escalation_data.reason,
    )
    
    db.add(escalation)
    
    # Update handoff
    handoff.assigned_to_user_id = escalation_data.to_user_id
    handoff.priority = "urgent"
    
    db.commit()
    db.refresh(escalation)
    
    return escalation


@router.get("/escalations/", response_model=List[EscalationResponse])
async def get_escalations(
    handoff_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of escalations."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Escalation access requires a business account"
        )
    
    query = db.query(Escalation).filter(Escalation.business_id == business_id)
    
    if handoff_id:
        query = query.filter(Escalation.handoff_id == handoff_id)
    
    escalations = query.order_by(Escalation.escalated_at.desc()).all()
    
    return escalations


@router.put("/escalations/{escalation_id}/resolve")
async def resolve_escalation(
    escalation_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve an escalation."""
    business_id = get_user_business_id(current_user, db)
    
    escalation = db.query(Escalation).filter(
        Escalation.id == escalation_id,
        Escalation.business_id == business_id
    ).first()
    
    if not escalation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found"
        )
    
    escalation.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(escalation)
    
    return {"success": True, "message": "Escalation resolved successfully"}

