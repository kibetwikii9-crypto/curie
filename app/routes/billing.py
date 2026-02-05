"""Billing and subscription API routes."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User as UserModel, Plan, Subscription, Addon, Invoice, PaymentMethod
from app.routes.auth import get_current_user, get_user_business_id
from app.services.billing_service import BillingService
from app.services.usage_service import UsageService
from app.services.stripe_service import StripeService

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


# ========== PYDANTIC MODELS ==========

class PlanResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    price_monthly: float
    price_annual: float
    currency: str
    conversation_limit: Optional[int]
    channel_limit: Optional[int]
    user_limit: Optional[int]
    storage_limit: Optional[int]
    ai_tokens_limit: Optional[int]
    features: str
    is_popular: bool


class SubscribeRequest(BaseModel):
    plan_id: int
    billing_cycle: str = 'monthly'  # monthly or annual
    payment_method_id: Optional[str] = None
    trial_days: Optional[int] = None


class UpdateSubscriptionRequest(BaseModel):
    plan_id: int


class CheckoutRequest(BaseModel):
    plan_id: int
    billing_cycle: str = 'monthly'
    success_url: str
    cancel_url: str


# ========== PLANS ==========

@router.get("/plans", response_model=List[PlanResponse])
async def get_plans(
    db: Session = Depends(get_db)
):
    """Get all available subscription plans."""
    try:
        plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.sort_order).all()
        return plans
    except Exception as e:
        log.error(f"Failed to get plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve plans"
        )


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific plan."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return plan


# ========== SUBSCRIPTION ==========

@router.get("/subscription")
async def get_subscription(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription details."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            return {"subscription": None, "message": "No business account"}
        
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            return {"subscription": None, "message": "No active subscription"}
        
        return {
            "subscription": {
                "id": subscription.id,
                "plan": {
                    "id": subscription.plan.id,
                    "name": subscription.plan.display_name,
                    "price": subscription.amount,
                    "currency": subscription.currency,
                    "billing_cycle": subscription.billing_cycle
                },
                "status": subscription.status,
                "current_period_start": subscription.current_period_start.isoformat(),
                "current_period_end": subscription.current_period_end.isoformat(),
                "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "canceled_at": subscription.canceled_at.isoformat() if subscription.canceled_at else None
            }
        }
    except Exception as e:
        log.error(f"Failed to get subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscription: {str(e)}"
        )


@router.post("/subscription/create")
async def create_subscription(
    request: SubscribeRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to a plan."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        billing_service = BillingService()
        result = await billing_service.subscribe_to_plan(
            db=db,
            business_id=business_id,
            plan_id=request.plan_id,
            billing_cycle=request.billing_cycle,
            payment_method_id=request.payment_method_id,
            trial_days=request.trial_days
        )
        
        return {
            "success": True,
            "message": "Subscription created successfully",
            **result
        }
    except Exception as e:
        log.error(f"Failed to create subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subscription: {str(e)}"
        )


@router.post("/subscription/upgrade")
async def upgrade_subscription(
    request: UpdateSubscriptionRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade subscription to a higher plan."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        billing_service = BillingService()
        result = await billing_service.upgrade_subscription(
            db=db,
            subscription_id=subscription.id,
            new_plan_id=request.plan_id
        )
        
        return {
            "success": True,
            "message": "Subscription upgraded successfully",
            **result
        }
    except Exception as e:
        log.error(f"Failed to upgrade subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade subscription: {str(e)}"
        )


@router.post("/subscription/downgrade")
async def downgrade_subscription(
    request: UpdateSubscriptionRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downgrade subscription to a lower plan."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        billing_service = BillingService()
        result = await billing_service.downgrade_subscription(
            db=db,
            subscription_id=subscription.id,
            new_plan_id=request.plan_id
        )
        
        return {
            "success": True,
            "message": "Subscription downgrade scheduled",
            **result
        }
    except Exception as e:
        log.error(f"Failed to downgrade subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to downgrade subscription: {str(e)}"
        )


@router.post("/subscription/cancel")
async def cancel_subscription(
    at_period_end: bool = True,
    reason: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel subscription."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        billing_service = BillingService()
        result = await billing_service.cancel_subscription(
            db=db,
            subscription_id=subscription.id,
            at_period_end=at_period_end,
            reason=reason
        )
        
        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            **result
        }
    except Exception as e:
        log.error(f"Failed to cancel subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.post("/subscription/resume")
async def resume_subscription(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a cancelled subscription."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        billing_service = BillingService()
        result = await billing_service.resume_subscription(
            db=db,
            subscription_id=subscription.id
        )
        
        return {
            "success": True,
            "message": "Subscription resumed successfully",
            **result
        }
    except Exception as e:
        log.error(f"Failed to resume subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume subscription: {str(e)}"
        )


# ========== PAYMENT METHODS ==========

@router.post("/payment-methods/setup")
async def create_setup_intent(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a SetupIntent for adding a new payment method."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(status_code=404, detail="Business not found")
        
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Get or create Stripe customer
        from app.services.stripe_service import StripeService
        stripe_service = StripeService()
        
        if not business.stripe_customer_id:
            customer = stripe_service.create_customer(
                email=current_user.email,
                name=business.name,
                metadata={"business_id": str(business_id)}
            )
            business.stripe_customer_id = customer.id
            db.commit()
        
        # Create SetupIntent
        import stripe
        setup_intent = stripe.SetupIntent.create(
            customer=business.stripe_customer_id,
            payment_method_types=["card"],
        )
        
        return {"client_secret": setup_intent.client_secret}
        
    except Exception as e:
        log.error(f"Error creating setup intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-methods")
async def get_payment_methods(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all saved payment methods."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            return {"payment_methods": []}
        
        payment_methods = db.query(PaymentMethod).filter(
            PaymentMethod.business_id == business_id,
            PaymentMethod.is_active == True
        ).all()
        
        return {
            "payment_methods": [{
                "id": pm.id,
                "type": pm.type,
                "card_brand": pm.card_brand,
                "card_last4": pm.card_last4,
                "card_exp_month": pm.card_exp_month,
                "card_exp_year": pm.card_exp_year,
                "is_default": pm.is_default
            } for pm in payment_methods]
        }
    except Exception as e:
        log.error(f"Failed to get payment methods: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment methods"
        )


@router.post("/payment-methods/{payment_method_id}/default")
async def set_default_payment_method(
    payment_method_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set a payment method as default."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        # Get payment method
        payment_method = db.query(PaymentMethod).filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.business_id == business_id
        ).first()
        
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found"
            )
        
        # Unset all other default payment methods
        db.query(PaymentMethod).filter(
            PaymentMethod.business_id == business_id
        ).update({"is_default": False})
        
        # Set this one as default
        payment_method.is_default = True
        db.commit()
        
        return {
            "success": True,
            "message": "Default payment method updated"
        }
    except Exception as e:
        log.error(f"Failed to set default payment method: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update payment method"
        )


@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a payment method."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        payment_method = db.query(PaymentMethod).filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.business_id == business_id
        ).first()
        
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found"
            )
        
        # Detach from Stripe
        stripe_service = StripeService()
        await stripe_service.detach_payment_method(payment_method.stripe_payment_method_id)
        
        # Delete from database
        db.delete(payment_method)
        db.commit()
        
        return {
            "success": True,
            "message": "Payment method deleted"
        }
    except Exception as e:
        log.error(f"Failed to delete payment method: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete payment method"
        )


# ========== USAGE ==========

@router.get("/usage")
async def get_usage(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current usage statistics."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            return {"usage": {}, "limits": {}}
        
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            return {"usage": {}, "limits": {}, "message": "No active subscription"}
        
        usage_service = UsageService()
        
        # Get usage for each resource type
        resources = ['conversation', 'channel', 'user', 'storage', 'ai_token']
        usage_data = {}
        
        for resource in resources:
            limit_info = await usage_service.check_limit(
                db, business_id, subscription.id, resource
            )
            usage_data[resource] = limit_info
        
        return {
            "usage": usage_data,
            "plan": {
                "name": subscription.plan.display_name,
                "billing_cycle": subscription.billing_cycle
            }
        }
    except Exception as e:
        log.error(f"Failed to get usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage"
        )


# ========== INVOICES ==========

@router.get("/invoices")
async def get_invoices(
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invoice history."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            return {"invoices": []}
        
        invoices = db.query(Invoice).filter(
            Invoice.business_id == business_id
        ).order_by(Invoice.created_at.desc()).limit(limit).all()
        
        return {
            "invoices": [{
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "status": inv.status,
                "total": inv.total,
                "currency": inv.currency,
                "invoice_date": inv.invoice_date.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "pdf_url": inv.pdf_url
            } for inv in invoices]
        }
    except Exception as e:
        log.error(f"Failed to get invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve invoices"
        )


# ========== CHECKOUT ==========

@router.post("/checkout/create-session")
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe Checkout session."""
    try:
        business_id = get_user_business_id(current_user, db)
        if not business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Business account required"
            )
        
        # Get business
        from app.models import Business
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if not business:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business not found"
            )
        
        # Get plan
        plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        # Get or create Stripe customer
        stripe_service = StripeService()
        if not business.stripe_customer_id:
            customer = await stripe_service.create_customer(
                email=current_user.email,
                name=business.name,
                metadata={'business_id': str(business_id)}
            )
            business.stripe_customer_id = customer.id
            db.commit()
        
        # Get price ID
        price_id = (
            plan.stripe_price_id_annual if request.billing_cycle == 'annual'
            else plan.stripe_price_id_monthly
        )
        
        # Create checkout session
        session = await stripe_service.create_checkout_session(
            customer_id=business.stripe_customer_id,
            price_id=price_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            trial_days=14,
            metadata={
                'business_id': str(business_id),
                'plan_id': str(request.plan_id)
            }
        )
        
        return {
            "success": True,
            "session_id": session.id,
            "url": session.url
        }
    except Exception as e:
        log.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


# ========== ADD-ONS ==========

@router.get("/addons")
async def get_addons(
    db: Session = Depends(get_db)
):
    """Get all available add-ons."""
    try:
        addons = db.query(Addon).filter(Addon.is_active == True).order_by(Addon.sort_order).all()
        
        return {
            "addons": [{
                "id": addon.id,
                "name": addon.name,
                "display_name": addon.display_name,
                "description": addon.description,
                "price_monthly": addon.price_monthly,
                "currency": addon.currency,
                "icon": addon.icon,
                "color": addon.color
            } for addon in addons]
        }
    except Exception as e:
        log.error(f"Failed to get addons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve add-ons"
        )
