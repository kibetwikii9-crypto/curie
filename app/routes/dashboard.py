"""Dashboard API routes for analytics and data retrieval."""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Conversation, Lead, AnalyticsEvent, ChannelIntegration, User as UserModel, Message, ConversationMemory, KnowledgeEntry, AdAsset, Business
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview")
async def get_overview(
    days: int = Query(7, ge=1, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dashboard overview statistics with extended insights."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    # If business_owner has no business_id, return empty results with helpful message
    if current_user.role == "business_owner" and business_id is None:
        log.warning(f"User {current_user.id} ({current_user.email}) is business_owner but has no business_id. No data will be returned.")
        # Return empty structure but don't raise error - let frontend show empty state
        return {
            "total_conversations": 0,
            "active_chats": 0,
            "total_leads": 0,
            "most_common_intents": [],
            "channel_distribution": [],
            "system_health": {
                "ai_engine_status": "operational",
                "fallback_rate": 0,
                "rule_coverage": 0,
                "channel_connectivity": 0,
            },
            "channel_performance": [],
            "intent_quality": [],
            "conversation_flow": {
                "total_incoming": 0,
                "ai_responses": 0,
                "engaged_conversations": 0,
                "leads_captured": 0,
                "human_handoffs": 0,
            },
            "alerts": [{
                "type": "warning",
                "priority": "high",
                "title": "No Business Associated",
                "message": "Your account is not linked to a business. Please contact support or check your account settings.",
            }],
            "period_days": days,
        }
    
    start_date = datetime.utcnow() - timedelta(days=days)
    last_24h = datetime.utcnow() - timedelta(hours=24)

    # Build base query filters
    conv_filter = Conversation.created_at >= start_date
    lead_filter = Lead.created_at >= start_date
    
    # Filter by business_id if user is not admin
    if business_id is not None:
        conv_filter = and_(conv_filter, Conversation.business_id == business_id)
        lead_filter = and_(lead_filter, Lead.business_id == business_id)

    # Total conversations
    total_conversations = db.query(func.count(Conversation.id)).filter(conv_filter).scalar() or 0

    # Active chats (conversations in last 24 hours)
    active_chats_filter = Conversation.created_at >= last_24h
    if business_id is not None:
        active_chats_filter = and_(active_chats_filter, Conversation.business_id == business_id)
    active_chats = db.query(func.count(Conversation.id)).filter(active_chats_filter).scalar() or 0

    # Leads captured
    total_leads = db.query(func.count(Lead.id)).filter(lead_filter).scalar() or 0

    # Most common intents
    intent_counts = (
        db.query(Conversation.intent, func.count(Conversation.id).label("count"))
        .filter(conv_filter)
        .group_by(Conversation.intent)
        .order_by(func.count(Conversation.id).desc())
        .limit(5)
        .all()
    )
    most_common_intents = [{"intent": intent, "count": count} for intent, count in intent_counts]

    # Channel distribution
    channel_counts = (
        db.query(Conversation.channel, func.count(Conversation.id).label("count"))
        .filter(conv_filter)
        .group_by(Conversation.channel)
        .all()
    )
    channel_distribution = [{"channel": channel, "count": count} for channel, count in channel_counts]

    # ========== NEW EXTENDED DATA ==========
    
    # System Health: AI engine status (always running for rule-based)
    # System Health: Fallback trigger rate (unknown intents)
    unknown_filter = and_(Conversation.intent == "unknown", conv_filter)
    unknown_intent_count = db.query(func.count(Conversation.id)).filter(unknown_filter).scalar() or 0
    fallback_rate = (unknown_intent_count / total_conversations * 100) if total_conversations > 0 else 0

    # System Health: Rule coverage (intents with responses vs missing)
    all_intents = db.query(Conversation.intent).filter(conv_filter).distinct().all()
    covered_intents = [intent[0] for intent in all_intents if intent[0] and intent[0] != "unknown"]
    rule_coverage = len(covered_intents) / max(len(all_intents), 1) * 100 if all_intents else 100

    # System Health: Channel connectivity (active channels) - filter by business
    channel_filter = ChannelIntegration.is_active == True
    if business_id is not None:
        channel_filter = and_(channel_filter, ChannelIntegration.business_id == business_id)
    active_channels = db.query(ChannelIntegration.channel).filter(channel_filter).distinct().all()
    channel_connectivity = len(active_channels)

    # Channel Performance Intelligence
    channel_performance = []
    for channel, count in channel_counts:
        channel_lead_filter = and_(Lead.channel == channel, lead_filter)
        channel_leads = db.query(func.count(Lead.id)).filter(channel_lead_filter).scalar() or 0
        lead_rate = (channel_leads / count * 100) if count > 0 else 0
        
        # AI resolution rate (conversations that didn't escalate to human)
        # Calculate based on actual data - all conversations are AI-handled in current system
        # In future, track human handoffs to calculate accurately
        total_channel_conv = db.query(func.count(Conversation.id)).filter(channel_conv_filter).scalar() or 0
        ai_resolution_rate = 100.0 if total_channel_conv > 0 else 0.0  # All are AI-resolved currently
        
        # Peak activity (hour with most messages)
        channel_conv_filter = and_(Conversation.channel == channel, conv_filter)
        hour_counts = (
            db.query(func.extract('hour', Conversation.created_at).label("hour"), 
                    func.count(Conversation.id).label("count"))
            .filter(channel_conv_filter)
            .group_by(func.extract('hour', Conversation.created_at))
            .order_by(func.count(Conversation.id).desc())
            .first()
        )
        peak_hour = int(hour_counts[0]) if hour_counts else None
        
        channel_performance.append({
            "channel": channel,
            "message_volume": count,
            "lead_capture_rate": round(lead_rate, 1),
            "ai_resolution_rate": round(ai_resolution_rate, 1),
            "peak_activity_hour": peak_hour,
        })

    # Intent Quality & Coverage
    intent_quality = []
    for intent, count in intent_counts:
        # Leads generated by this intent
        intent_lead_filter = and_(Lead.source_intent == intent, lead_filter)
        intent_leads = db.query(func.count(Lead.id)).filter(intent_lead_filter).scalar() or 0
        
        # Fallback rate for this intent (if unknown)
        is_fallback = (intent == "unknown")
        
        intent_quality.append({
            "intent": intent,
            "count": count,
            "leads_generated": intent_leads,
            "is_fallback": is_fallback,
        })
    
    # Top performing intents (by lead generation)
    top_intents_by_leads = sorted(intent_quality, key=lambda x: x["leads_generated"], reverse=True)[:3]
    
    # Intents causing fallbacks
    fallback_intents = [iq for iq in intent_quality if iq["is_fallback"]]

    # Conversation Flow Funnel
    total_incoming = total_conversations
    ai_responses = total_conversations  # All conversations have AI responses
    # User engagement (conversations with multiple messages - simplified)
    engaged_conversations = db.query(func.count(func.distinct(Conversation.user_id))).filter(
        conv_filter
    ).scalar() or 0
    leads_captured = total_leads
    # Human handoff (placeholder - no tracking yet)
    human_handoffs = 0

    # Smart Alerts & Recommendations
    alerts = []
    if fallback_rate > 15:
        alerts.append({
            "type": "warning",
            "priority": "high",
            "title": "High Fallback Rate",
            "message": f"{round(fallback_rate, 1)}% of conversations are falling back to default responses. Consider adding intent rules.",
        })
    if rule_coverage < 80:
        alerts.append({
            "type": "info",
            "priority": "medium",
            "title": "Rule Coverage Gap",
            "message": f"Only {round(rule_coverage, 1)}% of detected intents have custom responses.",
        })
    # Channel underperforming
    if channel_performance:
        min_lead_rate = min(cp["lead_capture_rate"] for cp in channel_performance)
        underperforming = [cp for cp in channel_performance if cp["lead_capture_rate"] == min_lead_rate and min_lead_rate < 5]
        if underperforming:
            alerts.append({
                "type": "info",
                "priority": "medium",
                "title": "Channel Performance",
                "message": f"{underperforming[0]['channel']} has low lead capture rate ({min_lead_rate}%).",
            })

    # Recent Activity Timeline
    recent_leads = db.query(Lead).filter(lead_filter).order_by(Lead.created_at.desc()).limit(5).all()
    
    recent_events = []
    for lead in recent_leads:
        recent_events.append({
            "type": "lead",
            "title": f"New lead from {lead.channel}",
            "description": f"{lead.name or 'Anonymous'} - {lead.source_intent or 'unknown intent'}",
            "timestamp": lead.created_at.isoformat(),
        })
    
    # Add intent gap events (unknown intents)
    if unknown_intent_count > 0:
        recent_events.append({
            "type": "intent_gap",
            "title": "Intent Gap Detected",
            "description": f"{unknown_intent_count} conversations with unknown intent in the last {days} days",
            "timestamp": datetime.utcnow().isoformat(),
        })

    # Lead Snapshot Summary
    leads_today_filter = func.date(Lead.created_at) == func.date(datetime.utcnow())
    if business_id is not None:
        leads_today_filter = and_(leads_today_filter, Lead.business_id == business_id)
    leads_today = db.query(func.count(Lead.id)).filter(leads_today_filter).scalar() or 0
    
    leads_week_filter = Lead.created_at >= datetime.utcnow() - timedelta(days=7)
    if business_id is not None:
        leads_week_filter = and_(leads_week_filter, Lead.business_id == business_id)
    leads_this_week = db.query(func.count(Lead.id)).filter(leads_week_filter).scalar() or 0
    
    # Best performing channel for leads
    best_channel_leads = (
        db.query(Lead.channel, func.count(Lead.id).label("count"))
        .filter(lead_filter)
        .group_by(Lead.channel)
        .order_by(func.count(Lead.id).desc())
        .first()
    )
    best_channel = best_channel_leads[0] if best_channel_leads else None
    
    # Top lead-generating intent
    top_lead_intent = (
        db.query(Lead.source_intent, func.count(Lead.id).label("count"))
        .filter(and_(lead_filter, Lead.source_intent.isnot(None)))
        .group_by(Lead.source_intent)
        .order_by(func.count(Lead.id).desc())
        .first()
    )
    top_lead_intent_name = top_lead_intent[0] if top_lead_intent else None

    # Time-Based Performance Insights
    # Best performing hour
    hour_performance = (
        db.query(func.extract('hour', Conversation.created_at).label("hour"),
                func.count(Conversation.id).label("count"))
        .filter(conv_filter)
        .group_by(func.extract('hour', Conversation.created_at))
        .order_by(func.count(Conversation.id).desc())
        .first()
    )
    best_hour = int(hour_performance[0]) if hour_performance else None
    
    # Best performing day of week
    day_performance = (
        db.query(func.extract('dow', Conversation.created_at).label("day"),
                func.count(Conversation.id).label("count"))
        .filter(conv_filter)
        .group_by(func.extract('dow', Conversation.created_at))
        .order_by(func.count(Conversation.id).desc())
        .first()
    )
    best_day = int(day_performance[0]) if day_performance else None
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    best_day_name = day_names[best_day] if best_day is not None else None

    return {
        # Existing data
        "total_conversations": total_conversations,
        "active_chats": active_chats,
        "leads_captured": total_leads,
        "most_common_intents": most_common_intents,
        "channel_distribution": channel_distribution,
        "period_days": days,
        # New extended data
        "system_health": {
            "ai_engine_status": "running",
            "rule_coverage_health": round(rule_coverage, 1),
            "fallback_trigger_rate": round(fallback_rate, 1),
            "channel_connectivity": channel_connectivity,
        },
        "channel_performance": channel_performance,
        "intent_quality": {
            "top_performing": top_intents_by_leads,
            "lead_generating": [iq for iq in intent_quality if iq["leads_generated"] > 0],
            "causing_fallbacks": fallback_intents,
        },
        "conversation_flow": {
            "incoming": total_incoming,
            "ai_responses": ai_responses,
            "user_engagement": engaged_conversations,
            "leads_captured": leads_captured,
            "human_handoffs": human_handoffs,
        },
        "alerts": alerts[:5],  # Limit to 5 most important
        "recent_activity": recent_events[:10],  # Limit to 10 most recent
        "lead_snapshot": {
            "leads_today": leads_today,
            "leads_this_week": leads_this_week,
            "best_channel": best_channel,
            "top_lead_intent": top_lead_intent_name,
        },
        "time_insights": {
            "best_hour": best_hour,
            "best_day": best_day_name,
        },
    }


@router.get("/conversations")
async def get_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    channel: Optional[str] = None,
    intent: Optional[str] = None,
    status: Optional[str] = None,  # ai-handled, human-assisted, escalated
    has_fallback: Optional[bool] = None,  # Filter by fallback status
    has_lead: Optional[bool] = None,  # Filter by lead potential
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated conversations list with intelligence data."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Conversation)
    
    # Filter by business_id if user is not admin
    if business_id is not None:
        query = query.filter(Conversation.business_id == business_id)

    # Apply filters
    if channel:
        query = query.filter(Conversation.channel == channel)
    if intent:
        query = query.filter(Conversation.intent == intent)
    if has_fallback is not None:
        if has_fallback:
            query = query.filter(Conversation.intent == "unknown")
        else:
            query = query.filter(Conversation.intent != "unknown")
    if has_lead is not None:
        # Check if conversation has associated lead
        # Simplified approach: filter by user_ids that have leads
        lead_query = db.query(Lead.user_id).distinct()
        if business_id is not None:
            lead_query = lead_query.filter(Lead.business_id == business_id)
        lead_user_ids = lead_query.all()
        lead_user_id_list = [uid[0] for uid in lead_user_ids] if lead_user_ids else []
        
        if has_lead:
            if lead_user_id_list:
                query = query.filter(Conversation.user_id.in_(lead_user_id_list))
            else:
                # No leads exist, return empty result
                query = query.filter(Conversation.id == -1)  # Impossible condition
        else:
            if lead_user_id_list:
                query = query.filter(~Conversation.user_id.in_(lead_user_id_list))

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * limit
    conversations = query.order_by(Conversation.created_at.desc()).offset(offset).limit(limit).all()

    # Build response with intelligence data
    result_conversations = []
    for conv in conversations:
        # Get conversation memory for context
        memory_filter = and_(
            ConversationMemory.user_id == conv.user_id,
            ConversationMemory.channel == conv.channel
        )
        if business_id is not None:
            memory_filter = and_(memory_filter, ConversationMemory.business_id == business_id)
        memory = db.query(ConversationMemory).filter(memory_filter).first()

        # Count messages for this conversation
        message_filter = and_(
            Message.user_id == conv.user_id,
            Message.channel == conv.channel
        )
        if business_id is not None:
            message_filter = and_(message_filter, Message.business_id == business_id)
        message_count = db.query(func.count(Message.id)).filter(message_filter).scalar() or 1

        # Check for associated lead
        lead_filter = and_(
            Lead.user_id == conv.user_id,
            Lead.channel == conv.channel
        )
        if business_id is not None:
            lead_filter = and_(lead_filter, Lead.business_id == business_id)
        lead = db.query(Lead).filter(lead_filter).first()

        # Determine conversation status
        status_value = "ai-handled"  # Default - all are AI-handled in Phase 1
        if conv.intent == "unknown":
            status_value = "needs-attention"
        if lead:
            status_value = "lead-captured"

        # Calculate fallback count (unknown intents for this user)
        fallback_filter = and_(
            Conversation.user_id == conv.user_id,
            Conversation.channel == conv.channel,
            Conversation.intent == "unknown"
        )
        if business_id is not None:
            fallback_filter = and_(fallback_filter, Conversation.business_id == business_id)
        fallback_count = db.query(func.count(Conversation.id)).filter(fallback_filter).scalar() or 0

        # Generate smart labels
        labels = []
        if lead:
            labels.append("Lead Captured")
        if conv.intent == "pricing":
            labels.append("Pricing Inquiry")
        if conv.intent == "unknown":
            labels.append("Unresolved")
        if message_count > 3:
            labels.append("Repeat Customer")
        if lead and lead.status == "new":
            labels.append("High Intent")

        # Check for health indicators
        health_indicators = []
        if fallback_count > 2:
            health_indicators.append("repeated_fallbacks")
        if conv.intent == "unknown":
            health_indicators.append("unresolved_intent")

        result_conversations.append({
            "id": conv.id,
            "user_id": conv.user_id,
            "channel": conv.channel,
            "user_message": conv.user_message,
            "bot_reply": conv.bot_reply,
            "intent": conv.intent,
            "created_at": conv.created_at.isoformat(),
            # Extended intelligence data
            "status": status_value,
            "message_count": message_count,
            "fallback_count": fallback_count,
            "labels": labels,
            "health_indicators": health_indicators,
            "has_lead": lead is not None,
            "lead_id": lead.id if lead else None,
        })

    return {
        "conversations": result_conversations,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/knowledge")
async def get_knowledge_base(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    intent: Optional[str] = None,
    status: Optional[str] = None,  # active, inactive, needs-review
    search: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get knowledge base entries with intelligence data."""
    from sqlalchemy import or_
    import json
    
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    query = db.query(KnowledgeEntry).filter(KnowledgeEntry.business_id == business_id)
    
    # Apply filters
    if intent:
        query = query.filter(KnowledgeEntry.intent == intent)
    if status == "active":
        query = query.filter(KnowledgeEntry.is_active == True)
    elif status == "inactive":
        query = query.filter(KnowledgeEntry.is_active == False)
    if search:
        query = query.filter(
            (KnowledgeEntry.question.ilike(f"%{search}%")) |
            (KnowledgeEntry.answer.ilike(f"%{search}%"))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    entries = query.order_by(KnowledgeEntry.updated_at.desc()).offset(offset).limit(limit).all()
    
    # Get all intents from conversations
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Build response with intelligence data
    result_entries = []
    for entry in entries:
        # Count usage in conversations (simple keyword matching)
        usage_count = 0
        keywords = []
        if entry.keywords:
            try:
                keywords = json.loads(entry.keywords) if isinstance(entry.keywords, str) else entry.keywords
                if keywords and isinstance(keywords, list):
                    # Count conversations with matching keywords (filtered by business)
                    usage_filter = and_(
                        Conversation.created_at >= start_date,
                        Conversation.business_id == business_id,
                        or_(*[Conversation.user_message.ilike(f"%{kw}%") for kw in keywords[:3]])
                    )
                    usage_count = db.query(func.count(Conversation.id)).filter(usage_filter).scalar() or 0
            except:
                keywords = []
        
        # Check if entry is linked to intent
        has_intent_link = entry.intent is not None and entry.intent != ""
        
        # Determine quality signals
        quality_signals = []
        if usage_count > 10:
            quality_signals.append("high_performing")
        elif usage_count == 0:
            quality_signals.append("unused")
        if not has_intent_link:
            quality_signals.append("needs_intent_link")
        if entry.is_active == False:
            quality_signals.append("inactive")
        
        # Get last used timestamp (simplified - use updated_at for now)
        last_used = entry.updated_at.isoformat()
        
        result_entries.append({
            "id": entry.id,
            "question": entry.question,
            "answer": entry.answer,
            "keywords": keywords,
            "intent": entry.intent,
            "is_active": entry.is_active,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
            # Intelligence data
            "usage_count": usage_count,
            "quality_signals": quality_signals,
            "has_intent_link": has_intent_link,
            "last_used": last_used,
        })
    
    return {
        "entries": result_entries,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/knowledge/health")
async def get_knowledge_health(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get knowledge base health and coverage metrics."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Total knowledge entries
    total_entries = db.query(func.count(KnowledgeEntry.id)).filter(
        KnowledgeEntry.business_id == business_id
    ).scalar() or 0
    
    # Active entries
    active_entries = db.query(func.count(KnowledgeEntry.id)).filter(
        KnowledgeEntry.business_id == business_id,
        KnowledgeEntry.is_active == True
    ).scalar() or 0
    
    # Entries with intent links
    entries_with_intent = db.query(func.count(KnowledgeEntry.id)).filter(
        KnowledgeEntry.business_id == business_id,
        KnowledgeEntry.intent.isnot(None),
        KnowledgeEntry.intent != ""
    ).scalar() or 0
    
    # Get all intents from conversations (filtered by business)
    conv_intent_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.business_id == business_id
    )
    conversation_intents = db.query(Conversation.intent).filter(conv_intent_filter).distinct().all()
    all_intents = [intent[0] for intent in conversation_intents if intent[0] and intent[0] != "unknown"]
    
    # Get intents with knowledge entries
    knowledge_intents = db.query(KnowledgeEntry.intent).filter(
        KnowledgeEntry.business_id == business_id,
        KnowledgeEntry.intent.isnot(None),
        KnowledgeEntry.intent != ""
    ).distinct().all()
    knowledge_intent_list = [intent[0] for intent in knowledge_intents]
    
    # Intents without knowledge
    intents_without_knowledge = [intent for intent in all_intents if intent not in knowledge_intent_list]
    
    return {
        "total_entries": total_entries,
        "active_entries": active_entries,
        "entries_with_intent": entries_with_intent,
        "intents_without_knowledge": intents_without_knowledge,
        "unused_entries_count": 0,  # Would need more complex logic
        "coverage_percentage": round((len(knowledge_intent_list) / max(len(all_intents), 1)) * 100, 1) if all_intents else 100,
    }


@router.get("/knowledge/mapping")
async def get_intent_knowledge_mapping(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get intent to knowledge entry mapping."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Get all intents from conversations (filtered by business)
    conv_intent_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.business_id == business_id
    )
    conversation_intents = db.query(Conversation.intent, func.count(Conversation.id).label("count")).filter(
        conv_intent_filter
    ).group_by(Conversation.intent).all()
    
    # Get all knowledge entries (filtered by business)
    knowledge_entries = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.business_id == business_id
    ).all()
    
    # Build mapping
    mapping = []
    for intent, count in conversation_intents:
        if intent and intent != "unknown":
            linked_entries = [entry for entry in knowledge_entries if entry.intent == intent]
            mapping.append({
                "intent": intent,
                "conversation_count": count,
                "knowledge_entries": [
                    {
                        "id": entry.id,
                        "question": entry.question,
                        "is_active": entry.is_active,
                    }
                    for entry in linked_entries
                ],
                "has_coverage": len(linked_entries) > 0,
            })
    
    return {
        "mapping": mapping,
    }


@router.get("/knowledge/{entry_id}")
async def get_knowledge_entry_detail(
    entry_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed knowledge entry with usage data."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    from sqlalchemy import or_
    import json
    
    entry = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.id == entry_id,
        KnowledgeEntry.business_id == business_id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Get usage timeline
    keywords = []
    if entry.keywords:
        try:
            keywords = json.loads(entry.keywords) if isinstance(entry.keywords, str) else entry.keywords
        except:
            pass
    
    # Get conversations with matching keywords
    usage_timeline = []
    if keywords and isinstance(keywords, list):
        for keyword in keywords[:5]:
            conversations = db.query(Conversation).filter(
                Conversation.user_message.ilike(f"%{keyword}%"),
                Conversation.created_at >= start_date
            ).order_by(Conversation.created_at.desc()).limit(10).all()
            
            for conv in conversations:
                usage_timeline.append({
                    "type": "used_in_conversation",
                    "timestamp": conv.created_at.isoformat(),
                    "conversation_id": conv.id,
                    "user_message": conv.user_message[:100],
                    "matched_keyword": keyword,
                })
    
    # Sort by timestamp
    usage_timeline.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "entry": {
            "id": entry.id,
            "question": entry.question,
            "answer": entry.answer,
            "keywords": keywords,
            "intent": entry.intent,
            "is_active": entry.is_active,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
        },
        "usage_timeline": usage_timeline[:20],
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed conversation with full context, AI reasoning, and timeline."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Conversation).filter(Conversation.id == conversation_id)
    
    # Filter by business_id if user is not admin
    if business_id is not None:
        query = query.filter(Conversation.business_id == business_id)
    
    conversation = query.first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get all messages for this conversation
    messages = db.query(Message).filter(
        Message.user_id == conversation.user_id,
        Message.channel == conversation.channel
    ).order_by(Message.created_at.asc()).all()

    # Get conversation memory (filtered by business)
    memory_filter = and_(
        ConversationMemory.user_id == conversation.user_id,
        ConversationMemory.channel == conversation.channel
    )
    if business_id is not None:
        memory_filter = and_(memory_filter, ConversationMemory.business_id == business_id)
    memory = db.query(ConversationMemory).filter(memory_filter).first()

    # Get associated lead (filtered by business)
    lead_filter = and_(
        Lead.user_id == conversation.user_id,
        Lead.channel == conversation.channel
    )
    if business_id is not None:
        lead_filter = and_(lead_filter, Lead.business_id == business_id)
    lead = db.query(Lead).filter(lead_filter).first()

    # Get all conversations from this user for timeline (filtered by business)
    all_user_conv_filter = and_(
        Conversation.user_id == conversation.user_id,
        Conversation.channel == conversation.channel
    )
    if business_id is not None:
        all_user_conv_filter = and_(all_user_conv_filter, Conversation.business_id == business_id)
    all_user_conversations = db.query(Conversation).filter(all_user_conv_filter).order_by(Conversation.created_at.asc()).all()

    # Count fallbacks (filtered by business)
    fallback_filter = and_(
        Conversation.user_id == conversation.user_id,
        Conversation.channel == conversation.channel,
        Conversation.intent == "unknown"
    )
    if business_id is not None:
        fallback_filter = and_(fallback_filter, Conversation.business_id == business_id)
    fallback_count = db.query(func.count(Conversation.id)).filter(fallback_filter).scalar() or 0

    # Determine status
    status_value = "ai-handled"
    if conversation.intent == "unknown":
        status_value = "needs-attention"
    if lead:
        status_value = "lead-captured"

    # Build AI reasoning trace (rule-based)
    ai_reasoning = {
        "detected_intent": conversation.intent,
        "confidence": "high" if conversation.intent != "unknown" else "low",
        "intent_history": [{"intent": conv.intent, "timestamp": conv.created_at.isoformat()} for conv in all_user_conversations],
        "rules_matched": [conversation.intent] if conversation.intent != "unknown" else [],
        "knowledge_base_used": False,  # Can be enhanced later
        "fallback_reason": "Unknown intent detected" if conversation.intent == "unknown" else None,
        "context_used": {
            "last_intent": memory.last_intent if memory else None,
            "message_count": memory.message_count if memory else 0,
        }
    }

    # Build timeline with enhancements
    timeline = []
    for conv in all_user_conversations:
        timeline.append({
            "type": "conversation",
            "timestamp": conv.created_at.isoformat(),
            "intent": conv.intent,
            "user_message": conv.user_message[:100] + "..." if len(conv.user_message) > 100 else conv.user_message,
            "bot_reply": conv.bot_reply[:100] + "..." if len(conv.bot_reply) > 100 else conv.bot_reply,
            "is_fallback": conv.intent == "unknown",
        })

    # Add lead capture event if exists
    if lead:
        timeline.append({
            "type": "lead_capture",
            "timestamp": lead.created_at.isoformat(),
            "lead_id": lead.id,
            "source_intent": lead.source_intent,
        })

    # Sort timeline by timestamp
    timeline.sort(key=lambda x: x["timestamp"])

    # Health indicators
    health_indicators = []
    if fallback_count > 2:
        health_indicators.append({
            "type": "repeated_fallbacks",
            "severity": "warning",
            "message": f"{fallback_count} fallback responses detected",
        })
    if conversation.intent == "unknown":
        health_indicators.append({
            "type": "unresolved_intent",
            "severity": "info",
            "message": "Intent could not be determined",
        })

    return {
        "conversation": {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "channel": conversation.channel,
            "user_message": conversation.user_message,
            "bot_reply": conversation.bot_reply,
            "intent": conversation.intent,
            "created_at": conversation.created_at.isoformat(),
        },
        "status": status_value,
        "intelligence": {
            "primary_intent": conversation.intent,
            "confidence": "high" if conversation.intent != "unknown" else "low",
            "fallback_count": fallback_count,
            "message_count": len(messages),
        },
        "ai_reasoning": ai_reasoning,
        "timeline": timeline,
        "health_indicators": health_indicators,
        "lead": {
            "id": lead.id,
            "name": lead.name,
            "email": lead.email,
            "phone": lead.phone,
            "status": lead.status,
            "source_intent": lead.source_intent,
            "created_at": lead.created_at.isoformat(),
        } if lead else None,
        "messages": [
            {
                "id": msg.id,
                "text": msg.message_text,
                "is_from_user": msg.is_from_user,
                "intent": msg.intent,
                "timestamp": msg.created_at.isoformat(),
            }
            for msg in messages
        ],
    }


@router.get("/analytics/intents")
async def get_intent_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get intent analytics over time."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)

    # Intent frequency (filtered by business)
    intent_filter = Conversation.created_at >= start_date
    if business_id is not None:
        intent_filter = and_(intent_filter, Conversation.business_id == business_id)
    
    intent_data = (
        db.query(Conversation.intent, func.count(Conversation.id).label("count"))
        .filter(intent_filter)
        .group_by(Conversation.intent)
        .order_by(func.count(Conversation.id).desc())
        .all()
    )

    return {
        "intents": [{"intent": intent, "count": count} for intent, count in intent_data],
        "period_days": days,
    }


@router.get("/analytics/channels")
async def get_channel_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get channel performance analytics."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)

    # Channel data (filtered by business)
    channel_filter = Conversation.created_at >= start_date
    if business_id is not None:
        channel_filter = and_(channel_filter, Conversation.business_id == business_id)

    channel_data = (
        db.query(
            Conversation.channel,
            func.count(Conversation.id).label("total"),
            func.count(func.distinct(Conversation.user_id)).label("unique_users"),
        )
        .filter(channel_filter)
        .group_by(Conversation.channel)
        .all()
    )

    return {
        "channels": [
            {"channel": channel, "total_conversations": total, "unique_users": unique_users}
            for channel, total, unique_users in channel_data
        ],
        "period_days": days,
    }


@router.get("/analytics/timeline")
async def get_timeline_analytics(
    days: int = Query(7, ge=1, le=90),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get conversation timeline data."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)

    # Group by day (filtered by business)
    timeline_filter = Conversation.created_at >= start_date
    if business_id is not None:
        timeline_filter = and_(timeline_filter, Conversation.business_id == business_id)
    
    timeline_data = (
        db.query(
            func.date(Conversation.created_at).label("date"),
            func.count(Conversation.id).label("count"),
        )
        .filter(timeline_filter)
        .group_by(func.date(Conversation.created_at))
        .order_by(func.date(Conversation.created_at))
        .all()
    )

    return {
        "timeline": [{"date": str(date), "count": count} for date, count in timeline_data],
        "period_days": days,
    }


@router.get("/analytics/performance-summary")
async def get_performance_summary(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get executive performance summary with trends."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    previous_start = datetime.utcnow() - timedelta(days=days * 2)
    previous_end = start_date
    
    # Current period metrics (filtered by business)
    current_conv_filter = Conversation.created_at >= start_date
    current_lead_filter = Lead.created_at >= start_date
    if business_id is not None:
        current_conv_filter = and_(current_conv_filter, Conversation.business_id == business_id)
        current_lead_filter = and_(current_lead_filter, Lead.business_id == business_id)
    
    current_conversations = db.query(func.count(Conversation.id)).filter(current_conv_filter).scalar() or 0
    current_leads = db.query(func.count(Lead.id)).filter(current_lead_filter).scalar() or 0
    
    # Previous period metrics (filtered by business)
    previous_conv_filter = and_(
        Conversation.created_at >= previous_start,
        Conversation.created_at < previous_end
    )
    previous_lead_filter = and_(
        Lead.created_at >= previous_start,
        Lead.created_at < previous_end
    )
    if business_id is not None:
        previous_conv_filter = and_(previous_conv_filter, Conversation.business_id == business_id)
        previous_lead_filter = and_(previous_lead_filter, Lead.business_id == business_id)
    
    previous_conversations = db.query(func.count(Conversation.id)).filter(previous_conv_filter).scalar() or 0
    previous_leads = db.query(func.count(Lead.id)).filter(previous_lead_filter).scalar() or 0
    
    # Calculate trends
    conv_trend = ((current_conversations - previous_conversations) / max(previous_conversations, 1)) * 100 if previous_conversations > 0 else 0
    lead_trend = ((current_leads - previous_leads) / max(previous_leads, 1)) * 100 if previous_leads > 0 else 0
    
    # Automation efficiency (all AI-handled in Phase 1)
    ai_resolved = current_conversations  # All are AI-resolved
    automation_efficiency = 100.0  # 100% automated
    
    return {
        "conversation_growth": {
            "current": current_conversations,
            "previous": previous_conversations,
            "trend": round(conv_trend, 1),
            "direction": "up" if conv_trend > 0 else "down" if conv_trend < 0 else "stable",
        },
        "lead_acquisition": {
            "current": current_leads,
            "previous": previous_leads,
            "trend": round(lead_trend, 1),
            "direction": "up" if lead_trend > 0 else "down" if lead_trend < 0 else "stable",
        },
        "automation_efficiency": {
            "percentage": automation_efficiency,
            "ai_resolved": ai_resolved,
            "human_handoffs": 0,  # Placeholder
        },
    }


@router.get("/analytics/conversation-flow")
async def get_conversation_flow(
    days: int = Query(30, ge=7, le=90),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get conversation volume and flow analysis."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily conversation volume (filtered by business)
    flow_filter = Conversation.created_at >= start_date
    if business_id is not None:
        flow_filter = and_(flow_filter, Conversation.business_id == business_id)
    
    daily_volume = (
        db.query(
            func.date(Conversation.created_at).label("date"),
            func.count(Conversation.id).label("count"),
        )
        .filter(flow_filter)
        .group_by(func.date(Conversation.created_at))
        .order_by(func.date(Conversation.created_at))
        .all()
    )
    
    # Message depth per conversation (filtered by business)
    message_depth_filter = Conversation.created_at >= start_date
    if business_id is not None:
        message_depth_filter = and_(message_depth_filter, Conversation.business_id == business_id)
    
    message_depth = (
        db.query(
            Conversation.user_id,
            func.count(Message.id).label("message_count")
        )
        .join(Message, and_(
            Message.user_id == Conversation.user_id,
            Message.channel == Conversation.channel
        ))
        .filter(message_depth_filter)
        .group_by(Conversation.user_id)
        .all()
    )
    
    avg_depth = sum(depth[1] for depth in message_depth) / max(len(message_depth), 1) if message_depth else 0
    
    return {
        "daily_volume": [{"date": str(date), "count": count} for date, count in daily_volume],
        "average_message_depth": round(avg_depth, 1),
        "total_conversations": len(daily_volume),
    }


@router.get("/analytics/intent-performance")
async def get_intent_performance(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get deep intent performance analytics."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Intent frequency over time (filtered by business)
    intent_filter = Conversation.created_at >= start_date
    if business_id is not None:
        intent_filter = and_(intent_filter, Conversation.business_id == business_id)
    
    intent_frequency = (
        db.query(
            Conversation.intent,
            func.count(Conversation.id).label("count")
        )
        .filter(intent_filter)
        .group_by(Conversation.intent)
        .order_by(func.count(Conversation.id).desc())
        .all()
    )
    
    # Intent to lead conversion (filtered by business)
    intent_performance = []
    for intent, count in intent_frequency:
        lead_filter = and_(
            Lead.source_intent == intent,
            Lead.created_at >= start_date
        )
        if business_id is not None:
            lead_filter = and_(lead_filter, Lead.business_id == business_id)
        intent_leads = db.query(func.count(Lead.id)).filter(lead_filter).scalar() or 0
        
        conversion_rate = (intent_leads / count * 100) if count > 0 else 0
        
        # Check for fallbacks (filtered by business)
        fallback_filter = and_(
            Conversation.intent == "unknown",
            Conversation.created_at >= start_date
        )
        if business_id is not None:
            fallback_filter = and_(fallback_filter, Conversation.business_id == business_id)
        fallback_count = db.query(func.count(Conversation.id)).filter(fallback_filter).scalar() or 0
        
        intent_performance.append({
            "intent": intent,
            "frequency": count,
            "leads_generated": intent_leads,
            "conversion_rate": round(conversion_rate, 1),
            "causes_fallback": intent == "unknown",
            "fallback_count": fallback_count if intent == "unknown" else 0,
        })
    
    return {
        "intent_performance": intent_performance,
        "period_days": days,
    }


@router.get("/analytics/channel-efficiency")
async def get_channel_efficiency(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get channel efficiency reports (different from basic channel analytics)."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get channels (filtered by business)
    channel_base_filter = Conversation.created_at >= start_date
    if business_id is not None:
        channel_base_filter = and_(channel_base_filter, Conversation.business_id == business_id)
    
    channels = db.query(Conversation.channel).filter(channel_base_filter).distinct().all()
    
    channel_efficiency = []
    for channel_tuple in channels:
        channel = channel_tuple[0]
        
        # Total conversations (filtered by business)
        conv_filter = and_(
            Conversation.channel == channel,
            Conversation.created_at >= start_date
        )
        if business_id is not None:
            conv_filter = and_(conv_filter, Conversation.business_id == business_id)
        total_conv = db.query(func.count(Conversation.id)).filter(conv_filter).scalar() or 0
        
        # Leads from this channel (filtered by business)
        lead_filter = and_(
            Lead.channel == channel,
            Lead.created_at >= start_date
        )
        if business_id is not None:
            lead_filter = and_(lead_filter, Lead.business_id == business_id)
        channel_leads = db.query(func.count(Lead.id)).filter(lead_filter).scalar() or 0
        
        # AI resolution rate (all are AI-resolved in Phase 1)
        ai_resolution_rate = 100.0
        
        # Lead quality (simplified - based on status, filtered by business)
        qualified_lead_filter = and_(
            Lead.channel == channel,
            Lead.status.in_(["qualified", "converted"]),
            Lead.created_at >= start_date
        )
        if business_id is not None:
            qualified_lead_filter = and_(qualified_lead_filter, Lead.business_id == business_id)
        qualified_leads = db.query(func.count(Lead.id)).filter(qualified_lead_filter).scalar() or 0
        
        lead_quality = (qualified_leads / max(channel_leads, 1)) * 100 if channel_leads > 0 else 0
        
        channel_efficiency.append({
            "channel": channel,
            "total_conversations": total_conv,
            "ai_resolution_rate": round(ai_resolution_rate, 1),
            "lead_quality": round(lead_quality, 1),
            "leads_generated": channel_leads,
        })
    
    return {
        "channels": channel_efficiency,
        "period_days": days,
    }


@router.get("/analytics/automation-effectiveness")
async def get_automation_effectiveness(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get automation and AI effectiveness analytics."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total conversations (filtered by business)
    total_filter = Conversation.created_at >= start_date
    if business_id is not None:
        total_filter = and_(total_filter, Conversation.business_id == business_id)
    
    total_conversations = db.query(func.count(Conversation.id)).filter(total_filter).scalar() or 0
    
    # Successful AI responses (non-fallback, filtered by business)
    successful_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.intent != "unknown"
    )
    if business_id is not None:
        successful_filter = and_(successful_filter, Conversation.business_id == business_id)
    
    successful_ai = db.query(func.count(Conversation.id)).filter(successful_filter).scalar() or 0
    
    # Fallback frequency (filtered by business)
    fallback_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.intent == "unknown"
    )
    if business_id is not None:
        fallback_filter = and_(fallback_filter, Conversation.business_id == business_id)
    
    fallback_count = db.query(func.count(Conversation.id)).filter(fallback_filter).scalar() or 0
    
    fallback_rate = (fallback_count / max(total_conversations, 1)) * 100
    
    # Human handoffs (placeholder - 0 in Phase 1)
    human_handoffs = 0
    
    return {
        "total_conversations": total_conversations,
        "successful_ai_responses": successful_ai,
        "success_rate": round((successful_ai / max(total_conversations, 1)) * 100, 1),
        "fallback_frequency": fallback_count,
        "fallback_rate": round(fallback_rate, 1),
        "human_handoffs": human_handoffs,
        "automation_rate": round(((total_conversations - human_handoffs) / max(total_conversations, 1)) * 100, 1),
    }


@router.get("/analytics/lead-outcomes")
async def get_lead_outcomes(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get lead and outcome analytics."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Leads over time
    leads_over_time = (
        db.query(
            func.date(Lead.created_at).label("date"),
            func.count(Lead.id).label("count"),
        )
        .filter(Lead.created_at >= start_date)
        .group_by(func.date(Lead.created_at))
        .order_by(func.date(Lead.created_at))
        .all()
    )
    
    # Lead source effectiveness
    lead_sources = (
        db.query(
            Lead.source_intent,
            func.count(Lead.id).label("count")
        )
        .filter(Lead.created_at >= start_date, Lead.source_intent.isnot(None))
        .group_by(Lead.source_intent)
        .order_by(func.count(Lead.id).desc())
        .all()
    )
    
    # Intent to outcome mapping
    intent_outcomes = []
    for intent, count in lead_sources:
        intent_outcomes.append({
            "intent": intent,
            "leads_generated": count,
        })
    
    return {
        "leads_over_time": [{"date": str(date), "count": count} for date, count in leads_over_time],
        "intent_outcomes": intent_outcomes,
        "total_leads": sum(count for _, count in leads_over_time),
        "period_days": days,
    }


@router.get("/analytics/time-behavior")
async def get_time_behavior(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get time-based behavior insights."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Peak engagement hours (filtered by business)
    time_filter = Conversation.created_at >= start_date
    if business_id is not None:
        time_filter = and_(time_filter, Conversation.business_id == business_id)
    
    hour_distribution = (
        db.query(
            func.extract('hour', Conversation.created_at).label("hour"),
            func.count(Conversation.id).label("count")
        )
        .filter(time_filter)
        .group_by(func.extract('hour', Conversation.created_at))
        .order_by(func.count(Conversation.id).desc())
        .all()
    )
    
    peak_hour = int(hour_distribution[0][0]) if hour_distribution else None
    
    # Peak engagement days (filtered by business)
    day_distribution = (
        db.query(
            func.extract('dow', Conversation.created_at).label("day"),
            func.count(Conversation.id).label("count")
        )
        .filter(time_filter)
        .group_by(func.extract('dow', Conversation.created_at))
        .order_by(func.count(Conversation.id).desc())
        .all()
    )
    
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    peak_day = day_names[int(day_distribution[0][0])] if day_distribution else None
    
    return {
        "peak_hour": peak_hour,
        "peak_day": peak_day,
        "hour_distribution": [{"hour": int(hour), "count": count} for hour, count in hour_distribution],
        "day_distribution": [{"day": day_names[int(day)], "count": count} for day, count in day_distribution],
    }


@router.get("/analytics/anomalies")
async def get_anomalies(
    days: int = Query(30, ge=7, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get anomaly and trend detection (rule-based)."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    previous_start = datetime.utcnow() - timedelta(days=days * 2)
    previous_end = start_date
    
    # Current vs previous period (filtered by business)
    current_conv_filter = Conversation.created_at >= start_date
    previous_conv_filter = and_(
        Conversation.created_at >= previous_start,
        Conversation.created_at < previous_end
    )
    if business_id is not None:
        current_conv_filter = and_(current_conv_filter, Conversation.business_id == business_id)
        previous_conv_filter = and_(previous_conv_filter, Conversation.business_id == business_id)
    
    current_conv = db.query(func.count(Conversation.id)).filter(current_conv_filter).scalar() or 0
    previous_conv = db.query(func.count(Conversation.id)).filter(previous_conv_filter).scalar() or 0
    
    # Current fallbacks (filtered by business)
    current_fallback_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.intent == "unknown"
    )
    previous_fallback_filter = and_(
        Conversation.created_at >= previous_start,
        Conversation.created_at < previous_end,
        Conversation.intent == "unknown"
    )
    if business_id is not None:
        current_fallback_filter = and_(current_fallback_filter, Conversation.business_id == business_id)
        previous_fallback_filter = and_(previous_fallback_filter, Conversation.business_id == business_id)
    
    current_fallbacks = db.query(func.count(Conversation.id)).filter(current_fallback_filter).scalar() or 0
    previous_fallbacks = db.query(func.count(Conversation.id)).filter(previous_fallback_filter).scalar() or 0
    
    anomalies = []
    
    # Check for conversation spike/drop
    if previous_conv > 0:
        conv_change = ((current_conv - previous_conv) / previous_conv) * 100
        if abs(conv_change) > 20:  # More than 20% change
            anomalies.append({
                "type": "conversation_spike" if conv_change > 0 else "conversation_drop",
                "severity": "info",
                "message": f"Conversation volume {'increased' if conv_change > 0 else 'decreased'} by {abs(round(conv_change, 1))}%",
            })
    
    # Check for rising fallback trend
    if previous_fallbacks > 0:
        fallback_change = ((current_fallbacks - previous_fallbacks) / previous_fallbacks) * 100
        if fallback_change > 15:  # More than 15% increase
            anomalies.append({
                "type": "rising_fallback_trend",
                "severity": "warning",
                "message": f"Fallback rate increased by {round(fallback_change, 1)}%",
            })
    
    return {
        "anomalies": anomalies,
        "period_days": days,
    }


@router.get("/leads")
async def get_leads(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated leads list."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Lead)
    
    # Filter by business_id if user is not admin
    if business_id is not None:
        query = query.filter(Lead.business_id == business_id)

    if status:
        query = query.filter(Lead.status == status)

    total = query.count()
    offset = (page - 1) * limit
    leads = query.order_by(Lead.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "leads": [
            {
                "id": lead.id,
                "user_id": lead.user_id,
                "channel": lead.channel,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "status": lead.status,
                "source_intent": lead.source_intent,
                "created_at": lead.created_at.isoformat(),
            }
            for lead in leads
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/knowledge")
async def get_knowledge_base(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    intent: Optional[str] = None,
    status: Optional[str] = None,  # active, inactive, needs-review
    search: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get knowledge base entries with intelligence data."""
    from sqlalchemy import or_
    import json
    
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    query = db.query(KnowledgeEntry).filter(KnowledgeEntry.business_id == business_id)
    
    # Apply filters
    if intent:
        query = query.filter(KnowledgeEntry.intent == intent)
    if status == "active":
        query = query.filter(KnowledgeEntry.is_active == True)
    elif status == "inactive":
        query = query.filter(KnowledgeEntry.is_active == False)
    if search:
        query = query.filter(
            (KnowledgeEntry.question.ilike(f"%{search}%")) |
            (KnowledgeEntry.answer.ilike(f"%{search}%"))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    entries = query.order_by(KnowledgeEntry.updated_at.desc()).offset(offset).limit(limit).all()
    
    # Get all intents from conversations
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Build response with intelligence data
    result_entries = []
    for entry in entries:
        # Count usage in conversations (simple keyword matching)
        usage_count = 0
        keywords = []
        if entry.keywords:
            try:
                keywords = json.loads(entry.keywords) if isinstance(entry.keywords, str) else entry.keywords
                if keywords and isinstance(keywords, list):
                    # Count conversations with matching keywords (filtered by business)
                    usage_filter = and_(
                        Conversation.created_at >= start_date,
                        Conversation.business_id == business_id,
                        or_(*[Conversation.user_message.ilike(f"%{kw}%") for kw in keywords[:3]])
                    )
                    usage_count = db.query(func.count(Conversation.id)).filter(usage_filter).scalar() or 0
            except:
                keywords = []
        
        # Check if entry is linked to intent
        has_intent_link = entry.intent is not None and entry.intent != ""
        
        # Determine quality signals
        quality_signals = []
        if usage_count > 10:
            quality_signals.append("high_performing")
        elif usage_count == 0:
            quality_signals.append("unused")
        if not has_intent_link:
            quality_signals.append("needs_intent_link")
        if entry.is_active == False:
            quality_signals.append("inactive")
        
        # Get last used timestamp (simplified - use updated_at for now)
        last_used = entry.updated_at.isoformat()
        
        result_entries.append({
            "id": entry.id,
            "question": entry.question,
            "answer": entry.answer,
            "keywords": keywords,
            "intent": entry.intent,
            "is_active": entry.is_active,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
            # Intelligence data
            "usage_count": usage_count,
            "quality_signals": quality_signals,
            "has_intent_link": has_intent_link,
            "last_used": last_used,
        })
    
    return {
        "entries": result_entries,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/knowledge/health")
async def get_knowledge_health(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get knowledge base health and coverage metrics."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Total knowledge entries
    total_entries = db.query(func.count(KnowledgeEntry.id)).filter(
        KnowledgeEntry.business_id == business_id
    ).scalar() or 0
    
    # Active entries
    active_entries = db.query(func.count(KnowledgeEntry.id)).filter(
        KnowledgeEntry.business_id == business_id,
        KnowledgeEntry.is_active == True
    ).scalar() or 0
    
    # Entries with intent links
    entries_with_intent = db.query(func.count(KnowledgeEntry.id)).filter(
        KnowledgeEntry.business_id == business_id,
        KnowledgeEntry.intent.isnot(None),
        KnowledgeEntry.intent != ""
    ).scalar() or 0
    
    # Get all intents from conversations (filtered by business)
    conv_intent_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.business_id == business_id
    )
    conversation_intents = db.query(Conversation.intent).filter(conv_intent_filter).distinct().all()
    all_intents = [intent[0] for intent in conversation_intents if intent[0] and intent[0] != "unknown"]
    
    # Get intents with knowledge entries
    knowledge_intents = db.query(KnowledgeEntry.intent).filter(
        KnowledgeEntry.business_id == business_id,
        KnowledgeEntry.intent.isnot(None),
        KnowledgeEntry.intent != ""
    ).distinct().all()
    knowledge_intent_list = [intent[0] for intent in knowledge_intents]
    
    # Intents without knowledge
    intents_without_knowledge = [intent for intent in all_intents if intent not in knowledge_intent_list]
    
    return {
        "total_entries": total_entries,
        "active_entries": active_entries,
        "entries_with_intent": entries_with_intent,
        "intents_without_knowledge": intents_without_knowledge,
        "unused_entries_count": 0,  # Would need more complex logic
        "coverage_percentage": round((len(knowledge_intent_list) / max(len(all_intents), 1)) * 100, 1) if all_intents else 100,
    }


@router.get("/knowledge/mapping")
async def get_intent_knowledge_mapping(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get intent to knowledge entry mapping."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Get all intents from conversations (filtered by business)
    conv_intent_filter = and_(
        Conversation.created_at >= start_date,
        Conversation.business_id == business_id
    )
    conversation_intents = db.query(Conversation.intent, func.count(Conversation.id).label("count")).filter(
        conv_intent_filter
    ).group_by(Conversation.intent).all()
    
    # Get all knowledge entries (filtered by business)
    knowledge_entries = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.business_id == business_id
    ).all()
    
    # Build mapping
    mapping = []
    for intent, count in conversation_intents:
        if intent and intent != "unknown":
            linked_entries = [entry for entry in knowledge_entries if entry.intent == intent]
            mapping.append({
                "intent": intent,
                "conversation_count": count,
                "knowledge_entries": [
                    {
                        "id": entry.id,
                        "question": entry.question,
                        "is_active": entry.is_active,
                    }
                    for entry in linked_entries
                ],
                "has_coverage": len(linked_entries) > 0,
            })
    
    return {
        "mapping": mapping,
    }


@router.get("/knowledge/{entry_id}")
async def get_knowledge_entry_detail(
    entry_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed knowledge entry with usage data."""
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Knowledge base access requires a business account"
        )
    
    from sqlalchemy import or_
    import json
    
    entry = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.id == entry_id,
        KnowledgeEntry.business_id == business_id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Get usage timeline
    keywords = []
    if entry.keywords:
        try:
            keywords = json.loads(entry.keywords) if isinstance(entry.keywords, str) else entry.keywords
        except:
            pass
    
    # Get conversations with matching keywords
    usage_timeline = []
    if keywords and isinstance(keywords, list):
        for keyword in keywords[:5]:
            conversations = db.query(Conversation).filter(
                Conversation.user_message.ilike(f"%{keyword}%"),
                Conversation.created_at >= start_date
            ).order_by(Conversation.created_at.desc()).limit(10).all()
            
            for conv in conversations:
                usage_timeline.append({
                    "type": "used_in_conversation",
                    "timestamp": conv.created_at.isoformat(),
                    "conversation_id": conv.id,
                    "user_message": conv.user_message[:100],
                    "matched_keyword": keyword,
                })
    
    # Sort by timestamp
    usage_timeline.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "entry": {
            "id": entry.id,
            "question": entry.question,
            "answer": entry.answer,
            "keywords": keywords,
            "intent": entry.intent,
            "is_active": entry.is_active,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
        },
        "usage_timeline": usage_timeline[:20],
    }


@router.get("/ai-rules/coverage")
async def get_rule_coverage(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get rule coverage and health overview."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    supported_intents = ["greeting", "help", "pricing", "human"]
    
    conversation_intents = db.query(Conversation.intent).filter(
        Conversation.created_at >= start_date
    ).distinct().all()
    all_intents = [intent[0] for intent in conversation_intents if intent[0]]
    
    intents_with_coverage = [intent for intent in all_intents if intent in supported_intents]
    intents_without_coverage = [intent for intent in all_intents if intent not in supported_intents and intent != "unknown"]
    
    fallback_count = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date,
        Conversation.intent == "unknown"
    ).scalar() or 0
    
    total_conversations = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date
    ).scalar() or 0
    
    fallback_rate = (fallback_count / max(total_conversations, 1)) * 100
    
    successful_intents = []
    for intent in supported_intents:
        intent_leads = db.query(func.count(Lead.id)).filter(
            Lead.source_intent == intent,
            Lead.created_at >= start_date
        ).scalar() or 0
        if intent_leads > 0:
            successful_intents.append({
                "intent": intent,
                "leads_generated": intent_leads,
            })
    
    return {
        "total_active_rules": len(supported_intents),
        "intents_with_coverage": intents_with_coverage,
        "intents_without_coverage": intents_without_coverage,
        "fallback_frequency": fallback_count,
        "fallback_rate": round(fallback_rate, 1),
        "successful_rules": successful_intents,
        "coverage_percentage": round((len(intents_with_coverage) / max(len(all_intents), 1)) * 100, 1) if all_intents else 100,
    }


@router.get("/ai-rules/effectiveness")
async def get_rule_effectiveness(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get rule impact and effectiveness indicators."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    intent_rules = {
        "greeting": ["hi", "hello", "hey", "greetings", "good morning", "good afternoon"],
        "help": ["help", "support", "what can you do", "assist", "guide"],
        "pricing": ["price", "cost", "pricing", "how much", "fee", "subscription"],
        "human": ["agent", "human", "talk to someone", "speak to someone", "representative"],
    }
    
    rule_effectiveness = []
    for intent, keywords in intent_rules.items():
        trigger_count = db.query(func.count(Conversation.id)).filter(
            Conversation.intent == intent,
            Conversation.created_at >= start_date
        ).scalar() or 0
        
        leads_generated = db.query(func.count(Lead.id)).filter(
            Lead.source_intent == intent,
            Lead.created_at >= start_date
        ).scalar() or 0
        
        last_triggered = db.query(Conversation.created_at).filter(
            Conversation.intent == intent,
            Conversation.created_at >= start_date
        ).order_by(Conversation.created_at.desc()).first()
        
        last_triggered_time = last_triggered[0].isoformat() if last_triggered else None
        
        knowledge_linked = db.query(func.count(KnowledgeEntry.id)).filter(
            KnowledgeEntry.intent == intent
        ).scalar() or 0
        
        rule_effectiveness.append({
            "intent": intent,
            "keywords": keywords,
            "trigger_frequency": trigger_count,
            "successful_response_rate": 100.0 if trigger_count > 0 else 0,
            "leads_generated": leads_generated,
            "knowledge_linked": knowledge_linked > 0,
            "last_triggered": last_triggered_time,
        })
    
    return {
        "rules": rule_effectiveness,
    }


@router.get("/ai-rules/confidence")
async def get_automation_confidence(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get automation confidence signals."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    total_conversations = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date
    ).scalar() or 0
    
    unknown_count = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date,
        Conversation.intent == "unknown"
    ).scalar() or 0
    
    fallback_rate = (unknown_count / max(total_conversations, 1)) * 100
    
    confidence_signals = []
    
    if fallback_rate < 10:
        confidence_signals.append({
            "type": "high_confidence",
            "message": "High confidence - low fallback rate",
        })
    elif fallback_rate < 20:
        confidence_signals.append({
            "type": "moderate_confidence",
            "message": "Moderate confidence - some fallbacks detected",
        })
    else:
        confidence_signals.append({
            "type": "low_confidence",
            "message": "Low confidence - high fallback rate",
        })
    
    intent_knowledge_counts = (
        db.query(KnowledgeEntry.intent, func.count(KnowledgeEntry.id).label("count"))
        .filter(KnowledgeEntry.intent.isnot(None))
        .group_by(KnowledgeEntry.intent)
        .having(func.count(KnowledgeEntry.id) > 1)
        .all()
    )
    
    if intent_knowledge_counts:
        for intent, count in intent_knowledge_counts:
            confidence_signals.append({
                "type": "overlapping_rules",
                "message": f"Multiple knowledge entries for '{intent}' intent",
            })
    
    return {
        "signals": confidence_signals,
        "fallback_rate": round(fallback_rate, 1),
        "total_conversations": total_conversations,
    }


@router.get("/ai-rules/flow")
async def get_automation_flow(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get automation flow visualization data."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    total_incoming = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date
    ).scalar() or 0
    
    rule_matched = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date,
        Conversation.intent != "unknown"
    ).scalar() or 0
    
    knowledge_used = db.query(func.count(KnowledgeEntry.id)).scalar() or 0
    
    successful = rule_matched
    fallback = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date,
        Conversation.intent == "unknown"
    ).scalar() or 0
    
    return {
        "flow": {
            "user_message": total_incoming,
            "intent_detection": total_incoming,
            "rule_match": rule_matched,
            "knowledge_response": knowledge_used > 0,
            "outcomes": {
                "success": successful,
                "fallback": fallback,
                "handoff": 0,
            },
        },
    }


@router.get("/ai-rules/recommendations")
async def get_rule_recommendations(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get smart rule recommendations (rule-based)."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    recommendations = []
    
    fallback_count = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= start_date,
        Conversation.intent == "unknown"
    ).scalar() or 0
    
    if fallback_count > 10:
        recommendations.append({
            "type": "high_fallback",
            "priority": "medium",
            "message": f"{fallback_count} conversations fell back to default responses. Consider adding rules for common patterns.",
        })
    
    conversation_intents = db.query(Conversation.intent).filter(
        Conversation.created_at >= start_date
    ).distinct().all()
    all_intents = [intent[0] for intent in conversation_intents if intent[0] and intent[0] != "unknown"]
    
    for intent in all_intents:
        knowledge_count = db.query(func.count(KnowledgeEntry.id)).filter(
            KnowledgeEntry.intent == intent
        ).scalar() or 0
        
        if knowledge_count == 0:
            recommendations.append({
                "type": "missing_knowledge",
                "priority": "low",
                "message": f"Intent '{intent}' has no knowledge base entries. Consider adding FAQ responses.",
            })
    
    return {
        "recommendations": recommendations[:5],
    }


@router.post("/ai-rules/test")
async def test_rule(
    request: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Test a sample message against existing rules (safe testing mode)."""
    from app.services.ai_brain import detect_intent
    from app.schemas import NormalizedMessage, MessageChannel
    from datetime import datetime
    
    message = request.get("message", "")
    if not message:
        return {
            "error": "Message is required",
        }
    
    test_message = NormalizedMessage(
        channel=MessageChannel.TELEGRAM,
        user_id="test-user",
        message_text=message,
        timestamp=datetime.utcnow(),
    )
    
    intent = detect_intent(test_message)
    intent_value = intent.value if hasattr(intent, "value") else "unknown"
    
    return {
        "test_message": message,
        "detected_intent": intent_value,
        "confidence": "high" if intent_value != "unknown" else "low",
        "rule_matched": intent_value != "unknown",
        "expected_path": "rule_based" if intent_value != "unknown" else "fallback",
    }


# ============================================================================
# AD & VIDEO CREATION STUDIO ENDPOINTS
# ============================================================================

@router.get("/ads/campaigns")
async def get_campaigns(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all campaigns with their assets."""
    # For now, we'll use AdAsset to group by campaign (stored in extra_data)
    # In a full implementation, you'd have a Campaign model
    assets = db.query(AdAsset).filter(
        AdAsset.business_id == current_user.business_id if hasattr(current_user, 'business_id') else True
    ).order_by(AdAsset.created_at.desc()).all()
    
    # Group assets by campaign (simplified - using title prefix or extra_data)
    campaigns = {}
    for asset in assets:
        # Extract campaign name from title or use "Uncategorized"
        campaign_name = "Uncategorized"
        if asset.extra_data:
            try:
                import json
                extra = json.loads(asset.extra_data)
                campaign_name = extra.get("campaign_name", "Uncategorized")
            except:
                pass
        
        if campaign_name not in campaigns:
            campaigns[campaign_name] = {
                "name": campaign_name,
                "assets": [],
                "asset_count": 0,
                "platforms": set(),
                "status": "draft",
                "created_at": asset.created_at.isoformat(),
                "updated_at": asset.updated_at.isoformat(),
            }
        
        campaigns[campaign_name]["assets"].append({
            "id": asset.id,
            "title": asset.title,
            "type": asset.asset_type,
            "platform": asset.platform,
            "status": asset.status,
        })
        campaigns[campaign_name]["asset_count"] += 1
        if asset.platform:
            campaigns[campaign_name]["platforms"].add(asset.platform)
        if asset.status == "published":
            campaigns[campaign_name]["status"] = "published"
    
    # Convert sets to lists
    for campaign in campaigns.values():
        campaign["platforms"] = list(campaign["platforms"])
    
    return {
        "campaigns": list(campaigns.values()),
    }


@router.get("/ads/copy-templates")
async def get_copy_templates(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get ad copy templates categorized by goal and platform."""
    templates = {
        "headline": {
            "promotion": [
                "🎉 Limited Time Offer: [Product/Service]",
                "Don't Miss Out: [Offer]",
                "Special Deal: [Details]",
            ],
            "announcement": [
                "Exciting News: [Announcement]",
                "We're Proud to Announce: [News]",
                "Introducing: [New Feature/Product]",
            ],
            "offer": [
                "Exclusive Offer: [Details]",
                "Save [Amount]% Today Only",
                "Special Discount: [Offer]",
            ],
        },
        "description": {
            "promotion": [
                "Get [benefit] with our [product/service]. Perfect for [target audience]. Act now!",
                "Discover [value proposition]. Limited availability. Order today!",
            ],
            "announcement": [
                "We're excited to share [announcement]. Learn more about [details].",
                "Big news! [Announcement]. Find out more at [link/contact].",
            ],
        },
        "cta": [
            "Shop Now",
            "Learn More",
            "Get Started",
            "Contact Us",
            "Book Now",
            "Sign Up",
        ],
    }
    
    return {
        "templates": templates,
    }


@router.get("/ads/conversation-intelligence")
async def get_conversation_intelligence(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get conversation-driven copy intelligence (top questions, intents, etc.)."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Top customer questions (from conversations)
    top_questions = (
        db.query(Conversation.user_message, func.count(Conversation.id).label("count"))
        .filter(Conversation.created_at >= start_date)
        .group_by(Conversation.user_message)
        .order_by(func.count(Conversation.id).desc())
        .limit(10)
        .all()
    )
    
    # High-performing intents
    intent_counts = (
        db.query(Conversation.intent, func.count(Conversation.id).label("count"))
        .filter(Conversation.created_at >= start_date)
        .group_by(Conversation.intent)
        .order_by(func.count(Conversation.id).desc())
        .limit(5)
        .all()
    )
    
    # Top knowledge base entries (frequently used)
    knowledge_usage = (
        db.query(KnowledgeEntry.question, KnowledgeEntry.answer)
        .filter(KnowledgeEntry.is_active == True)
        .limit(10)
        .all()
    )
    
    return {
        "top_questions": [{"question": q, "frequency": c} for q, c in top_questions],
        "high_performing_intents": [{"intent": i, "count": c} for i, c in intent_counts],
        "frequently_asked": [{"question": q, "answer": a[:100]} for q, a in knowledge_usage],
    }


@router.get("/ads/platform-presets")
async def get_platform_presets(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get platform tone presets and formatting guidelines."""
    presets = {
        "instagram": {
            "tone": "Short & punchy",
            "max_length": 2200,
            "hashtags": True,
            "emoji": True,
            "formatting": "Single post with image/video",
        },
        "whatsapp_status": {
            "tone": "Direct & sales-focused",
            "max_length": 500,
            "hashtags": False,
            "emoji": True,
            "formatting": "Short status update",
        },
        "facebook": {
            "tone": "Informative & branded",
            "max_length": 5000,
            "hashtags": True,
            "emoji": True,
            "formatting": "Post with optional media",
        },
    }
    
    return {
        "presets": presets,
    }


@router.post("/ads/generate-copy")
async def generate_ad_copy(
    request: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate ad copy using templates and conversation intelligence (rule-based)."""
    objective = request.get("objective", "promotion")
    platform = request.get("platform", "instagram")
    template_type = request.get("template_type", "headline")
    use_intelligence = request.get("use_intelligence", False)
    
    # Get templates
    templates_response = await get_copy_templates(current_user, db)
    templates = templates_response["templates"]
    
    # Select template based on objective
    if template_type == "headline":
        available = templates["headline"].get(objective, templates["headline"]["promotion"])
        selected = available[0] if available else "Special Offer"
    elif template_type == "description":
        available = templates["description"].get(objective, templates["description"]["promotion"])
        selected = available[0] if available else "Get started today!"
    else:
        selected = templates["cta"][0] if templates["cta"] else "Learn More"
    
    # Apply platform tone (simplified rule-based)
    if platform == "instagram":
        # Make it shorter and punchier
        if len(selected) > 100:
            selected = selected[:97] + "..."
    elif platform == "whatsapp_status":
        # Make it direct
        selected = selected.replace("Discover", "Get").replace("Learn more", "Contact us")
    
    # Add intelligence if requested
    intelligence_text = ""
    if use_intelligence:
        intelligence_data = await get_conversation_intelligence(current_user, db)
        if intelligence_data["top_questions"]:
            top_q = intelligence_data["top_questions"][0]["question"]
            intelligence_text = f"\n\n💡 Customer Insight: '{top_q[:50]}...'"
    
    return {
        "copy": selected + intelligence_text,
        "template_used": selected,
        "platform": platform,
        "objective": objective,
    }


@router.get("/ads/video-templates")
async def get_video_templates(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get video templates by type."""
    templates = {
        "static_image_text": {
            "name": "Static Image + Text",
            "description": "Single image with overlay text",
            "duration": 5,
            "scenes": 1,
        },
        "image_slideshow": {
            "name": "Image Slideshow",
            "description": "Multiple images with transitions",
            "duration": 15,
            "scenes": 3,
        },
        "short_clip_overlay": {
            "name": "Short Clip + Overlay Text",
            "description": "Video clip with text overlay",
            "duration": 10,
            "scenes": 1,
        },
    }
    
    return {
        "templates": templates,
    }


@router.get("/ads/brand-assets")
async def get_brand_assets(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get brand assets (logos, colors, fonts, etc.)."""
    # In a full implementation, this would come from a BrandAsset model
    # For now, return default brand structure
    return {
        "logo": {
            "primary": None,
            "secondary": None,
        },
        "colors": {
            "primary": "#6366f1",
            "secondary": "#8b5cf6",
            "accent": "#ec4899",
        },
        "fonts": {
            "heading": "Inter",
            "body": "Inter",
        },
        "contact": {
            "phone": None,
            "email": None,
            "website": None,
        },
        "legal_disclaimer": None,
    }


@router.get("/ads/usage-insights")
async def get_usage_insights(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get performance and usage insights for ad assets."""
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # Total assets created
    total_assets = db.query(func.count(AdAsset.id)).filter(
        AdAsset.created_at >= start_date
    ).scalar() or 0
    
    # Assets by type
    assets_by_type = (
        db.query(AdAsset.asset_type, func.count(AdAsset.id).label("count"))
        .filter(AdAsset.created_at >= start_date)
        .group_by(AdAsset.asset_type)
        .all()
    )
    
    # Assets by platform
    assets_by_platform = (
        db.query(AdAsset.platform, func.count(AdAsset.id).label("count"))
        .filter(AdAsset.created_at >= start_date, AdAsset.platform.isnot(None))
        .group_by(AdAsset.platform)
        .all()
    )
    
    # Assets by status
    assets_by_status = (
        db.query(AdAsset.status, func.count(AdAsset.id).label("count"))
        .filter(AdAsset.created_at >= start_date)
        .group_by(AdAsset.status)
        .all()
    )
    
    # Link to top intents (if assets reference intents in extra_data)
    intent_linkage = []
    assets_with_intents = db.query(AdAsset).filter(
        AdAsset.created_at >= start_date,
        AdAsset.extra_data.isnot(None)
    ).all()
    
    for asset in assets_with_intents:
        try:
            import json
            extra = json.loads(asset.extra_data)
            if "intent" in extra:
                intent_linkage.append(extra["intent"])
        except:
            pass
    
    return {
        "total_assets": total_assets,
        "assets_by_type": [{"type": t, "count": c} for t, c in assets_by_type],
        "assets_by_platform": [{"platform": p, "count": c} for p, c in assets_by_platform],
        "assets_by_status": [{"status": s, "count": c} for s, c in assets_by_status],
        "intent_linkage": list(set(intent_linkage)),
    }


@router.post("/ads/assets")
async def create_ad_asset(
    request: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new ad asset (copy or video metadata)."""
    asset_type = request.get("asset_type", "ad_copy")
    title = request.get("title", "Untitled")
    content = request.get("content", "")
    platform = request.get("platform", "instagram")
    status = request.get("status", "draft")
    campaign_name = request.get("campaign_name", "Uncategorized")
    extra_data = request.get("extra_data", {})
    
    # Add campaign name to extra_data
    import json
    if isinstance(extra_data, dict):
        extra_data["campaign_name"] = campaign_name
    else:
        extra_data = {"campaign_name": campaign_name}
    
    # Get user's business_id (None for admin = can see all)
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ad assets require a business account"
        )
    
    asset = AdAsset(
        business_id=business_id,
        asset_type=asset_type,
        title=title,
        content=content,
        platform=platform,
        status=status,
        extra_data=json.dumps(extra_data),
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    return {
        "id": asset.id,
        "title": asset.title,
        "type": asset.asset_type,
        "platform": asset.platform,
        "status": asset.status,
        "created_at": asset.created_at.isoformat(),
    }
