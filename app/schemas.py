"""Pydantic schemas for request/response validation and data models.

This module contains all Pydantic models used throughout the application
for data validation, serialization, and type safety.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class MessageChannel(str, Enum):
    """Supported messaging channels/platforms."""

    TELEGRAM = "telegram"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    MESSENGER = "messenger"


class NormalizedMessage(BaseModel):
    """
    Platform-agnostic message structure.

    This model represents a normalized message that can come from any
    messaging platform (Telegram, WhatsApp, Instagram, etc.). All
    platform-specific data is stored in the metadata field.
    """

    channel: MessageChannel = Field(..., description="Messaging platform/channel")
    user_id: str = Field(..., description="Platform-specific user identifier")
    message_text: str = Field(..., description="The message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp (UTC)")
    language: Optional[str] = Field(None, description="Language code (ISO 639-1)")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Platform-specific metadata (chat_id, message_id, etc.)",
    )

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class TelegramUpdate(BaseModel):
    """
    Telegram webhook update payload.

    This model represents the raw payload received from Telegram's webhook.
    It's a flexible structure that can handle various Telegram update types.
    """

    update_id: int = Field(..., description="Unique update identifier")
    message: Optional[Dict[str, Any]] = Field(None, description="New incoming message")
    edited_message: Optional[Dict[str, Any]] = Field(None, description="Edited message")
    channel_post: Optional[Dict[str, Any]] = Field(None, description="New channel post")
    edited_channel_post: Optional[Dict[str, Any]] = Field(None, description="Edited channel post")

    class Config:
        """Pydantic configuration."""

        extra = "allow"  # Allow additional fields from Telegram
