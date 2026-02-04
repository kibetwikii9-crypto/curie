"""Stripe webhook handlers."""
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Subscription, Invoice, Payment, PaymentMethod, BillingEvent, Business
from app.services.stripe_service import StripeService
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.
    
    Stripe sends webhook events for subscription updates, payments, etc.
    We verify the signature and process the event.
    """
    db = SessionLocal()
    
    try:
        # Get raw body and signature
        payload = await request.body()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing stripe-signature header"
            )
        
        # Verify webhook signature
        stripe_service = StripeService()
        
        try:
            event = stripe_service.construct_webhook_event(
                payload=payload,
                signature=signature,
                webhook_secret=settings.stripe_webhook_secret
            )
        except ValueError as e:
            log.error(f"Invalid webhook signature: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        
        # Handle different event types
        event_type = event['type']
        data = event['data']['object']
        
        log.info(f"Received Stripe webhook: {event_type}")
        
        # ========== SUBSCRIPTION EVENTS ==========
        
        if event_type == 'customer.subscription.created':
            await handle_subscription_created(db, data)
            
        elif event_type == 'customer.subscription.updated':
            await handle_subscription_updated(db, data)
            
        elif event_type == 'customer.subscription.deleted':
            await handle_subscription_deleted(db, data)
            
        elif event_type == 'customer.subscription.trial_will_end':
            await handle_trial_will_end(db, data)
        
        # ========== PAYMENT INTENT EVENTS ==========
        
        elif event_type == 'payment_intent.succeeded':
            await handle_payment_succeeded(db, data)
            
        elif event_type == 'payment_intent.payment_failed':
            await handle_payment_failed(db, data)
        
        # ========== INVOICE EVENTS ==========
        
        elif event_type == 'invoice.paid':
            await handle_invoice_paid(db, data)
            
        elif event_type == 'invoice.payment_failed':
            await handle_invoice_payment_failed(db, data)
            
        elif event_type == 'invoice.upcoming':
            await handle_invoice_upcoming(db, data)
        
        # ========== PAYMENT METHOD EVENTS ==========
        
        elif event_type == 'payment_method.attached':
            await handle_payment_method_attached(db, data)
            
        elif event_type == 'payment_method.detached':
            await handle_payment_method_detached(db, data)
        
        # ========== CHECKOUT EVENTS ==========
        
        elif event_type == 'checkout.session.completed':
            await handle_checkout_completed(db, data)
        
        else:
            log.info(f"Unhandled webhook event: {event_type}")
        
        db.commit()
        
        return {"success": True, "event_type": event_type}
        
    except Exception as e:
        log.error(f"Webhook processing error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )
    finally:
        db.close()


# ========== WEBHOOK EVENT HANDLERS ==========

async def handle_subscription_created(db: Session, data: dict):
    """Handle subscription.created event."""
    subscription_id = data['id']
    customer_id = data['customer']
    status_value = data['status']
    
    # Find subscription by Stripe ID
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if subscription:
        subscription.status = status_value
        subscription.current_period_start = datetime.fromtimestamp(data['current_period_start'])
        subscription.current_period_end = datetime.fromtimestamp(data['current_period_end'])
        
        log.info(f"Updated subscription {subscription.id} from webhook")


async def handle_subscription_updated(db: Session, data: dict):
    """Handle subscription.updated event."""
    subscription_id = data['id']
    status_value = data['status']
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if subscription:
        subscription.status = status_value
        subscription.current_period_start = datetime.fromtimestamp(data['current_period_start'])
        subscription.current_period_end = datetime.fromtimestamp(data['current_period_end'])
        subscription.updated_at = datetime.utcnow()
        
        # Update business payment status
        business = subscription.business
        if business:
            if status_value in ['active', 'trialing']:
                business.payment_status = 'active'
            elif status_value == 'past_due':
                business.payment_status = 'past_due'
            elif status_value in ['canceled', 'unpaid']:
                business.payment_status = 'suspended'
        
        log.info(f"Subscription {subscription.id} updated: status={status_value}")


async def handle_subscription_deleted(db: Session, data: dict):
    """Handle subscription.deleted event."""
    subscription_id = data['id']
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if subscription:
        subscription.status = 'canceled'
        subscription.ended_at = datetime.utcnow()
        
        # Update business
        business = subscription.business
        if business:
            business.payment_status = 'suspended'
        
        # Log event
        event = BillingEvent(
            business_id=subscription.business_id,
            event_type='subscription_ended',
            description='Subscription ended',
            metadata=None
        )
        db.add(event)
        
        log.info(f"Subscription {subscription.id} deleted")


async def handle_trial_will_end(db: Session, data: dict):
    """Handle subscription.trial_will_end event."""
    subscription_id = data['id']
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if subscription:
        # Log event
        event = BillingEvent(
            business_id=subscription.business_id,
            event_type='trial_ending',
            description='Trial ending in 3 days',
            metadata=None
        )
        db.add(event)
        
        log.info(f"Trial ending soon for subscription {subscription.id}")
        # TODO: Send email notification


async def handle_payment_succeeded(db: Session, data: dict):
    """Handle payment_intent.succeeded event."""
    payment_intent_id = data['id']
    amount = data['amount'] / 100  # Convert from cents
    currency = data['currency'].upper()
    
    # Find or create payment record
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == payment_intent_id
    ).first()
    
    if payment:
        payment.status = 'succeeded'
        payment.updated_at = datetime.utcnow()
    else:
        # Create new payment record
        customer_id = data.get('customer')
        if customer_id:
            business = db.query(Business).filter(
                Business.stripe_customer_id == customer_id
            ).first()
            
            if business:
                payment = Payment(
                    business_id=business.id,
                    stripe_payment_intent_id=payment_intent_id,
                    amount=amount,
                    currency=currency,
                    status='succeeded',
                    payment_method_type='card'
                )
                db.add(payment)
    
    log.info(f"Payment succeeded: {payment_intent_id}, amount: {amount} {currency}")


async def handle_payment_failed(db: Session, data: dict):
    """Handle payment_intent.payment_failed event."""
    payment_intent_id = data['id']
    failure_message = data.get('last_payment_error', {}).get('message', 'Unknown error')
    
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == payment_intent_id
    ).first()
    
    if payment:
        payment.status = 'failed'
        payment.failure_reason = failure_message
        payment.updated_at = datetime.utcnow()
        
        # Log event
        event = BillingEvent(
            business_id=payment.business_id,
            event_type='payment_failed',
            description=f'Payment failed: {failure_message}',
            metadata=None
        )
        db.add(event)
    
    log.warning(f"Payment failed: {payment_intent_id}, reason: {failure_message}")
    # TODO: Send email notification


async def handle_invoice_paid(db: Session, data: dict):
    """Handle invoice.paid event."""
    invoice_id = data['id']
    
    invoice = db.query(Invoice).filter(
        Invoice.stripe_invoice_id == invoice_id
    ).first()
    
    if invoice:
        invoice.status = 'paid'
        invoice.paid_at = datetime.utcnow()
        
        log.info(f"Invoice {invoice.invoice_number} marked as paid")


async def handle_invoice_payment_failed(db: Session, data: dict):
    """Handle invoice.payment_failed event."""
    invoice_id = data['id']
    
    invoice = db.query(Invoice).filter(
        Invoice.stripe_invoice_id == invoice_id
    ).first()
    
    if invoice:
        invoice.status = 'uncollectible'
        
        # Log event
        event = BillingEvent(
            business_id=invoice.business_id,
            event_type='invoice_payment_failed',
            description=f'Invoice {invoice.invoice_number} payment failed',
            metadata=None
        )
        db.add(event)
        
        log.warning(f"Invoice {invoice.invoice_number} payment failed")


async def handle_invoice_upcoming(db: Session, data: dict):
    """Handle invoice.upcoming event."""
    customer_id = data.get('customer')
    amount_due = data.get('amount_due', 0) / 100
    
    business = db.query(Business).filter(
        Business.stripe_customer_id == customer_id
    ).first()
    
    if business:
        # Log event
        event = BillingEvent(
            business_id=business.id,
            event_type='invoice_upcoming',
            description=f'Upcoming invoice: ${amount_due}',
            metadata=None
        )
        db.add(event)
        
        log.info(f"Upcoming invoice for business {business.id}: ${amount_due}")
        # TODO: Send email notification


async def handle_payment_method_attached(db: Session, data: dict):
    """Handle payment_method.attached event."""
    payment_method_id = data['id']
    customer_id = data.get('customer')
    
    if not customer_id:
        return
    
    business = db.query(Business).filter(
        Business.stripe_customer_id == customer_id
    ).first()
    
    if business:
        # Check if payment method already exists
        existing = db.query(PaymentMethod).filter(
            PaymentMethod.stripe_payment_method_id == payment_method_id
        ).first()
        
        if not existing and data.get('type') == 'card':
            card = data.get('card', {})
            payment_method = PaymentMethod(
                business_id=business.id,
                stripe_payment_method_id=payment_method_id,
                type='card',
                card_brand=card.get('brand'),
                card_last4=card.get('last4'),
                card_exp_month=card.get('exp_month'),
                card_exp_year=card.get('exp_year'),
                is_default=False,
                is_active=True
            )
            db.add(payment_method)
            
            log.info(f"Payment method attached for business {business.id}")


async def handle_payment_method_detached(db: Session, data: dict):
    """Handle payment_method.detached event."""
    payment_method_id = data['id']
    
    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.stripe_payment_method_id == payment_method_id
    ).first()
    
    if payment_method:
        payment_method.is_active = False
        log.info(f"Payment method {payment_method.id} detached")


async def handle_checkout_completed(db: Session, data: dict):
    """Handle checkout.session.completed event."""
    session_id = data['id']
    customer_id = data.get('customer')
    subscription_id = data.get('subscription')
    
    log.info(f"Checkout completed: session={session_id}, customer={customer_id}, subscription={subscription_id}")
    # Additional processing if needed
