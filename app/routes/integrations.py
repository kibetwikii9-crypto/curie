"""Channel integration API endpoints."""
import logging
import json
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse, JSONResponse, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import ChannelIntegration, Business, User as UserModel
from app.routes.auth import get_current_user, get_user_business_id
from app.services.meta_oauth import MetaOAuthService
from app.config import settings
import httpx

log = logging.getLogger(__name__)
router = APIRouter()


def _get_error_html(error_message: str) -> str:
    """Generate HTML page that posts error message to parent window (for popup OAuth)."""
    frontend_url = getattr(settings, 'frontend_url', 'http://localhost:3000')
    # Escape single quotes in error message for JavaScript
    escaped_error = error_message.replace("'", "\\'").replace("\n", "\\n")
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>WhatsApp Connection Error</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
            }}
            .container {{
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }}
            .error {{
                color: #ef4444;
                font-size: 3rem;
                margin-bottom: 1rem;
            }}
            h1 {{
                color: #333;
                margin: 0.5rem 0;
            }}
            p {{
                color: #666;
                margin: 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">✗</div>
            <h1>Connection Failed</h1>
            <p>{error_message}</p>
            <p style="margin-top: 1rem; font-size: 0.9rem; color: #999;">This window will close automatically...</p>
        </div>
        <script>
            // Post error message to parent window
            if (window.opener) {{
                window.opener.postMessage({{
                    type: 'whatsapp-oauth-error',
                    error: '{escaped_error}'
                }}, '*');
                
                // Close popup after a short delay
                setTimeout(function() {{
                    window.close();
                }}, 2000);
            }} else {{
                // If no opener (direct navigation), redirect
                window.location.href = '{frontend_url}/dashboard/integrations?error={escaped_error}';
            }}
        </script>
    </body>
    </html>
    """


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
    
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account. Admin users cannot manage integrations."
        )
    
    integrations = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id
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
    
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account. Admin users cannot manage integrations."
        )
    
    # Verify business exists
    business = db.query(Business).filter(Business.id == business_id).first()
    
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found. Please contact support."
        )
    
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
    # Render's fromService with property:host returns just the hostname (e.g., "automify-ai-backend-xxxx.onrender.com")
    # We need to ensure it has https:// protocol
    public_url = (settings.public_url or "").strip()
    
    # Remove any trailing slashes
    public_url = public_url.rstrip('/')
    
    # If PUBLIC_URL doesn't start with http:// or https://, add https://
    if public_url and not public_url.startswith(("http://", "https://")):
        # If it contains a dot, it's likely a hostname (e.g., "automify-ai-backend-xxxx.onrender.com")
        if "." in public_url:
            public_url = f"https://{public_url}"
            log.info(f"Auto-added https:// to PUBLIC_URL. Original: {settings.public_url}, Fixed: {public_url}")
        # If it's just a service name (no dots), construct Render URL
        elif public_url and "onrender.com" not in public_url:
            # This shouldn't happen with Render's fromService, but handle it anyway
            public_url = f"https://{public_url}.onrender.com"
            log.info(f"Auto-constructed Render URL from service name. Original: {settings.public_url}, Fixed: {public_url}")
    
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
    
    # Check if integration already exists for this business and channel
    # This prevents duplicate integrations for the same business+channel combination
    existing = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business.id,
        ChannelIntegration.channel == "telegram"
    ).first()
    
    # Additional check: Warn if there are other active integrations with the same bot token
    # This helps identify duplicate integrations across different businesses
    try:
        all_telegram_integrations = db.query(ChannelIntegration).filter(
            ChannelIntegration.channel == "telegram",
            ChannelIntegration.is_active == True
        ).all()
        
        duplicate_bot_tokens = []
        for other_integration in all_telegram_integrations:
            if other_integration.id != (existing.id if existing else None):
                try:
                    other_credentials = json.loads(other_integration.credentials) if other_integration.credentials else {}
                    other_bot_token = other_credentials.get("bot_token")
                    if other_bot_token == request.bot_token:
                        duplicate_bot_tokens.append({
                            "integration_id": other_integration.id,
                            "business_id": other_integration.business_id,
                            "channel_name": other_integration.channel_name
                        })
                except Exception:
                    pass
        
        if duplicate_bot_tokens:
            log.warning(
                f"Duplicate bot token detected! Bot @{bot_username} is already connected to other businesses: {duplicate_bot_tokens}. "
                f"This can cause conversations to be saved to the wrong business. Consider removing duplicate integrations."
            )
    except Exception as e:
        log.warning(f"Error checking for duplicate bot tokens: {e}")
        # Don't fail the connection, just log the warning
    
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
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        return TelegramStatusResponse(
            connected=False,
            message="No business found. Admin users cannot manage integrations."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
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
    
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account. Admin users cannot manage integrations."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
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
    
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account. Admin users cannot manage integrations."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
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


# ============================================================================
# WHATSAPP OAUTH INTEGRATION (Self-Serve)
# ============================================================================

# Store OAuth state temporarily (use Redis in production)
oauth_states = {}


@router.get("/whatsapp/connect")
async def initiate_whatsapp_oauth(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start Meta OAuth flow for WhatsApp connection.
    User clicks "Connect WhatsApp" → redirects here → redirects to Meta
    
    Supports both:
    - Browser redirect: Returns RedirectResponse (302)
    - API call: Returns JSON with auth_url (for frontend to redirect)
    """
    try:
        # Check user role
        if current_user.role not in ["admin", "business_owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin and Business Owner roles can connect integrations"
            )
        
        # Get user's business_id
        business_id = get_user_business_id(current_user, db)
        
        if business_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Integrations require a business account. Admin users cannot manage integrations."
            )
        
        # Check if Meta OAuth is configured
        if not hasattr(settings, 'meta_app_id') or not settings.meta_app_id:
            log.error("Meta OAuth not configured: meta_app_id is missing or empty")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Meta OAuth is not configured. Please contact support."
            )
        
        # Generate state token (include user_id and business_id for security)
        state = secrets.token_urlsafe(32)
        oauth_states[state] = {
            "user_id": current_user.id,
            "business_id": business_id
        }
        
        # Initialize OAuth service
        oauth = MetaOAuthService()
        
        # Get authorization URL
        auth_url = oauth.get_authorization_url(state)
        
        # Check Accept header to determine response format
        accept_header = request.headers.get("Accept", "")
        
        # If request wants JSON (API call from frontend), return JSON
        if "application/json" in accept_header:
            return JSONResponse(content={"auth_url": auth_url, "state": state})
        
        # Redirect to Meta (for direct browser navigation)
        return RedirectResponse(url=auth_url)
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error initiating WhatsApp OAuth: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/whatsapp/callback")
async def whatsapp_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    error_reason: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle Meta OAuth callback.
    Meta redirects here after user authorizes.
    """
    # Check for errors
    if error:
        log.error(f"OAuth error: {error_reason}")
        error_message = error_reason or error
        return Response(content=_get_error_html(error_message), media_type="text/html")
    
    # Verify state
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    oauth_data = oauth_states[state]
    user_id = oauth_data["user_id"]
    business_id = oauth_data["business_id"]
    
    # Get business
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Initialize OAuth service
    oauth = MetaOAuthService()
    
    try:
        # 1. Exchange code for token
        token_response = await oauth.exchange_code_for_token(code)
        short_lived_token = token_response["access_token"]
        
        # 2. Get long-lived token (60 days)
        long_lived_response = await oauth.get_long_lived_token(short_lived_token)
        access_token = long_lived_response["access_token"]
        expires_in = long_lived_response.get("expires_in", 5184000)  # 60 days
        
        # 3. Get business accounts
        # User selected their business account during OAuth flow
        business_accounts = await oauth.get_business_accounts(access_token)
        
        if not business_accounts:
            return Response(content=_get_error_html("No business accounts found. Please try again or contact support."), media_type="text/html")
        
        # 4. Use first business account
        business_account = business_accounts[0]
        business_account_id = business_account["id"]
        
        # 5. Get WhatsApp accounts
        # User must have selected/created a WhatsApp Business Account during OAuth
        whatsapp_accounts = await oauth.get_whatsapp_accounts(
            business_account_id,
            access_token
        )
        
        if not whatsapp_accounts:
            return Response(content=_get_error_html(
                "No WhatsApp Business Account found. "
                "Please ensure you have a WhatsApp Business Account set up with your Facebook account. "
                "You can create one at business.facebook.com or during the connection flow."
            ), media_type="text/html")
        
        # 6. Use first WhatsApp account
        whatsapp_account = whatsapp_accounts[0]
        whatsapp_account_id = whatsapp_account["id"]
        whatsapp_account_name = whatsapp_account.get("name", "WhatsApp Business")
        
        # 7. Get phone numbers
        phone_numbers = await oauth.get_phone_numbers(
            whatsapp_account_id,
            access_token
        )
        
        if not phone_numbers:
            return Response(content=_get_error_html(
                "No phone numbers found for your WhatsApp Business Account. "
                "Please add a phone number to your WhatsApp Business Account at business.facebook.com, "
                "then try reconnecting."
            ), media_type="text/html")
        
        # 8. Use first phone number
        phone_number = phone_numbers[0]
        phone_number_id = phone_number["id"]
        display_phone_number = phone_number.get("display_phone_number", "")
        verified_name = phone_number.get("verified_name", "")
        
        log.info(f"WhatsApp OAuth completed: WABA={whatsapp_account_id}, Phone={display_phone_number}")
        
        # 9. Set up webhook automatically
        public_url = settings.public_url.rstrip('/')
        webhook_url = f"{public_url}/api/webhooks/whatsapp"
        verify_token = getattr(settings, 'whatsapp_verify_token', '')
        
        webhook_setup = await oauth.setup_webhook(
            phone_number_id,
            access_token,
            webhook_url,
            verify_token
        )
        
        if not webhook_setup:
            log.warning(f"Webhook setup failed for {phone_number_id}")
        
        # 10. Store credentials in ChannelIntegration (following Telegram pattern)
        credentials = json.dumps({
            "access_token": access_token,
            "expires_in": expires_in,
            "business_account_id": business_account_id,
            "whatsapp_account_id": whatsapp_account_id,
            "phone_number_id": phone_number_id
        })
        
        # Check if integration already exists
        existing = db.query(ChannelIntegration).filter(
            ChannelIntegration.business_id == business.id,
            ChannelIntegration.channel == "whatsapp"
        ).first()
        
        webhook_url_full = f"{webhook_url}?hub.mode=subscribe&hub.verify_token={verify_token}"
        
        if existing:
            # Update existing integration
            existing.credentials = credentials
            existing.is_active = True
            existing.webhook_url = webhook_url_full
            existing.channel_name = f"WhatsApp ({display_phone_number})"
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            integration_id = existing.id
        else:
            # Create new integration
            integration = ChannelIntegration(
                business_id=business.id,
                channel="whatsapp",
                channel_name=f"WhatsApp ({display_phone_number})",
                credentials=credentials,
                is_active=True,
                webhook_url=webhook_url_full
            )
            db.add(integration)
            db.commit()
            db.refresh(integration)
            integration_id = integration.id
        
        # 11. Clean up state
        del oauth_states[state]
        
        log.info(f"WhatsApp integration created/updated: {integration_id} by user {user_id}")
        
        # 12. Return success page with account info
        frontend_url = getattr(settings, 'frontend_url', 'http://localhost:3000')
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Connected</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #f5f5f5;
                }}
                .container {{
                    text-align: center;
                    padding: 2rem;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    max-width: 400px;
                }}
                .success {{
                    color: #25D366;
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }}
                h1 {{
                    color: #333;
                    margin: 0.5rem 0;
                }}
                p {{
                    color: #666;
                    margin: 0.5rem 0;
                    font-size: 0.95rem;
                }}
                .info {{
                    background: #f0f9f4;
                    border: 1px solid #25D366;
                    border-radius: 6px;
                    padding: 1rem;
                    margin-top: 1rem;
                    text-align: left;
                }}
                .info-item {{
                    margin: 0.5rem 0;
                    font-size: 0.9rem;
                }}
                .info-label {{
                    font-weight: 600;
                    color: #333;
                }}
                .info-value {{
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success">✓</div>
                <h1>WhatsApp Connected Successfully!</h1>
                <p>Your WhatsApp Business Account is now ready.</p>
                <div class="info">
                    <div class="info-item">
                        <span class="info-label">Phone Number:</span>
                        <span class="info-value">{display_phone_number}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Business Name:</span>
                        <span class="info-value">{verified_name or whatsapp_account_name}</span>
                    </div>
                </div>
                <p style="margin-top: 1rem; font-size: 0.85rem; color: #999;">
                    This window will close automatically...
                </p>
            </div>
            <script>
                // Post message to parent window
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'whatsapp-oauth-success',
                        channel: 'whatsapp',
                        phone: '{display_phone_number}',
                        name: '{verified_name or whatsapp_account_name}'
                    }}, '*');
                    
                    // Close popup after showing success
                    setTimeout(function() {{
                        window.close();
                    }}, 3000);
                }} else {{
                    // If no opener (direct navigation), redirect
                    window.location.href = '{frontend_url}/dashboard/integrations?success=true&channel=whatsapp';
                }}
            </script>
        </body>
        </html>
        """
        return Response(content=html_content, media_type="text/html")
    
    except Exception as e:
        log.error(f"OAuth callback error: {e}", exc_info=True)
        error_message = f"Failed to connect WhatsApp: {str(e)}"
        return Response(content=_get_error_html(error_message), media_type="text/html")


