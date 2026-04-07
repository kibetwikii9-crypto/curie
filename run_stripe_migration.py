#!/usr/bin/env python3
"""
Run migration to add stripe_customer_id column to subscriptions table
This fixes the 500 error: "column subscriptions.stripe_customer_id does not exist"
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
from sqlalchemy import text, inspect
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def run_migration():
    """Run the migration to add stripe_customer_id column"""

    try:
        log.info("Starting migration: Add stripe_customer_id column to subscriptions...")
        
        # Check if column already exists
        with engine.connect() as connection:
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('subscriptions')]
            
            if 'stripe_customer_id' in columns:
                log.info("✓ Column 'stripe_customer_id' already exists, skipping...")
                return True
            
            log.info("Column 'stripe_customer_id' not found, creating...")
            
            # Add the column
            try:
                connection.execute(text('ALTER TABLE subscriptions ADD COLUMN stripe_customer_id VARCHAR(255)'))
                connection.commit()
                log.info("✓ Column 'stripe_customer_id' added successfully")
            except Exception as e:
                log.error(f"✗ Error adding column: {e}")
                connection.rollback()
                return False
            
            # Add the index
            try:
                connection.execute(text('CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id)'))
                connection.commit()
                log.info("✓ Index 'idx_subscriptions_stripe_customer_id' created successfully")
            except Exception as e:
                log.warning(f"⚠ Warning: Could not create index: {e}")
                # Don't fail if index already exists
        
        log.info("✅ Migration completed successfully!")
        return True

    except Exception as e:
        log.error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
