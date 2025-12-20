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

app = FastAPI(title="Curie - Multi-Platform Messaging API", version="0.1.0")

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
    cors_origins.append(frontend_url_env)

# Also add from settings if set
if hasattr(settings, "frontend_url") and settings.frontend_url:
    cors_origins.append(settings.frontend_url)

# For production, allow common Render frontend URLs
# Add your specific frontend URL here or via FRONTEND_URL env var
cors_origins.append("https://curie-frontend-8hvz.onrender.com")

# In production, if FRONTEND_URL is not set, allow all origins (less secure but works)
# Remove this in production and set FRONTEND_URL explicitly
if not frontend_url_env and not (hasattr(settings, "frontend_url") and settings.frontend_url):
    # Allow all origins in development (not recommended for production)
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


