-- Database Migration Script
-- Run this in Supabase SQL Editor or Render database console
-- This adds all necessary columns for the multi-tenant system

-- ============================================
-- 1. Add business_id to users table (nullable for admin users)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'business_id'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN business_id INTEGER 
        REFERENCES businesses(id);
        
        CREATE INDEX IF NOT EXISTS ix_users_business_id ON users(business_id);
        
        RAISE NOTICE 'Added business_id column to users table';
    ELSE
        RAISE NOTICE 'business_id column already exists in users table';
    END IF;
END $$;

-- ============================================
-- 2. Add business_id to conversations table (required)
-- ============================================
DO $$ 
DECLARE
    default_business_id INTEGER;
    conv_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'business_id'
    ) THEN
        -- Check if there are existing conversations
        SELECT COUNT(*) INTO conv_count FROM conversations;
        
        IF conv_count > 0 THEN
            -- Get or create default business
            SELECT id INTO default_business_id FROM businesses LIMIT 1;
            
            IF default_business_id IS NULL THEN
                -- Create default business if none exists
                INSERT INTO businesses (name, owner_id, created_at, updated_at)
                VALUES ('Default Business', 1, NOW(), NOW())
                RETURNING id INTO default_business_id;
            END IF;
            
            -- Add column as nullable first
            ALTER TABLE conversations 
            ADD COLUMN business_id INTEGER 
            REFERENCES businesses(id);
            
            -- Assign existing conversations to default business
            UPDATE conversations 
            SET business_id = default_business_id 
            WHERE business_id IS NULL;
            
            -- Now make it NOT NULL
            ALTER TABLE conversations 
            ALTER COLUMN business_id SET NOT NULL;
        ELSE
            -- No existing data, can add as NOT NULL directly
            ALTER TABLE conversations 
            ADD COLUMN business_id INTEGER NOT NULL 
            REFERENCES businesses(id);
        END IF;
        
        CREATE INDEX IF NOT EXISTS ix_conversations_business_id ON conversations(business_id);
        
        RAISE NOTICE 'Added business_id column to conversations table';
    ELSE
        RAISE NOTICE 'business_id column already exists in conversations table';
    END IF;
END $$;

-- ============================================
-- 3. Add business_id to messages table (required)
-- ============================================
DO $$ 
DECLARE
    default_business_id INTEGER;
    msg_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'business_id'
    ) THEN
        SELECT COUNT(*) INTO msg_count FROM messages;
        
        IF msg_count > 0 THEN
            SELECT id INTO default_business_id FROM businesses LIMIT 1;
            
            IF default_business_id IS NULL THEN
                INSERT INTO businesses (name, owner_id, created_at, updated_at)
                VALUES ('Default Business', 1, NOW(), NOW())
                RETURNING id INTO default_business_id;
            END IF;
            
            ALTER TABLE messages 
            ADD COLUMN business_id INTEGER 
            REFERENCES businesses(id);
            
            UPDATE messages 
            SET business_id = default_business_id 
            WHERE business_id IS NULL;
            
            ALTER TABLE messages 
            ALTER COLUMN business_id SET NOT NULL;
        ELSE
            ALTER TABLE messages 
            ADD COLUMN business_id INTEGER NOT NULL 
            REFERENCES businesses(id);
        END IF;
        
        CREATE INDEX IF NOT EXISTS ix_messages_business_id ON messages(business_id);
        
        RAISE NOTICE 'Added business_id column to messages table';
    ELSE
        RAISE NOTICE 'business_id column already exists in messages table';
    END IF;
END $$;

-- ============================================
-- 4. Add business_id to conversation_memory table (required)
-- ============================================
DO $$ 
DECLARE
    default_business_id INTEGER;
    mem_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' AND column_name = 'business_id'
    ) THEN
        SELECT COUNT(*) INTO mem_count FROM conversation_memory;
        
        IF mem_count > 0 THEN
            SELECT id INTO default_business_id FROM businesses LIMIT 1;
            
            IF default_business_id IS NULL THEN
                INSERT INTO businesses (name, owner_id, created_at, updated_at)
                VALUES ('Default Business', 1, NOW(), NOW())
                RETURNING id INTO default_business_id;
            END IF;
            
            ALTER TABLE conversation_memory 
            ADD COLUMN business_id INTEGER 
            REFERENCES businesses(id);
            
            UPDATE conversation_memory 
            SET business_id = default_business_id 
            WHERE business_id IS NULL;
            
            ALTER TABLE conversation_memory 
            ALTER COLUMN business_id SET NOT NULL;
        ELSE
            ALTER TABLE conversation_memory 
            ADD COLUMN business_id INTEGER NOT NULL 
            REFERENCES businesses(id);
        END IF;
        
        CREATE INDEX IF NOT EXISTS ix_conversation_memory_business_id ON conversation_memory(business_id);
        
        RAISE NOTICE 'Added business_id column to conversation_memory table';
    ELSE
        RAISE NOTICE 'business_id column already exists in conversation_memory table';
    END IF;
END $$;

-- ============================================
-- 5. Fix any businesses with NULL owner_id
-- ============================================
DO $$ 
DECLARE
    default_user_id INTEGER;
BEGIN
    -- Find businesses with NULL owner_id
    IF EXISTS (SELECT 1 FROM businesses WHERE owner_id IS NULL) THEN
        -- Get first user (or create one if none exists)
        SELECT id INTO default_user_id FROM users LIMIT 1;
        
        IF default_user_id IS NULL THEN
            -- No default admin creation for security reasons
            -- Businesses with NULL owner_id will remain NULL until manually assigned
            RAISE NOTICE 'No users found. Please create users via the application signup.';
            RETURN;
        END IF;
        
        -- Update businesses with NULL owner_id
        UPDATE businesses 
        SET owner_id = default_user_id 
        WHERE owner_id IS NULL;
        
        RAISE NOTICE 'Fixed businesses with NULL owner_id';
    ELSE
        RAISE NOTICE 'All businesses have valid owner_id';
    END IF;
END $$;

-- ============================================
-- Summary
-- ============================================
SELECT 
    'Migration completed! Columns added:' as status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_id') 
         THEN '✓ users.business_id' ELSE '✗ users.business_id' END as users_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'business_id') 
         THEN '✓ conversations.business_id' ELSE '✗ conversations.business_id' END as conversations_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'business_id') 
         THEN '✓ messages.business_id' ELSE '✗ messages.business_id' END as messages_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_memory' AND column_name = 'business_id') 
         THEN '✓ conversation_memory.business_id' ELSE '✗ conversation_memory.business_id' END as memory_col;







