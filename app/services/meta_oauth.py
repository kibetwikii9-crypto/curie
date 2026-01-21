"""
Meta Embedded Signup Service for WhatsApp Business API
Handles Embedded Signup flow to create and connect WhatsApp Business Accounts automatically.
"""
import logging
import httpx
from typing import Dict, List, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)


class MetaOAuthService:
    """Handles Meta Embedded Signup for WhatsApp connection"""
    
    BASE_URL = "https://graph.facebook.com/v21.0"  # Updated to latest version for Embedded Signup
    
    def __init__(self):
        """Initialize with settings from config"""
        self.app_id = getattr(settings, 'meta_app_id', '')
        self.app_secret = getattr(settings, 'meta_app_secret', '')
        self.redirect_uri = getattr(settings, 'meta_redirect_uri', '')
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Meta Embedded Signup authorization URL.
        This creates a WABA during the signup process.
        
        Args:
            state: CSRF protection token (should include user_id)
            
        Returns:
            Embedded Signup authorization URL
        """
        # Embedded Signup configuration
        config = {
            "business_config": {
                "vertical": "NOT_A_BUSINESS"  # For testing; use appropriate vertical in production
            }
        }
        
        # Convert config to query parameter (Meta expects JSON in setup param)
        import json
        from urllib.parse import quote
        setup_config = quote(json.dumps(config))
        
        # Build Embedded Signup URL
        url = (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={self.app_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"state={state}&"
            f"scope=whatsapp_business_management,whatsapp_business_messaging,business_management&"
            f"extras={{\"feature\":\"whatsapp_embedded_signup\",\"setup\":{setup_config}}}&"
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
        With Embedded Signup, this will return the newly created WABA.
        
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
            "fields": "id,name,account_review_status,message_template_namespace,timezone_id"
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
    
    async def register_phone_number(
        self,
        phone_number_id: str,
        access_token: str,
        pin: str = "000000"  # 6-digit PIN for verification
    ) -> Dict[str, Any]:
        """
        Register a phone number for WhatsApp Business.
        This is part of Embedded Signup flow.
        
        Args:
            phone_number_id: Phone number ID from Meta
            access_token: User's access token
            pin: 6-digit PIN for two-step verification
            
        Returns:
            Registration response
        """
        url = f"{self.BASE_URL}/{phone_number_id}/register"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "messaging_product": "whatsapp",
            "pin": pin
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=30.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error registering phone number: {e}")
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
    
    async def get_debug_token_info(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """
        Get debug information about the access token.
        This includes scopes, data access expiration, and app/user info.
        After Embedded Signup, this can extract the WABA ID.
        
        Args:
            access_token: User's access token
            
        Returns:
            Debug token information including granular_scopes with whatsapp_business_management
        """
        url = f"{self.BASE_URL}/debug_token"
        
        params = {
            "input_token": access_token,
            "access_token": f"{self.app_id}|{self.app_secret}"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error getting debug token info: {e}")
            raise
    
    async def setup_webhook(
        self,
        phone_number_id: str,
        access_token: str,
        webhook_url: str,
        verify_token: str
    ) -> bool:
        """
        Subscribe app to receive webhooks for a phone number.
        
        Args:
            phone_number_id: WhatsApp phone number ID
            access_token: User's access token
            webhook_url: Your webhook URL (not used in this call, set in Meta dashboard)
            verify_token: Verification token (not used in this call, set in Meta dashboard)
            
        Returns:
            True if successful
        """
        url = f"{self.BASE_URL}/{phone_number_id}/subscribed_apps"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Subscribe to webhook events
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, timeout=10.0)
                response.raise_for_status()
                logger.info(f"Webhook subscribed for {phone_number_id}")
                return True
        except Exception as e:
            logger.error(f"Error setting up webhook: {e}")
            return False



