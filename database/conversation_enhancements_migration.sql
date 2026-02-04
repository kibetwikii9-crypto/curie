-- Conversation Enhancements Migration
-- Adds conversation tags, assignments, and related tables

-- Create conversation_tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7),  -- Hex color code (e.g., #3B82F6)
    description TEXT,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for conversation_tags
CREATE INDEX IF NOT EXISTS idx_conversation_tags_business_id ON conversation_tags(business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_name ON conversation_tags(name);

-- Create conversation_tag_relations table (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_tag_relations (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES conversation_tags(id) ON DELETE CASCADE,
    tagged_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(conversation_id, tag_id)  -- Prevent duplicate tags on same conversation
);

-- Create indexes for conversation_tag_relations
CREATE INDEX IF NOT EXISTS idx_conversation_tag_relations_conversation_id ON conversation_tag_relations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tag_relations_tag_id ON conversation_tag_relations(tag_id);

-- Create conversation_assignments table
CREATE TABLE IF NOT EXISTS conversation_assignments (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(conversation_id)  -- One assignment per conversation
);

-- Create indexes for conversation_assignments
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_conversation_id ON conversation_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_assigned_to_user_id ON conversation_assignments(assigned_to_user_id);

-- Add comments for documentation
COMMENT ON TABLE conversation_tags IS 'User-defined tags for categorizing conversations';
COMMENT ON TABLE conversation_tag_relations IS 'Many-to-many relationship between conversations and tags';
COMMENT ON TABLE conversation_assignments IS 'Tracks which team member is assigned to each conversation';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Conversation enhancements migration completed successfully!';
END $$;
