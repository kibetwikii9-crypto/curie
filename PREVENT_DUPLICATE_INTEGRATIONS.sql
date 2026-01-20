-- ============================================
-- SQL to prevent duplicate Telegram integrations
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check for duplicate active Telegram integrations per business
-- This should return 0 rows if there are no duplicates
SELECT 
    business_id,
    channel,
    COUNT(*) as integration_count,
    STRING_AGG(id::text, ', ') as integration_ids,
    STRING_AGG(channel_name, ', ') as channel_names
FROM channel_integrations
WHERE channel = 'telegram' AND is_active = true
GROUP BY business_id, channel
HAVING COUNT(*) > 1;

-- 2. Check for duplicate bot tokens across different businesses
-- This identifies bots that are connected to multiple businesses
WITH bot_tokens AS (
    SELECT 
        id,
        business_id,
        channel_name,
        credentials::json->>'bot_token' as bot_token,
        credentials::json->>'bot_username' as bot_username
    FROM channel_integrations
    WHERE channel = 'telegram' 
      AND is_active = true
      AND credentials IS NOT NULL
)
SELECT 
    bot_token,
    bot_username,
    COUNT(*) as usage_count,
    STRING_AGG(business_id::text, ', ') as business_ids,
    STRING_AGG(id::text, ', ') as integration_ids
FROM bot_tokens
GROUP BY bot_token, bot_username
HAVING COUNT(*) > 1;

-- 3. FIX: Disable duplicate integrations, keeping only the most recently updated one per business
-- This will disable older duplicate integrations for the same business+channel
WITH ranked_integrations AS (
    SELECT 
        id,
        business_id,
        channel,
        is_active,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY business_id, channel 
            ORDER BY updated_at DESC, id DESC
        ) as rn
    FROM channel_integrations
    WHERE channel = 'telegram' AND is_active = true
)
UPDATE channel_integrations ci
SET is_active = false,
    updated_at = NOW()
FROM ranked_integrations ri
WHERE ci.id = ri.id
  AND ri.rn > 1  -- Keep only the first (most recent) one
RETURNING ci.id, ci.business_id, ci.channel_name, ci.is_active;

-- 4. Add a unique constraint to prevent future duplicates
-- This ensures only one active integration per business+channel combination
-- Note: This will fail if duplicates still exist. Run query #3 first to clean up.

-- First, check if constraint already exists
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'channel_integrations'::regclass
  AND conname LIKE '%business_channel%';

-- If constraint doesn't exist, create it:
-- ALTER TABLE channel_integrations
-- ADD CONSTRAINT unique_active_business_channel 
-- UNIQUE (business_id, channel) 
-- WHERE is_active = true;

-- Note: PostgreSQL unique constraints with WHERE clauses (partial indexes) 
-- require a unique index instead:
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_business_channel 
ON channel_integrations (business_id, channel) 
WHERE is_active = true;

-- 5. Verify the fix worked
SELECT 
    business_id,
    channel,
    COUNT(*) as active_integrations
FROM channel_integrations
WHERE channel = 'telegram' AND is_active = true
GROUP BY business_id, channel
HAVING COUNT(*) > 1;
-- Should return 0 rows







