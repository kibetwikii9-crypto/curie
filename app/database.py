"""Database configuration and session management using SQLAlchemy.

This module provides:
- SQLAlchemy engine and session factory
- Database base class for models
- Database session dependency for FastAPI

Uses SQLite for local development and can be upgraded to PostgreSQL
for production without changing the interface.
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from app.config import settings

# Create SQLAlchemy engine
# SQLite connection string: sqlite:///./curie.db
# PostgreSQL connection string: postgresql://user:pass@host/dbname
# This supports both SQLite (local) and PostgreSQL (production)
# For PostgreSQL, we use psycopg3 (postgresql+psycopg://) instead of psycopg2

connect_args = {}
database_url = settings.database_url

# Convert postgresql:// to postgresql+psycopg:// for psycopg3 support
if database_url.startswith("postgresql://"):
    # Replace postgresql:// with postgresql+psycopg:// to use psycopg3
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif database_url.startswith("sqlite"):
    # SQLite-specific connection args
    connect_args = {"check_same_thread": False}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    echo=False,  # Set to True for SQL query logging (useful for debugging)
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
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Database session context manager for use outside FastAPI.

    This provides a database session that can be used with
    Python's 'with' statement for manual session management.

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
    except Exception:
        db.rollback()
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



