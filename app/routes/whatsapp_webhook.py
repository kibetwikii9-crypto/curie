"""
WhatsApp webhook endpoints.
Handles incoming messages from WhatsApp Cloud API.
"""
import logging
import json
import hmac
import hashlib
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Header, Query, status, Depends
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChannelIntegration
from app.config import settings
import httpx

log = logging.getLogger(__name__)
router = APIRouter()


@router.get("/webhooks/whatsapp")
async def verify_whatsapp_webhook(
    mode: str = Query(..., alias="hub.mode"),
    token: str = Query(..., alias="hub.verify_token"),
    challenge: str = Query(..., alias="hub.challenge")
):
    """
    Verify webhook during Meta's subscription process.
    
    Meta sends a GET request with:
    - hub.mode: "subscribe"
    - hub.verify_token: Your verify token
    - hub.challenge: Random string to echo back
    """
    verify_token = getattr(settings, 'whatsapp_verify_token', '')
    
    if mode == "subscribe" and token == verify_token:
        log.info("WhatsApp webhook verified successfully")
        return Response(content=challenge, media_type="text/plain")
    
    log.warning(f"Webhook verification failed: mode={mode}")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhooks/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db)
):
    """
    Receive WhatsApp webhook messages from Meta.
    
    Flow:
    1. Verify webhook signature
    2. Parse WhatsApp payload
    3. Extract phone number, message text, timestamp
    4. Find channel by phone_number_id
    5. Process message (store, reply, etc.)
    """
    try:
        # Read raw body for signature verification
        body = await request.body()
        
        # Verify signature if app secret is configured
        app_secret = getattr(settings, 'whatsapp_app_secret', None)
        if app_secret and x_hub_signature_256:
            # Remove 'sha256=' prefix if present
            signature = x_hub_signature_256.replace("sha256=", "")
            
            # Calculate expected signature
            expected_signature = hmac.new(
                app_secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            # Constant-time comparison
            if not hmac.compare_digest(signature, expected_signature):
                log.warning("Invalid webhook signature")
                raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Parse JSON payload
        payload = json.loads(body.decode())
        
        log.info(f"Received WhatsApp webhook: {payload.get('object')}")
        
        # Extract phone_number_id from payload
        entry = payload.get("entry", [])
        if not entry:
            log.warning("Empty entry in webhook")
            return JSONResponse(content={"status": "ok"})
        
        # Get phone_number_id from first entry
        phone_number_id = None
        for entry_item in entry:
            changes = entry_item.get("changes", [])
            for change in changes:
                if change.get("field") == "messages":
                    metadata = change.get("value", {}).get("metadata", {})
                    phone_number_id = metadata.get("phone_number_id")
                    break
            if phone_number_id:
                break
        
        if not phone_number_id:
            log.warning("No phone_number_id in webhook payload")
            return JSONResponse(content={"status": "ok"})
        
        # Find channel by phone_number_id
        # Search through all active WhatsApp integrations
        integrations = db.query(ChannelIntegration).filter(
            ChannelIntegration.channel == "whatsapp",
            ChannelIntegration.is_active == True
        ).all()
        
        matching_integration = None
        for integration in integrations:
            try:
                credentials = json.loads(integration.credentials) if integration.credentials else {}
                stored_phone_number_id = credentials.get("phone_number_id")
                if stored_phone_number_id == phone_number_id:
                    matching_integration = integration
                    break
            except Exception:
                continue
        
        if not matching_integration:
            log.error(f"Channel not found for phone_number_id: {phone_number_id}")
            return JSONResponse(content={"status": "ok"})  # Return 200 to Meta
        
        # Get credentials
        credentials = json.loads(matching_integration.credentials)
        access_token = credentials.get("access_token")
        
        if not access_token:
            log.error(f"No access token for channel: {matching_integration.id}")
            return JSONResponse(content={"status": "ok"})
        
        # Process messages from payload
        messages_processed = 0
        for entry_item in entry:
            changes = entry_item.get("changes", [])
            for change in changes:
                if change.get("field") != "messages":
                    continue
                
                value = change.get("value", {})
                messages = value.get("messages", [])
                
                for message_item in messages:
                    try:
                        # Extract message data
                        message_id = message_item.get("id")
                        from_number = message_item.get("from")
                        timestamp = int(message_item.get("timestamp", 0))
                        
                        # Get message text
                        message_text = ""
                        if "text" in message_item:
                            message_text = message_item["text"].get("body", "")
                        
                        if not message_text:
                            continue  # Skip non-text messages for now
                        
                        log.info(f"Processing WhatsApp message: from={from_number}, text={message_text[:50]}")
                        
                        # TODO: Store message in database
                        # TODO: Process through AI/rules
                        # TODO: Send auto-reply
                        
                        # For now, send static auto-reply
                        reply_text = "Thanks for contacting us. A team member will respond shortly."
                        
                        # Send reply via WhatsApp API
                        send_url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
                        headers = {
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/json"
                        }
                        payload = {
                            "messaging_product": "whatsapp",
                            "recipient_type": "individual",
                            "to": from_number,
                            "type": "text",
                            "text": {
                                "preview_url": False,
                                "body": reply_text
                            }
                        }
                        
                        async with httpx.AsyncClient() as client:
                            response = await client.post(send_url, json=payload, headers=headers, timeout=10.0)
                            response.raise_for_status()
                            log.info(f"Reply sent to {from_number}")
                        
                        messages_processed += 1
                    
                    except Exception as e:
                        log.error(f"Error processing message: {e}", exc_info=True)
                        continue
        
        log.info(f"Processed {messages_processed} WhatsApp messages")
        return JSONResponse(content={"status": "ok", "processed": messages_processed})
    
    except HTTPException:
        raise
    except Exception as e:
        # Never crash webhook - always return 200 to Meta
        log.error(f"Webhook error: {e}", exc_info=True)
        return JSONResponse(
            content={"status": "error", "message": "Internal error"},
            status_code=200  # Return 200 to Meta to prevent retries
        )

