"""Onboarding API routes."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import OnboardingStep, OnboardingProgress, User as UserModel, ChannelIntegration
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


# ========== PYDANTIC MODELS ==========

class OnboardingProgressResponse(BaseModel):
    step_key: str
    title: str
    description: str
    order: int
    is_required: bool
    is_completed: bool
    completed_at: Optional[str] = None


# ========== ONBOARDING ENDPOINTS ==========

@router.get("/progress/", response_model=List[OnboardingProgressResponse])
async def get_progress(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get onboarding progress for current user."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding access requires a business account"
        )
    
    # Get all steps, or create default steps if none exist
    steps = db.query(OnboardingStep).order_by(OnboardingStep.order).all()
    
    # If no steps exist, create default steps
    if not steps:
        default_steps = [
            OnboardingStep(step_key='welcome', title='Welcome & Setup', description='Get started with your account', order=1, is_required=True),
            OnboardingStep(step_key='connect_channel', title='Connect Channels', description='Integrate your communication channels (Telegram, WhatsApp, etc.)', order=2, is_required=True),
            OnboardingStep(step_key='configure_ai_rules', title='Configure AI Rules', description='Set up your automation rules and responses', order=3, is_required=True),
            OnboardingStep(step_key='add_knowledge', title='Add Knowledge Base', description='Upload FAQs and responses to help your AI', order=4, is_required=True),
            OnboardingStep(step_key='review_analytics', title='Review Analytics', description='Explore your dashboard and insights', order=5, is_required=False),
            OnboardingStep(step_key='invite_team', title='Invite Team Members', description='Add team members to your workspace', order=6, is_required=False),
        ]
        for step in default_steps:
            db.add(step)
        db.commit()
        # Re-query to get the newly created steps
        steps = db.query(OnboardingStep).order_by(OnboardingStep.order).all()
    
    # Get progress
    progress_dict = {
        p.step_key: p for p in db.query(OnboardingProgress).filter(
            OnboardingProgress.user_id == current_user.id,
            OnboardingProgress.business_id == business_id
        ).all()
    }
    
    # Check if Telegram is connected (for connect_channel step)
    telegram_connected = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
        ChannelIntegration.channel == "telegram",
        ChannelIntegration.is_active == True
    ).first() is not None
    
    result = []
    for step in steps:
        progress = progress_dict.get(step.step_key)
        
        # Auto-complete connect_channel step if Telegram is connected
        is_completed = False
        completed_at = None
        
        if step.step_key == "connect_channel":
            # Auto-complete if Telegram is connected
            if telegram_connected:
                is_completed = True
                # Use existing progress completed_at if available, otherwise use current time
                if progress and progress.completed_at:
                    completed_at = progress.completed_at.isoformat()
                else:
                    completed_at = datetime.utcnow().isoformat()
            else:
                # Use manual completion status
                is_completed = progress.is_completed if progress else False
                completed_at = progress.completed_at.isoformat() if progress and progress.completed_at else None
        else:
            # For other steps, use manual completion status
            is_completed = progress.is_completed if progress else False
            completed_at = progress.completed_at.isoformat() if progress and progress.completed_at else None
        
        result.append({
            "step_key": step.step_key,
            "title": step.title,
            "description": step.description,
            "order": step.order,
            "is_required": step.is_required,
            "is_completed": is_completed,
            "completed_at": completed_at,
        })
    
    return result


@router.post("/complete-step/{step_key}", status_code=status.HTTP_204_NO_CONTENT)
async def complete_step(
    step_key: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an onboarding step as completed."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding access requires a business account"
        )
    
    # Verify step exists
    step = db.query(OnboardingStep).filter(OnboardingStep.step_key == step_key).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found"
        )
    
    # Get or create progress
    progress = db.query(OnboardingProgress).filter(
        OnboardingProgress.user_id == current_user.id,
        OnboardingProgress.business_id == business_id,
        OnboardingProgress.step_key == step_key
    ).first()
    
    if progress:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
    else:
        progress = OnboardingProgress(
            user_id=current_user.id,
            business_id=business_id,
            step_key=step_key,
            is_completed=True,
            completed_at=datetime.utcnow(),
        )
        db.add(progress)
    
    db.commit()
    
    return None


@router.post("/reset-step/{step_key}", status_code=status.HTTP_204_NO_CONTENT)
async def reset_step(
    step_key: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset/uncomplete an onboarding step."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding access requires a business account"
        )
    
    # Get progress
    progress = db.query(OnboardingProgress).filter(
        OnboardingProgress.user_id == current_user.id,
        OnboardingProgress.business_id == business_id,
        OnboardingProgress.step_key == step_key
    ).first()
    
    if progress:
        progress.is_completed = False
        progress.completed_at = None
        db.commit()
    
    return None


@router.post("/skip-step/{step_key}", status_code=status.HTTP_204_NO_CONTENT)
async def skip_step(
    step_key: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Skip an onboarding step (mark as completed but track it was skipped)."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding access requires a business account"
        )
    
    # Verify step exists and is not required
    step = db.query(OnboardingStep).filter(OnboardingStep.step_key == step_key).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found"
        )
    
    if step.is_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot skip required steps"
        )
    
    # Get or create progress
    progress = db.query(OnboardingProgress).filter(
        OnboardingProgress.user_id == current_user.id,
        OnboardingProgress.business_id == business_id,
        OnboardingProgress.step_key == step_key
    ).first()
    
    if progress:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
    else:
        progress = OnboardingProgress(
            user_id=current_user.id,
            business_id=business_id,
            step_key=step_key,
            is_completed=True,
            completed_at=datetime.utcnow(),
        )
        db.add(progress)
    
    db.commit()
    
    return None


@router.get("/stats")
async def get_onboarding_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get onboarding statistics."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding access requires a business account"
        )
    
    from sqlalchemy import func
    
    # Get all steps
    steps = db.query(OnboardingStep).all()
    total_steps = len(steps)
    required_steps = len([s for s in steps if s.is_required])
    optional_steps = total_steps - required_steps
    
    # Get completed progress
    completed_progress = db.query(OnboardingProgress).filter(
        OnboardingProgress.user_id == current_user.id,
        OnboardingProgress.business_id == business_id,
        OnboardingProgress.is_completed == True
    ).all()
    
    completed_steps = len(completed_progress)
    
    # Check auto-completed steps (like Telegram connection)
    telegram_connected = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
        ChannelIntegration.channel == "telegram",
        ChannelIntegration.is_active == True
    ).first() is not None
    
    if telegram_connected:
        # Check if connect_channel is in completed_progress
        connect_channel_completed = any(p.step_key == "connect_channel" for p in completed_progress)
        if not connect_channel_completed:
            completed_steps += 1
    
    # Calculate percentage
    percentage = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    
    # Determine status
    if completed_steps == total_steps:
        status_text = "completed"
    elif completed_steps >= required_steps:
        status_text = "almost_done"
    elif completed_steps > 0:
        status_text = "in_progress"
    else:
        status_text = "not_started"
    
    return {
        "total_steps": total_steps,
        "completed_steps": completed_steps,
        "required_steps": required_steps,
        "optional_steps": optional_steps,
        "percentage": percentage,
        "status": status_text,
        "is_complete": completed_steps == total_steps,
    }

