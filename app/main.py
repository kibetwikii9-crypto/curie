from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app = FastAPI(title="Automify - Multi-Platform Messaging API", version="0.1.0")

# Add CORS middleware
# Support both local development and production (Render)
import os

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

def fix_render_url(url: str) -> str:
    """Fix incomplete Render URLs by automatically appending .onrender.com if needed."""
    if not url:
        return url
    
    # Remove protocol to check the hostname
    hostname = url.replace("https://", "").replace("http://", "").split("/")[0]
    
    # If hostname doesn't contain a dot and doesn't end with .onrender.com,
    # it's likely an incomplete Render service name
    if "." not in hostname and not hostname.endswith(".onrender.com"):
        # Reconstruct URL with .onrender.com
        protocol = "https://" if url.startswith("https://") else ("http://" if url.startswith("http://") else "https://")
        fixed_url = f"{protocol}{hostname}.onrender.com"
        print(f"[FIX] Fixed incomplete Render URL: {url} -> {fixed_url}")
        return fixed_url
    
    return url

# Add production frontend URL from environment variable
frontend_url_env = os.getenv("FRONTEND_URL", "").strip()
if frontend_url_env:
    # Don't modify localhost URLs - they're correct as-is
    if "localhost" in frontend_url_env or "127.0.0.1" in frontend_url_env:
        # Localhost URLs are fine as-is, just ensure they're in the list
        if frontend_url_env not in cors_origins:
            cors_origins.append(frontend_url_env)
            print(f"[OK] CORS: Added FRONTEND_URL from env (localhost): {frontend_url_env}")
    else:
        # For production URLs, ensure protocol and fix Render URLs
        if not frontend_url_env.startswith("http://") and not frontend_url_env.startswith("https://"):
            frontend_url_env = f"https://{frontend_url_env}"
        # Fix incomplete Render URLs (missing .onrender.com)
        frontend_url_env = fix_render_url(frontend_url_env)
        if frontend_url_env not in cors_origins:
            cors_origins.append(frontend_url_env)
            print(f"[OK] CORS: Added FRONTEND_URL from env: {frontend_url_env}")

# Also add from settings if set
if settings.frontend_url:
    frontend_url = settings.frontend_url.strip()
    # Don't modify localhost URLs - they're correct as-is
    if "localhost" in frontend_url or "127.0.0.1" in frontend_url:
        if frontend_url not in cors_origins:
            cors_origins.append(frontend_url)
            print(f"[OK] CORS: Added frontend_url from settings (localhost): {frontend_url}")
    else:
        # For production URLs, ensure protocol and fix Render URLs
        if not frontend_url.startswith("http://") and not frontend_url.startswith("https://"):
            frontend_url = f"https://{frontend_url}"
        # Fix incomplete Render URLs
        frontend_url = fix_render_url(frontend_url)
        if frontend_url not in cors_origins:
            cors_origins.append(frontend_url)
            print(f"[OK] CORS: Added frontend_url from settings: {frontend_url}")

# Always add the Render frontend URL if backend is on Render
# This ensures CORS works even if FRONTEND_URL env var is not set
if settings.public_url and "onrender.com" in settings.public_url:
    render_frontend_url = "https://automify-ai-frontend.onrender.com"
    if render_frontend_url not in cors_origins:
        cors_origins.append(render_frontend_url)
        print(f"[OK] CORS: Added Render frontend URL: {render_frontend_url}")

# In production on Render, always allow the frontend service URL
# This is a safety fallback to ensure CORS works
is_production = os.getenv("ENVIRONMENT", "").lower() in ["production", "prod"] or (
    settings.public_url and not settings.public_url.startswith("http://localhost") and "onrender.com" in settings.public_url
)
allow_all_origins = False
if is_production:
    # Safety: If still no valid frontend URL, we'll allow all origins but disable credentials
    if len(cors_origins) <= 2:  # Only localhost origins
        print("[WARN] No production frontend URL detected. Allowing all origins for CORS (credentials disabled).")
        cors_origins = ["*"]
        allow_all_origins = True
elif not frontend_url_env and not settings.frontend_url:
    # Only allow all origins in local development if no URL is set
    cors_origins = ["*"]
    allow_all_origins = True

# Final safety check: If backend is on Render, always ensure frontend URL is included
if settings.public_url and "onrender.com" in settings.public_url:
    render_frontend_url = "https://automify-ai-frontend.onrender.com"
    if render_frontend_url not in cors_origins:
        cors_origins.append(render_frontend_url)
        print(f"[SAFETY] CORS: Ensured Render frontend URL is included: {render_frontend_url}")

print(f"[INFO] CORS origins configured: {cors_origins}")

# Add CORS middleware - MUST be added before routers
# CRITICAL: Cannot use allow_credentials=True with allow_origins=["*"]
# If allowing all origins, we must disable credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not allow_all_origins,  # Disable credentials when allowing all origins
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    # Initialize database (create tables)
    try:
        init_db()
        print("[OK] Database initialized successfully")
    except Exception as e:
        # Ignore DuplicatePreparedStatement errors (non-critical, tables already exist)
        if "DuplicatePreparedStatement" in str(e) or "already exists" in str(e).lower():
            print("[OK] Database tables already exist (skipping initialization)")
        else:
            print(f"[WARN] Database initialization error: {e}")
    
    # Auto-create admin user if it doesn't exist
    try:
        from app.database import get_db_context
        from app.services.auth import create_user, get_user_by_email
        
        admin_email = settings.admin_email
        admin_password = settings.admin_password
        
        # Only auto-create admin if password is provided
        if admin_password:
            with get_db_context() as db:
                existing = get_user_by_email(db, admin_email)
                if not existing:
                    admin_user = create_user(
                        db,
                        email=admin_email,
                        password=admin_password,
                        full_name="Admin User",
                        role="admin"
                    )
                    print(f"[OK] Admin user auto-created: {admin_email}")
                else:
                    print(f"[OK] Admin user already exists: {admin_email}")
        else:
            print(f"[WARN] Admin password not set (ADMIN_PASSWORD env var). Skipping admin auto-creation.")
    except Exception as e:
        # Handle DuplicatePreparedStatement errors gracefully (non-critical)
        if "DuplicatePreparedStatement" in str(e):
            print(f"[WARN] Admin user creation skipped (database connection issue, non-critical)")
        else:
            print(f"[WARN] Admin user creation error: {e}")
        # Don't fail startup if admin creation fails
    
    # Load knowledge base
    if load_knowledge("faq.json"):
        print("[OK] Knowledge base loaded successfully")
    else:
        print("[WARN] Knowledge base not loaded (faq.json not found or invalid)")