@router.get("/whatsapp/status", response_model=IntegrationResponse)
async def get_whatsapp_status(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get WhatsApp integration status.
    """
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
        ChannelIntegration.channel == "whatsapp",
        ChannelIntegration.is_active == True
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WhatsApp not connected"
        )
    
    return IntegrationResponse(
        id=integration.id,
        channel=integration.channel,
        channel_name=integration.channel_name,
        is_active=integration.is_active,
        webhook_url=integration.webhook_url,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat(),
    )


@router.delete("/whatsapp/disconnect")
async def disconnect_whatsapp(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect WhatsApp integration.
    """
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can disconnect integrations"
        )
    
    # Get user's business_id
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id,
        ChannelIntegration.channel == "whatsapp"
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WhatsApp integration not found"
        )
    
    # Deactivate integration
    integration.is_active = False
    integration.updated_at = datetime.utcnow()
    db.commit()
    
    log.info(f"WhatsApp integration disconnected: {integration.id} by user {current_user.id}")
    
    return {"success": True, "message": "WhatsApp integration disconnected successfully"}


# ============================================================================
# GENERAL CRUD OPERATIONS
# ============================================================================

class IntegrationUpdateRequest(BaseModel):
    """Request model for updating integration."""
    channel_name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific integration by ID."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.business_id == business_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    return IntegrationResponse(
        id=integration.id,
        channel=integration.channel,
        channel_name=integration.channel_name,
        is_active=integration.is_active,
        webhook_url=integration.webhook_url,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat(),
    )


