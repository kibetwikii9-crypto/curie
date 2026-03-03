from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.config import settings
from app.logging_config import init_logging
from app.routes import api_router
from app.services.knowledge_service import load_knowledge
from app.database import init_db
from app.models import (
    Conversation,
    User,
    Business,
    ChannelIntegration,
    Message,
    Lead,
    KnowledgeEntry,
    ConversationMemory,
    AnalyticsEvent,
    AdAsset,
)  # Import all models to register with Base
from app.middleware.security import (
    limiter,
    SecurityHeadersMiddleware,
    DDoSProtectionMiddleware,
    TimeoutMiddleware,
    rate_limit_handler,
)
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

init_logging(settings.log_level)

app = FastAPI(
    title="Curie - Multi-Platform Messaging API",
    version="0.1.0",
    docs_url="/docs" if not settings.maintenance_mode else None,
    redoc_url="/redoc" if not settings.maintenance_mode else None,
)

# Attach rate limiter to app
app.state.limiter = limiter

# Add CORS middleware FIRST (must be first to ensure all responses have CORS headers)
# Support both local development and production (Render)
import os
import logging

log = logging.getLogger(__name__)

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production frontend URL from environment variable
frontend_url_env = os.getenv("FRONTEND_URL", "")
if frontend_url_env:
    # Strip trailing slashes to avoid duplicates
    cors_origins.append(frontend_url_env.rstrip('/'))

# Also add from settings if set
if hasattr(settings, "frontend_url") and settings.frontend_url:
    # Strip trailing slashes to avoid duplicates
    cors_origins.append(settings.frontend_url.rstrip('/'))

# For production, allow common Render frontend URLs
# Add your specific frontend URL here or via FRONTEND_URL env var
cors_origins.append("https://curie-frontend-8hvz.onrender.com")
cors_origins.append("https://automify-ai-frontend.onrender.com")
cors_origins.append("https://www.automifyyai.com")
cors_origins.append("https://automifyyai.com")

# Remove any duplicates
cors_origins = list(dict.fromkeys(cors_origins))

# Log CORS origins for debugging
log.info(f"🌐 CORS configured for origins: {cors_origins}")

# ========== SECURITY MIDDLEWARE STACK ==========
# Order matters! Add from most general to most specific

# 1. Trusted Host Protection (prevent host header attacks)
allowed_hosts = [
    "localhost",
    "127.0.0.1",
    "automify-ai-backend.onrender.com",
    "automifyyai.com",
    "www.automifyyai.com",
]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# 2. GZip Compression (reduce bandwidth, improve performance)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 3. DDoS Protection (must be early in chain)
app.add_middleware(DDoSProtectionMiddleware, max_requests_per_second=50)

# 4. Request Timeout Protection
app.add_middleware(TimeoutMiddleware, timeout_seconds=30)

# 5. Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# Add a middleware to log requests and CORS headers (for debugging)
@app.middleware("http")
async def log_cors_headers(request, call_next):
    origin = request.headers.get("origin")
    if origin:
        log.debug(f"📨 Request from origin: {origin} to {request.url.path}")
    
    response = await call_next(request)
    
    # Log CORS headers in response
    cors_header = response.headers.get("access-control-allow-origin")
    if origin and not cors_header:
        log.warning(f"⚠️  Missing CORS header for origin {origin} on {request.url.path}")
    elif cors_header:
        log.debug(f"✅ CORS header set: {cors_header} for {request.url.path}")
    
    return response

# 6. CORS middleware - AFTER security headers but before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 7. Rate Limiting Middleware - LAST before routes
app.add_middleware(SlowAPIMiddleware)

# ========== EXCEPTION HANDLERS ==========

# Rate limit exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Add exception handlers to ensure CORS headers on all error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    origin = request.headers.get("origin", "")
    # Only allow origin if it's in our whitelist
    allowed_origin = origin if origin in cors_origins else ""
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": allowed_origin or origin,
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in cors_origins else ""
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": allowed_origin or origin,
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Add a catch-all exception handler for 500 errors
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in cors_origins else ""
    
    log.error(f"❌ Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": allowed_origin or origin,
            "Access-Control-Allow-Credentials": "true",
        }
    )

app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    # Initialize database (create tables)
    try:
        init_db()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"⚠️  Database initialization error: {e}")
    
    # Auto-create admin user if it doesn't exist
    try:
        from app.database import get_db_context
        from app.services.auth import create_user, get_user_by_email
        
        with get_db_context() as db:
            admin_email = "admin@curie.com"
            existing = get_user_by_email(db, admin_email)
            if not existing:
                admin_user = create_user(
                    db,
                    email=admin_email,
                    password="admin123",
                    full_name="Admin User",
                    role="admin"
                )
                print(f"✅ Admin user auto-created: {admin_email} / admin123")
            else:
                print(f"✅ Admin user already exists: {admin_email}")
    except Exception as e:
        print(f"⚠️  Admin user creation error: {e}")
        # Don't fail startup if admin creation fails
    
    # Load knowledge base
    if load_knowledge("faq.json"):
        print("✅ Knowledge base loaded successfully")
    else:
        print("⚠️  Knowledge base not loaded (faq.json not found or invalid)")


