#!/usr/bin/env python3
"""
Run Ads System Migration Only
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def run_ads_migration():
    """Run the ads system migration SQL script"""

    # Read migration SQL file
    migration_file = Path(__file__).parent / "migrations" / "002_add_ads_system.sql"

    if not migration_file.exists():
        log.error(f"Migration file not found: {migration_file}")
        return False

    log.info(f"Reading migration file: {migration_file}")
    with open(migration_file, "r", encoding="utf-8") as f:
        migration_sql = f.read()

    # Get database connection
    db_engine = engine

    try:
        log.info("Starting ads system migration...")

        raw_conn = db_engine.raw_connection()
        try:
            log.info("Executing ads system migration SQL...")
            with raw_conn.cursor() as cursor:
                cursor.execute(migration_sql)
            raw_conn.commit()
        except Exception:
            raw_conn.rollback()
            raise
        finally:
            raw_conn.close()

        log.info("✅ Ads system migration completed successfully!")
        return True

    except Exception as e:
        log.error(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("ADS SYSTEM DATABASE MIGRATION")
    print("="*60 + "\n")

    success = run_ads_migration()

    if success:
        print("\n" + "="*60)
        print("ADS MIGRATION COMPLETE!")
        print("="*60)
    else:
        print("\n❌ Migration failed. Please check the logs above.")
        sys.exit(1)