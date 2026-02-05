"""Dashboard API routes for analytics and data retrieval."""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Conversation, Lead, AnalyticsEvent, ChannelIntegration, User as UserModel, Message, ConversationMemory, KnowledgeEntry, AdAsset, Business, ConversationTag, ConversationTagRelation, ConversationAssignment, AIRule
from app.routes.auth import get_current_user, get_user_business_id
from app.middleware.rate_limiter import limiter, get_rate_limit

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
    # Optimize: Get all channel leads in one query instead of per-channel queries
    channel_leads_map = {}
    if channel_counts:
        channel_list = [ch for ch, _ in channel_counts]
        channel_leads_query = (
            db.query(Lead.channel, func.count(Lead.id).label("count"))
            .filter(lead_filter, Lead.channel.in_(channel_list))
            .group_by(Lead.channel)
            .all()
        )
        channel_leads_map = {channel: count for channel, count in channel_leads_query}
    
    # Get peak hours for all channels in one query
    channel_peak_hours = {}
    if channel_counts:
        channel_list = [ch for ch, _ in channel_counts]
        peak_hours_query = (
            db.query(
                Conversation.channel,
                func.extract('hour', Conversation.created_at).label("hour"),
                func.count(Conversation.id).label("count")
            )
            .filter(conv_filter, Conversation.channel.in_(channel_list))
            .group_by(Conversation.channel, func.extract('hour', Conversation.created_at))
            .order_by(Conversation.channel, func.count(Conversation.id).desc())
            .all()
        )
        # Group by channel and get the hour with max count for each
        channel_hour_counts = defaultdict(lambda: defaultdict(int))
        for ch, hour, cnt in peak_hours_query:
            channel_hour_counts[ch][int(hour)] += cnt
        
        for ch in channel_list:
            if ch in channel_hour_counts:
                max_hour = max(channel_hour_counts[ch].items(), key=lambda x: x[1])[0]
                channel_peak_hours[ch] = max_hour
    
    channel_performance = []
    for channel, count in channel_counts:
        channel_leads = channel_leads_map.get(channel, 0)
        lead_rate = (channel_leads / count * 100) if count > 0 else 0
        
        # AI resolution rate: All conversations are AI-handled (no human handoffs tracked yet)
        # This is accurate - all conversations get AI responses, so 100% if there are conversations
        ai_resolution_rate = 100.0 if count > 0 else 0.0
        
        peak_hour = channel_peak_hours.get(channel)
        
        channel_performance.append({
            "channel": channel,
            "message_volume": count,
            "lead_capture_rate": round(lead_rate, 1),
            "ai_resolution_rate": round(ai_resolution_rate, 1),
            "peak_activity_hour": peak_hour,
        })

    # Intent Quality & Coverage
    # Optimize: Get all intent leads in one query instead of per-intent queries
    intent_leads_map = {}
    if intent_counts:
        intent_list = [intent for intent, _ in intent_counts]
        intent_leads_query = (
            db.query(Lead.source_intent, func.count(Lead.id).label("count"))
            .filter(lead_filter, Lead.source_intent.in_(intent_list))
            .group_by(Lead.source_intent)
            .all()
        )
        intent_leads_map = {intent: count for intent, count in intent_leads_query}
    
    intent_quality = []
    for intent, count in intent_counts:
        intent_leads = intent_leads_map.get(intent, 0)
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
    # User engagement (unique users who had conversations)
    engaged_conversations = db.query(func.count(func.distinct(Conversation.user_id))).filter(
        conv_filter
    ).scalar() or 0
    leads_captured = total_leads
    # Human handoff: Currently all conversations are AI-handled, so 0 handoffs
    # This will be updated when human handoff tracking is implemented
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

        # Get tags for this conversation
        tag_relations = db.query(ConversationTagRelation).filter(
            ConversationTagRelation.conversation_id == conv.id
        ).all()
        tag_ids = [rel.tag_id for rel in tag_relations]
        conversation_tags = db.query(ConversationTag).filter(ConversationTag.id.in_(tag_ids)).all() if tag_ids else []

        # Get assignment for this conversation
        assignment = db.query(ConversationAssignment).filter(
            ConversationAssignment.conversation_id == conv.id
        ).first()

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
            # Tags and assignment
            "tags": [{"id": tag.id, "name": tag.name, "color": tag.color} for tag in conversation_tags],
            "assigned_to_user_id": assignment.assigned_to_user_id if assignment else None,
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


# ========== KNOWLEDGE BASE CRUD OPERATIONS ==========

