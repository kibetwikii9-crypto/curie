-- AI Rules Migration
-- Adds ai_rules table for intent detection and automated responses

-- Create ai_rules table
CREATE TABLE IF NOT EXISTS ai_rules (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Rule identification
    intent VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    
    -- Matching configuration
    keywords TEXT NOT NULL,  -- JSON array of keywords
    
    -- Response configuration
    response TEXT NOT NULL,
    
    -- Rule behavior
    priority INTEGER DEFAULT 100 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Metadata
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Statistics
    trigger_count INTEGER DEFAULT 0 NOT NULL,
    last_triggered_at TIMESTAMP
);

-- Create indexes for ai_rules
CREATE INDEX IF NOT EXISTS idx_ai_rules_business_id ON ai_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_rules_intent ON ai_rules(intent);
CREATE INDEX IF NOT EXISTS idx_ai_rules_is_active ON ai_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_rules_priority ON ai_rules(priority);

-- Add comments for documentation
COMMENT ON TABLE ai_rules IS 'AI automation rules for intent detection and automated responses';
COMMENT ON COLUMN ai_rules.intent IS 'Intent type: greeting, pricing, help, human, etc.';
COMMENT ON COLUMN ai_rules.keywords IS 'JSON array of keywords for matching';
COMMENT ON COLUMN ai_rules.priority IS 'Rule priority (lower number = higher priority)';
COMMENT ON COLUMN ai_rules.trigger_count IS 'Number of times this rule has been triggered';

-- Insert default rules for bootstrapping
INSERT INTO ai_rules (business_id, intent, name, keywords, response, priority, is_active, created_at, updated_at)
SELECT 
    b.id,
    'greeting',
    'Default Greeting',
    '["hi", "hello", "hey", "good morning", "good afternoon"]',
    'Hello! How can I help you today?',
    10,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM ai_rules WHERE business_id = b.id AND intent = 'greeting'
);

INSERT INTO ai_rules (business_id, intent, name, keywords, response, priority, is_active, created_at, updated_at)
SELECT 
    b.id,
    'pricing',
    'Pricing Inquiry',
    '["price", "cost", "pricing", "how much", "payment", "plan"]',
    'Our pricing plans are flexible and tailored to your needs. Would you like to speak with someone about specific options?',
    20,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM ai_rules WHERE business_id = b.id AND intent = 'pricing'
);

INSERT INTO ai_rules (business_id, intent, name, keywords, response, priority, is_active, created_at, updated_at)
SELECT 
    b.id,
    'help',
    'Help Request',
    '["help", "support", "assistance", "question", "how do i", "can you"]',
    'I''m here to help! What would you like assistance with?',
    30,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM ai_rules WHERE business_id = b.id AND intent = 'help'
);

INSERT INTO ai_rules (business_id, intent, name, keywords, response, priority, is_active, created_at, updated_at)
SELECT 
    b.id,
    'human',
    'Human Handoff',
    '["speak to human", "talk to person", "real person", "agent", "representative", "staff"]',
    'I''ll connect you with a team member right away. One moment please.',
    5,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM ai_rules WHERE business_id = b.id AND intent = 'human'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AI Rules migration completed successfully!';
    RAISE NOTICE 'Default rules have been added for all businesses.';
END $$;
