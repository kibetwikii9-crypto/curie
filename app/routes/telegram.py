"""Telegram webhook endpoints."""
import logging

from fastapi import APIRouter, status

from app.logging_context import set_request_id
from app.schemas import TelegramUpdate
from app.services.processor import process_message
from app.services.telegram import normalize_telegram_message, telegram_service
from app.services.conversation_service import save_conversation_from_normalized

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

    # Log incoming webhook
    try:
        update_id = getattr(update, "update_id", "unknown")
        log.info(f"webhook_received update_id={update_id}")
    except Exception:
        pass  # Don't fail on logging

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
                if update.message:
                    chat_id = update.message.get("chat", {}).get("id")
                elif update.channel_post:
                    chat_id = update.channel_post.get("chat", {}).get("id")
            except Exception as e:
                log.error(f"chat_id_extraction_failed error={type(e).__name__}")
            
            # Send safe default response if we have chat_id
            if chat_id:
                try:
                    chat_id_int = int(chat_id) if chat_id is not None else None
                    if chat_id_int:
                        await telegram_service.send_message(chat_id_int, SAFE_DEFAULT_RESPONSE)
                        log.info(f"default_response_sent chat_id={chat_id_int}")
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
        except Exception as e:
            log.error(f"chat_id_extraction_failed error={type(e).__name__}")
            chat_id = None

        # Step 5: Send reply using processor-generated text
        # This MUST happen before saving conversation to ensure user receives reply
        # Bot behavior is unchanged - reply is sent regardless of what happens next
        if chat_id:
            try:
                # Ensure chat_id is an int (Telegram API requires int)
                chat_id_int = int(chat_id) if chat_id is not None else None
                if chat_id_int:
                    send_success = await telegram_service.send_message(chat_id_int, reply_text)
                    if send_success:
                        log.info(f"reply_sent chat_id={chat_id_int} user_id={normalized_message.user_id}")
                    else:
                        log.warning(f"reply_send_failed chat_id={chat_id_int} user_id={normalized_message.user_id}")
                else:
                    log.warning(f"invalid_chat_id chat_id={chat_id} user_id={normalized_message.user_id}")
            except (ValueError, TypeError) as e:
                log.error(f"chat_id_conversion_failed chat_id={chat_id} error={type(e).__name__}")
            except Exception as e:
                log.error(f"send_message_error chat_id={chat_id} error={type(e).__name__} message={str(e)}", exc_info=True)
        else:
            log.warning(f"no_chat_id user_id={normalized_message.user_id}")

    except Exception as e:
        # Catch-all for any unexpected errors in the main flow
        log.error(f"webhook_error error={type(e).__name__} message={str(e)}", exc_info=True)
        # Try to send safe default response if we have chat_id
        if chat_id:
            try:
                chat_id_int = int(chat_id) if isinstance(chat_id, (int, str)) else None
                if chat_id_int:
                    await telegram_service.send_message(chat_id_int, SAFE_DEFAULT_RESPONSE)
                    log.info(f"fallback_response_sent chat_id={chat_id_int}")
            except Exception:
                pass  # Already logged, don't crash

    # Step 6: Save conversation to database (AFTER reply is sent/attempted)
    # This is non-blocking and error-safe - failures don't affect bot behavior
    # Conversation is saved even if reply send failed (for debugging/analytics)
    if normalized_message:
        try:
            save_success = await save_conversation_from_normalized(
                normalized_message=normalized_message,
                bot_reply=reply_text,
            )
            if save_success:
                log.debug(f"conversation_saved user_id={normalized_message.user_id}")
            else:
                log.warning(f"conversation_save_failed user_id={normalized_message.user_id}")
        except Exception as e:
            # save_conversation_from_normalized should never raise, but double-check
            log.error(f"conversation_save_error user_id={normalized_message.user_id} error={type(e).__name__}", exc_info=True)

    return {"ok": True}


