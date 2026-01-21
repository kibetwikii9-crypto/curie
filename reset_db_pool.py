"""
Reset database connection pool to fix DuplicatePreparedStatement errors.

Run this script if you encounter persistent prepared statement errors.
It will dispose all connections and force the pool to create fresh ones.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

def reset_pool():
    """Reset the database connection pool."""
    print("Resetting database connection pool...")
    try:
        # Dispose all connections in the pool
        engine.dispose()
        print("✅ Connection pool reset successfully!")
        print("All prepared statements have been cleared.")
        print("New connections will be created on next database access.")
    except Exception as e:
        print(f"❌ Error resetting pool: {e}")
        return False
    return True

if __name__ == "__main__":
    reset_pool()
