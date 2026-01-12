"""Telegram webhook endpoints."""
import logging
import json

from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from app.logging_context import set_request_id
from app.schemas import TelegramUpdate
from app.services.processor import process_message
from app.services.telegram import normalize_telegram_message, TelegramService
from app.services.conversation_service import save_conversation_from_normalized
from app.database import get_db
from app.models import ChannelIntegration

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def telegram_webhook(update: TelegramUpdate):
    """
    Receive Telegram webhook payloads, normalize them, and send a reply.

    Execution flow:
    1. Receive raw Telegram webhook payload
    2. Immediately normalize to platform-agnostic NormalizedMessage
    3. Pass normalized message to processor (AI Brain)
    4. Use processor response as reply text
    5. Send reply via Telegram service
    6. Save conversation to database (non-blocking, error-safe)

    All Telegram-specific logic is isolated to the normalization step.
    After normalization, only platform-agnostic NormalizedMessage is used.

    Important:
    - Bot reply is sent BEFORE saving conversation
    - Conversation saving is non-blocking and error-safe
    - Telegram reply is sent even if database save fails
    - ALWAYS returns a reply to the user, even on errors
    """
    # Generate unique request ID for this request
    request_id = set_request_id()
    
    # Safe default response - used if all else fails
    SAFE_DEFAULT_RESPONSE = "I'm here to help! How can I assist you today?"
    reply_text = SAFE_DEFAULT_RESPONSE
    normalized_message = None
    chat_id = None

    # Log incoming webhook with more details
    try:
        update_id = getattr(update, "update_id", "unknown")
        has_message = bool(getattr(update, "message", None))
        has_channel_post = bool(getattr(update, "channel_post", None))
        log.info(
            f"webhook_received update_id={update_id} "
            f"has_message={has_message} has_channel_post={has_channel_post}"
        )
    except Exception as log_error:
        log.warning(f"webhook_logging_error error={type(log_error).__name__}")
        # Don't fail on logging

    try:
        # Step 1: Immediately normalize Telegram payload to platform-agnostic format
        # This is the ONLY place we read Telegram-specific fields
        try:
            normalized_message = normalize_telegram_message(update)
            if normalized_message:
                log.info(
                    f"message_normalized user_id={normalized_message.user_id} "
                    f"channel={normalized_message.channel} "
                    f"text_length={len(normalized_message.message_text)}"
                )
        except Exception as e:
            log.error(f"normalization_failed error={type(e).__name__} message={str(e)}", exc_info=True)
            # Continue with safe default - we'll try to extract chat_id from raw update

        # Step 2: Validate normalization succeeded and extract chat_id
        if not normalized_message:
            log.warning("normalization_failed reason=no_message_data")
            # Try to extract chat_id from raw update for sending default response
            try:
                # Handle both dict and Pydantic model access
                message_data = update.message if hasattr(update, 'message') and update.message else None
                if not message_data:
                    message_data = update.channel_post if hasattr(update, 'channel_post') and update.channel_post else None
                
                if message_data:
                    # Convert to dict if it's a Pydantic model
                    if hasattr(message_data, 'dict'):
                        message_data = message_data.dict()
                    elif hasattr(message_data, 'model_dump'):
                        message_data = message_data.model_dump()
                    
                    if isinstance(message_data, dict):
                        chat_id = message_data.get("chat", {}).get("id") if isinstance(message_data.get("chat"), dict) else None
                    else:
                        log.warning(f"message_data_not_dict type={type(message_data)}")
            except Exception as e:
                log.error(f"chat_id_extraction_failed error={type(e).__name__} message={str(e)}", exc_info=True)
            
            # Send safe default response if we have chat_id
            if chat_id:
                try:
                    chat_id_int = int(chat_id) if chat_id is not None else None
                    if chat_id_int:
                        # Try per-business tokens first
                        send_success = False
                        db = next(get_db())
                        try:
                            integrations = db.query(ChannelIntegration).filter(
                                ChannelIntegration.channel == "telegram",
                                ChannelIntegration.is_active == True
                            ).all()
                            
                            for integration in integrations:
                                try:
                                    if integration.credentials:
                                        credentials = json.loads(integration.credentials)
                                        bot_token = credentials.get("bot_token")
                                        if bot_token:
                                            bot_service = TelegramService(bot_token)
                                            send_success = await bot_service.send_message(chat_id_int, SAFE_DEFAULT_RESPONSE)
                                            if send_success:
                                                break
                                except Exception:
                                    continue
                        except Exception:
                            pass
                        finally:
                            db.close()
                        
                        if send_success:
                            log.info(f"default_response_sent chat_id={chat_id_int}")
                        else:
                            log.warning(f"no_bot_token_available chat_id={chat_id_int} - No active Telegram integration found")
                except Exception as e:
                    log.error(f"send_default_failed chat_id={chat_id} error={type(e).__name__}")
            
            return {"ok": True}

        # Validate normalized message has required fields
        if not normalized_message.message_text or not normalized_message.message_text.strip():
            log.warning(f"empty_message user_id={normalized_message.user_id}")
            # Use safe default but continue processing
            normalized_message.message_text = ""

        # Step 3: Process message through AI Brain (processor)
        # This is the ONLY source of reply text generation
        try:
            reply_text = await process_message(normalized_message)
            # Validate reply is not empty/None
            if not reply_text or not reply_text.strip():
                log.warning(f"empty_response user_id={normalized_message.user_id} action=using_default")
                reply_text = SAFE_DEFAULT_RESPONSE
            else:
                log.debug(f"response_generated user_id={normalized_message.user_id} response_length={len(reply_text)}")
        except Exception as e:
            log.error(f"processing_failed user_id={normalized_message.user_id} error={type(e).__name__} message={str(e)}", exc_info=True)
            reply_text = SAFE_DEFAULT_RESPONSE

        # Step 4: Extract reply destination from normalized message metadata
        # Metadata contains platform-specific data needed for sending replies
        try:
            chat_id = normalized_message.metadata.get("chat_id") if normalized_message.metadata else None
            if not chat_id:
                # Fallback: try to extract from raw update if metadata doesn't have it
                log.warning(f"chat_id_not_in_metadata user_id={normalized_message.user_id} attempting_fallback")
                try:
                    # Handle both dict and Pydantic model access
                    message_data = update.message if hasattr(update, 'message') and update.message else None
                    if not message_data:
                        message_data = update.channel_post if hasattr(update, 'channel_post') and update.channel_post else None
                    
                    if message_data:
                        # Convert to dict if it's a Pydantic model
                        if hasattr(message_data, 'dict'):
                            message_data = message_data.dict()
                        elif hasattr(message_data, 'model_dump'):
                            message_data = message_data.model_dump()
                        
                        if isinstance(message_data, dict):
                            chat_id = message_data.get("chat", {}).get("id") if isinstance(message_data.get("chat"), dict) else None
                except Exception as fallback_error:
                    log.error(f"fallback_chat_id_extraction_failed error={type(fallback_error).__name__} message={str(fallback_error)}", exc_info=True)
        except Exception as e:
            log.error(f"chat_id_extraction_failed error={type(e).__name__}", exc_info=True)
            chat_id = None

        # Step 5: Send reply using processor-generated text
        # This MUST happen before saving conversation to ensure user receives reply
        # Bot behavior is unchanged - reply is sent regardless of what happens next
        used_business_id = None  # Track which business's bot was used
        if chat_id:
            try:
                # Ensure chat_id is an int (Telegram API requires int)
                chat_id_int = int(chat_id) if chat_id is not None else None
                if chat_id_int:
                    log.info(f"attempting_reply chat_id={chat_id_int} user_id={normalized_message.user_id} reply_length={len(reply_text)}")
                    
                    # Try to find the correct bot token from database integrations
                    # This supports per-business bot tokens (new system)
                    # IMPORTANT: We try integrations in order, but we need to be deterministic
                    # If multiple integrations exist, we prefer the most recently updated one
                    send_success = False
                    db = next(get_db())
                    try:
                        # Get all active Telegram integrations, ordered by most recently updated first
                        # This makes the selection more deterministic
                        integrations = db.query(ChannelIntegration).filter(
                            ChannelIntegration.channel == "telegram",
                            ChannelIntegration.is_active == True
                        ).order_by(ChannelIntegration.updated_at.desc()).all()
                        
                        # Log if multiple integrations exist (potential issue)
                        if len(integrations) > 1:
                            log.warning(
                                f"Multiple active Telegram integrations found ({len(integrations)}). "
                                f"This can cause non-deterministic business_id assignment. "
                                f"Integration IDs: {[i.id for i in integrations]}, Business IDs: {[i.business_id for i in integrations]}"
                            )
                        
                        # Try each bot token until one works
                        # We use the first one that successfully sends (most recently updated)
                        for integration in integrations:
                            try:
                                if integration.credentials:
                                    credentials = json.loads(integration.credentials)
                                    bot_token = credentials.get("bot_token")
                                    if bot_token:
                                        # Create a service instance with this bot's token
                                        bot_service = TelegramService(bot_token)
                                        send_success = await bot_service.send_message(chat_id_int, reply_text)
                                        if send_success:
                                            used_business_id = integration.business_id  # Track which business's bot was used
                                            log.info(
                                                f"reply_sent chat_id={chat_id_int} user_id={normalized_message.user_id} "
                                                f"bot={integration.channel_name} business_id={used_business_id} integration_id={integration.id}"
                                            )
                                            # Log for debugging
                                            log.info(
                                                f"CONVERSATION_SAVE_INFO: business_id={used_business_id} "
                                                f"integration_id={integration.id} bot_username={integration.channel_name}"
                                            )
                                            break
                            except Exception as e:
                                log.debug(f"tried_bot_token integration_id={integration.id} error={type(e).__name__}")
                                continue
                    except Exception as db_error:
                        log.warning(f"db_lookup_failed error={type(db_error).__name__}")
                    finally:
                        db.close()
                    
                    if send_success:
                        log.info(f"reply_sent chat_id={chat_id_int} user_id={normalized_message.user_id} business_id={used_business_id}")
                    else:
                        log.error(f"reply_send_failed chat_id={chat_id_int} user_id={normalized_message.user_id} - No active Telegram integration found. Connect your bot via the dashboard.")
                else:
                    log.error(f"invalid_chat_id chat_id={chat_id} user_id={normalized_message.user_id} type={type(chat_id)}")
            except (ValueError, TypeError) as e:
                log.error(f"chat_id_conversion_failed chat_id={chat_id} error={type(e).__name__} message={str(e)}", exc_info=True)
            except Exception as e:
                log.error(f"send_message_error chat_id={chat_id} error={type(e).__name__} message={str(e)}", exc_info=True)
        else:
            log.error(f"no_chat_id user_id={normalized_message.user_id} metadata={normalized_message.metadata}")

    except Exception as e:
        # Catch-all for any unexpected errors in the main flow
        log.error(f"webhook_error error={type(e).__name__} message={str(e)}", exc_info=True)
        # Try to send safe default response if we have chat_id
        if chat_id:
            try:
                chat_id_int = int(chat_id) if isinstance(chat_id, (int, str)) else None
                if chat_id_int:
                    # Try per-business tokens first, then fallback to global
                    send_success = False
                    db = next(get_db())
                    try:
                        integrations = db.query(ChannelIntegration).filter(
                            ChannelIntegration.channel == "telegram",
                            ChannelIntegration.is_active == True
                        ).all()
                        
                        for integration in integrations:
                            try:
                                if integration.credentials:
                                    credentials = json.loads(integration.credentials)
                                    bot_token = credentials.get("bot_token")
                                    if bot_token:
                                        bot_service = TelegramService(bot_token)
                                        send_success = await bot_service.send_message(chat_id_int, SAFE_DEFAULT_RESPONSE)
                                        if send_success:
                                            break
                            except Exception:
                                continue
                    except Exception:
                        pass
                    finally:
                        db.close()
                    
                    if send_success:
                        log.info(f"fallback_response_sent chat_id={chat_id_int}")
                    else:
                        log.warning(f"no_bot_token_available chat_id={chat_id_int} - No active Telegram integration found")
            except Exception:
                pass  # Already logged, don't crash

    # Step 6: Save conversation to database (AFTER reply is sent/attempted)
    # This is non-blocking and error-safe - failures don't affect bot behavior
    # Conversation is saved even if reply send failed (for debugging/analytics)
    if normalized_message and used_business_id:
        try:
            log.info(f"SAVING_CONVERSATION: user_id={normalized_message.user_id} business_id={used_business_id} channel={normalized_message.channel}")
            save_success = await save_conversation_from_normalized(
                normalized_message=normalized_message,
                bot_reply=reply_text,
                business_id=used_business_id,
            )
            if save_success:
                log.info(f"✅ CONVERSATION_SAVED: user_id={normalized_message.user_id} business_id={used_business_id} channel={normalized_message.channel}")
            else:
                log.warning(f"❌ CONVERSATION_SAVE_FAILED: user_id={normalized_message.user_id} business_id={used_business_id} channel={normalized_message.channel}")
        except Exception as e:
            # save_conversation_from_normalized should never raise, but double-check
            log.error(f"❌ CONVERSATION_SAVE_ERROR: user_id={normalized_message.user_id} business_id={used_business_id} error={type(e).__name__} message={str(e)}", exc_info=True)
    elif normalized_message and not used_business_id:
        log.warning(f"⚠️ CONVERSATION_SAVE_SKIPPED: user_id={normalized_message.user_id} reason=no_business_id_available (used_business_id is None)")

    return {"ok": True}


