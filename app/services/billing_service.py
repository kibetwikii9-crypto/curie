"""Billing service - orchestrates subscription management."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Business, Subscription, Plan, BillingEvent, User
from app.services.stripe_service import StripeService
from app.services.usage_service import UsageService
from app.config import settings

logger = logging.getLogger(__name__)


class BillingService:
    """Service for subscription and billing management."""
    
    def __init__(self):
        """Initialize with Stripe service."""
        self.stripe = StripeService()
    
    async def subscribe_to_plan(
        self,
        db: Session,
        business_id: int,
        plan_id: int,
        billing_cycle: str = 'monthly',
        payment_method_id: Optional[str] = None,
        trial_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Subscribe a business to a plan.
        
        Args:
            db: Database session
            business_id: Business ID
            plan_id: Plan ID
            billing_cycle: 'monthly' or 'annual'
            payment_method_id: Stripe payment method ID (optional for trial)
            trial_days: Number of trial days (optional)
            
        Returns:
            Subscription details with client_secret for payment confirmation
        """
        try:
            # Get business and plan
            business = db.query(Business).filter(Business.id == business_id).first()
            plan = db.query(Plan).filter(Plan.id == plan_id).first()
            
            if not business:
                raise ValueError(f"Business {business_id} not found")
            if not plan:
                raise ValueError(f"Plan {plan_id} not found")
            
            # Get or create Stripe customer
            if not business.stripe_customer_id:
                customer = await self.stripe.create_customer(
                    email=business.owner.email if hasattr(business, 'owner') else f"business-{business_id}@example.com",
                    name=business.name,
                    metadata={'business_id': str(business_id)}
                )
                business.stripe_customer_id = customer.id
                db.commit()
            
            # Attach payment method if provided
            if payment_method_id:
                await self.stripe.attach_payment_method(
                    payment_method_id,
                    business.stripe_customer_id
                )
                await self.stripe.set_default_payment_method(
                    business.stripe_customer_id,
                    payment_method_id
                )
            
            # Get Stripe price ID based on billing cycle
            stripe_price_id = (
                plan.stripe_price_id_annual if billing_cycle == 'annual'
                else plan.stripe_price_id_monthly
            )
            
            # Use trial days from settings if not specified
            if trial_days is None:
                trial_days = settings.trial_days
            
            # Create Stripe subscription
            stripe_subscription = await self.stripe.create_subscription(
                customer_id=business.stripe_customer_id,
                price_id=stripe_price_id,
                trial_days=trial_days,
                metadata={
                    'business_id': str(business_id),
                    'plan_id': str(plan_id)
                }
            )
            
            # Calculate amount based on billing cycle
            amount = plan.price_annual if billing_cycle == 'annual' else plan.price_monthly
            
            # Create local subscription record
            subscription = Subscription(
                business_id=business_id,
                plan_id=plan_id,
                stripe_subscription_id=stripe_subscription.id,
                stripe_customer_id=business.stripe_customer_id,
                status=stripe_subscription.status,
                billing_cycle=billing_cycle,
                current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
                trial_start=datetime.fromtimestamp(stripe_subscription.trial_start) if stripe_subscription.trial_start else None,
                trial_end=datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None,
                amount=amount,
                currency=plan.currency
            )
            
            db.add(subscription)
            
            # Log billing event
            event = BillingEvent(
                business_id=business_id,
                event_type='subscription_created',
                description=f'Subscribed to {plan.display_name} ({billing_cycle})',
                metadata=None
            )
            db.add(event)
            
            db.commit()
            db.refresh(subscription)
            
            logger.info(f"Business {business_id} subscribed to plan {plan_id}")
            
            # Return subscription details with client_secret if payment required
            result = {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'trial_end': subscription.trial_end.isoformat() if subscription.trial_end else None,
                'current_period_end': subscription.current_period_end.isoformat()
            }
            
            # Add client_secret if payment intent exists
            if hasattr(stripe_subscription, 'latest_invoice'):
                invoice = stripe_subscription.latest_invoice
                if hasattr(invoice, 'payment_intent') and invoice.payment_intent:
                    result['client_secret'] = invoice.payment_intent.client_secret
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to subscribe to plan: {e}")
            db.rollback()
            raise
    
    async def upgrade_subscription(
        self,
        db: Session,
        subscription_id: int,
        new_plan_id: int
    ) -> Dict[str, Any]:
        """
        Upgrade subscription to a higher plan.
        
        Args:
            db: Database session
            subscription_id: Current subscription ID
            new_plan_id: New plan ID
            
        Returns:
            Updated subscription details
        """
        try:
            subscription = db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()
            
            if not subscription:
                raise ValueError(f"Subscription {subscription_id} not found")
            
            new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
            if not new_plan:
                raise ValueError(f"Plan {new_plan_id} not found")
            
            # Get new price ID
            stripe_price_id = (
                new_plan.stripe_price_id_annual if subscription.billing_cycle == 'annual'
                else new_plan.stripe_price_id_monthly
            )
            
            # Update Stripe subscription with proration
            stripe_subscription = await self.stripe.update_subscription(
                subscription.stripe_subscription_id,
                price_id=stripe_price_id,
                proration_behavior='create_prorations'
            )
            
            # Update local subscription
            old_plan_name = subscription.plan.display_name
            subscription.plan_id = new_plan_id
            subscription.amount = (
                new_plan.price_annual if subscription.billing_cycle == 'annual'
                else new_plan.price_monthly
            )
            subscription.updated_at = datetime.utcnow()
            
            # Log event
            event = BillingEvent(
                business_id=subscription.business_id,
                event_type='subscription_upgraded',
                description=f'Upgraded from {old_plan_name} to {new_plan.display_name}',
                metadata=None
            )
            db.add(event)
            
            db.commit()
            
            logger.info(f"Subscription {subscription_id} upgraded to plan {new_plan_id}")
            
            return {
                'subscription_id': subscription.id,
                'plan': new_plan.display_name,
                'amount': subscription.amount,
                'updated_at': subscription.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to upgrade subscription: {e}")
            db.rollback()
            raise
    
    async def downgrade_subscription(
        self,
        db: Session,
        subscription_id: int,
        new_plan_id: int
    ) -> Dict[str, Any]:
        """
        Downgrade subscription to a lower plan (applied at period end).
        
        Args:
            db: Database session
            subscription_id: Current subscription ID
            new_plan_id: New plan ID
            
        Returns:
            Updated subscription details
        """
        try:
            subscription = db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()
            
            if not subscription:
                raise ValueError(f"Subscription {subscription_id} not found")
            
            new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
            if not new_plan:
                raise ValueError(f"Plan {new_plan_id} not found")
            
            # Get new price ID
            stripe_price_id = (
                new_plan.stripe_price_id_annual if subscription.billing_cycle == 'annual'
                else new_plan.stripe_price_id_monthly
            )
            
            # Update Stripe subscription (no proration for downgrades)
            stripe_subscription = await self.stripe.update_subscription(
                subscription.stripe_subscription_id,
                price_id=stripe_price_id,
                proration_behavior='none'
            )
            
            # Note: Plan change will take effect at period end
            # For now, just log the event
            old_plan_name = subscription.plan.display_name
            event = BillingEvent(
                business_id=subscription.business_id,
                event_type='subscription_downgraded',
                description=f'Scheduled downgrade from {old_plan_name} to {new_plan.display_name} at period end',
                metadata=None
            )
            db.add(event)
            db.commit()
            
            logger.info(f"Subscription {subscription_id} scheduled for downgrade to plan {new_plan_id}")
            
            return {
                'subscription_id': subscription.id,
                'current_plan': subscription.plan.display_name,
                'scheduled_plan': new_plan.display_name,
                'effective_date': subscription.current_period_end.isoformat(),
                'message': 'Downgrade will take effect at the end of current billing period'
            }
            
        except Exception as e:
            logger.error(f"Failed to downgrade subscription: {e}")
            db.rollback()
            raise
    
    async def cancel_subscription(
        self,
        db: Session,
        subscription_id: int,
        at_period_end: bool = True,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cancel a subscription.
        
        Args:
            db: Database session
            subscription_id: Subscription ID
            at_period_end: Cancel at period end or immediately
            reason: Cancellation reason (optional)
            
        Returns:
            Cancellation details
        """
        try:
            subscription = db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()
            
            if not subscription:
                raise ValueError(f"Subscription {subscription_id} not found")
            
            # Cancel in Stripe
            stripe_subscription = await self.stripe.cancel_subscription(
                subscription.stripe_subscription_id,
                at_period_end=at_period_end
            )
            
            # Update local subscription
            subscription.cancel_at_period_end = at_period_end
            subscription.canceled_at = datetime.utcnow()
            subscription.cancellation_reason = reason
            
            if not at_period_end:
                subscription.status = 'canceled'
                subscription.ended_at = datetime.utcnow()
            
            # Log event
            event = BillingEvent(
                business_id=subscription.business_id,
                event_type='subscription_canceled',
                description=f'Subscription canceled {"at period end" if at_period_end else "immediately"}',
                metadata=None
            )
            db.add(event)
            
            db.commit()
            
            logger.info(f"Subscription {subscription_id} canceled")
            
            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'canceled_at': subscription.canceled_at.isoformat(),
                'ends_at': subscription.current_period_end.isoformat() if at_period_end else subscription.ended_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to cancel subscription: {e}")
            db.rollback()
            raise
    
    async def resume_subscription(
        self,
        db: Session,
        subscription_id: int
    ) -> Dict[str, Any]:
        """
        Resume a subscription scheduled for cancellation.
        
        Args:
            db: Database session
            subscription_id: Subscription ID
            
        Returns:
            Updated subscription details
        """
        try:
            subscription = db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()
            
            if not subscription:
                raise ValueError(f"Subscription {subscription_id} not found")
            
            if not subscription.cancel_at_period_end:
                raise ValueError("Subscription is not scheduled for cancellation")
            
            # Resume in Stripe
            await self.stripe.resume_subscription(subscription.stripe_subscription_id)
            
            # Update local subscription
            subscription.cancel_at_period_end = False
            subscription.canceled_at = None
            subscription.cancellation_reason = None
            
            # Log event
            event = BillingEvent(
                business_id=subscription.business_id,
                event_type='subscription_resumed',
                description='Subscription cancellation reversed',
                metadata=None
            )
            db.add(event)
            
            db.commit()
            
            logger.info(f"Subscription {subscription_id} resumed")
            
            return {
                'subscription_id': subscription.id,
                'status': 'active',
                'message': 'Subscription will continue at period end'
            }
            
        except Exception as e:
            logger.error(f"Failed to resume subscription: {e}")
            db.rollback()
            raise
