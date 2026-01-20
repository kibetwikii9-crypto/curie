-- ============================================================================
-- WHATSAPP OAUTH MIGRATION FOR EXISTING SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================================
-- This migration adds support for WhatsApp OAuth integration
-- It works with your existing channel_integrations table
-- No new tables needed - we use the existing structure
-- ============================================================================

-- The existing channel_integrations table already supports WhatsApp:
-- - channel column can be 'whatsapp'
-- - credentials column (JSONB) stores access tokens
-- - webhook_url column stores webhook URL
-- - business_id links to businesses table

-- Verify the table structure (should already exist):
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'channel_integrations';

-- ============================================================================
-- OPTIONAL: Add index for faster WhatsApp lookups (if not exists)
-- ============================================================================

-- Index for finding WhatsApp integrations by business
CREATE INDEX IF NOT EXISTS idx_channel_integrations_business_whatsapp 
ON channel_integrations(business_id, channel) 
WHERE channel = 'whatsapp' AND is_active = true;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check existing WhatsApp integrations:
-- SELECT id, business_id, channel_name, is_active, created_at
-- FROM channel_integrations
-- WHERE channel = 'whatsapp';

-- Check credentials structure (should show access_token, phone_number_id, etc.):
-- SELECT id, channel_name, credentials::json->>'access_token' as has_token,
--        credentials::json->>'phone_number_id' as phone_number_id
-- FROM channel_integrations
-- WHERE channel = 'whatsapp' AND credentials IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The channel_integrations table already supports WhatsApp
-- 2. Credentials are stored as JSON in the credentials column
-- 3. WhatsApp OAuth will store:
--    {
--      "access_token": "...",
--      "expires_in": 5184000,
--      "business_account_id": "...",
--      "whatsapp_account_id": "...",
--      "phone_number_id": "..."
--    }
-- 4. No schema changes needed - existing structure works!
-- ============================================================================



