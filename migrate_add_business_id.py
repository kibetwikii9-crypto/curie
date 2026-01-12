"""Migration script to add business_id column to users table and other tables.

This script adds the business_id column to:
- users (nullable for admin users)
- conversations (required)
- messages (required)
- conversation_memory (required)

Run this script once after deploying the multi-tenant changes.
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Get database URL from environment
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("❌ Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create engine
engine = create_engine(database_url)
inspector = inspect(engine)

def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    try:
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        return False

def table_exists(table_name: str) -> bool:
    """Check if a table exists."""
    try:
        return table_name in inspector.get_table_names()
    except Exception:
        return False

def run_migration():
    """Run the migration to add business_id columns."""
    print("🔧 Starting database migration...")
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # 1. Add business_id to users table (nullable for admin users)
            if table_exists("users"):
                if not column_exists("users", "business_id"):
                    print("  ✓ Adding business_id to users table...")
                    conn.execute(text("""
                        ALTER TABLE users 
                        ADD COLUMN business_id INTEGER 
                        REFERENCES businesses(id)
                    """))
                    print("    ✅ Added business_id to users")
                else:
                    print("  ⏭️  business_id already exists in users table")
            else:
                print("  ⚠️  users table does not exist, skipping")
            
            # 2. Add business_id to conversations table (required)
            if table_exists("conversations"):
                if not column_exists("conversations", "business_id"):
                    print("  ✓ Adding business_id to conversations table...")
                    # First, check if there are any existing conversations
                    result = conn.execute(text("SELECT COUNT(*) FROM conversations"))
                    count = result.scalar()
                    
                    if count > 0:
                        print(f"    ⚠️  Found {count} existing conversations")
                        print("    ⚠️  Adding business_id as nullable first, then updating...")
                        # Add as nullable first
                        conn.execute(text("""
                            ALTER TABLE conversations 
                            ADD COLUMN business_id INTEGER 
                            REFERENCES businesses(id)
                        """))
                        # For existing conversations, we'll need to assign them to a default business
                        # Get the first business or create one
                        business_result = conn.execute(text("SELECT id FROM businesses LIMIT 1"))
                        first_business = business_result.scalar()
                        
                        if first_business:
                            print(f"    ✓ Assigning existing conversations to business_id {first_business}")
                            conn.execute(text("""
                                UPDATE conversations 
                                SET business_id = :business_id 
                                WHERE business_id IS NULL
                            """), {"business_id": first_business})
                            # Now make it NOT NULL
                            conn.execute(text("""
                                ALTER TABLE conversations 
                                ALTER COLUMN business_id SET NOT NULL
                            """))
                        else:
                            print("    ⚠️  No businesses found. Creating default business...")
                            # Create a default business
                            conn.execute(text("""
                                INSERT INTO businesses (name, owner_id, created_at, updated_at)
                                VALUES ('Default Business', 1, NOW(), NOW())
                                RETURNING id
                            """))
                            business_result = conn.execute(text("SELECT id FROM businesses LIMIT 1"))
                            default_business = business_result.scalar()
                            if default_business:
                                conn.execute(text("""
                                    UPDATE conversations 
                                    SET business_id = :business_id 
                                    WHERE business_id IS NULL
                                """), {"business_id": default_business})
                                conn.execute(text("""
                                    ALTER TABLE conversations 
                                    ALTER COLUMN business_id SET NOT NULL
                                """))
                    else:
                        # No existing conversations, can add as NOT NULL directly
                        conn.execute(text("""
                            ALTER TABLE conversations 
                            ADD COLUMN business_id INTEGER NOT NULL 
                            REFERENCES businesses(id)
                        """))
                    print("    ✅ Added business_id to conversations")
                else:
                    print("  ⏭️  business_id already exists in conversations table")
            else:
                print("  ⚠️  conversations table does not exist, skipping")
            
            # 3. Add business_id to messages table (required)
            if table_exists("messages"):
                if not column_exists("messages", "business_id"):
                    print("  ✓ Adding business_id to messages table...")
                    result = conn.execute(text("SELECT COUNT(*) FROM messages"))
                    count = result.scalar()
                    
                    if count > 0:
                        print(f"    ⚠️  Found {count} existing messages")
                        # Add as nullable first
                        conn.execute(text("""
                            ALTER TABLE messages 
                            ADD COLUMN business_id INTEGER 
                            REFERENCES businesses(id)
                        """))
                        # Get first business
                        business_result = conn.execute(text("SELECT id FROM businesses LIMIT 1"))
                        first_business = business_result.scalar()
                        if first_business:
                            conn.execute(text("""
                                UPDATE messages 
                                SET business_id = :business_id 
                                WHERE business_id IS NULL
                            """), {"business_id": first_business})
                            conn.execute(text("""
                                ALTER TABLE messages 
                                ALTER COLUMN business_id SET NOT NULL
                            """))
                    else:
                        conn.execute(text("""
                            ALTER TABLE messages 
                            ADD COLUMN business_id INTEGER NOT NULL 
                            REFERENCES businesses(id)
                        """))
                    print("    ✅ Added business_id to messages")
                else:
                    print("  ⏭️  business_id already exists in messages table")
            else:
                print("  ⚠️  messages table does not exist, skipping")
            
            # 4. Add business_id to conversation_memory table (required)
            if table_exists("conversation_memory"):
                if not column_exists("conversation_memory", "business_id"):
                    print("  ✓ Adding business_id to conversation_memory table...")
                    result = conn.execute(text("SELECT COUNT(*) FROM conversation_memory"))
                    count = result.scalar()
                    
                    if count > 0:
                        print(f"    ⚠️  Found {count} existing conversation_memory records")
                        conn.execute(text("""
                            ALTER TABLE conversation_memory 
                            ADD COLUMN business_id INTEGER 
                            REFERENCES businesses(id)
                        """))
                        business_result = conn.execute(text("SELECT id FROM businesses LIMIT 1"))
                        first_business = business_result.scalar()
                        if first_business:
                            conn.execute(text("""
                                UPDATE conversation_memory 
                                SET business_id = :business_id 
                                WHERE business_id IS NULL
                            """), {"business_id": first_business})
                            conn.execute(text("""
                                ALTER TABLE conversation_memory 
                                ALTER COLUMN business_id SET NOT NULL
                            """))
                    else:
                        conn.execute(text("""
                            ALTER TABLE conversation_memory 
                            ADD COLUMN business_id INTEGER NOT NULL 
                            REFERENCES businesses(id)
                        """))
                    print("    ✅ Added business_id to conversation_memory")
                else:
                    print("  ⏭️  business_id already exists in conversation_memory table")
            else:
                print("  ⚠️  conversation_memory table does not exist, skipping")
            
            # Create indexes for better performance
            print("  ✓ Creating indexes...")
            try:
                if table_exists("users") and column_exists("users", "business_id"):
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_business_id ON users(business_id)"))
                if table_exists("conversations") and column_exists("conversations", "business_id"):
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_business_id ON conversations(business_id)"))
                if table_exists("messages") and column_exists("messages", "business_id"):
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_business_id ON messages(business_id)"))
                if table_exists("conversation_memory") and column_exists("conversation_memory", "business_id"):
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversation_memory_business_id ON conversation_memory(business_id)"))
                print("    ✅ Indexes created")
            except Exception as e:
                print(f"    ⚠️  Index creation warning: {e}")
            
            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

