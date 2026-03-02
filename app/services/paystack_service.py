"""Paystack payment processing service."""
import logging
import hmac
import hashlib
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PaystackService:
    """Service for Paystack payment processing and subscription management."""
    
    def __init__(self):
        """Initialize Paystack with API key."""
        self.secret_key = settings.paystack_secret_key
        self.public_key = settings.paystack_public_key
        self.base_url = "https://api.paystack.co"
        
        if not self.secret_key:
            logger.warning("Paystack API key not configured. Billing features will not work.")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Paystack API requests."""
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Paystack API."""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()
        
        try:
            async with httpx.AsyncClient() as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                result = response.json()
                
                if not result.get("status"):
                    raise Exception(result.get("message", "Paystack API error"))
                
                return result.get("data", result)
                
        except httpx.HTTPError as e:
            logger.error(f"Paystack API request failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Paystack error: {e}")
            raise
    
    # ========== CUSTOMERS ==========
    
    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a Paystack customer.
        
        Args:
            email: Customer email
            name: Customer name (optional)
            metadata: Additional metadata (optional)
            
        Returns:
            Paystack customer object
        """
        try:
            data = {
                "email": email,
                "first_name": name or email.split("@")[0],
                "metadata": metadata or {}
            }
            
            customer = await self._make_request("POST", "/customer", data=data)
            logger.info(f"Paystack customer created: {customer.get('customer_code')} for {email}")
            return customer
            
        except Exception as e:
            logger.error(f"Failed to create Paystack customer: {e}")
            raise
    
    async def get_customer(self, customer_code: str) -> Dict[str, Any]:
        """Get Paystack customer details."""
        try:
            customer = await self._make_request("GET", f"/customer/{customer_code}")
            return customer
        except Exception as e:
            logger.error(f"Failed to retrieve customer {customer_code}: {e}")
            raise
    
    async def update_customer(
        self,
        customer_code: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Update Paystack customer."""
        try:
            data = {}
            if email:
                data['email'] = email
            if name:
                data['first_name'] = name
            if metadata:
                data['metadata'] = metadata
            
            customer = await self._make_request("PUT", f"/customer/{customer_code}", data=data)
            logger.info(f"Paystack customer updated: {customer_code}")
            return customer
            
        except Exception as e:
            logger.error(f"Failed to update customer {customer_code}: {e}")
            raise
    
    # ========== SUBSCRIPTIONS ==========
    
    async def create_subscription(
        self,
        customer_code: str,
        plan_code: str,
        authorization_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a subscription for a customer.
        
        Args:
            customer_code: Paystack customer code
            plan_code: Paystack plan code
            authorization_code: Payment authorization code (optional for trial)
            metadata: Additional metadata
            
        Returns:
            Paystack subscription object
        """
        try:
            data = {
                'customer': customer_code,
                'plan': plan_code,
                'metadata': metadata or {}
            }
            
            if authorization_code:
                data['authorization'] = authorization_code
            
            subscription = await self._make_request("POST", "/subscription", data=data)
            
            logger.info(f"Subscription created: {subscription.get('subscription_code')} for customer {customer_code}")
            return subscription
            
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
            raise
    
    async def get_subscription(self, subscription_code: str) -> Dict[str, Any]:
        """Get subscription details."""
        try:
            subscription = await self._make_request("GET", f"/subscription/{subscription_code}")
            return subscription
        except Exception as e:
            logger.error(f"Failed to retrieve subscription {subscription_code}: {e}")
            raise
    
    async def update_subscription(
        self,
        subscription_code: str,
        plan_code: Optional[str] = None,
        authorization_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update subscription (e.g., upgrade/downgrade plan).
        
        Args:
            subscription_code: Paystack subscription code
            plan_code: New plan code (optional)
            authorization_code: Payment authorization code (optional)
            metadata: Additional metadata
            
        Returns:
            Updated subscription object
        """
        try:
            # Paystack doesn't have direct subscription update
            # We need to disable old and create new, or use manage link
            # For now, we'll use the manage subscription endpoint
            data = {}
            
            if plan_code:
                data['plan'] = plan_code
            if authorization_code:
                data['authorization'] = authorization_code
            if metadata:
                data['metadata'] = metadata
            
            # Note: Paystack subscription updates are limited
            # Consider using disable + create for plan changes
            subscription = await self._make_request("POST", f"/subscription/{subscription_code}/manage/link", data=data)
            
            logger.info(f"Subscription updated: {subscription_code}")
            return subscription
            
        except Exception as e:
            logger.error(f"Failed to update subscription {subscription_code}: {e}")
            raise
    
    async def cancel_subscription(
        self,
        subscription_code: str,
        email_token: str
    ) -> Dict[str, Any]:
        """
        Cancel a subscription.
        
        Args:
            subscription_code: Paystack subscription code
            email_token: Email token from customer
            
        Returns:
            Cancellation result
        """
        try:
            data = {
                'code': subscription_code,
                'token': email_token
            }
            
            result = await self._make_request("POST", "/subscription/disable", data=data)
            logger.info(f"Subscription {subscription_code} cancelled")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to cancel subscription {subscription_code}: {e}")
            raise
    
    async def enable_subscription(
        self,
        subscription_code: str,
        email_token: str
    ) -> Dict[str, Any]:
        """Enable a cancelled subscription."""
        try:
            data = {
                'code': subscription_code,
                'token': email_token
            }
            
            result = await self._make_request("POST", "/subscription/enable", data=data)
            logger.info(f"Subscription {subscription_code} enabled")
            return result
        except Exception as e:
            logger.error(f"Failed to enable subscription {subscription_code}: {e}")
            raise
    
    # ========== PAYMENT METHODS & TRANSACTIONS ==========
    
    async def initialize_transaction(
        self,
        email: str,
        amount: int,  # Amount in kobo/cents
        currency: str = "NGN",
        plan_code: Optional[str] = None,
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Initialize a payment transaction."""
        try:
            data = {
                'email': email,
                'amount': amount,
                'currency': currency,
                'metadata': metadata or {}
            }
            
            if plan_code:
                data['plan'] = plan_code
            if callback_url:
                data['callback_url'] = callback_url
            
            result = await self._make_request("POST", "/transaction/initialize", data=data)
            logger.info(f"Transaction initialized for {email}")
            return result
        except Exception as e:
            logger.error(f"Failed to initialize transaction: {e}")
            raise
    
    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """Verify a transaction."""
        try:
            result = await self._make_request("GET", f"/transaction/verify/{reference}")
            return result
        except Exception as e:
            logger.error(f"Failed to verify transaction {reference}: {e}")
            raise
    
    async def charge_authorization(
        self,
        authorization_code: str,
        email: str,
        amount: int,
        currency: str = "NGN",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Charge an authorization."""
        try:
            data = {
                'authorization_code': authorization_code,
                'email': email,
                'amount': amount,
                'currency': currency,
                'metadata': metadata or {}
            }
            
            result = await self._make_request("POST", "/transaction/charge_authorization", data=data)
            logger.info(f"Authorization charged for {email}")
            return result
        except Exception as e:
            logger.error(f"Failed to charge authorization: {e}")
            raise
    
    async def list_transactions(
        self,
        customer_id: Optional[int] = None,
        per_page: int = 10
    ) -> List[Dict[str, Any]]:
        """List transactions."""
        try:
            params = {'perPage': per_page}
            if customer_id:
                params['customer'] = customer_id
            
            result = await self._make_request("GET", "/transaction", params=params)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to list transactions: {e}")
            raise
    
    # ========== PLANS ==========
    
    async def create_plan(
        self,
        name: str,
        amount: int,  # Amount in kobo/cents
        interval: str = "monthly",  # monthly, annually, etc.
        currency: str = "NGN",
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Paystack plan."""
        try:
            data = {
                'name': name,
                'amount': amount,
                'interval': interval,
                'currency': currency,
            }
            
            if description:
                data['description'] = description
            if metadata:
                data['metadata'] = metadata
            
            plan = await self._make_request("POST", "/plan", data=data)
            logger.info(f"Paystack plan created: {plan.get('plan_code')}")
            return plan
        except Exception as e:
            logger.error(f"Failed to create plan: {e}")
            raise
    
    async def get_plan(self, plan_code: str) -> Dict[str, Any]:
        """Get a plan."""
        try:
            plan = await self._make_request("GET", f"/plan/{plan_code}")
            return plan
        except Exception as e:
            logger.error(f"Failed to get plan {plan_code}: {e}")
            raise
    
    async def list_plans(self, per_page: int = 50) -> List[Dict[str, Any]]:
        """List all plans."""
        try:
            params = {'perPage': per_page}
            result = await self._make_request("GET", "/plan", params=params)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to list plans: {e}")
            raise
    
    # ========== REFUNDS ==========
    
    async def create_refund(
        self,
        transaction_reference: str,
        amount: Optional[int] = None,  # Amount in kobo (None = full refund)
        merchant_note: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a refund for a transaction."""
        try:
            data = {
                'transaction': transaction_reference
            }
            
            if amount:
                data['amount'] = amount
            if merchant_note:
                data['merchant_note'] = merchant_note
            
            refund = await self._make_request("POST", "/refund", data=data)
            logger.info(f"Refund created for transaction {transaction_reference}")
            return refund
        except Exception as e:
            logger.error(f"Failed to create refund: {e}")
            raise
    
    # ========== WEBHOOKS ==========
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """
        Verify webhook signature from Paystack.
        
        Args:
            payload: Raw request body
            signature: Paystack signature header (x-paystack-signature)
            
        Returns:
            True if signature is valid
        """
        try:
            computed_signature = hmac.new(
                self.secret_key.encode('utf-8'),
                payload,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(computed_signature, signature)
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return False
    
    def parse_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse webhook event from Paystack.
        
        Args:
            payload: Webhook payload (already parsed JSON)
            
        Returns:
            Event object with type and data
        """
        return {
            'type': payload.get('event'),
            'data': payload.get('data', {})
        }
