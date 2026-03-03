"""
Security middleware and rate limiting configuration
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.gzip import GZipMiddleware
import time
import logging

log = logging.getLogger(__name__)

# Rate limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://",
    swallow_errors=True,
)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://automifyyai.com https://automify-ai-backend.onrender.com; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response


# DDoS protection middleware
class DDoSProtectionMiddleware(BaseHTTPMiddleware):
    """Basic DDoS protection with request tracking"""
    
    def __init__(self, app, max_requests_per_second: int = 50):
        super().__init__(app)
        self.max_requests_per_second = max_requests_per_second
        self.request_counts = {}
        self.last_cleanup = time.time()
    
    async def dispatch(self, request: Request, call_next):
        # Clean up old entries every 10 seconds
        current_time = time.time()
        if current_time - self.last_cleanup > 10:
            self.cleanup_old_entries(current_time)
            self.last_cleanup = current_time
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Skip checks for health endpoint
        if request.url.path == "/health":
            return await call_next(request)
        
        # Track requests per IP
        current_second = int(current_time)
        key = f"{client_ip}:{current_second}"
        
        if key in self.request_counts:
            self.request_counts[key] += 1
            if self.request_counts[key] > self.max_requests_per_second:
                log.warning(f"🚨 DDoS protection triggered for IP: {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down.",
                        "retry_after": 1
                    }
                )
        else:
            self.request_counts[key] = 1
        
        return await call_next(request)
    
    def cleanup_old_entries(self, current_time: float):
        """Remove entries older than 2 seconds"""
        current_second = int(current_time)
        keys_to_remove = [
            key for key in self.request_counts.keys()
            if int(key.split(':')[1]) < current_second - 2
        ]
        for key in keys_to_remove:
            del self.request_counts[key]


# Request timeout middleware
class TimeoutMiddleware(BaseHTTPMiddleware):
    """Add timeout to requests"""
    
    def __init__(self, app, timeout_seconds: int = 30):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds
    
    async def dispatch(self, request: Request, call_next):
        import asyncio
        
        try:
            return await asyncio.wait_for(
                call_next(request),
                timeout=self.timeout_seconds
            )
        except asyncio.TimeoutError:
            log.error(f"⏱️ Request timeout: {request.url.path}")
            return JSONResponse(
                status_code=504,
                content={"detail": "Request timeout"}
            )


# Rate limit error handler
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom rate limit error response"""
    log.warning(f"⚠️ Rate limit exceeded for {request.client.host}: {request.url.path}")
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "limit": str(exc.detail)
        },
        headers={
            "Retry-After": "60",
            "X-RateLimit-Limit": str(exc.detail),
        }
    )
