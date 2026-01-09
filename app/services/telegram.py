"""Telegram Bot API service for sending messages and normalizing Telegram data."""
import logging
from datetime import datetime
from typing import Optional

import httpx

from app.schemas import MessageChannel, NormalizedMessage, TelegramUpdate

log = logging.getLogger(__name__)


def normalize_telegram_message(update: TelegramUpdate) -> Optional[NormalizedMessage]:
    """
    Convert Telegram webhook update to normalized message format.

    This function extracts platform-agnostic data from Telegram-specific payloads,
    ensuring no Telegram-specific fields leak beyond this normalization layer.
    All Telegram-specific data is stored in the metadata field for reference.

    Args:
        update: Raw Telegram webhook update payload

    Returns:
        NormalizedMessage if valid message found, None otherwise

    Error Handling:
        - Safely handles missing or malformed fields
        - Returns None on any error (never crashes)
        - Logs warnings for recoverable issues
    """
    try:
        # Validate update has required structure
        if not update:
            log.warning("Received None or empty update")
            return None

        # Extract message data from various Telegram update types
        message_data = None
        try:
            if update.message:
                message_data = update.message
            elif update.channel_post:
                message_data = update.channel_post
            elif update.edited_message:
                message_data = update.edited_message
            elif update.edited_channel_post:
                message_data = update.edited_channel_post
        except (AttributeError, TypeError) as e:
            log.warning(f"Error accessing update fields: {e}")
            return None

        if not message_data:
            return None

        # Extract required fields with safe defaults
        try:
            message_text = message_data.get("text") if isinstance(message_data, dict) else None
        except (AttributeError, TypeError):
            message_text = None

        if not message_text or not isinstance(message_text, str):
            # Telegram messages can have no text (e.g., photos, stickers)
            # For now, we skip non-text messages
            return None

        # Validate message text is not empty/whitespace
        if not message_text.strip():
            log.warning("Received empty or whitespace-only message text")
            return None

        # Edge Case: Validate message length before normalization
        # This prevents processing extremely long messages
        if len(message_text) > 2000:  # MAX_MESSAGE_LENGTH
            log.warning(f"message_too_long length={len(message_text)} max=2000")
            # Still normalize but truncate for processing
            message_text = message_text[:2000] + "..."

        # Extract user_id from 'from' field (can be None for channel posts)
        user_id = None
        try:
            from_user = message_data.get("from") if isinstance(message_data, dict) else None
            if from_user:
                if isinstance(from_user, dict):
                    user_id_raw = from_user.get("id")
                    if user_id_raw is not None:
                        user_id = str(user_id_raw)
                else:
                    log.warning("'from' field is not a dictionary")
        except (AttributeError, TypeError) as e:
            log.warning(f"Error extracting user_id from 'from' field: {e}")

        # Fallback: Channel posts don't have 'from' field, use chat.id instead
        if not user_id:
            try:
                chat = message_data.get("chat", {}) if isinstance(message_data, dict) else {}
                if isinstance(chat, dict):
                    chat_id_raw = chat.get("id")
                    if chat_id_raw is not None:
                        user_id = str(chat_id_raw)
            except (AttributeError, TypeError) as e:
                log.warning(f"Error extracting user_id from chat: {e}")

        if not user_id:
            log.warning("Could not extract user_id from update")
            return None

        # Extract timestamp (Telegram uses Unix timestamp)
        timestamp = datetime.utcnow()  # Safe default
        try:
            date_timestamp = message_data.get("date") if isinstance(message_data, dict) else None
            if date_timestamp:
                if isinstance(date_timestamp, (int, float)):
                    timestamp = datetime.utcfromtimestamp(date_timestamp)
                else:
                    log.warning(f"Invalid date format: {date_timestamp}, using current time")
        except (ValueError, OSError, OverflowError) as e:
            log.warning(f"Error parsing timestamp: {e}, using current time")

        # Extract chat info for metadata
        metadata = {}
        try:
            chat = message_data.get("chat", {}) if isinstance(message_data, dict) else {}
            if isinstance(chat, dict):
                chat_id = chat.get("id")
                message_id = message_data.get("message_id") if isinstance(message_data, dict) else None
                
                # Build metadata with Telegram-specific fields
                metadata = {
                    "update_id": getattr(update, "update_id", None),
                    "chat_id": chat_id,
                    "message_id": message_id,
                    "chat_type": chat.get("type") if isinstance(chat, dict) else None,
                }

                # Add optional Telegram fields to metadata if present
                if isinstance(message_data, dict):
                    if "reply_to_message" in message_data:
                        reply_to = message_data["reply_to_message"]
                        if isinstance(reply_to, dict):
                            metadata["reply_to_message_id"] = reply_to.get("message_id")
                    if "forward_from" in message_data:
                        forward_from = message_data["forward_from"]
                        if isinstance(forward_from, dict):
                            metadata["forward_from_id"] = forward_from.get("id")
        except Exception as e:
            log.warning(f"Error building metadata: {e}, using empty metadata")

        return NormalizedMessage(
            channel=MessageChannel.TELEGRAM,
            user_id=user_id,
            message_text=message_text.strip(),  # Ensure trimmed
            timestamp=timestamp,
            language=None,  # Can be added later with language detection
            metadata=metadata,
        )

    except Exception as e:
        # Catch-all for any unexpected errors
        log.error(f"Unexpected error normalizing Telegram message: {e}", exc_info=True)
        return None


class TelegramService:
    """Service for interacting with Telegram Bot API."""

    BASE_URL = "https://api.telegram.org"

    def __init__(self, bot_token: str):
        """Initialize Telegram service with bot token."""
        self.bot_token = bot_token
        self.api_url = f"{self.BASE_URL}/bot{bot_token}"

    async def send_message(self, chat_id: int, text: str) -> bool:
        """
        Send a text message to a Telegram chat.

        Args:
            chat_id: Telegram chat ID to send message to
            text: Message text to send

        Returns:
            True if message sent successfully, False otherwise
        """
        url = f"{self.api_url}/sendMessage"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": text,
                    },
                    timeout=10.0,
                )
                response.raise_for_status()
                return True
        except httpx.HTTPStatusError as e:
            error_detail = ""
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
            
            log.error(
                f"HTTP error sending message to chat_id {chat_id}: {e.response.status_code} - {error_detail}"
            )
            # Log specific error codes
            if e.response.status_code == 401:
                log.error("Bot token is invalid or unauthorized. Check the bot token in your channel integration.")
            elif e.response.status_code == 403:
                log.error("Bot is blocked by user or doesn't have permission to send messages.")
            elif e.response.status_code == 400:
                log.error(f"Bad request: {error_detail}")
            return False
        except Exception as e:
            log.error(f"Failed to send message to chat_id {chat_id}: {type(e).__name__}: {e}", exc_info=True)
            return False


