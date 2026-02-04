from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.logging_config import init_logging
from app.routes import api_router
from app.services.knowledge_service import load_knowledge
from app.database import init_db
from app.middleware.rate_limiter import setup_rate_limiting
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

# Set up rate limiting (MUST be done before adding routes)
setup_rate_limiting(app)

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
    
    url = url.strip()
    
    # Remove protocol to check the hostname
    hostname = url.replace("https://", "").replace("http://", "").split("/")[0]
    
    # Fix for Render's automatic URL shortening in dashboard
    # If hostname doesn't end with .onrender.com but looks like a Render service name
    if not hostname.endswith(".onrender.com"):
        # Check if it's a Render service name (contains "automify" or other patterns)
        if "automify" in hostname or "-" in hostname or hostname.count(".") == 0:
            # Reconstruct URL with .onrender.com
            protocol = "https://" if url.startswith("https://") else ("http://" if url.startswith("http://") else "https://")
            # Remove any trailing parts after the service name
            service_name = hostname.split(".")[0]
            fixed_url = f"{protocol}{service_name}.onrender.com"
            print(f"[FIX] Fixed incomplete Render URL: {url} -> {fixed_url}")
            return fixed_url
    
    return url

# Add production frontend URL from environment variable
frontend_url_env = os.getenv("FRONTEND_URL", "").strip()

# CRITICAL FIX: Render sometimes shortens URLs in environment variables
# If we detect a shortened Render service name, fix it immediately
if frontend_url_env and "automify" in frontend_url_env.lower():
    if not frontend_url_env.endswith(".onrender.com"):
        # Extract service name and rebuild full URL
        service_name = frontend_url_env.replace("https://", "").replace("http://", "").split("/")[0].split(".")[0]
        frontend_url_env = f"https://{service_name}.onrender.com"
        print(f"[FIX] Render shortened URL detected and fixed: https://{service_name}.onrender.com")

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

# ULTIMATE SAFETY NET: If backend URL contains "automify-ai-backend", always add the frontend
if settings.public_url and "automify-ai-backend" in settings.public_url:
    ultimate_frontend = "https://automify-ai-frontend.onrender.com"
    if ultimate_frontend not in cors_origins:
        cors_origins.append(ultimate_frontend)
        print(f"[ULTIMATE-SAFETY] CORS: Force-added automify-ai-frontend.onrender.com")

print(f"[INFO] ============================================")
print(f"[INFO] CORS CONFIGURATION:")
print(f"[INFO] FRONTEND_URL env: {os.getenv('FRONTEND_URL', 'NOT SET')}")
print(f"[INFO] settings.frontend_url: {settings.frontend_url}")
print(f"[INFO] settings.public_url: {settings.public_url}")
print(f"[INFO] Is production: {is_production}")
print(f"[INFO] Allow all origins: {allow_all_origins}")
print(f"[INFO] CORS origins configured: {cors_origins}")
print(f"[INFO] ============================================")

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
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add middleware to ensure CORS headers are always present, even on errors
class CORSHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        
        try:
            response = await call_next(request)
        except Exception as e:
            # If there's an error, create a response with CORS headers
            response = JSONResponse(
                content={"detail": str(e)},
                status_code=500
            )
        
        # Always add CORS headers if origin is allowed
        if origin in cors_origins or "*" in cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin if origin in cors_origins else "*"
            response.headers["Access-Control-Allow-Credentials"] = "true" if not allow_all_origins and origin in cors_origins else "false"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "*"
        
        return response

app.add_middleware(CORSHeaderMiddleware)

# Maintenance Mode Middleware - MUST be added after CORS but before routes
class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    """Block all requests when maintenance mode is enabled."""
    async def dispatch(self, request: Request, call_next):
        # Allow health check endpoint even in maintenance mode
        if request.url.path == "/health":
            return await call_next(request)
        
        # Check if maintenance mode is enabled
        if settings.maintenance_mode:
            # Add CORS headers for maintenance response
            origin = request.headers.get("origin", "")
            headers = {
                "Retry-After": "3600",  # Suggest retry after 1 hour
            }
            
            # Add CORS headers if origin is allowed
            if origin in cors_origins or "*" in cors_origins:
                headers["Access-Control-Allow-Origin"] = origin if origin in cors_origins else "*"
                headers["Access-Control-Allow-Credentials"] = "true" if not allow_all_origins and origin in cors_origins else "false"
                headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                headers["Access-Control-Allow-Headers"] = "*"
            
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Service Unavailable",
                    "message": "The website is currently under maintenance. Please check back later.",
                    "maintenance_mode": True
                },
                headers=headers
            )
        
        return await call_next(request)

app.add_middleware(MaintenanceModeMiddleware)

# Add GZip compression middleware for all responses
# Compresses responses > 500 bytes, reduces bandwidth by 60-80% (PERFORMANCE OPTIMIZATION)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Global exception handler to ensure CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions and ensure CORS headers are present."""
    origin = request.headers.get("origin", "")
    
    # Determine allowed origin
    allowed_origin = None
    if origin in cors_origins:
        allowed_origin = origin
    elif "*" in cors_origins:
        allowed_origin = "*"
    elif origin == "https://automify-ai-frontend.onrender.com":
        allowed_origin = origin
    elif "onrender.com" in str(settings.public_url):
        allowed_origin = "https://automify-ai-frontend.onrender.com"
    
    headers = {}
    if allowed_origin:
        headers = {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Credentials": "true" if allowed_origin != "*" else "false",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    
    return JSONResponse(
        content={"detail": str(exc)},
        status_code=500,
        headers=headers
    )

# Add explicit OPTIONS handler for all routes to ensure CORS preflight works
@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    """Handle OPTIONS preflight requests explicitly."""
    origin = request.headers.get("origin", "")
    
    # Always allow the Render frontend URL
    allowed_origin = None
    if origin in cors_origins:
        allowed_origin = origin
    elif "*" in cors_origins:
        allowed_origin = "*"
    elif origin == "https://automify-ai-frontend.onrender.com":
        allowed_origin = origin
    elif not origin and "onrender.com" in str(settings.public_url):
        # If no origin header but we're on Render, allow the frontend
        allowed_origin = "https://automify-ai-frontend.onrender.com"
    
    if allowed_origin:
        return JSONResponse(
            content={"message": "OK"},
            headers={
                "Access-Control-Allow-Origin": allowed_origin,
                "Access-Control-Allow-Credentials": "true" if allowed_origin != "*" else "false",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "3600",
            }
        )
    
    # Default response
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "https://automify-ai-frontend.onrender.com",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
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
    
    # Note: Admin users must be created manually via the signup flow
    # No default admin accounts for security reasons
    
    # Load knowledge base
    if load_knowledge("faq.json"):
        print("[OK] Knowledge base loaded successfully")
    else:
        print("[WARN] Knowledge base not loaded (faq.json not found or invalid)")


