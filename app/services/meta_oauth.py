"""
Meta OAuth Service for WhatsApp Business API
Handles standard OAuth redirect flow for WhatsApp Business connections.
Users log in with Facebook and select/create business and WhatsApp accounts.
"""
import logging
import httpx
from typing import Dict, List, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)


class MetaOAuthService:
    """Handles Meta OAuth for WhatsApp Business connection"""
    
    BASE_URL = "https://graph.facebook.com/v21.0"
    
    def __init__(self):
        """Initialize with settings from config"""
        self.app_id = getattr(settings, 'meta_app_id', '')
        self.app_secret = getattr(settings, 'meta_app_secret', '')
        self.redirect_uri = getattr(settings, 'meta_redirect_uri', '')
        self.instagram_redirect_uri = getattr(settings, 'meta_instagram_redirect_uri', '')
        self.messenger_redirect_uri = getattr(settings, 'meta_messenger_redirect_uri', '')
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Meta OAuth authorization URL (Standard OAuth Redirect Flow).
        
        User will:
        1. Log in with Facebook
        2. Select/create a business account (if prompted)
        3. Select/create a WhatsApp Business account (if prompted)
        4. Grant permissions
        
        Meta handles the account creation automatically during the flow.
        
        Args:
            state: CSRF protection token (should include user_id)
            
        Returns:
            OAuth authorization URL
        """
        # Standard OAuth URL with WhatsApp-specific scopes
        # The scope "whatsapp_business_management" allows the app to:
        # - Read and manage WhatsApp Business Account settings
        # - Send messages via WhatsApp Business API
        # - Read phone numbers and business profiles
        url = (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={self.app_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"state={state}&"
            f"scope=whatsapp_business_management,whatsapp_business_messaging&"
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
        Returns existing WhatsApp Business Accounts that the user has access to.
        
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
        Useful for debugging OAuth flow and verifying permissions.
        
        Args:
            access_token: User's access token
            
        Returns:
            Debug token information including scopes and app/user details
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
    
    def get_instagram_authorization_url(self, state: str) -> str:
        """
        Generate Meta OAuth authorization URL for Instagram.
        
        Scopes for Instagram:
        - instagram_basic: Basic profile info
        - instagram_manage_messages: Read and respond to messages
        - pages_show_list: List connected pages
        - pages_manage_metadata: Manage page metadata
        
        Args:
            state: CSRF protection token (should include user_id)
            
        Returns:
            OAuth authorization URL
        """
        url = (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={self.app_id}&"
            f"redirect_uri={self.instagram_redirect_uri}&"
            f"state={state}&"
            f"scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata&"
            f"response_type=code"
        )
        
        return url
    
    def get_messenger_authorization_url(self, state: str) -> str:
        """
        Generate Meta OAuth authorization URL for Facebook Messenger.
        
        Scopes for Messenger:
        - pages_messaging: Send and receive messages
        - pages_manage_metadata: Manage page metadata
        - pages_show_list: List connected pages
        
        Args:
            state: CSRF protection token (should include user_id)
            
        Returns:
            OAuth authorization URL
        """
        url = (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={self.app_id}&"
            f"redirect_uri={self.messenger_redirect_uri}&"
            f"state={state}&"
            f"scope=pages_messaging,pages_manage_metadata,pages_show_list,pages_read_engagement&"
            f"response_type=code"
        )
        
        return url
    
    async def get_instagram_accounts(
        self, 
        access_token: str
    ) -> List[Dict[str, Any]]:
        """
        Get user's Instagram Business Accounts.
        
        Args:
            access_token: User's access token
            
        Returns:
            List of Instagram accounts
        """
        url = f"{self.BASE_URL}/me/accounts"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        params = {
            "fields": "instagram_business_account,name,id"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                # Extract Instagram accounts from pages
                instagram_accounts = []
                for page in data.get("data", []):
                    if "instagram_business_account" in page:
                        ig_account = page["instagram_business_account"]
                        ig_account["page_name"] = page["name"]
                        ig_account["page_id"] = page["id"]
                        instagram_accounts.append(ig_account)
                
                return instagram_accounts
        except Exception as e:
            logger.error(f"Error getting Instagram accounts: {e}")
            raise
    
    async def get_messenger_pages(
        self, 
        access_token: str
    ) -> List[Dict[str, Any]]:
        """
        Get user's Facebook Pages (for Messenger).
        
        Args:
            access_token: User's access token
            
        Returns:
            List of Facebook Pages
        """
        url = f"{self.BASE_URL}/me/accounts"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        params = {
            "fields": "id,name,access_token,category,tasks"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"Error getting Messenger pages: {e}")
            raise
    
    async def subscribe_page_webhook(
        self,
        page_id: str,
        page_access_token: str
    ) -> bool:
        """
        Subscribe page to receive Messenger webhooks.
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            
        Returns:
            True if successful
        """
        url = f"{self.BASE_URL}/{page_id}/subscribed_apps"
        
        headers = {
            "Authorization": f"Bearer {page_access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "subscribed_fields": ["messages", "messaging_postbacks", "message_echoes", "messaging_handovers"]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=10.0)
                response.raise_for_status()
                logger.info(f"Messenger webhook subscribed for page {page_id}")
                return True
        except Exception as e:
            logger.error(f"Error subscribing page webhook: {e}")
            return False



