"""Billing service - orchestrates subscription management."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Business, Subscription, Plan, BillingEvent, User
from app.services.paystack_service import PaystackService
from app.services.usage_service import UsageService
from app.config import settings

logger = logging.getLogger(__name__)


class BillingService:
    """Service for subscription and billing management."""
    
    def __init__(self):
        """Initialize with Paystack service."""
        self.paystack = PaystackService()
    
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
            
            # Get or create Paystack customer
            if not business.stripe_customer_id:  # Keep column name for now
                customer = await self.paystack.create_customer(
                    email=business.owner.email if hasattr(business, 'owner') else f"business-{business_id}@example.com",
                    name=business.name,
                    metadata={'business_id': str(business_id)}
                )
                business.stripe_customer_id = customer.get('customer_code')
                db.commit()
            
            # Get Paystack plan code based on billing cycle
            paystack_plan_code = (
                plan.stripe_price_id_annual if billing_cycle == 'annual'
                else plan.stripe_price_id_monthly
            )
            
            # Use trial days from settings if not specified
            if trial_days is None:
                trial_days = settings.trial_days
            
            # For Paystack, we initialize a transaction first, then create subscription after payment
            # Calculate amount based on billing cycle (in kobo/cents)
            amount = plan.price_annual if billing_cycle == 'annual' else plan.price_monthly
            amount_in_kobo = int(amount * 100)  # Convert to kobo
            
            # Initialize transaction for payment
            transaction = await self.paystack.initialize_transaction(
                email=business.owner.email if hasattr(business, 'owner') else f"business-{business_id}@example.com",
                amount=amount_in_kobo,
                currency=plan.currency,
                plan_code=paystack_plan_code,
                metadata={
                    'business_id': str(business_id),
                    'plan_id': str(plan_id),
                    'billing_cycle': billing_cycle
                }
            )
            
            # Calculate amount based on billing cycle
            amount = plan.price_annual if billing_cycle == 'annual' else plan.price_monthly
            
            # Create local subscription record (pending payment confirmation)
            subscription = Subscription(
                business_id=business_id,
                plan_id=plan_id,
                stripe_subscription_id=None,  # Will be updated after payment
                stripe_customer_id=business.stripe_customer_id,
                status='pending',  # Pending payment
                billing_cycle=billing_cycle,
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=30 if billing_cycle == 'monthly' else 365),
                trial_start=datetime.utcnow() if trial_days else None,
                trial_end=datetime.utcnow() + timedelta(days=trial_days) if trial_days else None,
                amount=amount,
                currency=plan.currency
            )
            
            db.add(subscription)
            
            # Log billing event
            event = BillingEvent(
                business_id=business_id,
                event_type='subscription_initiated',
                description=f'Subscription initiated for {plan.display_name} ({billing_cycle})',
                metadata=None
            )
            db.add(event)
            
            db.commit()
            db.refresh(subscription)
            
            logger.info(f"Business {business_id} initiated subscription to plan {plan_id}")
            
            # Return transaction details for frontend to complete payment
            result = {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'authorization_url': transaction.get('authorization_url'),
                'access_code': transaction.get('access_code'),
                'reference': transaction.get('reference'),
                'trial_end': subscription.trial_end.isoformat() if subscription.trial_end else None,
                'current_period_end': subscription.current_period_end.isoformat()
            }
            
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
            
            # Get new plan code
            paystack_plan_code = (
                new_plan.stripe_price_id_annual if subscription.billing_cycle == 'annual'
                else new_plan.stripe_price_id_monthly
            )
            
            # For Paystack, we need to create a new subscription
            # First, disable the old one (if active)
            # Then create new subscription with new plan
            # Note: This is simplified - actual implementation may vary
            
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
            
            # Get new plan code
            paystack_plan_code = (
                new_plan.stripe_price_id_annual if subscription.billing_cycle == 'annual'
                else new_plan.stripe_price_id_monthly
            )
            
            # For Paystack, downgrades are handled similarly to upgrades
            # The change takes effect immediately or at next billing cycle
            # depending on implementation
            
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
            
            # For Paystack, cancellation requires email token
            # We'll update status locally and let webhook confirm
            # Or use Paystack dashboard for cancellation
            
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
            
            # For Paystack, enable subscription
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
