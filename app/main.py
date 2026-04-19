from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.logging_config import init_logging
from app.routes import api_router
from app.services.knowledge_service import load_knowledge
from app.database import init_db, SessionLocal
from app.services.auth import verify_token
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
    Campaign,
    VideoProject,
    ABTest,
    CampaignPerformance,
    Subscription,
)  # Import all models to register with Base

init_logging(settings.log_level)

app = FastAPI(title="Curie - Multi-Platform Messaging API", version="0.1.0")

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/video-assets", exist_ok=True)
os.makedirs("uploads/brand-assets", exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Add CORS middleware
# Support both local development and production (Render)
import os

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production frontend URL from environment variable
frontend_url_env = os.getenv("FRONTEND_URL", "")
if frontend_url_env:
    cors_origins.append(frontend_url_env.rstrip('/'))

# Also add from settings if set
if hasattr(settings, "frontend_url") and settings.frontend_url:
    cors_origins.append(settings.frontend_url.rstrip('/'))

# Add all known frontend URLs
# (Keep this list aligned with your deployed frontend domains.)
cors_origins.append("https://www.automifyyai.com")
cors_origins.append("https://automifyyai.com")
cors_origins.append("http://76.13.48.35")

# Remove duplicates
cors_origins = list(dict.fromkeys(cors_origins))

# Log CORS configuration for debugging
import logging
log = logging.getLogger(__name__)
log.info(f"🌐 CORS configured for origins: {cors_origins}")

SUBSCRIPTION_BYPASS_EMAILS = {
    email.strip().lower()
    for email in settings.subscription_bypass_emails.split(",")
    if email.strip()
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router)


# ========== GLOBAL EXCEPTION HANDLERS ==========
# Ensure CORS headers are included even on error responses

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


def _is_public_or_billing_path(path: str) -> bool:
    """Allow auth/billing/public paths without subscription lock."""
    public_prefixes = (
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/auth/",
        "/api/billing/",
        "/api/webhooks/",
        "/api/integrations/",
    )
    return any(path.startswith(prefix) for prefix in public_prefixes)


def _json_with_cors(request: Request, status_code: int, content: dict) -> JSONResponse:
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


@app.middleware("http")
async def subscription_access_guard(request: Request, call_next):
    """
    Global access guard:
    - Allow public/auth/billing/webhook endpoints
    - For other API endpoints, require active subscription or valid trial credits
    """
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if not path.startswith("/api/") or _is_public_or_billing_path(path):
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return _json_with_cors(request, 401, {"detail": "Authentication required"})

    token = auth_header.split(" ", 1)[1].strip()
    payload = verify_token(token)
    if not payload:
        return _json_with_cors(request, 401, {"detail": "Invalid authentication credentials"})

    email = payload.get("sub")
    if not email:
        return _json_with_cors(request, 401, {"detail": "Invalid authentication credentials"})

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return _json_with_cors(request, 401, {"detail": "User not found"})

        # Admin users and explicit test accounts are never blocked by subscription access guard.
        user_email = (user.email or "").strip().lower()
        if user.role == "admin" or user_email in SUBSCRIPTION_BYPASS_EMAILS:
            return await call_next(request)

        business_id = user.business_id
        if business_id is None:
            business = db.query(Business).filter(Business.owner_id == user.id).first()
            if business:
                business_id = business.id
                user.business_id = business_id
                db.add(user)
                db.commit()

        # Active/trialing paid subscription unlocks all protected endpoints.
        if business_id is not None:
            subscription = db.query(Subscription).filter(
                Subscription.business_id == business_id
            ).first()
            if subscription and subscription.status in ("active", "trialing"):
                return await call_next(request)

        # No active subscription: allow while trial credits are valid.
        if user.trial_ends_at and user.trial_ends_at >= datetime.utcnow():
            return await call_next(request)

        # Trial credits ended and no active subscription.
        return JSONResponse(
            status_code=402,
            content={
                "detail": "Subscription required. Your free credits have ended. Please subscribe to continue.",
                "code": "SUBSCRIPTION_REQUIRED",
            },
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Credentials": "true",
            },
        )
    finally:
        db.close()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler with CORS headers."""
    log.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )


@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    # Initialize database (create tables)
    try:
        init_db()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"⚠️  Database initialization error: {e}")
    
    # Run database migrations to ensure schema is up to date
    try:
        from database.run_migration import run_migration
        success = run_migration()
        if success:
            print("✅ Database migrations completed successfully")
        else:
            print("⚠️  Database migrations failed - some features may not work")
    except Exception as e:
        print(f"⚠️  Database migration error: {e}")
    
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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level=settings.log_level.lower())


