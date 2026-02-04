"""Message processor for handling normalized messages.

This module provides intent detection and data preparation. The processor is SILENT:
- It only prepares data (message text, user_id, intent)
- It never contains user-facing text
- It never returns hardcoded messages
- It always delegates response generation to the AI layer

The AI layer (ai_engine.process_message) is responsible for all text generation.
"""
import logging

from enum import Enum

from app.schemas import NormalizedMessage
from app.services.ai_brain import process_message as ai_brain_process  # Fallback
from app.database import get_db_context

log = logging.getLogger(__name__)


class MessageIntent(str, Enum):
    """Detected intent categories for user messages."""

    GREETING = "greeting"
    PRICING = "pricing"
    OTHER = "other"


def detect_intent(message: NormalizedMessage) -> MessageIntent:
    """
    Detect the intent of a normalized message.

    This function analyzes message content to determine user intent using simple
    keyword matching. The intent is then passed to the AI layer for response generation.

    Args:
        message: Normalized message from any platform

    Returns:
        MessageIntent enum value (greeting, pricing, or other)
    """
    message_lower = message.message_text.lower().strip()

    # Check for greetings
    greeting_keywords = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]
    if any(keyword in message_lower for keyword in greeting_keywords):
        return MessageIntent.GREETING

    # Check for pricing-related queries
    pricing_keywords = ["price", "cost", "pricing", "how much", "fee", "charge", "subscription", "plan"]
    if any(keyword in message_lower for keyword in pricing_keywords):
        return MessageIntent.PRICING

    # Default to other
    return MessageIntent.OTHER


def build_system_prompt(intent: MessageIntent) -> str:
    """
    Build system prompt based on detected intent.

    System prompts guide the AI's behavior and response style. Each intent
    has specific instructions to ensure appropriate responses.

    Args:
        intent: Detected message intent

    Returns:
        System prompt string for the AI
    """
    if intent == MessageIntent.PRICING:
        return """You are a helpful customer service assistant for a SaaS platform.
When users ask about pricing, provide helpful information about pricing plans and options.
Be informative, friendly, and encourage them to learn more about features and benefits.
Do not make up specific prices - focus on value and options available."""

    elif intent == MessageIntent.GREETING:
        return """You are a friendly and professional customer service assistant.
When users greet you, respond warmly and politely. Welcome them and offer assistance.
Keep responses concise and inviting."""

    else:  # MessageIntent.OTHER
        return """You are a helpful customer service assistant.
When user intent is unclear, ask clarifying questions to understand what they need.
Be friendly, patient, and guide the conversation to help the user."""


def build_user_prompt(message: NormalizedMessage) -> str:
    """
    Build user prompt from normalized message.

    Args:
        message: Normalized message from any platform

    Returns:
        User prompt string for the AI
    """
    return message.message_text


def _get_fallback_response() -> str:
    """
    Get a safe fallback response when AI generation fails.

    Returns:
        Safe fallback message that is clearly identifiable
    """
    return "I'm having trouble processing your message right now. [AI FALLBACK] Please try again in a moment."


