"""
Gmail OAuth Service for Email Integration
Handles OAuth flow for Gmail API access.
"""
import logging
import httpx
from typing import Dict, List, Optional, Any
import base64
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


class GmailOAuthService:
    """Handles Gmail OAuth for Email integration"""
    
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1"
    
    def __init__(self):
        """Initialize with settings from config"""
        self.client_id = getattr(settings, 'google_client_id', '')
        self.client_secret = getattr(settings, 'google_client_secret', '')
        self.redirect_uri = getattr(settings, 'google_redirect_uri', '')
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Scopes:
        - gmail.readonly: Read emails
        - gmail.send: Send emails
        - gmail.modify: Modify labels (mark as read, etc.)
        
        Args:
            state: CSRF protection token (should include user_id)
            
        Returns:
            OAuth authorization URL
        """
        scopes = [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/userinfo.email"
        ]
        
        scope_string = " ".join(scopes)
        
        url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"state={state}&"
            f"scope={scope_string}&"
            f"response_type=code&"
            f"access_type=offline&"  # Get refresh token
            f"prompt=consent"  # Force consent to get refresh token
        )
        
        return url
    
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from callback
            
        Returns:
            Token response with access_token, refresh_token, etc.
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": code,
            "grant_type": "authorization_code"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.TOKEN_URL, data=data, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            raise
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New token response
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.TOKEN_URL, data=data, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            raise
    
    async def get_user_email(self, access_token: str) -> str:
        """
        Get user's email address.
        
        Args:
            access_token: Access token
            
        Returns:
            User's email address
        """
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.USER_INFO_URL, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("email", "")
        except Exception as e:
            logger.error(f"Error getting user email: {e}")
            raise
    
    async def list_messages(
        self, 
        access_token: str,
        max_results: int = 10,
        query: str = "is:unread"
    ) -> List[Dict[str, Any]]:
        """
        List messages from Gmail.
        
        Args:
            access_token: Access token
            max_results: Maximum number of messages to return
            query: Gmail search query (default: unread messages)
            
        Returns:
            List of messages
        """
        url = f"{self.GMAIL_API_URL}/users/me/messages"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        params = {
            "maxResults": max_results,
            "q": query
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("messages", [])
        except Exception as e:
            logger.error(f"Error listing messages: {e}")
            raise
    
    async def get_message(
        self, 
        access_token: str,
        message_id: str
    ) -> Dict[str, Any]:
        """
        Get a specific message.
        
        Args:
            access_token: Access token
            message_id: Message ID
            
        Returns:
            Message data
        """
        url = f"{self.GMAIL_API_URL}/users/me/messages/{message_id}"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        params = {
            "format": "full"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error getting message: {e}")
            raise
    
    async def send_email(
        self,
        access_token: str,
        to: str,
        subject: str,
        body: str,
        in_reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an email.
        
        Args:
            access_token: Access token
            to: Recipient email
            subject: Email subject
            body: Email body (plain text)
            in_reply_to: Message ID to reply to (optional)
            
        Returns:
            Sent message data
        """
        url = f"{self.GMAIL_API_URL}/users/me/messages/send"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Create MIME message
        message = MIMEText(body)
        message['to'] = to
        message['subject'] = subject
        
        if in_reply_to:
            message['In-Reply-To'] = in_reply_to
            message['References'] = in_reply_to
        
        # Encode message
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        data = {
            "raw": raw
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            raise
    
    async def modify_message(
        self,
        access_token: str,
        message_id: str,
        add_labels: List[str] = None,
        remove_labels: List[str] = None
    ) -> Dict[str, Any]:
        """
        Modify message labels (e.g., mark as read).
        
        Args:
            access_token: Access token
            message_id: Message ID
            add_labels: Labels to add
            remove_labels: Labels to remove
            
        Returns:
            Modified message data
        """
        url = f"{self.GMAIL_API_URL}/users/me/messages/{message_id}/modify"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {}
        if add_labels:
            data["addLabelIds"] = add_labels
        if remove_labels:
            data["removeLabelIds"] = remove_labels
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error modifying message: {e}")
            raise
    
    async def process_new_emails(
        self,
        access_token: str,
        business_id: int,
        last_processed_id: str = None
    ) -> Dict[str, Any]:
        """
        Process new emails for a business.
        Retrieves unread emails and processes them through the AI system.
        
        Args:
            access_token: Gmail access token
            business_id: Business ID for the integration
            last_processed_id: Last processed message ID to avoid duplicates
            
        Returns:
            Processing results
        """
        from app.services.processor import process_message
        from app.services.conversation_service import save_conversation_from_normalized
        from app.schemas import NormalizedMessage, MessageChannel
        from datetime import datetime
        
        processed_count = 0
        errors = []
        
        try:
            # Get unread messages
            messages = await self.list_messages(access_token, max_results=10, query="is:unread")
            
            if not messages:
                return {"processed": 0, "errors": []}
            
            for message_info in messages:
                try:
                    message_id = message_info.get("id")
                    
                    # Skip if already processed
                    if last_processed_id and message_id <= last_processed_id:
                        continue
                    
                    # Get full message
                    message_data = await self.get_message(access_token, message_id)
                    
                    # Extract email content
                    payload = message_data.get("payload", {})
                    headers = payload.get("headers", [])
                    
                    subject = ""
                    from_email = ""
                    to_email = ""
                    
                    for header in headers:
                        name = header.get("name", "").lower()
                        value = header.get("value", "")
                        
                        if name == "subject":
                            subject = value
                        elif name == "from":
                            from_email = value
                        elif name == "to":
                            to_email = value
                    
                    # Get message body
                    body = self._extract_email_body(payload)
                    
                    if not body:
                        continue
                    
                    # Create normalized message
                    normalized_message = NormalizedMessage(
                        channel=MessageChannel.EMAIL,
                        user_id=from_email,
                        message_text=f"Subject: {subject}\n\n{body}",
                        timestamp=datetime.utcfromtimestamp(int(message_data.get("internalDate", 0)) / 1000) if message_data.get("internalDate") else datetime.utcnow(),
                        metadata={
                            "message_id": message_id,
                            "subject": subject,
                            "from_email": from_email,
                            "to_email": to_email,
                            "business_id": business_id,
                            "source": "gmail_polling",
                        },
                    )
                    
                    # Generate AI reply
                    reply_text = await process_message(normalized_message, business_id)
                    if not reply_text or not reply_text.strip():
                        reply_text = "Thank you for your email. I'll get back to you soon."
                    
                    # Send reply email
                    await self.send_email(
                        access_token,
                        from_email,  # Reply to sender
                        f"Re: {subject}",
                        reply_text,
                        message_id  # In-Reply-To header
                    )
                    
                    # Mark as read
                    await self.modify_message(
                        access_token,
                        message_id,
                        remove_labels=["UNREAD"]
                    )
                    
                    # Save conversation
                    try:
                        await save_conversation_from_normalized(
                            normalized_message=normalized_message,
                            bot_reply=reply_text,
                            business_id=business_id,
                        )
                    except Exception:
                        pass  # Don't fail if saving fails
                    
                    processed_count += 1
                    logger.info(f"Processed email {message_id} from {from_email}")
                    
                except Exception as e:
                    logger.error(f"Error processing email {message_info.get('id')}: {e}")
                    errors.append(str(e))
                    continue
            
            return {"processed": processed_count, "errors": errors}
            
        except Exception as e:
            logger.error(f"Error in process_new_emails: {e}")
            return {"processed": processed_count, "errors": [str(e)]}
    
    def _extract_email_body(self, payload: Dict[str, Any]) -> str:
        """
        Extract plain text body from Gmail message payload.
        
        Args:
            payload: Gmail message payload
            
        Returns:
            Plain text body
        """
        def get_plain_text_body(part):
            """Recursively find plain text body"""
            if part.get("mimeType") == "text/plain":
                body_data = part.get("body", {}).get("data", "")
                if body_data:
                    import base64
                    return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="ignore")
            
            # Check parts
            for subpart in part.get("parts", []):
                result = get_plain_text_body(subpart)
                if result:
                    return result
            
            return ""
        
        return get_plain_text_body(payload)
