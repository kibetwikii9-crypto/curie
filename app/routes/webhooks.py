"""Paystack webhook handlers."""
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Subscription, Invoice, Payment, PaymentMethod, BillingEvent, Business
from app.services.paystack_service import PaystackService
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/paystack")
async def paystack_webhook(request: Request):
    """
    Handle Paystack webhook events.
    
    Paystack sends webhook events for subscription updates, payments, etc.
    We verify the signature and process the event.
    """
    db = SessionLocal()
    
    try:
        # Get raw body and signature
        payload = await request.body()
        signature = request.headers.get('x-paystack-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing x-paystack-signature header"
            )
        
        # Verify webhook signature
        paystack_service = PaystackService()
        
        if not paystack_service.verify_webhook_signature(payload, signature):
            log.error("Invalid webhook signature")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        
        # Parse webhook payload
        import json
        payload_dict = json.loads(payload)
        event = paystack_service.parse_webhook_event(payload_dict)
        
        # Handle different event types
        event_type = event['type']
        data = event['data']
        
        log.info(f"Received Paystack webhook: {event_type}")
        
        # ========== SUBSCRIPTION EVENTS ==========
        
        if event_type == 'subscription.create':
            await handle_subscription_created(db, data)
            
        elif event_type == 'subscription.disable':
            await handle_subscription_disabled(db, data)
            
        elif event_type == 'subscription.enable':
            await handle_subscription_enabled(db, data)
        
        # ========== CHARGE/PAYMENT EVENTS ==========
        
        elif event_type == 'charge.success':
            await handle_charge_success(db, data)
            
        elif event_type == 'charge.failed':
            await handle_charge_failed(db, data)
        
        # ========== INVOICE EVENTS ==========
        
        elif event_type == 'invoice.create':
            await handle_invoice_created(db, data)
            
        elif event_type == 'invoice.update':
            await handle_invoice_updated(db, data)
            
        elif event_type == 'invoice.payment_failed':
            await handle_invoice_payment_failed(db, data)
        
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
    """Handle subscription.create event."""
    subscription_code = data.get('subscription_code')
    customer_code = data.get('customer', {}).get('customer_code')
    status_value = data.get('status')
    
    # Find subscription by customer code
    business = db.query(Business).filter(
        Business.stripe_customer_id == customer_code
    ).first()
    
    if business:
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business.id
        ).first()
        
        if subscription:
            subscription.stripe_subscription_id = subscription_code
            subscription.status = status_value
            log.info(f"Updated subscription {subscription.id} from webhook")


async def handle_subscription_disabled(db: Session, data: dict):
    """Handle subscription.disable event."""
    subscription_code = data.get('subscription_code')
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_code
    ).first()
    
    if subscription:
        subscription.status = 'canceled'
        subscription.ended_at = datetime.utcnow()
        
        # Update business
        business = subscription.business
        if business:
            business.payment_status = 'suspended'
        
        log.info(f"Subscription {subscription.id} disabled")


async def handle_subscription_enabled(db: Session, data: dict):
    """Handle subscription.enable event."""
    subscription_code = data.get('subscription_code')
    status_value = data.get('status')
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_code
    ).first()
    
    if subscription:
        subscription.status = status_value
        subscription.ended_at = None
        subscription.updated_at = datetime.utcnow()
        
        # Update business payment status
        business = subscription.business
        if business:
            business.payment_status = 'active'
        
        log.info(f"Subscription {subscription.id} enabled: status={status_value}")


async def handle_charge_success(db: Session, data: dict):
    """Handle charge.success event."""
    reference = data.get('reference')
    amount = data.get('amount') / 100  # Convert from kobo to main currency
    currency = data.get('currency', 'NGN')
    customer = data.get('customer', {})
    customer_email = customer.get('email')
    authorization = data.get('authorization', {})
    
    # Find or create payment record
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == reference
    ).first()
    
    if payment:
        payment.status = 'succeeded'
        payment.updated_at = datetime.utcnow()
    else:
        # Create new payment record
        if customer_email:
            business = db.query(Business).filter(
                Business.stripe_customer_id == customer.get('customer_code')
            ).first()
            
            if business:
                payment = Payment(
                    business_id=business.id,
                    stripe_payment_intent_id=reference,
                    amount=amount,
                    currency=currency,
                    status='succeeded',
                    payment_method_type='card'
                )
                db.add(payment)
                
                # Save authorization for future charges
                if authorization.get('authorization_code'):
                    # Check if payment method already exists
                    existing_pm = db.query(PaymentMethod).filter(
                        PaymentMethod.stripe_payment_method_id == authorization['authorization_code'],
                        PaymentMethod.business_id == business.id
                    ).first()
                    
                    if not existing_pm:
                        payment_method = PaymentMethod(
                            business_id=business.id,
                            stripe_payment_method_id=authorization['authorization_code'],
                            type='card',
                            card_brand=authorization.get('brand'),
                            card_last4=authorization.get('last4'),
                            card_exp_month=authorization.get('exp_month'),
                            card_exp_year=authorization.get('exp_year'),
                            is_default=False,
                            is_active=True
                        )
                        db.add(payment_method)
    
    log.info(f"Payment succeeded: {reference}, amount: {amount} {currency}")


async def handle_charge_failed(db: Session, data: dict):
    """Handle charge.failed event."""
    reference = data.get('reference')
    failure_message = data.get('gateway_response', 'Unknown error')
    
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == reference
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
    
    log.warning(f"Payment failed: {reference}, reason: {failure_message}")


async def handle_invoice_created(db: Session, data: dict):
    """Handle invoice.create event."""
    # Paystack invoice handling
    log.info("Invoice created event received")


async def handle_invoice_updated(db: Session, data: dict):
    """Handle invoice.update event."""
    # Paystack invoice handling
    log.info("Invoice updated event received")


async def handle_invoice_payment_failed(db: Session, data: dict):
    """Handle invoice.payment_failed event."""
    # Paystack invoice payment failed handling
    log.warning("Invoice payment failed event received")