@router.post("/test-send", status_code=status.HTTP_200_OK)
async def test_send_message(chat_id: int, message: str = "Test message from Automify bot", db: Session = Depends(get_db)):
    """
    Test endpoint to verify bot can send messages.
    
    This is a diagnostic endpoint to test if:
    1. Per-business bot tokens are configured correctly
    2. Bot can send messages to a specific chat_id
    
    Usage:
    POST /telegram/test-send?chat_id=YOUR_CHAT_ID&message=Your test message
    
    Note: Bot must be connected via the dashboard (Integrations → Telegram)
    """
    try:
        log.info(f"test_send_requested chat_id={chat_id} message_length={len(message)}")
        
        # Try per-business tokens first
        send_success = False
        try:
            integrations = db.query(ChannelIntegration).filter(
                ChannelIntegration.channel == "telegram",
                ChannelIntegration.is_active == True
            ).all()
            
            for integration in integrations:
                try:
                    if integration.credentials:
                        credentials = json.loads(integration.credentials)
                        bot_token = credentials.get("bot_token")
                        if bot_token:
                            bot_service = TelegramService(bot_token)
                            send_success = await bot_service.send_message(chat_id, message)
                            if send_success:
                                log.info(f"test_message_sent chat_id={chat_id} bot={integration.channel_name}")
                                return {"ok": True, "message": f"Test message sent successfully using {integration.channel_name}", "chat_id": chat_id}
                except Exception as e:
                    log.debug(f"test_tried_bot integration_id={integration.id} error={type(e).__name__}")
                    continue
        except Exception as db_error:
            log.warning(f"test_db_lookup_failed error={type(db_error).__name__}")
        
        if not send_success:
            log.error(f"test_message_failed chat_id={chat_id}")
            return {"ok": False, "error": "Failed to send test message. No active Telegram integration found. Connect your bot via the dashboard (Integrations → Telegram).", "chat_id": chat_id}
            
    except Exception as e:
        log.error(f"test_send_error chat_id={chat_id} error={type(e).__name__} message={str(e)}", exc_info=True)
        return {"ok": False, "error": f"Error sending test message: {str(e)}", "chat_id": chat_id}