@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: int,
    request: IntegrationUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an integration (channel name, active status)."""
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can update integrations"
        )
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.business_id == business_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Update fields
    if request.channel_name is not None:
        integration.channel_name = request.channel_name
    if request.is_active is not None:
        integration.is_active = request.is_active
    
    integration.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(integration)
    
    log.info(f"Integration {integration_id} updated by user {current_user.id}")
    
    return IntegrationResponse(
        id=integration.id,
        channel=integration.channel,
        channel_name=integration.channel_name,
        is_active=integration.is_active,
        webhook_url=integration.webhook_url,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat(),
    )


@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete/deactivate an integration."""
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can delete integrations"
        )
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.business_id == business_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Deactivate instead of hard delete
    integration.is_active = False
    integration.updated_at = datetime.utcnow()
    db.commit()
    
    log.info(f"Integration {integration_id} deactivated by user {current_user.id}")
    
    return {"success": True, "message": "Integration deactivated successfully"}


@router.post("/bulk/toggle")
async def bulk_toggle_integrations(
    integration_ids: List[int],
    is_active: bool,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk toggle integrations active/inactive."""
    # Check user role
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Business Owner roles can manage integrations"
        )
    
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integrations = db.query(ChannelIntegration).filter(
        ChannelIntegration.id.in_(integration_ids),
        ChannelIntegration.business_id == business_id
    ).all()
    
    updated_count = 0
    for integration in integrations:
        integration.is_active = is_active
        integration.updated_at = datetime.utcnow()
        updated_count += 1
    
    db.commit()
    
    log.info(f"Bulk toggled {updated_count} integrations to {'active' if is_active else 'inactive'} by user {current_user.id}")
    
    return {
        "success": True,
        "message": f"{updated_count} integrations {'activated' if is_active else 'deactivated'}",
        "updated_count": updated_count
    }


@router.get("/health/check")
async def check_integrations_health(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check health status of all integrations."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integrations require a business account."
        )
    
    integrations = db.query(ChannelIntegration).filter(
        ChannelIntegration.business_id == business_id
    ).all()
    
    health_status = {
        "total_integrations": len(integrations),
        "active_integrations": sum(1 for i in integrations if i.is_active),
        "inactive_integrations": sum(1 for i in integrations if not i.is_active),
        "by_channel": {},
        "integrations": []
    }
    
    # Group by channel
    from collections import defaultdict
    channel_counts = defaultdict(int)
    for integration in integrations:
        if integration.is_active:
            channel_counts[integration.channel] += 1
    
    health_status["by_channel"] = dict(channel_counts)
    
    # Add integration details
    for integration in integrations:
        health_status["integrations"].append({
            "id": integration.id,
            "channel": integration.channel,
            "channel_name": integration.channel_name,
            "is_active": integration.is_active,
            "created_at": integration.created_at.isoformat(),
            "updated_at": integration.updated_at.isoformat(),
        })
    
    return health_status

