"""Database configuration and session management using SQLAlchemy.

This module provides:
- SQLAlchemy engine and session factory
- Database base class for models
- Database session dependency for FastAPI

Uses Supabase PostgreSQL as the only database backend.
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from app.config import settings

# Create SQLAlchemy engine for Supabase PostgreSQL
# Connection string format: postgresql://user:pass@host/dbname
# We use psycopg3 (postgresql+psycopg://) for Python 3.13 compatibility

if not settings.database_url:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Please set it to your Supabase PostgreSQL connection string."
    )

# Validate that we're using PostgreSQL (Supabase)
if not settings.database_url.startswith("postgresql://"):
    raise ValueError(
        f"Invalid DATABASE_URL: '{settings.database_url}'. "
        "Only PostgreSQL (Supabase) connection strings are supported. "
        "Format: postgresql://user:password@host:port/database"
    )

# Convert postgresql:// to postgresql+psycopg:// for psycopg3 support
database_url = settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    database_url,
    echo=False,  # Set to True for SQL query logging (useful for debugging)
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=300,  # Recycle connections after 5 minutes
    pool_size=5,  # Limit pool size to reduce connection issues
    max_overflow=10,  # Allow up to 10 overflow connections
    connect_args={
        "prepare_threshold": 0,  # Disable prepared statements to avoid psycopg3 DuplicatePreparedStatement errors
        "connect_timeout": 10,  # Connection timeout in seconds
    },
    # Force IPv4 if DNS resolution fails (Windows sometimes has IPv6 issues)
    poolclass=None,  # Use default connection pool
    # Disable statement caching and prepared statements completely
    execution_options={
        "autocommit": False,
        "compiled_cache": None,  # Disable SQLAlchemy's compiled statement cache
    },
)

# Create session factory
# This is used to create database sessions
SessionLocal = sessionmaker(
    autocommit=False,  # Don't auto-commit (we'll commit explicitly)
    autoflush=False,  # Don't auto-flush (we'll flush explicitly)
    bind=engine,  # Bind to the engine we created
)

# Create base class for models
# All database models will inherit from this Base class
# Example: class User(Base): ...
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI.

    This function provides a database session that:
    - Is automatically created for each request
    - Is automatically closed after the request
    - Can be used as a FastAPI dependency
    - Handles DuplicatePreparedStatement errors gracefully

    Usage in FastAPI routes:
        @router.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()

    Yields:
        Database session (SQLAlchemy Session object)
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        # Handle DuplicatePreparedStatement errors by disposing the entire connection pool
        if "DuplicatePreparedStatement" in str(e) or "prepared statement" in str(e).lower():
            try:
                # Close the current connection
                db.close()
                # Dispose the entire connection pool to force fresh connections
                engine.dispose()
                # Create a new session
                db = SessionLocal()
            except Exception:
                pass
        raise
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Database session context manager for use outside FastAPI.

    This provides a database session that can be used with
    Python's 'with' statement for manual session management.
    Handles DuplicatePreparedStatement errors gracefully.

    Usage:
        with get_db_context() as db:
            user = db.query(User).first()
            db.commit()

    Yields:
        Database session (SQLAlchemy Session object)
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        # Handle DuplicatePreparedStatement errors by invalidating the connection
        if "DuplicatePreparedStatement" in str(e) or "prepared statement" in str(e).lower():
            try:
                db.connection().invalidate()
            except Exception:
                pass
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database by creating all tables.

    This function creates all tables defined in models that inherit from Base.
    Should be called once on application startup or when setting up the database.

    Note: This does NOT handle migrations. For production, use Alembic migrations.
    """
    Base.metadata.create_all(bind=engine)



