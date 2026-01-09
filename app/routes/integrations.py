"""Channel integration API endpoints."""
import logging
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import ChannelIntegration, Business, User as UserModel
from app.routes.auth import get_current_user
import httpx

log = logging.getLogger(__name__)
router = APIRouter()


class TelegramConnectRequest(BaseModel):
    """Request model for Telegram integration."""
    bot_token: str
    channel_name: Optional[str] = None


class IntegrationResponse(BaseModel):
    """Response model for channel integration."""
    id: int
    channel: str
    channel_name: Optional[str]
    is_active: bool
    webhook_url: Optional[str]
    created_at: str
    updated_at: str


class TelegramStatusResponse(BaseModel):
    """Response model for Telegram status."""
    connected: bool
    webhook_url: Optional[str] = None
    pending_updates: Optional[int] = None
    last_error_date: Optional[int] = None
    last_error_message: Optional[str] = None
    bot_username: Optional[str] = None
    integration_id: Optional[int] = None
    message: Optional[str] = None


@router.get("/", response_model=List[IntegrationResponse])
async def list_integrations(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all channel integrations for the current user's business.
    """
    # Check user role - only Admin and Business Owner can manage integrations
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can manage integrations"
        )
    
    # Get or create user's business
    business = db.query(Business).filter(Business.owner_id == current_user.id).first()
    
    if not business:
        return []
    
    integrations = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business.id
    ).all()
    
    return [
        IntegrationResponse(
            id=integration.id,
            channel=integration.channel,
            channel_name=integration.channel_name,
            is_active=integration.is_active,
            webhook_url=integration.webhook_url,
            created_at=integration.created_at.isoformat(),
            updated_at=integration.updated_at.isoformat(),
        )
        for integration in integrations
    ]


@router.post("/telegram/connect", response_model=IntegrationResponse)
async def connect_telegram(
    request: TelegramConnectRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect Telegram bot by providing bot token.
    This will:
    1. Validate the bot token
    2. Set up the webhook automatically
    3. Save the integration to database (encrypted)
    """
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can connect integrations"
        )
    
    # Validate bot token format (basic check)
    if not request.bot_token or len(request.bot_token) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot token format. Please check your token and try again."
        )
    
    # Get or create user's business
    business = db.query(Business).filter(Business.owner_id == current_user.id).first()
    if not business:
        # Create business for user
        business = Business(
            name=f"{current_user.full_name or current_user.email}'s Business",
            owner_id=current_user.id
        )
        db.add(business)
        db.commit()
        db.refresh(business)
    
    # Validate bot token by calling Telegram API
    bot_username = None
    try:
        bot_info_url = f"https://api.telegram.org/bot{request.bot_token}/getMe"
        async with httpx.AsyncClient() as client:
            response = await client.get(bot_info_url, timeout=10.0)
            response.raise_for_status()
            bot_info = response.json()
            
            if not bot_info.get("ok"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid bot token. Please check your token and try again."
                )
            
            bot_username = bot_info.get("result", {}).get("username", "Unknown")
            log.info(f"Telegram bot validated: @{bot_username} by user {current_user.id}")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid bot token. The token you provided is not valid."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to validate bot token: {e.response.text}"
        )
    except Exception as e:
        log.error(f"Error validating bot token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate bot token. Please try again."
        )
    
    # Set webhook automatically
    from app.config import settings
    
    # Normalize PUBLIC_URL - handle common issues
    public_url = settings.public_url or ""
    
    # If PUBLIC_URL is just a service name (e.g., "automify-ai-backend"), construct full URL
    if public_url and not public_url.startswith(("http://", "https://")):
        # If it contains a dot, assume it's a hostname missing protocol
        if "." in public_url:
            public_url = f"https://{public_url}"
            log.info(f"Auto-added https:// to PUBLIC_URL: {public_url}")
        # If it's just a service name (no dots), construct Render URL
        elif "onrender.com" not in public_url:
            # Assume it's a Render service name, construct the URL
            # Note: Render free tier URLs have format: https://service-name-xxxx.onrender.com
            # We'll use the service name and let Render's DNS handle it
            public_url = f"https://{public_url}.onrender.com"
            log.info(f"Auto-constructed Render URL from service name: {public_url}")
    
    # Validate PUBLIC_URL is set
    if not public_url or public_url == "http://localhost:8000":
        log.error("PUBLIC_URL is not set or is localhost. Cannot set webhook for production.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend URL (PUBLIC_URL) is not configured. Please set PUBLIC_URL environment variable in Render dashboard to your full backend URL (e.g., https://automify-ai-backend-xxxx.onrender.com)."
        )
    
    # Ensure webhook URL is HTTPS (Telegram requires HTTPS)
    webhook_url = f"{public_url.rstrip('/')}/telegram/webhook"
    if not webhook_url.startswith("https://"):
        log.error(f"Webhook URL must be HTTPS, got: {webhook_url}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook URL must use HTTPS. Current PUBLIC_URL: {settings.public_url}, constructed URL: {webhook_url}. Please set PUBLIC_URL in Render dashboard to your full backend URL with https:// (e.g., https://automify-ai-backend-xxxx.onrender.com)."
        )
    
    try:
        set_webhook_url = f"https://api.telegram.org/bot{request.bot_token}/setWebhook?url={webhook_url}"
        log.info(f"Setting webhook for bot @{bot_username} to: {webhook_url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(set_webhook_url, timeout=10.0)
            response.raise_for_status()
            webhook_result = response.json()
            
            if not webhook_result.get("ok"):
                error_description = webhook_result.get('description', 'Unknown error')
                log.error(f"Telegram API error setting webhook: {error_description}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to set webhook: {error_description}"
                )
            log.info(f"Webhook set successfully for bot @{bot_username} to {webhook_url}")
    except httpx.HTTPStatusError as e:
        log.error(f"HTTP error setting webhook: {e.response.status_code} - {e.response.text}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set webhook: HTTP {e.response.status_code}. Check that PUBLIC_URL is correct and accessible."
        )
    except httpx.RequestError as e:
        log.error(f"Network error setting webhook: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network error while setting webhook: {str(e)}. Please check your internet connection and try again."
        )
    except HTTPException:
        # Re-raise HTTPExceptions (like the one above for webhook_result.get("ok"))
        raise
    except Exception as e:
        log.error(f"Unexpected error setting webhook: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error setting webhook: {str(e)}. Please check Render logs for details."
        )
    
    # Check if integration already exists
    existing = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business.id,
        ChannelIntegration.channel == "telegram"
    ).first()
    
    # Store credentials (in production, use proper encryption)
    # For now, store as JSON string - in production, encrypt this
    credentials = json.dumps({
        "bot_token": request.bot_token,
        "bot_username": bot_username
    })
    
    if existing:
        # Update existing integration
        existing.credentials = credentials
        existing.is_active = True
        existing.webhook_url = webhook_url
        existing.channel_name = request.channel_name or f"Telegram (@{bot_username})"
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        
        log.info(f"Telegram integration updated: {existing.id} by user {current_user.id}")
        
        return IntegrationResponse(
            id=existing.id,
            channel=existing.channel,
            channel_name=existing.channel_name,
            is_active=existing.is_active,
            webhook_url=existing.webhook_url,
            created_at=existing.created_at.isoformat(),
            updated_at=existing.updated_at.isoformat(),
        )
    else:
        # Create new integration
        integration = ChannelIntegration(
            business_id=business.id,
            channel="telegram",
            channel_name=request.channel_name or f"Telegram (@{bot_username})",
            credentials=credentials,
            is_active=True,
            webhook_url=webhook_url
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        log.info(f"Telegram integration created: {integration.id} by user {current_user.id}")
        
        return IntegrationResponse(
            id=integration.id,
            channel=integration.channel,
            channel_name=integration.channel_name,
            is_active=integration.is_active,
            webhook_url=integration.webhook_url,
            created_at=integration.created_at.isoformat(),
            updated_at=integration.updated_at.isoformat(),
        )


@router.get("/telegram/status", response_model=TelegramStatusResponse)
async def get_telegram_status(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Telegram integration status including webhook info.
    """
    business = db.query(Business).filter(Business.owner_id == current_user.id).first()
    if not business:
        return TelegramStatusResponse(
            connected=False,
            message="No business found. Please connect a channel first."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business.id,
        ChannelIntegration.channel == "telegram",
        ChannelIntegration.is_active == True
    ).first()
    
    if not integration:
        return TelegramStatusResponse(
            connected=False,
            message="Telegram bot not connected"
        )
    
    # Get bot token from credentials
    try:
        credentials = json.loads(integration.credentials)
        bot_token = credentials.get("bot_token")
        bot_username = credentials.get("bot_username")
    except:
        return TelegramStatusResponse(
            connected=False,
            message="Invalid integration credentials"
        )
    
    # Check webhook status
    try:
        webhook_info_url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
        async with httpx.AsyncClient() as client:
            response = await client.get(webhook_info_url, timeout=10.0)
            response.raise_for_status()
            webhook_info = response.json()
            
            if webhook_info.get("ok"):
                result = webhook_info.get("result", {})
                return TelegramStatusResponse(
                    connected=True,
                    webhook_url=result.get("url"),
                    pending_updates=result.get("pending_update_count", 0),
                    last_error_date=result.get("last_error_date"),
                    last_error_message=result.get("last_error_message"),
                    bot_username=bot_username,
                    integration_id=integration.id
                )
    except Exception as e:
        log.error(f"Error checking webhook status: {e}", exc_info=True)
        return TelegramStatusResponse(
            connected=True,
            message="Failed to check webhook status",
            bot_username=bot_username,
            integration_id=integration.id
        )


@router.post("/telegram/test")
async def test_telegram_connection(
    chat_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test Telegram connection by sending a test message.
    """
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can test integrations"
        )
    
    business = db.query(Business).filter(Business.owner_id == current_user.id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found"
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business.id,
        ChannelIntegration.channel == "telegram",
        ChannelIntegration.is_active == True
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telegram bot not connected"
        )
    
    try:
        credentials = json.loads(integration.credentials)
        bot_token = credentials.get("bot_token")
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid integration credentials"
        )
    
    # Send test message
    test_message = "✅ Test message from Automify! Your Telegram bot is working correctly."
    try:
        send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                send_url,
                json={
                    "chat_id": chat_id,
                    "text": test_message
                },
                timeout=10.0
            )
            response.raise_for_status()
            result = response.json()
            
            if result.get("ok"):
                log.info(f"Test message sent successfully to chat_id {chat_id} by user {current_user.id}")
                return {
                    "success": True,
                    "message": "Test message sent successfully"
                }
            else:
                return {
                    "success": False,
                    "error": result.get("description", "Unknown error")
                }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bot is blocked by user or doesn't have permission to send messages"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send test message: {e.response.text}"
        )
    except Exception as e:
        log.error(f"Error sending test message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test message"
        )


@router.delete("/telegram/disconnect")
async def disconnect_telegram(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect Telegram integration.
    """
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can disconnect integrations"
        )
    
    business = db.query(Business).filter(Business.owner_id == current_user.id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found"
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business.id,
        ChannelIntegration.channel == "telegram"
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telegram integration not found"
        )
    
    # Remove webhook
    try:
        credentials = json.loads(integration.credentials)
        bot_token = credentials.get("bot_token")
        delete_webhook_url = f"https://api.telegram.org/bot{bot_token}/deleteWebhook"
        async with httpx.AsyncClient() as client:
            await client.get(delete_webhook_url, timeout=10.0)
        log.info(f"Webhook deleted for Telegram integration {integration.id}")
    except Exception as e:
        log.warning(f"Failed to delete webhook: {e}")
    
    # Deactivate integration
    integration.is_active = False
    integration.updated_at = datetime.utcnow()
    db.commit()
    
    log.info(f"Telegram integration disconnected: {integration.id} by user {current_user.id}")
    
    return {"success": True, "message": "Telegram integration disconnected successfully"}

