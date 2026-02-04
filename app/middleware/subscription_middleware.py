"""Subscription and feature access middleware."""
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.models import Subscription, Plan, User as UserModel
from app.services.usage_service import UsageService

logger = logging.getLogger(__name__)


class SubscriptionMiddleware:
    """Middleware for checking subscription status and feature access."""
    
    @staticmethod
    async def check_subscription_active(
        db: Session,
        business_id: int
    ) -> bool:
        """
        Check if business has an active subscription.
        
        Args:
            db: Database session
            business_id: Business ID
            
        Returns:
            True if subscription is active, False otherwise
        """
        try:
            subscription = db.query(Subscription).filter(
                Subscription.business_id == business_id
            ).first()
            
            if not subscription:
                return False
            
            # Check if status is active or trialing
            if subscription.status in ['active', 'trialing']:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check subscription status: {e}")
            return False
    
    @staticmethod
    async def check_feature_access(
        db: Session,
        business_id: int,
        feature: str
    ) -> bool:
        """
        Check if business has access to a specific feature.
        
        Args:
            db: Database session
            business_id: Business ID
            feature: Feature name (e.g., 'voice_ai', 'api_access', 'crm')
            
        Returns:
            True if feature is accessible, False otherwise
        """
        try:
            subscription = db.query(Subscription).join(Plan).filter(
                Subscription.business_id == business_id
            ).first()
            
            if not subscription or not subscription.plan:
                return False
            
            plan = subscription.plan
            
            # Parse features JSON
            import json
            try:
                features = json.loads(plan.features) if plan.features else {}
            except:
                features = {}
            
            # Check if feature is enabled
            return features.get(feature, False)
            
        except Exception as e:
            logger.error(f"Failed to check feature access: {e}")
            return False
    
    @staticmethod
    async def require_subscription(
        db: Session,
        business_id: int
    ):
        """
        Require an active subscription (raises exception if not).
        
        Args:
            db: Database session
            business_id: Business ID
            
        Raises:
            HTTPException: If subscription is not active
        """
        is_active = await SubscriptionMiddleware.check_subscription_active(db, business_id)
        
        if not is_active:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Active subscription required. Please upgrade your plan."
            )
    
    @staticmethod
    async def require_feature(
        db: Session,
        business_id: int,
        feature: str,
        feature_display_name: Optional[str] = None
    ):
        """
        Require access to a specific feature (raises exception if not accessible).
        
        Args:
            db: Database session
            business_id: Business ID
            feature: Feature name
            feature_display_name: Human-readable feature name (optional)
            
        Raises:
            HTTPException: If feature is not accessible
        """
        has_access = await SubscriptionMiddleware.check_feature_access(
            db, business_id, feature
        )
        
        if not has_access:
            feature_name = feature_display_name or feature.replace('_', ' ').title()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{feature_name} is not available on your current plan. Please upgrade."
            )
    
    @staticmethod
    async def check_usage_limit(
        db: Session,
        business_id: int,
        resource_type: str,
        resource_display_name: Optional[str] = None
    ):
        """
        Check usage limit for a resource (raises exception if exceeded).
        
        Args:
            db: Database session
            business_id: Business ID
            resource_type: Resource type (conversation, channel, user, etc.)
            resource_display_name: Human-readable resource name (optional)
            
        Raises:
            HTTPException: If usage limit exceeded
        """
        try:
            subscription = db.query(Subscription).filter(
                Subscription.business_id == business_id
            ).first()
            
            if not subscription:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Active subscription required"
                )
            
            usage_service = UsageService()
            can_use = await usage_service.can_use_resource(
                db, business_id, subscription.id, resource_type
            )
            
            if not can_use:
                resource_name = resource_display_name or resource_type.replace('_', ' ').title()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"{resource_name} limit reached. Please upgrade your plan to continue."
                )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to check usage limit: {e}")
            # Allow on errors to avoid blocking users
            pass


# Helper functions for route dependencies

async def require_active_subscription(
    current_user: UserModel,
    db: Session
):
    """Dependency to require active subscription."""
    from app.routes.auth import get_user_business_id
    
    business_id = get_user_business_id(current_user, db)
    if business_id:
        await SubscriptionMiddleware.require_subscription(db, business_id)


async def require_pro_plan(
    current_user: UserModel,
    db: Session
):
    """Dependency to require Pro or Enterprise plan."""
    from app.routes.auth import get_user_business_id
    
    business_id = get_user_business_id(current_user, db)
    if business_id:
        subscription = db.query(Subscription).join(Plan).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription or subscription.plan.name not in ['pro', 'enterprise']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This feature requires Pro or Enterprise plan"
            )
