#!/usr/bin/env python3
"""
Run specific migration for missing video project columns
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def run_specific_migration():
    """Run the specific migration for missing video project columns"""

    migration_file = "004_add_missing_video_project_columns.sql"
    migration_path = Path(__file__).parent / "database" / "migrations" / migration_file

    if not migration_path.exists():
        log.error(f"Migration file not found: {migration_path}")
        return False

    try:
        log.info("Starting specific migration...")
        log.info(f"Reading migration file: {migration_path}")

        with open(migration_path, "r", encoding="utf-8") as f:
            migration_sql = f.read()

        # Use raw DBAPI cursor so full SQL files (with comments/functions)
        # execute safely without brittle semicolon splitting.
        raw_conn = engine.raw_connection()
        try:
            with raw_conn.cursor() as cursor:
                cursor.execute(migration_sql)
            raw_conn.commit()
        except Exception:
            raw_conn.rollback()
            raise
        finally:
            raw_conn.close()

        log.info("✅ Migration completed successfully!")
        return True

    except Exception as e:
        log.error(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_specific_migration()
    sys.exit(0 if success else 1)