#!/usr/bin/env python3
"""
Direct Ads System Migration
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def run_migration():
    """Run the ads system migration"""

    migration_file = Path(__file__).parent / "migrations" / "002_add_ads_system.sql"

    if not migration_file.exists():
        log.error(f"Migration file not found: {migration_file}")
        return False

    log.info("Reading migration SQL...")
    with open(migration_file, 'r') as f:
        sql = f.read()

    try:
        log.info("Executing migration...")
        with engine.connect() as conn:
            # Split SQL into individual statements
            statements = []
            current_statement = []
            
            for line in sql.split('\n'):
                line = line.strip()
                if line.startswith('--') or not line:
                    continue
                current_statement.append(line)
                if line.endswith(';'):
                    statements.append(' '.join(current_statement))
                    current_statement = []
            
            # Execute each statement
            for i, statement in enumerate(statements, 1):
                if statement.strip():
                    log.info(f"Executing statement {i}/{len(statements)}")
                    conn.execute(text(statement))
            
            conn.commit()

        log.info("✅ Migration completed successfully!")
        return True

    except Exception as e:
        log.error(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("ADS SYSTEM MIGRATION")
    print("=" * 30)

    success = run_migration()

    if not success:
        sys.exit(1)

    print("✅ Done!")