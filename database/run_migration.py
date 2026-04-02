#!/usr/bin/env python3
"""
Database Migration Runner for Curie Ads System
Run this script to apply all database changes to your database
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import engine, SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def run_migration():
    """Run all pending migration SQL scripts"""
    
    # List of migration files in order
    migration_files = [
        "001_add_billing_system.sql",
        "002_add_ads_system.sql"
    ]
    
    # Get database connection
    db_engine = engine
    
    try:
        log.info("Starting database migration...")
        
        # Execute migrations in a transaction
        with db_engine.begin() as connection:
            for migration_file in migration_files:
                migration_path = Path(__file__).parent / "migrations" / migration_file
                
                if not migration_path.exists():
                    log.error(f"Migration file not found: {migration_path}")
                    return False
                
                log.info(f"Reading migration file: {migration_path}")
                with open(migration_path, 'r') as f:
                    migration_sql = f.read()
                
                # Split SQL into statements and execute each one
                statements = migration_sql.split(';')
                
                for i, statement in enumerate(statements, 1):
                    statement = statement.strip()
                    if not statement or statement.startswith('--'):
                        continue
                    
                    try:
                        log.info(f"Executing statement {i} from {migration_file}")
                        connection.execute(text(statement))
                    except Exception as e:
                        log.error(f"Error executing statement {i} from {migration_file}: {e}")
                        raise
        
        log.info("✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        log.error(f"❌ Migration failed: {str(e)}")
        return False


def verify_migration():
    """Verify that all tables and columns exist"""
    
    log.info("\nVerifying migration...")
    
    db_engine = engine
    checks = [
        # Check new columns in existing tables
        ("SELECT trial_ends_at FROM users LIMIT 1", "users.trial_ends_at"),
        ("SELECT stripe_customer_id FROM businesses LIMIT 1", "businesses.stripe_customer_id"),
        ("SELECT payment_status FROM businesses LIMIT 1", "businesses.payment_status"),
        
        # Check billing tables
        ("SELECT COUNT(*) FROM plans", "plans table"),
        ("SELECT COUNT(*) FROM subscriptions", "subscriptions table"),
        ("SELECT COUNT(*) FROM invoices", "invoices table"),
        ("SELECT COUNT(*) FROM payments", "payments table"),
        ("SELECT COUNT(*) FROM payment_methods", "payment_methods table"),
        ("SELECT COUNT(*) FROM usage_records", "usage_records table"),
        ("SELECT COUNT(*) FROM addons", "addons table"),
        ("SELECT COUNT(*) FROM subscription_addons", "subscription_addons table"),
        
        # Check ads system tables
        ("SELECT COUNT(*) FROM campaigns", "campaigns table"),
        ("SELECT COUNT(*) FROM video_projects", "video_projects table"),
        ("SELECT COUNT(*) FROM ab_tests", "ab_tests table"),
        ("SELECT COUNT(*) FROM campaign_performance", "campaign_performance table"),
        ("SELECT COUNT(*) FROM billing_events", "billing_events table"),
    ]
    
    all_passed = True
    
    with db_engine.connect() as connection:
        for sql, description in checks:
            try:
                connection.execute(text(sql))
                log.info(f"✅ {description} exists")
            except Exception as e:
                log.error(f"❌ {description} - Error: {str(e)[:100]}")
                all_passed = False
    
    if all_passed:
        log.info("\n🎉 All verification checks passed!")
    else:
        log.error("\n⚠️ Some verification checks failed")
    
    return all_passed


if __name__ == "__main__":
    print("\n" + "="*60)
    print("BILLING SYSTEM DATABASE MIGRATION")
    print("="*60 + "\n")
    
    # Run migration
    success = run_migration()
    
    if success:
        # Verify migration
        verify_migration()
        
        print("\n" + "="*60)
        print("MIGRATION COMPLETE!")
        print("="*60)
        print("\n📋 Next steps:")
        print("  1. Restart your FastAPI application")
        print("  2. Test the login endpoint")
        print("  3. Visit /dashboard/billing/plans to see the plans\n")
    else:
        print("\n❌ Migration failed. Please check the logs above.")
        sys.exit(1)