@router.post("/knowledge")
async def create_knowledge_entry(
    question: str,
    answer: str,
    keywords: Optional[List[str]] = None,
    intent: Optional[str] = None,
    is_active: bool = True,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new knowledge base entry."""
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Knowledge base access requires a business account"
        )
    
    # Validate required fields
    if not question or not answer:
        raise HTTPException(status_code=400, detail="Question and answer are required")
    
    # Create entry
    entry = KnowledgeEntry(
        business_id=business_id,
        question=question.strip(),
        answer=answer.strip(),
        keywords=json.dumps(keywords) if keywords else None,
        intent=intent,
        is_active=is_active,
    )
    
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    return {
        "id": entry.id,
        "question": entry.question,
        "answer": entry.answer,
        "keywords": json.loads(entry.keywords) if entry.keywords else [],
        "intent": entry.intent,
        "is_active": entry.is_active,
        "created_at": entry.created_at.isoformat(),
    }


@router.put("/knowledge/{entry_id}")
async def update_knowledge_entry(
    entry_id: int,
    question: Optional[str] = None,
    answer: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    intent: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing knowledge base entry."""
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Knowledge base access requires a business account"
        )
    
    # Get entry
    entry = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.id == entry_id,
        KnowledgeEntry.business_id == business_id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    
    # Update fields
    if question is not None:
        entry.question = question.strip()
    if answer is not None:
        entry.answer = answer.strip()
    if keywords is not None:
        entry.keywords = json.dumps(keywords)
    if intent is not None:
        entry.intent = intent
    if is_active is not None:
        entry.is_active = is_active
    
    entry.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(entry)
    
    return {
        "id": entry.id,
        "question": entry.question,
        "answer": entry.answer,
        "keywords": json.loads(entry.keywords) if entry.keywords else [],
        "intent": entry.intent,
        "is_active": entry.is_active,
        "updated_at": entry.updated_at.isoformat(),
    }


@router.delete("/knowledge/{entry_id}")
async def delete_knowledge_entry(
    entry_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a knowledge base entry."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Knowledge base access requires a business account"
        )
    
    # Get entry
    entry = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.id == entry_id,
        KnowledgeEntry.business_id == business_id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    
    db.delete(entry)
    db.commit()
    
    return {"success": True, "message": "Knowledge entry deleted successfully"}


@router.post("/knowledge/bulk/import")
async def bulk_import_knowledge(
    entries: List[dict],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk import knowledge entries from JSON."""
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Knowledge base access requires a business account"
        )
    
    if not entries or not isinstance(entries, list):
        raise HTTPException(status_code=400, detail="Invalid entries format")
    
    imported_count = 0
    skipped_count = 0
    errors = []
    
    for idx, entry_data in enumerate(entries):
        try:
            if not isinstance(entry_data, dict):
                errors.append(f"Entry {idx + 1}: Invalid format")
                skipped_count += 1
                continue
            
            question = entry_data.get("question")
            answer = entry_data.get("answer")
            
            if not question or not answer:
                errors.append(f"Entry {idx + 1}: Missing question or answer")
                skipped_count += 1
                continue
            
            # Check if entry already exists
            existing = db.query(KnowledgeEntry).filter(
                KnowledgeEntry.business_id == business_id,
                KnowledgeEntry.question == question
            ).first()
            
            if existing:
                errors.append(f"Entry {idx + 1}: Question already exists")
                skipped_count += 1
                continue
            
            # Create entry
            entry = KnowledgeEntry(
                business_id=business_id,
                question=question.strip(),
                answer=answer.strip(),
                keywords=json.dumps(entry_data.get("keywords", [])),
                intent=entry_data.get("intent"),
                is_active=entry_data.get("is_active", True),
            )
            
            db.add(entry)
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Entry {idx + 1}: {str(e)}")
            skipped_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "errors": errors[:10],  # Limit to first 10 errors
    }


@router.post("/knowledge/upload/document")
@limiter.limit(get_rate_limit("auth_upload"))  # 10/minute - Heavy operation
async def upload_knowledge_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a document (Word, PDF, Text, etc.) and extract knowledge entries using AI.
    
    Supports: .docx, .pdf, .txt, .md, .csv, .xlsx
    """
    from app.services.document_parser import parse_document, extract_qa_with_gpt
    from app.config import settings
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Knowledge base access requires a business account"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        filename = file.filename
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        file_size_bytes = len(file_content)
        if file_size_bytes > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB. Your file is {file_size_bytes / 1024 / 1024:.1f}MB"
            )
        
        # Track storage usage for billing (convert bytes to MB)
        try:
            from app.services.usage_service import UsageService
            usage_service = UsageService(db)
            file_size_mb = file_size_bytes / 1024 / 1024
            usage_service.track_usage(
                business_id=business_id,
                resource_type="storage",
                resource_id=f"doc_{filename}",
                quantity=int(file_size_mb) + 1  # Round up to nearest MB
            )
            log.debug(f"storage_usage_tracked business_id={business_id} size_mb={file_size_mb:.2f}")
        except Exception as usage_error:
            # Don't fail upload if usage tracking fails
            log.warning(f"storage_usage_tracking_failed business_id={business_id} error={str(usage_error)}")
        
        # Parse document to extract text
        log.info(f"Parsing uploaded document: {filename} ({len(file_content)} bytes)")
        document_text = parse_document(file_content, filename)
        
        if not document_text:
            raise HTTPException(
                status_code=400,
                detail="Failed to extract text from document. Please check the file format and try again."
            )
        
        log.info(f"✅ Extracted {len(document_text)} characters from {filename}")
        
        # Use GPT-4o to extract Q&A pairs
        if not settings.openai_api_key or not settings.openai_api_key.strip():
            # Fallback: return raw text for manual processing
            return {
                "success": True,
                "mode": "manual",
                "raw_text": document_text[:5000],  # Limit to 5000 chars for preview
                "message": "OpenAI API key not configured. Please manually create Q&A pairs from the text above."
            }
        
        log.info("Using GPT-4o to extract Q&A pairs...")
        qa_pairs = extract_qa_with_gpt(document_text, settings.openai_api_key)
        
        if not qa_pairs:
            # Fallback: return raw text
            return {
                "success": True,
                "mode": "manual",
                "raw_text": document_text[:5000],
                "message": "Failed to extract Q&A pairs automatically. Please review the text and create entries manually."
            }
        
        # Return extracted Q&A pairs for user review
        return {
            "success": True,
            "mode": "ai_extracted",
            "qa_pairs": qa_pairs,
            "original_text": document_text[:2000],  # Preview of original
            "message": f"Successfully extracted {len(qa_pairs)} Q&A pairs. Review and save them below."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error processing document upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )


