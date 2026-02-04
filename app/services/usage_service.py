"""Usage tracking service for billing."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import UsageRecord, Subscription, Plan, Business

logger = logging.getLogger(__name__)


class UsageService:
    """Service for tracking and checking usage limits."""
    
    @staticmethod
    async def track_usage(
        db: Session,
        business_id: int,
        subscription_id: int,
        resource_type: str,
        quantity: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UsageRecord:
        """
        Track usage for a resource.
        
        Args:
            db: Database session
            business_id: Business ID
            subscription_id: Subscription ID
            resource_type: Type of resource (conversation, ai_token, storage, etc.)
            quantity: Quantity used
            metadata: Additional metadata
            
        Returns:
            Created usage record
        """
        try:
            # Get current billing period
            subscription = db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()
            
            if not subscription:
                logger.error(f"Subscription {subscription_id} not found")
                return None
            
            period_start = subscription.current_period_start or datetime.utcnow()
            period_end = subscription.current_period_end or (datetime.utcnow() + timedelta(days=30))
            
            # Create usage record
            import json
            usage_record = UsageRecord(
                business_id=business_id,
                subscription_id=subscription_id,
                resource_type=resource_type,
                quantity=quantity,
                period_start=period_start,
                period_end=period_end,
                metadata=json.dumps(metadata) if metadata else None
            )
            
            db.add(usage_record)
            db.commit()
            db.refresh(usage_record)
            
            logger.info(f"Usage tracked: {resource_type} x{quantity} for business {business_id}")
            return usage_record
            
        except Exception as e:
            logger.error(f"Failed to track usage: {e}")
            db.rollback()
            raise
    
    @staticmethod
    async def get_usage_summary(
        db: Session,
        business_id: int,
        subscription_id: int,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None
    ) -> Dict[str, int]:
        """
        Get usage summary for all resource types.
        
        Args:
            db: Database session
            business_id: Business ID
            subscription_id: Subscription ID
            period_start: Start of period (optional)
            period_end: End of period (optional)
            
        Returns:
            Dictionary with usage counts per resource type
        """
        try:
            # If no period specified, use current billing period
            if not period_start or not period_end:
                subscription = db.query(Subscription).filter(
                    Subscription.id == subscription_id
                ).first()
                
                if subscription:
                    period_start = subscription.current_period_start or datetime.utcnow()
                    period_end = subscription.current_period_end or (datetime.utcnow() + timedelta(days=30))
                else:
                    period_start = datetime.utcnow()
                    period_end = datetime.utcnow() + timedelta(days=30)
            
            # Get usage aggregated by resource type
            usage_query = db.query(
                UsageRecord.resource_type,
                func.sum(UsageRecord.quantity).label('total')
            ).filter(
                UsageRecord.business_id == business_id,
                UsageRecord.subscription_id == subscription_id,
                UsageRecord.period_start >= period_start,
                UsageRecord.period_end <= period_end
            ).group_by(UsageRecord.resource_type).all()
            
            # Convert to dictionary
            usage_summary = {row.resource_type: row.total for row in usage_query}
            
            return usage_summary
            
        except Exception as e:
            logger.error(f"Failed to get usage summary: {e}")
            raise
    
    @staticmethod
    async def check_limit(
        db: Session,
        business_id: int,
        subscription_id: int,
        resource_type: str
    ) -> Dict[str, Any]:
        """
        Check if usage is within limits for a resource.
        
        Args:
            db: Database session
            business_id: Business ID
            subscription_id: Subscription ID
            resource_type: Resource type to check
            
        Returns:
            Dictionary with limit info:
            {
                "limit": 1000,
                "used": 850,
                "remaining": 150,
                "percentage": 85.0,
                "exceeded": False
            }
        """
        try:
            # Get subscription and plan
            subscription = db.query(Subscription).join(Plan).filter(
                Subscription.id == subscription_id
            ).first()
            
            if not subscription or not subscription.plan:
                return {
                    "limit": 0,
                    "used": 0,
                    "remaining": 0,
                    "percentage": 0.0,
                    "exceeded": True
                }
            
            plan = subscription.plan
            
            # Get limit from plan
            limit_map = {
                'conversation': plan.conversation_limit,
                'channel': plan.channel_limit,
                'user': plan.user_limit,
                'storage': plan.storage_limit,
                'ai_token': plan.ai_tokens_limit
            }
            
            limit = limit_map.get(resource_type, 0)
            
            # If limit is None (unlimited), return special response
            if limit is None or limit == 0:
                return {
                    "limit": None,
                    "used": 0,
                    "remaining": None,
                    "percentage": 0.0,
                    "exceeded": False,
                    "unlimited": True
                }
            
            # Get current usage
            usage_summary = await UsageService.get_usage_summary(
                db, business_id, subscription_id
            )
            
            used = usage_summary.get(resource_type, 0)
            remaining = max(0, limit - used)
            percentage = (used / limit * 100) if limit > 0 else 0
            exceeded = used >= limit
            
            return {
                "limit": limit,
                "used": used,
                "remaining": remaining,
                "percentage": round(percentage, 2),
                "exceeded": exceeded,
                "unlimited": False
            }
            
        except Exception as e:
            logger.error(f"Failed to check limit: {e}")
            raise
    
    @staticmethod
    async def can_use_resource(
        db: Session,
        business_id: int,
        subscription_id: int,
        resource_type: str
    ) -> bool:
        """
        Check if resource can be used (within limits).
        
        Args:
            db: Database session
            business_id: Business ID
            subscription_id: Subscription ID
            resource_type: Resource type
            
        Returns:
            True if resource can be used, False if limit exceeded
        """
        try:
            limit_info = await UsageService.check_limit(
                db, business_id, subscription_id, resource_type
            )
            
            # If unlimited, always allow
            if limit_info.get('unlimited', False):
                return True
            
            # Check if exceeded
            return not limit_info.get('exceeded', True)
            
        except Exception as e:
            logger.error(f"Failed to check if resource can be used: {e}")
            # Default to allowing to avoid blocking users on errors
            return True
    
    @staticmethod
    async def get_overage(
        db: Session,
        business_id: int,
        subscription_id: int,
        resource_type: str
    ) -> int:
        """
        Get overage amount for a resource.
        
        Args:
            db: Database session
            business_id: Business ID
            subscription_id: Subscription ID
            resource_type: Resource type
            
        Returns:
            Overage amount (0 if within limits)
        """
        try:
            limit_info = await UsageService.check_limit(
                db, business_id, subscription_id, resource_type
            )
            
            # If unlimited, no overage
            if limit_info.get('unlimited', False):
                return 0
            
            # Calculate overage
            used = limit_info.get('used', 0)
            limit = limit_info.get('limit', 0)
            
            overage = max(0, used - limit)
            
            return overage
            
        except Exception as e:
            logger.error(f"Failed to get overage: {e}")
            return 0
    
    @staticmethod
    async def calculate_overage_cost(
        db: Session,
        business_id: int,
        subscription_id: int
    ) -> Dict[str, float]:
        """
        Calculate overage costs for all resources.
        
        Args:
            db: Database session
            business_id: Business ID
            subscription_id: Subscription ID
            
        Returns:
            Dictionary with overage costs per resource type
        """
        try:
            # Overage pricing (per unit)
            overage_pricing = {
                'conversation': 0.05,  # $0.05 per conversation
                'ai_token': 0.00002,   # $0.02 per 1K tokens
                'storage': 0.10,       # $5 per 50 MB ($0.10 per MB)
                'channel': 10.00,      # $10 per channel
                'user': 8.00           # $8 per user
            }
            
            overage_costs = {}
            total_cost = 0.0
            
            for resource_type, price_per_unit in overage_pricing.items():
                overage = await UsageService.get_overage(
                    db, business_id, subscription_id, resource_type
                )
                
                cost = overage * price_per_unit
                overage_costs[resource_type] = round(cost, 2)
                total_cost += cost
            
            overage_costs['total'] = round(total_cost, 2)
            
            return overage_costs
            
        except Exception as e:
            logger.error(f"Failed to calculate overage cost: {e}")
            return {'total': 0.0}