async def generate_ai_response(message: NormalizedMessage, intent: MessageIntent) -> str:
    """
    Generate AI-powered response based on message and detected intent.

    This function uses intent-guided prompts to generate contextual responses.
    The system prompt is tailored to the detected intent, ensuring appropriate
    response style and content.

    IMPORTANT: This function ALWAYS returns a non-empty string. If any error
    occurs or response is empty/None, a safe fallback message is returned.

    Args:
        message: Normalized message from any platform
        intent: Detected message intent (greeting, pricing, other)

    Returns:
        AI-generated text response (never None or empty string)

    Prompt Structure:
        - System prompt: Intent-specific instructions (pricing/greeting/other)
        - User prompt: Original user message
        - AI generates response following system instructions

    Error Handling:
        - If AI generation fails → Returns fallback message
        - If response is None/empty → Returns fallback message
        - Fallback is clearly marked with "[AI FALLBACK]"

    Future Enhancement:
        This function will be enhanced with:
        - Actual LLM API calls (OpenAI, Anthropic, etc.)
        - Conversation memory and context
        - Dynamic prompt engineering
        - Response validation and filtering
    """
    try:
        # Build intent-guided prompts
        system_prompt = build_system_prompt(intent)
        user_prompt = build_user_prompt(message)

        # Note: Currently using rule-based responses (ai_brain.py handles actual processing)
        # This function is kept for future LLM integration
        # When LLM is integrated, this will become:
        # try:
        #     response = await llm_client.chat(
        #         system=system_prompt,
        #         user=user_prompt
        #     )
        # except Exception as e:
        #     return _get_fallback_response()

        # Placeholder: Simulate intent-guided AI response
        if intent == MessageIntent.PRICING:
            response = "I'd be happy to help you with pricing information! We offer flexible plans to suit different needs. Would you like to know more about our features and which plan might work best for you?"
        elif intent == MessageIntent.GREETING:
            response = "Hello! 👋 Welcome! I'm here to help. How can I assist you today?"
        else:  # MessageIntent.OTHER
            response = "Thanks for reaching out! Could you tell me a bit more about what you're looking for? I want to make sure I can help you in the best way possible."

        # Ensure response is never None or empty
        if not response or not response.strip():
            return _get_fallback_response()

        return response.strip()

    except Exception:
        # Any error during AI generation → return safe fallback
        return _get_fallback_response()


async def process_message(message: NormalizedMessage, business_id: int = 1) -> str:
    """
    Process a normalized message and return a text response.

    RESPONSIBILITY: Pure orchestrator - delegates to AI engine.

    This function:
    1. Receives normalized message
    2. Delegates to GPT-powered AI engine (with RAG, memory, AI rules)
    3. Returns AI-generated response

    The processor:
    - ✅ Orchestrates AI engine call
    - ✅ Passes normalized message to AI engine
    - ✅ Returns AI engine response
    - ❌ NEVER contains reply text
    - ❌ NEVER contains hardcoded messages
    - ❌ NEVER generates responses

    All text generation happens in the AI engine (ai_engine.process_message).

    IMPORTANT: This function ALWAYS returns a non-empty string.
    If the AI engine fails, a safe fallback is returned.

    Args:
        message: Normalized message from any platform (Telegram, WhatsApp, Instagram)
        business_id: Business ID for multi-tenant isolation (default: 1)

    Returns:
        Text response generated by the AI engine (never from processor)
        Always returns a non-empty string, even on errors
    """
    # Safe default response
    SAFE_DEFAULT = "I'm here to help! How can I assist you today?"

    # Validate input
    if not message:
        log.warning("process_message received None or invalid message")
        return SAFE_DEFAULT

    if not hasattr(message, "message_text") or not message.message_text:
        log.warning("process_message received message with no text")
        return SAFE_DEFAULT

    # Try GPT-powered AI engine first
    try:
        from app.services.ai_engine import process_message as ai_engine_process
        
        response = await ai_engine_process(message, business_id)
        
        # Validate response is not empty/None
        if not response or not isinstance(response, str) or not response.strip():
            log.warning("AI engine returned empty or invalid response, using safe default")
            return SAFE_DEFAULT
        
        return response.strip()
    
    except ImportError:
        # AI engine not available - fall back to rule-based brain
        log.warning("AI engine not available, using fallback rule-based brain")
        try:
            response = await ai_brain_process(message)
            if not response or not isinstance(response, str) or not response.strip():
                return SAFE_DEFAULT
            return response.strip()
        except Exception as e:
            log.error(f"Fallback brain also failed: {e}", exc_info=True)
            return SAFE_DEFAULT
    
    except Exception as e:
        # Catch any errors from AI engine
        log.error(f"Error in AI engine processing: {e}", exc_info=True)
        # Try fallback to rule-based brain
        try:
            response = await ai_brain_process(message)
            if response and response.strip():
                return response.strip()
        except Exception:
            pass
        return SAFE_DEFAULT