@router.post("/knowledge/bulk/delete")
async def bulk_delete_knowledge(
    entry_ids: List[int],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk delete knowledge entries."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Knowledge base access requires a business account"
        )
    
    if not entry_ids or not isinstance(entry_ids, list):
        raise HTTPException(status_code=400, detail="Invalid entry_ids format")
    
    # Get all entries that belong to this business
    entries = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.id.in_(entry_ids),
        KnowledgeEntry.business_id == business_id
    ).all()
    
    deleted_count = len(entries)
    
    for entry in entries:
        db.delete(entry)
    
    db.commit()
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "requested_count": len(entry_ids),
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

    # Get tags for this conversation
    tag_relations = db.query(ConversationTagRelation).filter(
        ConversationTagRelation.conversation_id == conversation_id
    ).all()
    tag_ids = [rel.tag_id for rel in tag_relations]
    tags = db.query(ConversationTag).filter(ConversationTag.id.in_(tag_ids)).all() if tag_ids else []

    # Get assignment for this conversation
    assignment = db.query(ConversationAssignment).filter(
        ConversationAssignment.conversation_id == conversation_id
    ).first()
    
    assignment_data = None
    if assignment:
        assignee = db.query(UserModel).filter(UserModel.id == assignment.assigned_to_user_id).first()
        assignment_data = {
            "assigned_to_user_id": assignment.assigned_to_user_id,
            "assigned_to_user_name": assignee.full_name if assignee and assignee.full_name else assignee.email if assignee else "Unknown",
            "notes": assignment.notes,
            "assigned_at": assignment.created_at.isoformat(),
        }

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
        "tags": [
            {
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
            }
            for tag in tags
        ],
        "assignment": assignment_data,
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
        
        # AI resolution rate: All conversations are AI-handled (no human handoffs tracked yet)
        ai_resolution_rate = 100.0 if total_conv > 0 else 0.0
        
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


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single lead by ID."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Lead).filter(Lead.id == lead_id)
    
    if business_id is not None:
        query = query.filter(Lead.business_id == business_id)
    
    lead = query.first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {
        "id": lead.id,
        "user_id": lead.user_id,
        "channel": lead.channel,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "status": lead.status,
        "source_intent": lead.source_intent,
        "extra_data": lead.extra_data,
        "created_at": lead.created_at.isoformat(),
        "updated_at": lead.updated_at.isoformat(),
    }


@router.post("/leads")
async def create_lead(
    lead_data: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new lead."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lead creation requires a business account"
        )
    
    lead = Lead(
        business_id=business_id,
        user_id=lead_data.get("user_id", ""),
        channel=lead_data.get("channel", "manual"),
        name=lead_data.get("name"),
        email=lead_data.get("email"),
        phone=lead_data.get("phone"),
        status=lead_data.get("status", "new"),
        source_intent=lead_data.get("source_intent"),
        extra_data=lead_data.get("extra_data"),
    )
    
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    return {
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


@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: int,
    lead_data: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a lead."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Lead).filter(Lead.id == lead_id)
    
    if business_id is not None:
        query = query.filter(Lead.business_id == business_id)
    
    lead = query.first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update fields
    if "name" in lead_data:
        lead.name = lead_data["name"]
    if "email" in lead_data:
        lead.email = lead_data["email"]
    if "phone" in lead_data:
        lead.phone = lead_data["phone"]
    if "status" in lead_data:
        lead.status = lead_data["status"]
    if "source_intent" in lead_data:
        lead.source_intent = lead_data["source_intent"]
    if "extra_data" in lead_data:
        lead.extra_data = lead_data["extra_data"]
    
    db.commit()
    db.refresh(lead)
    
    return {
        "id": lead.id,
        "user_id": lead.user_id,
        "channel": lead.channel,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "status": lead.status,
        "source_intent": lead.source_intent,
        "created_at": lead.created_at.isoformat(),
        "updated_at": lead.updated_at.isoformat(),
    }


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a lead."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Lead).filter(Lead.id == lead_id)
    
    if business_id is not None:
        query = query.filter(Lead.business_id == business_id)
    
    lead = query.first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db.delete(lead)
    db.commit()
    
    return {"success": True, "message": "Lead deleted successfully"}


@router.get("/leads/stats/dashboard")
async def get_lead_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get lead statistics for dashboard."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Lead)
    
    if business_id is not None:
        query = query.filter(Lead.business_id == business_id)
    
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    # Total leads
    total_leads = query.count()
    
    # By status
    status_counts = db.query(
        Lead.status,
        func.count(Lead.id)
    ).filter(
        Lead.business_id == business_id if business_id else True
    ).group_by(Lead.status).all()
    
    by_status = defaultdict(int)
    for status_val, count in status_counts:
        by_status[status_val] = count
    
    # By channel
    channel_counts = db.query(
        Lead.channel,
        func.count(Lead.id)
    ).filter(
        Lead.business_id == business_id if business_id else True
    ).group_by(Lead.channel).all()
    
    by_channel = defaultdict(int)
    for channel_val, count in channel_counts:
        by_channel[channel_val] = count
    
    # Recent leads (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_leads = query.filter(Lead.created_at >= seven_days_ago).count()
    
    # Conversion rate
    total_qualified = by_status.get("qualified", 0) + by_status.get("converted", 0)
    conversion_rate = (total_qualified / total_leads * 100) if total_leads > 0 else 0
    
    return {
        "total_leads": total_leads,
        "by_status": dict(by_status),
        "by_channel": dict(by_channel),
        "recent_leads": recent_leads,
        "conversion_rate": round(conversion_rate, 2),
        "new_count": by_status.get("new", 0),
        "contacted_count": by_status.get("contacted", 0),
        "qualified_count": by_status.get("qualified", 0),
        "converted_count": by_status.get("converted", 0),
    }


@router.post("/leads/bulk/update-status")
async def bulk_update_lead_status(
    data: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk update lead status."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lead management requires a business account"
        )
    
    lead_ids = data.get("lead_ids", [])
    new_status = data.get("status")
    
    if not lead_ids or not new_status:
        raise HTTPException(
            status_code=400,
            detail="lead_ids and status are required"
        )
    
    query = db.query(Lead).filter(
        Lead.id.in_(lead_ids),
        Lead.business_id == business_id
    )
    
    updated_count = query.update(
        {"status": new_status, "updated_at": datetime.utcnow()},
        synchronize_session=False
    )
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{updated_count} leads updated to {new_status}",
        "updated_count": updated_count
    }


