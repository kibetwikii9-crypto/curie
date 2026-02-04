"""Stripe payment processing service."""
import logging
import stripe
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


class StripeService:
    """Service for Stripe payment processing and subscription management."""
    
    def __init__(self):
        """Initialize Stripe with API key."""
        if settings.stripe_secret_key:
            stripe.api_key = settings.stripe_secret_key
        else:
            logger.warning("Stripe API key not configured. Billing features will not work.")
    
    # ========== CUSTOMERS ==========
    
    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe customer.
        
        Args:
            email: Customer email
            name: Customer name (optional)
            metadata: Additional metadata (optional)
            
        Returns:
            Stripe customer object
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            
            logger.info(f"Stripe customer created: {customer.id} for {email}")
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise
    
    async def get_customer(self, customer_id: str) -> Dict[str, Any]:
        """Get Stripe customer details."""
        try:
            customer = stripe.Customer.retrieve(customer_id)
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve customer {customer_id}: {e}")
            raise
    
    async def update_customer(
        self,
        customer_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Update Stripe customer."""
        try:
            update_data = {}
            if email:
                update_data['email'] = email
            if name:
                update_data['name'] = name
            if metadata:
                update_data['metadata'] = metadata
            
            customer = stripe.Customer.modify(customer_id, **update_data)
            logger.info(f"Stripe customer updated: {customer_id}")
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to update customer {customer_id}: {e}")
            raise
    
    # ========== SUBSCRIPTIONS ==========
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a subscription for a customer.
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            trial_days: Number of trial days (optional)
            metadata: Additional metadata
            
        Returns:
            Stripe subscription object
        """
        try:
            subscription_data = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'metadata': metadata or {},
                'payment_behavior': 'default_incomplete',
                'payment_settings': {'save_default_payment_method': 'on_subscription'},
                'expand': ['latest_invoice.payment_intent']
            }
            
            if trial_days:
                subscription_data['trial_period_days'] = trial_days
            
            subscription = stripe.Subscription.create(**subscription_data)
            
            logger.info(f"Subscription created: {subscription.id} for customer {customer_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create subscription: {e}")
            raise
    
    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Get subscription details."""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve subscription {subscription_id}: {e}")
            raise
    
    async def update_subscription(
        self,
        subscription_id: str,
        price_id: Optional[str] = None,
        proration_behavior: str = 'create_prorations',
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update subscription (e.g., upgrade/downgrade plan).
        
        Args:
            subscription_id: Stripe subscription ID
            price_id: New price ID (optional)
            proration_behavior: How to handle proration
            metadata: Additional metadata
            
        Returns:
            Updated subscription object
        """
        try:
            update_data = {
                'proration_behavior': proration_behavior
            }
            
            if price_id:
                # Get current subscription
                subscription = await self.get_subscription(subscription_id)
                
                # Update the subscription item
                update_data['items'] = [{
                    'id': subscription['items']['data'][0].id,
                    'price': price_id,
                }]
            
            if metadata:
                update_data['metadata'] = metadata
            
            subscription = stripe.Subscription.modify(subscription_id, **update_data)
            
            logger.info(f"Subscription updated: {subscription_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to update subscription {subscription_id}: {e}")
            raise
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> Dict[str, Any]:
        """
        Cancel a subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            at_period_end: Cancel at period end or immediately
            
        Returns:
            Updated subscription object
        """
        try:
            if at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
                logger.info(f"Subscription {subscription_id} will cancel at period end")
            else:
                subscription = stripe.Subscription.delete(subscription_id)
                logger.info(f"Subscription {subscription_id} cancelled immediately")
            
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {e}")
            raise
    
    async def resume_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Resume a subscription scheduled for cancellation."""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            logger.info(f"Subscription {subscription_id} resumed")
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Failed to resume subscription {subscription_id}: {e}")
            raise
    
    # ========== PAYMENT METHODS ==========
    
    async def attach_payment_method(
        self,
        payment_method_id: str,
        customer_id: str
    ) -> Dict[str, Any]:
        """Attach a payment method to a customer."""
        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            logger.info(f"Payment method {payment_method_id} attached to customer {customer_id}")
            return payment_method
        except stripe.error.StripeError as e:
            logger.error(f"Failed to attach payment method: {e}")
            raise
    
    async def detach_payment_method(self, payment_method_id: str) -> Dict[str, Any]:
        """Detach a payment method from a customer."""
        try:
            payment_method = stripe.PaymentMethod.detach(payment_method_id)
            logger.info(f"Payment method {payment_method_id} detached")
            return payment_method
        except stripe.error.StripeError as e:
            logger.error(f"Failed to detach payment method: {e}")
            raise
    
    async def set_default_payment_method(
        self,
        customer_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Set default payment method for a customer."""
        try:
            customer = stripe.Customer.modify(
                customer_id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            logger.info(f"Default payment method set for customer {customer_id}")
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Failed to set default payment method: {e}")
            raise
    
    async def list_payment_methods(self, customer_id: str) -> List[Dict[str, Any]]:
        """List all payment methods for a customer."""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type='card'
            )
            return payment_methods.data
        except stripe.error.StripeError as e:
            logger.error(f"Failed to list payment methods: {e}")
            raise
    
    # ========== INVOICES ==========
    
    async def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Get invoice details."""
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            return invoice
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve invoice {invoice_id}: {e}")
            raise
    
    async def list_invoices(
        self,
        customer_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """List invoices for a customer."""
        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit
            )
            return invoices.data
        except stripe.error.StripeError as e:
            logger.error(f"Failed to list invoices: {e}")
            raise
    
    async def pay_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Manually pay an invoice."""
        try:
            invoice = stripe.Invoice.pay(invoice_id)
            logger.info(f"Invoice {invoice_id} paid")
            return invoice
        except stripe.error.StripeError as e:
            logger.error(f"Failed to pay invoice {invoice_id}: {e}")
            raise
    
    # ========== CHECKOUT ==========
    
    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session.
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            success_url: URL to redirect after success
            cancel_url: URL to redirect on cancel
            trial_days: Number of trial days
            metadata: Additional metadata
            
        Returns:
            Checkout session object
        """
        try:
            session_data = {
                'customer': customer_id,
                'mode': 'subscription',
                'line_items': [{
                    'price': price_id,
                    'quantity': 1
                }],
                'success_url': success_url,
                'cancel_url': cancel_url,
                'metadata': metadata or {}
            }
            
            if trial_days:
                session_data['subscription_data'] = {
                    'trial_period_days': trial_days
                }
            
            session = stripe.checkout.Session.create(**session_data)
            
            logger.info(f"Checkout session created: {session.id} for customer {customer_id}")
            return session
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise
    
    async def get_checkout_session(self, session_id: str) -> Dict[str, Any]:
        """Get checkout session details."""
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return session
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve checkout session {session_id}: {e}")
            raise
    
    # ========== PRODUCTS & PRICES ==========
    
    async def create_product(
        self,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe product."""
        try:
            product = stripe.Product.create(
                name=name,
                description=description,
                metadata=metadata or {}
            )
            logger.info(f"Stripe product created: {product.id}")
            return product
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create product: {e}")
            raise
    
    async def create_price(
        self,
        product_id: str,
        amount: int,  # Amount in cents
        currency: str = 'usd',
        interval: str = 'month',  # month or year
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe price."""
        try:
            price = stripe.Price.create(
                product=product_id,
                unit_amount=amount,
                currency=currency,
                recurring={'interval': interval},
                metadata=metadata or {}
            )
            logger.info(f"Stripe price created: {price.id}")
            return price
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create price: {e}")
            raise
    
    # ========== REFUNDS ==========
    
    async def create_refund(
        self,
        payment_intent_id: str,
        amount: Optional[int] = None,  # Amount in cents (None = full refund)
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a refund for a payment."""
        try:
            refund_data = {'payment_intent': payment_intent_id}
            
            if amount:
                refund_data['amount'] = amount
            if reason:
                refund_data['reason'] = reason
            
            refund = stripe.Refund.create(**refund_data)
            logger.info(f"Refund created: {refund.id} for payment {payment_intent_id}")
            return refund
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create refund: {e}")
            raise
    
    # ========== WEBHOOKS ==========
    
    def construct_webhook_event(
        self,
        payload: bytes,
        signature: str,
        webhook_secret: str
    ) -> Dict[str, Any]:
        """
        Verify and construct webhook event from Stripe.
        
        Args:
            payload: Raw request body
            signature: Stripe signature header
            webhook_secret: Webhook secret from Stripe
            
        Returns:
            Verified event object
            
        Raises:
            ValueError: If signature verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                webhook_secret
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            raise
