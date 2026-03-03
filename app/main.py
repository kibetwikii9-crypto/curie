from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

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

init_logging(settings.log_level)

app = FastAPI(title="Curie - Multi-Platform Messaging API", version="0.1.0")

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
    cors_origins.append(frontend_url_env)

# Also add from settings if set
if hasattr(settings, "frontend_url") and settings.frontend_url:
    cors_origins.append(settings.frontend_url)

# For production, allow common Render frontend URLs
# Add your specific frontend URL here or via FRONTEND_URL env var
cors_origins.append("https://curie-frontend-8hvz.onrender.com")
cors_origins.append("https://automify-ai-frontend.onrender.com")
cors_origins.append("https://www.automifyyai.com")
cors_origins.append("https://automifyyai.com")

# Log CORS origins for debugging
log.info(f"🌐 CORS configured for origins: {cors_origins}")

# Add a middleware to log requests and CORS headers (for debugging)
@app.middleware("http")
async def log_cors_headers(request, call_next):
    origin = request.headers.get("origin")
    if origin:
        log.info(f"📨 Request from origin: {origin} to {request.url.path}")
    
    response = await call_next(request)
    
    # Log CORS headers in response
    cors_header = response.headers.get("access-control-allow-origin")
    if origin and not cors_header:
        log.warning(f"⚠️  Missing CORS header for origin {origin} on {request.url.path}")
    elif cors_header:
        log.info(f"✅ CORS header set: {cors_header} for {request.url.path}")
    
    return response

# Add CORS middleware - MUST BE FIRST
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add exception handlers to ensure CORS headers on all error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
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