@router.post("/leads/bulk/delete")
async def bulk_delete_leads(
    data: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk delete leads."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lead management requires a business account"
        )
    
    lead_ids = data.get("lead_ids", [])
    
    if not lead_ids:
        raise HTTPException(status_code=400, detail="lead_ids is required")
    
    query = db.query(Lead).filter(
        Lead.id.in_(lead_ids),
        Lead.business_id == business_id
    )
    
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    
    return {
        "success": True,
        "message": f"{deleted_count} leads deleted",
        "deleted_count": deleted_count
    }


@router.get("/leads/{lead_id}/score")
async def get_lead_score(
    lead_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate lead score based on various factors."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(Lead).filter(Lead.id == lead_id)
    
    if business_id is not None:
        query = query.filter(Lead.business_id == business_id)
    
    lead = query.first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Simple scoring algorithm
    score = 0
    factors = []
    
    # Has email (+20 points)
    if lead.email:
        score += 20
        factors.append({"factor": "Has email", "points": 20})
    
    # Has phone (+20 points)
    if lead.phone:
        score += 20
        factors.append({"factor": "Has phone", "points": 20})
    
    # Has name (+10 points)
    if lead.name:
        score += 10
        factors.append({"factor": "Has name", "points": 10})
    
    # Source intent (+15 points)
    if lead.source_intent:
        score += 15
        factors.append({"factor": "Has source intent", "points": 15})
    
    # Status progression
    status_points = {
        "new": 10,
        "contacted": 20,
        "qualified": 35,
        "converted": 50
    }
    status_score = status_points.get(lead.status, 0)
    score += status_score
    factors.append({"factor": f"Status: {lead.status}", "points": status_score})
    
    # Recency (newer leads get more points)
    from datetime import datetime, timedelta
    days_old = (datetime.utcnow() - lead.created_at).days
    if days_old <= 1:
        recency_score = 15
        factors.append({"factor": "Very recent (< 1 day)", "points": 15})
    elif days_old <= 7:
        recency_score = 10
        factors.append({"factor": "Recent (< 7 days)", "points": 10})
    elif days_old <= 30:
        recency_score = 5
        factors.append({"factor": "Recent (< 30 days)", "points": 5})
    else:
        recency_score = 0
    score += recency_score
    
    # Determine quality
    if score >= 80:
        quality = "hot"
    elif score >= 60:
        quality = "warm"
    elif score >= 40:
        quality = "cold"
    else:
        quality = "ice"
    
    return {
        "lead_id": lead_id,
        "score": score,
        "quality": quality,
        "factors": factors,
        "max_score": 150,
        "percentage": round((score / 150) * 100, 2)
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


# ========== AI RULES CRUD OPERATIONS ==========

@router.get("/ai-rules")
async def get_ai_rules(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    intent: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all AI rules for the business."""
    from app.models import AIRule
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI rules access requires a business account"
        )
    
    query = db.query(AIRule).filter(AIRule.business_id == business_id)
    
    # Apply filters
    if intent:
        query = query.filter(AIRule.intent == intent)
    if is_active is not None:
        query = query.filter(AIRule.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering (priority first, then created_at)
    offset = (page - 1) * limit
    rules = query.order_by(AIRule.priority.asc(), AIRule.created_at.desc()).offset(offset).limit(limit).all()
    
    # Build response
    result_rules = []
    for rule in rules:
        keywords = []
        if rule.keywords:
            try:
                keywords = json.loads(rule.keywords) if isinstance(rule.keywords, str) else rule.keywords
            except:
                keywords = []
        
        result_rules.append({
            "id": rule.id,
            "intent": rule.intent,
            "name": rule.name,
            "description": rule.description,
            "keywords": keywords,
            "response": rule.response,
            "priority": rule.priority,
            "is_active": rule.is_active,
            "trigger_count": rule.trigger_count,
            "last_triggered_at": rule.last_triggered_at.isoformat() if rule.last_triggered_at else None,
            "created_at": rule.created_at.isoformat(),
            "updated_at": rule.updated_at.isoformat(),
        })
    
    return {
        "rules": result_rules,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.post("/ai-rules")
async def create_ai_rule(
    intent: str,
    keywords: List[str],
    response: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    priority: int = 100,
    is_active: bool = True,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI rule."""
    from app.models import AIRule
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="AI rules access requires a business account"
        )
    
    # Validate required fields
    if not intent or not keywords or not response:
        raise HTTPException(status_code=400, detail="Intent, keywords, and response are required")
    
    # Create rule
    rule = AIRule(
        business_id=business_id,
        intent=intent.strip().lower(),
        name=name.strip() if name else None,
        description=description.strip() if description else None,
        keywords=json.dumps(keywords),
        response=response.strip(),
        priority=priority,
        is_active=is_active,
        created_by_user_id=current_user.id,
    )
    
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    return {
        "id": rule.id,
        "intent": rule.intent,
        "name": rule.name,
        "description": rule.description,
        "keywords": json.loads(rule.keywords),
        "response": rule.response,
        "priority": rule.priority,
        "is_active": rule.is_active,
        "created_at": rule.created_at.isoformat(),
    }


@router.get("/ai-rules/{rule_id}")
async def get_ai_rule(
    rule_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific AI rule."""
    from app.models import AIRule
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="AI rules access requires a business account"
        )
    
    rule = db.query(AIRule).filter(
        AIRule.id == rule_id,
        AIRule.business_id == business_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="AI rule not found")
    
    keywords = []
    if rule.keywords:
        try:
            keywords = json.loads(rule.keywords)
        except:
            keywords = []
    
    return {
        "id": rule.id,
        "intent": rule.intent,
        "name": rule.name,
        "description": rule.description,
        "keywords": keywords,
        "response": rule.response,
        "priority": rule.priority,
        "is_active": rule.is_active,
        "trigger_count": rule.trigger_count,
        "last_triggered_at": rule.last_triggered_at.isoformat() if rule.last_triggered_at else None,
        "created_at": rule.created_at.isoformat(),
        "updated_at": rule.updated_at.isoformat(),
    }


@router.put("/ai-rules/{rule_id}")
async def update_ai_rule(
    rule_id: int,
    intent: Optional[str] = None,
    name: Optional[str] = None,
    description: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    response: Optional[str] = None,
    priority: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an AI rule."""
    from app.models import AIRule
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="AI rules access requires a business account"
        )
    
    # Get rule
    rule = db.query(AIRule).filter(
        AIRule.id == rule_id,
        AIRule.business_id == business_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="AI rule not found")
    
    # Update fields
    if intent is not None:
        rule.intent = intent.strip().lower()
    if name is not None:
        rule.name = name.strip() if name else None
    if description is not None:
        rule.description = description.strip() if description else None
    if keywords is not None:
        rule.keywords = json.dumps(keywords)
    if response is not None:
        rule.response = response.strip()
    if priority is not None:
        rule.priority = priority
    if is_active is not None:
        rule.is_active = is_active
    
    rule.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(rule)
    
    return {
        "id": rule.id,
        "intent": rule.intent,
        "name": rule.name,
        "description": rule.description,
        "keywords": json.loads(rule.keywords),
        "response": rule.response,
        "priority": rule.priority,
        "is_active": rule.is_active,
        "updated_at": rule.updated_at.isoformat(),
    }


@router.delete("/ai-rules/{rule_id}")
async def delete_ai_rule(
    rule_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an AI rule."""
    from app.models import AIRule
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="AI rules access requires a business account"
        )
    
    # Get rule
    rule = db.query(AIRule).filter(
        AIRule.id == rule_id,
        AIRule.business_id == business_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="AI rule not found")
    
    db.delete(rule)
    db.commit()
    
    return {"success": True, "message": "AI rule deleted successfully"}


@router.post("/ai-rules/bulk/delete")
async def bulk_delete_ai_rules(
    rule_ids: List[int],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk delete AI rules."""
    from app.models import AIRule
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="AI rules access requires a business account"
        )
    
    if not rule_ids or not isinstance(rule_ids, list):
        raise HTTPException(status_code=400, detail="Invalid rule_ids format")
    
    # Get all rules that belong to this business
    rules = db.query(AIRule).filter(
        AIRule.id.in_(rule_ids),
        AIRule.business_id == business_id
    ).all()
    
    deleted_count = len(rules)
    
    for rule in rules:
        db.delete(rule)
    
    db.commit()
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "requested_count": len(rule_ids),
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


@router.get("/ads/assets/{asset_id}")
async def get_ad_asset(
    asset_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific ad asset."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Ad assets require a business account"
        )
    
    asset = db.query(AdAsset).filter(
        AdAsset.id == asset_id,
        AdAsset.business_id == business_id
    ).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    import json
    extra_data = {}
    if asset.extra_data:
        try:
            extra_data = json.loads(asset.extra_data)
        except:
            pass
    
    return {
        "id": asset.id,
        "title": asset.title,
        "asset_type": asset.asset_type,
        "content": asset.content,
        "platform": asset.platform,
        "status": asset.status,
        "extra_data": extra_data,
        "created_at": asset.created_at.isoformat(),
        "updated_at": asset.updated_at.isoformat(),
    }


@router.put("/ads/assets/{asset_id}")
async def update_ad_asset(
    asset_id: int,
    request: dict,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an ad asset."""
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Ad assets require a business account"
        )
    
    asset = db.query(AdAsset).filter(
        AdAsset.id == asset_id,
        AdAsset.business_id == business_id
    ).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Update fields
    if "title" in request:
        asset.title = request["title"]
    if "content" in request:
        asset.content = request["content"]
    if "platform" in request:
        asset.platform = request["platform"]
    if "status" in request:
        asset.status = request["status"]
    if "extra_data" in request:
        if isinstance(request["extra_data"], dict):
            asset.extra_data = json.dumps(request["extra_data"])
        else:
            asset.extra_data = request["extra_data"]
    
    asset.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(asset)
    
    return {
        "id": asset.id,
        "title": asset.title,
        "asset_type": asset.asset_type,
        "status": asset.status,
        "updated_at": asset.updated_at.isoformat(),
    }


@router.delete("/ads/assets/{asset_id}")
async def delete_ad_asset(
    asset_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an ad asset."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Ad assets require a business account"
        )
    
    asset = db.query(AdAsset).filter(
        AdAsset.id == asset_id,
        AdAsset.business_id == business_id
    ).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(asset)
    db.commit()
    
    return {"success": True, "message": "Asset deleted successfully"}


@router.get("/ads/assets")
async def list_ad_assets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    asset_type: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    campaign_name: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all ad assets with filtering."""
    import json
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=403,
            detail="Ad assets require a business account"
        )
    
    query = db.query(AdAsset).filter(AdAsset.business_id == business_id)
    
    # Apply filters
    if asset_type:
        query = query.filter(AdAsset.asset_type == asset_type)
    if platform:
        query = query.filter(AdAsset.platform == platform)
    if status:
        query = query.filter(AdAsset.status == status)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    assets = query.order_by(AdAsset.created_at.desc()).offset(offset).limit(limit).all()
    
    # Build response
    result_assets = []
    for asset in assets:
        extra_data = {}
        if asset.extra_data:
            try:
                extra_data = json.loads(asset.extra_data)
            except:
                pass
        
        # Filter by campaign if specified
        if campaign_name and extra_data.get("campaign_name") != campaign_name:
            continue
        
        result_assets.append({
            "id": asset.id,
            "title": asset.title,
            "asset_type": asset.asset_type,
            "platform": asset.platform,
            "status": asset.status,
            "campaign_name": extra_data.get("campaign_name", "Uncategorized"),
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat(),
        })
    
    return {
        "assets": result_assets,
        "total": len(result_assets),
        "page": page,
        "limit": limit,
        "total_pages": (len(result_assets) + limit - 1) // limit,
    }


# ========== CONVERSATION TAGS & BULK ACTIONS ==========

@router.get("/conversations/tags")
async def get_conversation_tags(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all conversation tags for the current business."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(ConversationTag)
    if business_id is not None:
        query = query.filter(ConversationTag.business_id == business_id)
    
    tags = query.order_by(ConversationTag.name).all()
    
    return {
        "tags": [
            {
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "description": tag.description,
                "created_at": tag.created_at.isoformat(),
            }
            for tag in tags
        ]
    }


@router.post("/conversations/tags")
async def create_conversation_tag(
    name: str,
    color: Optional[str] = None,
    description: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new conversation tag."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(status_code=403, detail="Tags require a business account")
    
    # Check if tag name already exists for this business
    existing_tag = db.query(ConversationTag).filter(
        ConversationTag.business_id == business_id,
        ConversationTag.name == name
    ).first()
    
    if existing_tag:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    
    tag = ConversationTag(
        business_id=business_id,
        name=name,
        color=color,
        description=description,
        created_by_user_id=current_user.id,
    )
    
    db.add(tag)
    db.commit()
    db.refresh(tag)
    
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "description": tag.description,
        "created_at": tag.created_at.isoformat(),
    }


@router.put("/conversations/tags/{tag_id}")
async def update_conversation_tag(
    tag_id: int,
    name: Optional[str] = None,
    color: Optional[str] = None,
    description: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a conversation tag."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(ConversationTag).filter(ConversationTag.id == tag_id)
    if business_id is not None:
        query = query.filter(ConversationTag.business_id == business_id)
    
    tag = query.first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    if name:
        tag.name = name
    if color:
        tag.color = color
    if description is not None:
        tag.description = description
    
    db.commit()
    db.refresh(tag)
    
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "description": tag.description,
    }


@router.delete("/conversations/tags/{tag_id}")
async def delete_conversation_tag(
    tag_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation tag."""
    business_id = get_user_business_id(current_user, db)
    
    query = db.query(ConversationTag).filter(ConversationTag.id == tag_id)
    if business_id is not None:
        query = query.filter(ConversationTag.business_id == business_id)
    
    tag = query.first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Delete all tag relations first
    db.query(ConversationTagRelation).filter(
        ConversationTagRelation.tag_id == tag_id
    ).delete()
    
    db.delete(tag)
    db.commit()
    
    return {"success": True}


@router.post("/conversations/{conversation_id}/tags")
async def add_tag_to_conversation(
    conversation_id: int,
    tag_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a tag to a conversation."""
    business_id = get_user_business_id(current_user, db)
    
    # Verify conversation exists and belongs to business
    conv_query = db.query(Conversation).filter(Conversation.id == conversation_id)
    if business_id is not None:
        conv_query = conv_query.filter(Conversation.business_id == business_id)
    
    conversation = conv_query.first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify tag exists and belongs to business
    tag_query = db.query(ConversationTag).filter(ConversationTag.id == tag_id)
    if business_id is not None:
        tag_query = tag_query.filter(ConversationTag.business_id == business_id)
    
    tag = tag_query.first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if already tagged
    existing = db.query(ConversationTagRelation).filter(
        ConversationTagRelation.conversation_id == conversation_id,
        ConversationTagRelation.tag_id == tag_id
    ).first()
    
    if existing:
        return {"success": True, "message": "Already tagged"}
    
    relation = ConversationTagRelation(
        conversation_id=conversation_id,
        tag_id=tag_id,
        tagged_by_user_id=current_user.id,
    )
    
    db.add(relation)
    db.commit()
    
    return {"success": True}


@router.delete("/conversations/{conversation_id}/tags/{tag_id}")
async def remove_tag_from_conversation(
    conversation_id: int,
    tag_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a tag from a conversation."""
    business_id = get_user_business_id(current_user, db)
    
    # Verify conversation belongs to business
    conv_query = db.query(Conversation).filter(Conversation.id == conversation_id)
    if business_id is not None:
        conv_query = conv_query.filter(Conversation.business_id == business_id)
    
    conversation = conv_query.first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete tag relation
    relation = db.query(ConversationTagRelation).filter(
        ConversationTagRelation.conversation_id == conversation_id,
        ConversationTagRelation.tag_id == tag_id
    ).first()
    
    if relation:
        db.delete(relation)
        db.commit()
    
    return {"success": True}


@router.post("/conversations/bulk/tag")
async def bulk_tag_conversations(
    conversation_ids: List[int],
    tag_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a tag to multiple conversations at once."""
    business_id = get_user_business_id(current_user, db)
    
    # Verify tag exists
    tag_query = db.query(ConversationTag).filter(ConversationTag.id == tag_id)
    if business_id is not None:
        tag_query = tag_query.filter(ConversationTag.business_id == business_id)
    
    tag = tag_query.first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Verify all conversations belong to business
    conv_query = db.query(Conversation).filter(Conversation.id.in_(conversation_ids))
    if business_id is not None:
        conv_query = conv_query.filter(Conversation.business_id == business_id)
    
    conversations = conv_query.all()
    found_ids = [c.id for c in conversations]
    
    # Add tags (skip if already exists)
    added_count = 0
    for conv_id in found_ids:
        existing = db.query(ConversationTagRelation).filter(
            ConversationTagRelation.conversation_id == conv_id,
            ConversationTagRelation.tag_id == tag_id
        ).first()
        
        if not existing:
            relation = ConversationTagRelation(
                conversation_id=conv_id,
                tag_id=tag_id,
                tagged_by_user_id=current_user.id,
            )
            db.add(relation)
            added_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "tagged_count": added_count,
        "total_requested": len(conversation_ids),
        "found_count": len(found_ids),
    }


@router.post("/conversations/bulk/export")
async def bulk_export_conversations(
    conversation_ids: List[int],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export multiple conversations to JSON."""
    business_id = get_user_business_id(current_user, db)
    
    # Verify all conversations belong to business
    conv_query = db.query(Conversation).filter(Conversation.id.in_(conversation_ids))
    if business_id is not None:
        conv_query = conv_query.filter(Conversation.business_id == business_id)
    
    conversations = conv_query.all()
    
    export_data = []
    for conv in conversations:
        # Get messages
        message_filter = and_(
            Message.user_id == conv.user_id,
            Message.channel == conv.channel
        )
        if business_id is not None:
            message_filter = and_(message_filter, Message.business_id == business_id)
        
        messages = db.query(Message).filter(message_filter).order_by(Message.created_at).all()
        
        # Get tags
        tag_relations = db.query(ConversationTagRelation).filter(
            ConversationTagRelation.conversation_id == conv.id
        ).all()
        tag_ids = [rel.tag_id for rel in tag_relations]
        tags = db.query(ConversationTag).filter(ConversationTag.id.in_(tag_ids)).all() if tag_ids else []
        
        # Get assignment
        assignment = db.query(ConversationAssignment).filter(
            ConversationAssignment.conversation_id == conv.id
        ).first()
        
        export_data.append({
            "id": conv.id,
            "user_id": conv.user_id,
            "channel": conv.channel,
            "user_message": conv.user_message,
            "bot_reply": conv.bot_reply,
            "intent": conv.intent,
            "created_at": conv.created_at.isoformat(),
            "messages": [
                {
                    "text": msg.message_text,
                    "is_from_user": msg.is_from_user,
                    "intent": msg.intent,
                    "timestamp": msg.created_at.isoformat(),
                }
                for msg in messages
            ],
            "tags": [{"id": tag.id, "name": tag.name, "color": tag.color} for tag in tags],
            "assignment": {
                "assigned_to_user_id": assignment.assigned_to_user_id,
                "notes": assignment.notes,
                "assigned_at": assignment.created_at.isoformat(),
            } if assignment else None,
        })
    
    return {
        "conversations": export_data,
        "total": len(export_data),
        "exported_at": datetime.utcnow().isoformat(),
    }


# ========== CONVERSATION ASSIGNMENTS ==========

@router.post("/conversations/{conversation_id}/assign")
async def assign_conversation(
    conversation_id: int,
    assigned_to_user_id: int,
    notes: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a conversation to a team member."""
    business_id = get_user_business_id(current_user, db)
    
    # Verify conversation exists and belongs to business
    conv_query = db.query(Conversation).filter(Conversation.id == conversation_id)
    if business_id is not None:
        conv_query = conv_query.filter(Conversation.business_id == business_id)
    
    conversation = conv_query.first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify assignee exists and belongs to same business
    assignee_query = db.query(UserModel).filter(UserModel.id == assigned_to_user_id)
    if business_id is not None:
        assignee_query = assignee_query.filter(UserModel.business_id == business_id)
    
    assignee = assignee_query.first()
    if not assignee:
        raise HTTPException(status_code=404, detail="User not found or not in same business")
    
    # Check if already assigned
    existing_assignment = db.query(ConversationAssignment).filter(
        ConversationAssignment.conversation_id == conversation_id
    ).first()
    
    if existing_assignment:
        # Update existing assignment
        existing_assignment.assigned_to_user_id = assigned_to_user_id
        existing_assignment.assigned_by_user_id = current_user.id
        existing_assignment.notes = notes
        existing_assignment.updated_at = datetime.utcnow()
    else:
        # Create new assignment
        assignment = ConversationAssignment(
            conversation_id=conversation_id,
            assigned_to_user_id=assigned_to_user_id,
            assigned_by_user_id=current_user.id,
            notes=notes,
        )
        db.add(assignment)
    
    db.commit()
    
    return {"success": True}


@router.delete("/conversations/{conversation_id}/assign")
async def unassign_conversation(
    conversation_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unassign a conversation from a team member."""
    business_id = get_user_business_id(current_user, db)
    
    # Verify conversation belongs to business
    conv_query = db.query(Conversation).filter(Conversation.id == conversation_id)
    if business_id is not None:
        conv_query = conv_query.filter(Conversation.business_id == business_id)
    
    conversation = conv_query.first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete assignment
    assignment = db.query(ConversationAssignment).filter(
        ConversationAssignment.conversation_id == conversation_id
    ).first()
    
    if assignment:
        db.delete(assignment)
        db.commit()
    
    return {"success": True}


# ========== CONVERSATION ANALYTICS ==========

@router.get("/conversations/analytics")
async def get_conversation_analytics(
    days: int = Query(7, ge=1, le=365),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get conversation analytics including response times and engagement metrics."""
    business_id = get_user_business_id(current_user, db)
    
    # Date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Base filters
    conv_filter = Conversation.created_at >= start_date
    if business_id is not None:
        conv_filter = and_(conv_filter, Conversation.business_id == business_id)
    
    # Total conversations
    total_conversations = db.query(func.count(Conversation.id)).filter(conv_filter).scalar() or 0
    
    # Unique users
    unique_users = db.query(func.count(func.distinct(Conversation.user_id))).filter(conv_filter).scalar() or 0
    
    # Average messages per conversation
    message_filter = Message.created_at >= start_date
    if business_id is not None:
        message_filter = and_(message_filter, Message.business_id == business_id)
    
    total_messages = db.query(func.count(Message.id)).filter(message_filter).scalar() or 0
    avg_messages_per_conv = round(total_messages / max(total_conversations, 1), 2)
    
    # Conversations by channel
    channel_stats = db.query(
        Conversation.channel,
        func.count(Conversation.id).label("count")
    ).filter(conv_filter).group_by(Conversation.channel).all()
    
    # Conversations by intent
    intent_stats = db.query(
        Conversation.intent,
        func.count(Conversation.id).label("count")
    ).filter(conv_filter).group_by(Conversation.intent).all()
    
    # Tagged conversations count
    tagged_count = db.query(func.count(func.distinct(ConversationTagRelation.conversation_id))).join(
        Conversation, Conversation.id == ConversationTagRelation.conversation_id
    ).filter(conv_filter).scalar() or 0
    
    # Assigned conversations count
    assigned_count = db.query(func.count(func.distinct(ConversationAssignment.conversation_id))).join(
        Conversation, Conversation.id == ConversationAssignment.conversation_id
    ).filter(conv_filter).scalar() or 0
    
    # Most active tags
    tag_stats = db.query(
        ConversationTag.id,
        ConversationTag.name,
        ConversationTag.color,
        func.count(ConversationTagRelation.conversation_id).label("usage_count")
    ).join(ConversationTagRelation).join(Conversation).filter(conv_filter).group_by(
        ConversationTag.id, ConversationTag.name, ConversationTag.color
    ).order_by(func.count(ConversationTagRelation.conversation_id).desc()).limit(10).all()
    
    return {
        "summary": {
            "total_conversations": total_conversations,
            "unique_users": unique_users,
            "avg_messages_per_conversation": avg_messages_per_conv,
            "tagged_conversations": tagged_count,
            "assigned_conversations": assigned_count,
        },
        "channels": [
            {"channel": channel, "count": count}
            for channel, count in channel_stats
        ],
        "intents": [
            {"intent": intent, "count": count}
            for intent, count in intent_stats
        ],
        "popular_tags": [
            {
                "id": tag_id,
                "name": name,
                "color": color,
                "usage_count": usage_count,
            }
            for tag_id, name, color, usage_count in tag_stats
        ],
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": days,
        },
    }
