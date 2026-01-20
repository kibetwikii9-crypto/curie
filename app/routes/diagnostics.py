"""Diagnostic endpoints for debugging dashboard issues."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Conversation, User as UserModel, Business, ChannelIntegration
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/diagnostics", tags=["diagnostics"])


@router.get("/conversations-check")
async def check_conversations(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Diagnostic endpoint to check conversation data and business_id matching.
    Helps debug why conversations aren't showing on dashboard.
    """
    user_business_id = get_user_business_id(current_user, db)
    
    # Get all conversations (for admin) or user's business conversations
    if user_business_id is None:
        # Admin - show all
        all_conversations = db.query(Conversation).all()
        total_count = db.query(func.count(Conversation.id)).scalar() or 0
        conversations_by_business = db.query(
            Conversation.business_id,
            func.count(Conversation.id).label("count")
        ).group_by(Conversation.business_id).all()
    else:
        # Regular user - show their business
        all_conversations = db.query(Conversation).filter(
            Conversation.business_id == user_business_id
        ).all()
        total_count = db.query(func.count(Conversation.id)).filter(
            Conversation.business_id == user_business_id
        ).scalar() or 0
        conversations_by_business = [(user_business_id, total_count)]
    
    # Get user's business info
    user_business = None
    if user_business_id:
        user_business = db.query(Business).filter(Business.id == user_business_id).first()
    
    # Get all businesses with their conversation counts
    all_businesses = db.query(
        Business.id,
        Business.name,
        Business.owner_id,
        func.count(Conversation.id).label("conversation_count")
    ).outerjoin(Conversation, Business.id == Conversation.business_id).group_by(
        Business.id, Business.name, Business.owner_id
    ).all()
    
    # Get all Telegram integrations
    telegram_integrations = db.query(ChannelIntegration).filter(
        ChannelIntegration.channel == "telegram",
        ChannelIntegration.is_active == True
    ).all()
    
    # Sample conversations
    sample_conversations = []
    for conv in all_conversations[:10]:  # First 10
        sample_conversations.append({
            "id": conv.id,
            "business_id": conv.business_id,
            "user_id": conv.user_id,
            "channel": conv.channel,
            "intent": conv.intent,
            "created_at": conv.created_at.isoformat(),
            "message_preview": conv.user_message[:50] + "..." if len(conv.user_message) > 50 else conv.user_message,
        })
    
    return {
        "user_info": {
            "user_id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
            "business_id": user_business_id,
        },
        "user_business": {
            "id": user_business.id if user_business else None,
            "name": user_business.name if user_business else None,
            "owner_id": user_business.owner_id if user_business else None,
        } if user_business else None,
        "conversation_stats": {
            "total_for_user_business": total_count,
            "conversations_by_business": [
                {"business_id": bid, "count": count} 
                for bid, count in conversations_by_business
            ],
        },
        "all_businesses": [
            {
                "id": bid,
                "name": name,
                "owner_id": owner_id,
                "conversation_count": conv_count,
            }
            for bid, name, owner_id, conv_count in all_businesses
        ],
        "telegram_integrations": [
            {
                "id": integration.id,
                "business_id": integration.business_id,
                "channel_name": integration.channel_name,
                "is_active": integration.is_active,
                "webhook_url": integration.webhook_url,
            }
            for integration in telegram_integrations
        ],
        "sample_conversations": sample_conversations,
        "diagnosis": {
            "user_has_business": user_business_id is not None,
            "conversations_exist": total_count > 0,
            "business_id_matches": (
                user_business_id is not None and 
                any(bid == user_business_id for bid, _ in conversations_by_business)
            ) if conversations_by_business else False,
        },
    }





