"""
Meta OAuth Service for WhatsApp Business API
Handles OAuth flow to connect WhatsApp without manual token entry.
"""
import logging
import httpx
from typing import Dict, List, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)


class MetaOAuthService:
    """Handles Meta OAuth flow for WhatsApp connection"""
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self):
        """Initialize with settings from config"""
        self.app_id = getattr(settings, 'meta_app_id', '')
        self.app_secret = getattr(settings, 'meta_app_secret', '')
        self.redirect_uri = getattr(settings, 'meta_redirect_uri', '')
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Meta OAuth authorization URL.
        
        Args:
            state: CSRF protection token (should include user_id)
            
        Returns:
            OAuth authorization URL
        """
        scopes = [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
            "business_management"
        ]
        
        url = (
            f"https://www.facebook.com/v18.0/dialog/oauth?"
            f"client_id={self.app_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"state={state}&"
            f"scope={','.join(scopes)}&"
            f"response_type=code"
        )
        
        return url
    
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from callback
            
        Returns:
            Token response with access_token, expires_in, etc.
        """
        url = f"{self.BASE_URL}/oauth/access_token"
        
        params = {
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "redirect_uri": self.redirect_uri,
            "code": code
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            raise
    
    async def get_long_lived_token(self, short_lived_token: str) -> Dict[str, Any]:
        """
        Exchange short-lived token for long-lived token (60 days).
        
        Args:
            short_lived_token: Short-lived access token
            
        Returns:
            Long-lived token response
        """
        url = f"{self.BASE_URL}/oauth/access_token"
        
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "fb_exchange_token": short_lived_token
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error getting long-lived token: {e}")
            raise
    
    async def get_business_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """
        Get user's Meta Business Accounts.
        
        Args:
            access_token: User's access token
            
        Returns:
            List of business accounts
        """
        url = f"{self.BASE_URL}/me/businesses"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"Error getting business accounts: {e}")
            raise
    
    async def get_whatsapp_accounts(
        self, 
        business_account_id: str,
        access_token: str
    ) -> List[Dict[str, Any]]:
        """
        Get WhatsApp Business Accounts for a business.
        
        Args:
            business_account_id: Meta Business Account ID
            access_token: User's access token
            
        Returns:
            List of WhatsApp Business Accounts
        """
        url = f"{self.BASE_URL}/{business_account_id}/owned_whatsapp_business_accounts"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        params = {
            "fields": "id,name,account_review_status,message_template_namespace"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"Error getting WhatsApp accounts: {e}")
            raise
    
    async def get_phone_numbers(
        self,
        whatsapp_account_id: str,
        access_token: str
    ) -> List[Dict[str, Any]]:
        """
        Get phone numbers for a WhatsApp Business Account.
        
        Args:
            whatsapp_account_id: WhatsApp Business Account ID
            access_token: User's access token
            
        Returns:
            List of phone numbers
        """
        url = f"{self.BASE_URL}/{whatsapp_account_id}/phone_numbers"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        params = {
            "fields": "id,verified_name,display_phone_number,code_verification_status"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"Error getting phone numbers: {e}")
            raise
    
    async def setup_webhook(
        self,
        phone_number_id: str,
        access_token: str,
        webhook_url: str,
        verify_token: str
    ) -> bool:
        """
        Automatically set up webhook for phone number.
        
        Args:
            phone_number_id: WhatsApp phone number ID
            access_token: User's access token
            webhook_url: Your webhook URL
            verify_token: Verification token
            
        Returns:
            True if successful
        """
        url = f"{self.BASE_URL}/{phone_number_id}/subscribed_apps"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "data": [{"fields": "messages"}]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=10.0)
                response.raise_for_status()
                logger.info(f"Webhook subscribed for {phone_number_id}")
                return True
        except Exception as e:
            logger.error(f"Error setting up webhook: {e}")
            return False



