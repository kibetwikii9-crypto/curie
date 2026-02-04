"""Production-ready AI Engine with GPT-4o integration.

This module provides a complete AI brain that:
- Integrates with OpenAI GPT-4o/GPT-4 for intelligent responses
- Uses RAG (Retrieval-Augmented Generation) with database knowledge
- Applies business-specific AI rules from database
- Maintains conversation memory in database
- Falls back gracefully to rule-based responses if GPT fails
- Handles all edge cases and errors
"""
import logging
import json
from typing import Optional, Dict, List
from datetime import datetime

from openai import AsyncOpenAI, OpenAIError
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.config import settings
from app.schemas import NormalizedMessage
from app.models import KnowledgeEntry, AIRule, ConversationMemory
from app.database import get_db_context
from app.services.ai_brain import process_message as fallback_process
from app.services.edge_case_handler import (
    is_spam,
    validate_message_length,
    is_emoji_or_symbol_only,
    is_unsupported_action,
)

log = logging.getLogger(__name__)

# Initialize OpenAI client (lazy load to handle missing API key gracefully)
_openai_client: Optional[AsyncOpenAI] = None
_gpt_enabled: bool = False


def _init_openai_client():
    """Initialize OpenAI client if API key is available."""
    global _openai_client, _gpt_enabled
    
    if _openai_client is not None:
        return  # Already initialized
    
    try:
        if settings.openai_api_key and settings.openai_api_key.strip():
            _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            _gpt_enabled = True
            log.info("✅ OpenAI GPT client initialized successfully")
        else:
            log.warning("⚠️ OpenAI API key not configured - using fallback rule-based responses")
            _gpt_enabled = False
    except Exception as e:
        log.error(f"❌ Failed to initialize OpenAI client: {e}")
        _gpt_enabled = False


