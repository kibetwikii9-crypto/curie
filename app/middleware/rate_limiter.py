"""Rate limiting middleware for API protection.

This module provides rate limiting to prevent:
- API abuse
- DDoS attacks
- Cost overruns (OpenAI, WhatsApp, etc.)
- Spam/bot traffic

Uses SlowAPI with in-memory storage (production can use Redis).
"""
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, Response
from typing import Callable

log = logging.getLogger(__name__)

# Create limiter instance
# get_remote_address: Uses client IP for rate limiting
# Note: In production with proxy/load balancer, may need to use X-Forwarded-For header
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/hour", "3000/day"],  # Global default
    storage_uri="memory://",  # In-memory storage (switch to Redis in production)
    strategy="fixed-window",  # Can also use "moving-window" for more accuracy
)


def get_limiter():
    """Get the limiter instance for use in route decorators."""
    return limiter


# Rate limit tiers (requests per minute unless specified)
RATE_LIMITS = {
    # Public endpoints (no auth) - Most restrictive
    "public_strict": "10/minute",  # Login, signup
    "public_moderate": "30/minute",  # Health checks, webhooks
    
    # Authenticated endpoints
    "auth_read": "100/minute",  # GET requests (dashboard data)
    "auth_write": "50/minute",  # POST/PUT/DELETE (create/update)
    "auth_upload": "10/minute",  # File uploads (heavy operations)
    
    # AI/LLM endpoints - Cost control
    "ai_generation": "30/minute",  # GPT API calls
    "knowledge_query": "100/minute",  # Knowledge base queries
    
    # Webhook endpoints - External services
    "webhook": "300/minute",  # High throughput for WhatsApp/Telegram
    
    # Admin endpoints
    "admin": "200/minute",  # Admin operations
}


def get_rate_limit(tier: str) -> str:
    """
    Get rate limit string for a specific tier.
    
    Args:
        tier: Rate limit tier name
    
    Returns:
        Rate limit string (e.g., "100/minute")
    """
    return RATE_LIMITS.get(tier, "60/minute")  # Default fallback


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors.
    
    Returns a user-friendly error message with retry information.
    """
    from fastapi.responses import JSONResponse
    
    # Extract retry-after from exception if available
    retry_after = exc.detail.split("Retry after ")[1].split(" ")[0] if "Retry after" in exc.detail else "60"
    
    log.warning(
        f"rate_limit_exceeded "
        f"ip={request.client.host} "
        f"path={request.url.path} "
        f"method={request.method} "
        f"retry_after={retry_after}s"
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down and try again later.",
            "retry_after_seconds": int(retry_after),
            "detail": "Rate limit exceeded. Please wait before making more requests."
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": "Check API documentation for limits",
        }
    )


async def rate_limit_by_user(request: Request) -> str:
    """
    Rate limit key function based on authenticated user.
    
    For authenticated requests, uses user_id instead of IP.
    This prevents users from bypassing limits by changing IPs.
    
    Args:
        request: FastAPI request object
    
    Returns:
        Unique key for rate limiting (IP or user_id)
    """
    try:
        # Try to get user from request state (set by auth middleware)
        if hasattr(request.state, "user") and request.state.user:
            user_id = getattr(request.state.user, "id", None)
            if user_id:
                return f"user:{user_id}"
        
        # Try to get user from JWT token
        from fastapi import Header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Extract user_id from token if needed
            # For now, fall back to IP
            pass
    except Exception as e:
        log.debug(f"Error getting user for rate limiting: {e}")
    
    # Fallback to IP-based rate limiting
    return get_remote_address(request)


def setup_rate_limiting(app):
    """
    Set up rate limiting middleware for FastAPI app.
    
    Call this in main.py after app creation.
    
    Args:
        app: FastAPI application instance
    """
    # Add state for limiter
    app.state.limiter = limiter
    
    # Add exception handler for rate limit errors
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    
    # Add middleware (processes requests before they reach routes)
    app.add_middleware(SlowAPIMiddleware)
    
    log.info("✅ Rate limiting configured successfully")
    log.info(f"   Default limits: {limiter._default_limits}")
    log.info(f"   Storage: {limiter._storage_uri}")


# Example usage in routes:
"""
from app.middleware.rate_limiter import limiter, get_rate_limit

@router.post("/api/auth/login")
@limiter.limit(get_rate_limit("public_strict"))  # 10/minute for login
async def login(request: Request, ...):
    pass

@router.get("/api/dashboard/conversations")
@limiter.limit(get_rate_limit("auth_read"))  # 100/minute for reads
async def get_conversations(request: Request, ...):
    pass

@router.post("/api/dashboard/knowledge/upload/document")
@limiter.limit(get_rate_limit("auth_upload"))  # 10/minute for uploads
async def upload_document(request: Request, ...):
    pass
"""