def _get_knowledge_context(db: Session, business_id: int, message_text: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Retrieve relevant knowledge entries from database using keyword matching.
    
    Args:
        db: Database session
        business_id: Business ID for multi-tenant isolation
        message_text: User's message text
        limit: Maximum number of entries to return
    
    Returns:
        List of relevant knowledge entries with question and answer
    """
    try:
        message_lower = message_text.lower().strip()
        
        # PERFORMANCE OPTIMIZATION: Limit to 50 most recent active entries instead of loading ALL
        # This prevents slowdown when knowledge base grows to 1000+ entries
        entries = db.query(KnowledgeEntry).filter(
            and_(
                KnowledgeEntry.business_id == business_id,
                KnowledgeEntry.is_active == True
            )
        ).order_by(KnowledgeEntry.updated_at.desc()).limit(50).all()
        
        relevant_entries = []
        
        for entry in entries:
            # Check if any keyword matches
            if entry.keywords:
                try:
                    keywords = json.loads(entry.keywords) if isinstance(entry.keywords, str) else entry.keywords
                    if isinstance(keywords, list):
                        if any(kw.lower() in message_lower for kw in keywords if isinstance(kw, str)):
                            relevant_entries.append({
                                "question": entry.question,
                                "answer": entry.answer
                            })
                            if len(relevant_entries) >= limit:
                                break
                except Exception as e:
                    log.debug(f"Error parsing keywords for entry {entry.id}: {e}")
            
            # Also check question text match
            if entry.question and entry.question.lower() in message_lower:
                if not any(e["question"] == entry.question for e in relevant_entries):
                    relevant_entries.append({
                        "question": entry.question,
                        "answer": entry.answer
                    })
                    if len(relevant_entries) >= limit:
                        break
        
        return relevant_entries[:limit]
    
    except Exception as e:
        log.error(f"Error retrieving knowledge context: {e}")
        return []


def _get_ai_rules(db: Session, business_id: int) -> List[str]:
    """
    Get active AI rules for the business.
    
    Args:
        db: Database session
        business_id: Business ID for multi-tenant isolation
    
    Returns:
        List of rule descriptions
    """
    try:
        rules = db.query(AIRule).filter(
            and_(
                AIRule.business_id == business_id,
                AIRule.is_active == True
            )
        ).order_by(AIRule.priority.desc()).limit(10).all()
        
        return [rule.description for rule in rules if rule.description]
    
    except Exception as e:
        log.error(f"Error retrieving AI rules: {e}")
        return []


def _get_conversation_memory(db: Session, business_id: int, user_id: str, channel: str) -> Optional[Dict]:
    """
    Get conversation memory from database.
    
    Args:
        db: Database session
        business_id: Business ID
        user_id: Platform-specific user ID
        channel: Channel/platform
    
    Returns:
        Memory dictionary or None
    """
    try:
        memory = db.query(ConversationMemory).filter(
            and_(
                ConversationMemory.business_id == business_id,
                ConversationMemory.user_id == user_id,
                ConversationMemory.channel == channel
            )
        ).first()
        
        if memory:
            context_data = {}
            if memory.context_data:
                try:
                    context_data = json.loads(memory.context_data) if isinstance(memory.context_data, str) else memory.context_data
                except Exception:
                    context_data = {}
            
            return {
                "last_intent": memory.last_intent,
                "message_count": memory.message_count,
                "context_data": context_data
            }
        
        return None
    
    except Exception as e:
        log.error(f"Error retrieving conversation memory: {e}")
        return None


def _update_conversation_memory(db: Session, business_id: int, user_id: str, channel: str, intent: str):
    """
    Update or create conversation memory in database.
    
    Args:
        db: Database session
        business_id: Business ID
        user_id: Platform-specific user ID
        channel: Channel/platform
        intent: Detected intent
    """
    try:
        memory = db.query(ConversationMemory).filter(
            and_(
                ConversationMemory.business_id == business_id,
                ConversationMemory.user_id == user_id,
                ConversationMemory.channel == channel
            )
        ).first()
        
        if memory:
            # Update existing memory
            memory.last_intent = intent
            memory.message_count = (memory.message_count or 0) + 1
            memory.updated_at = datetime.utcnow()
        else:
            # Create new memory
            memory = ConversationMemory(
                business_id=business_id,
                user_id=user_id,
                channel=channel,
                last_intent=intent,
                message_count=1,
                context_data=None
            )
            db.add(memory)
        
        db.commit()
        log.debug(f"✅ memory_updated user_id={user_id} intent={intent} count={memory.message_count}")
    
    except Exception as e:
        log.error(f"Error updating conversation memory: {e}")
        db.rollback()


def _build_system_prompt(
    business_rules: List[str],
    knowledge_context: List[Dict[str, str]],
    memory: Optional[Dict] = None
) -> str:
    """
    Build comprehensive system prompt with business rules, knowledge, and memory.
    
    Args:
        business_rules: List of AI rules from database
        knowledge_context: Relevant knowledge entries
        memory: Conversation memory data
    
    Returns:
        Complete system prompt for GPT
    """
    prompt_parts = [
        "You are a helpful, professional AI assistant for a business communication platform.",
        "Your role is to assist customers with their questions, provide information, and help them achieve their goals.",
        "",
        "IMPORTANT GUIDELINES:",
        "- Be friendly, professional, and concise",
        "- Answer based on the knowledge provided below",
        "- If you don't know something, admit it and offer to connect them with support",
        "- Never make up information",
        "- Keep responses under 300 words",
        "- Use emojis sparingly (max 2 per message)",
        ""
    ]
    
    # Add business-specific AI rules
    if business_rules:
        prompt_parts.append("BUSINESS-SPECIFIC RULES:")
        for i, rule in enumerate(business_rules, 1):
            prompt_parts.append(f"{i}. {rule}")
        prompt_parts.append("")
    
    # Add knowledge context (RAG)
    if knowledge_context:
        prompt_parts.append("KNOWLEDGE BASE (Use this to answer questions):")
        for entry in knowledge_context:
            prompt_parts.append(f"Q: {entry['question']}")
            prompt_parts.append(f"A: {entry['answer']}")
            prompt_parts.append("")
    
    # Add conversation memory context
    if memory and memory.get("message_count", 0) > 1:
        prompt_parts.append(f"CONVERSATION CONTEXT:")
        prompt_parts.append(f"- This is message #{memory.get('message_count')} from this user")
        if memory.get("last_intent"):
            prompt_parts.append(f"- Previous topic: {memory.get('last_intent')}")
        prompt_parts.append("")
    
    return "\n".join(prompt_parts)


async def process_message_with_gpt(
    message: NormalizedMessage,
    business_id: int,
    db: Session
) -> str:
    """
    Process message using GPT-4o with RAG, business rules, and memory.
    
    This is the PRODUCTION AI brain that:
    1. Checks for edge cases (spam, emoji-only, etc.)
    2. Retrieves relevant knowledge from database (RAG)
    3. Gets business AI rules from database
    4. Loads conversation memory from database
    5. Builds comprehensive system prompt
    6. Calls GPT-4o for intelligent response
    7. Updates conversation memory
    8. Falls back to rule-based on errors
    
    Args:
        message: Normalized message from any platform
        business_id: Business ID for multi-tenant isolation
        db: Database session
    
    Returns:
        AI-generated response (never empty or None)
    """
    SAFE_DEFAULT = "I'm here to help! How can I assist you today?"
    
    try:
        # Initialize OpenAI client if needed
        _init_openai_client()
        
        # Edge Case 1: Spam detection
        try:
            is_spam_detected, spam_reason = is_spam(message.user_id)
            if is_spam_detected:
                log.warning(f"spam_detected user_id={message.user_id}")
                return "I notice you're sending messages very quickly. Please slow down so I can help you better! 😊"
        except Exception as e:
            log.warning(f"Spam check failed: {e}")
        
        # Edge Case 2: Message length validation
        try:
            is_valid_length, length_reason = validate_message_length(message.message_text)
            if not is_valid_length:
                log.warning(f"message_too_long user_id={message.user_id}")
                return "Your message is quite long! Could you break it down into smaller questions? I'm here to help! 😊"
        except Exception as e:
            log.warning(f"Length validation failed: {e}")
        
        # Edge Case 3: Emoji-only messages
        try:
            if is_emoji_or_symbol_only(message.message_text):
                log.info(f"emoji_only user_id={message.user_id}")
                return "I see you sent emojis! 😊 While I love emojis, I work best with text. How can I help you today?"
        except Exception as e:
            log.warning(f"Emoji check failed: {e}")
        
        # Edge Case 4: Unsupported actions
        try:
            is_unsupported, action_type = is_unsupported_action(message.message_text)
            if is_unsupported:
                if action_type == "file_upload":
                    return "I can't receive files right now, but I can answer questions! What would you like to know?"
                elif action_type == "video_call":
                    return "I'm a text-based assistant, so I can't do video calls. But I'm here to help! What can I assist you with?"
        except Exception as e:
            log.warning(f"Unsupported action check failed: {e}")
        
        # Step 1: Get relevant knowledge from database (RAG)
        knowledge_context = _get_knowledge_context(db, business_id, message.message_text)
        log.debug(f"knowledge_retrieved count={len(knowledge_context)}")
        
        # Step 2: Get AI rules for this business
        ai_rules = _get_ai_rules(db, business_id)
        log.debug(f"ai_rules_retrieved count={len(ai_rules)}")
        
        # Step 3: Get conversation memory
        memory = _get_conversation_memory(db, business_id, message.user_id, message.channel)
        log.debug(f"memory_retrieved user_id={message.user_id} exists={memory is not None}")
        
        # Step 4: Try GPT-4o if enabled
        if _gpt_enabled and _openai_client:
            try:
                # Build system prompt with knowledge, rules, and memory
                system_prompt = _build_system_prompt(ai_rules, knowledge_context, memory)
                
                # Call GPT-4o
                completion = await _openai_client.chat.completions.create(
                    model="gpt-4o",  # Use GPT-4o (latest, fastest, cheapest)
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message.message_text}
                    ],
                    temperature=0.7,
                    max_tokens=500,
                    timeout=10.0
                )
                
                response = completion.choices[0].message.content
                
                if response and response.strip():
                    log.info(f"✅ gpt_response_generated user_id={message.user_id} model=gpt-4o tokens={completion.usage.total_tokens}")
                    
                    # Update memory with detected intent (simplified - using "conversation" as intent)
                    _update_conversation_memory(db, business_id, message.user_id, message.channel, "conversation")
                    
                    return response.strip()
                else:
                    log.warning("GPT returned empty response - using fallback")
            
            except OpenAIError as e:
                log.error(f"OpenAI API error: {e} - falling back to rule-based")
            except Exception as e:
                log.error(f"GPT processing error: {e} - falling back to rule-based")
        
        # Step 5: Fallback to rule-based brain
        log.info(f"using_fallback_brain user_id={message.user_id} reason={'gpt_disabled' if not _gpt_enabled else 'gpt_failed'}")
        response = await fallback_process(message)
        
        # Update memory
        try:
            from app.services.ai_brain import detect_intent
            intent = detect_intent(message)
            intent_value = intent.value if hasattr(intent, "value") else "unknown"
            _update_conversation_memory(db, business_id, message.user_id, message.channel, intent_value)
        except Exception as e:
            log.warning(f"Memory update failed in fallback: {e}")
        
        return response if response and response.strip() else SAFE_DEFAULT
    
    except Exception as e:
        log.error(f"Critical error in AI engine: {e}", exc_info=True)
        return SAFE_DEFAULT


async def process_message(
    message: NormalizedMessage,
    business_id: int
) -> str:
    """
    Main entry point for AI message processing.
    
    This function orchestrates the complete AI pipeline:
    1. Edge case handling
    2. Knowledge retrieval (RAG)
    3. AI rules application
    4. Memory management
    5. GPT-4o response generation
    6. Fallback handling
    
    Args:
        message: Normalized message from any platform
        business_id: Business ID for multi-tenant isolation
    
    Returns:
        AI-generated response (never empty or None)
    """
    SAFE_DEFAULT = "I'm here to help! How can I assist you today?"
    
    try:
        # Validate input
        if not message or not hasattr(message, "message_text") or not message.message_text:
            log.warning("Invalid message received")
            return SAFE_DEFAULT
        
        # Get database session and process
        with get_db_context() as db:
            response = await process_message_with_gpt(message, business_id, db)
            return response if response and response.strip() else SAFE_DEFAULT
    
    except Exception as e:
        log.error(f"Fatal error in AI process_message: {e}", exc_info=True)
        return SAFE_DEFAULT
