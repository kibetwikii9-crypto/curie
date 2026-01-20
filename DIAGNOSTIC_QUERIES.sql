-- ============================================
-- DIAGNOSTIC QUERIES FOR DASHBOARD ANALYTICS ISSUE
-- Run these in Supabase SQL Editor to diagnose the problem
-- ============================================

-- 1. Check your user's business_id and role
-- Replace 'your-email@example.com' with your actual email
SELECT 
    id,
    email,
    role,
    business_id,
    full_name,
    created_at
FROM users 
WHERE email = 'your-email@example.com';

-- 2. Check if a business exists for your user (by owner_id)
-- Replace 'your-email@example.com' with your actual email
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    u.email as owner_email,
    b.created_at
FROM businesses b
JOIN users u ON b.owner_id = u.id
WHERE u.email = 'your-email@example.com';

-- 3. Check all conversations and their business_id distribution
SELECT 
    business_id,
    COUNT(*) as conversation_count,
    MIN(created_at) as oldest_conversation,
    MAX(created_at) as newest_conversation
FROM conversations
GROUP BY business_id
ORDER BY conversation_count DESC;

-- 4. Check conversations for your business (if you know your business_id)
-- Replace YOUR_BUSINESS_ID with your actual business_id from query #1 or #2
SELECT 
    id,
    user_id,
    channel,
    intent,
    created_at,
    business_id
FROM conversations
WHERE business_id = YOUR_BUSINESS_ID
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if conversations exist but have NULL business_id (this is a problem!)
SELECT 
    COUNT(*) as conversations_with_null_business_id,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM conversations
WHERE business_id IS NULL;

-- 6. Check Telegram integrations and their business_id
SELECT 
    ci.id,
    ci.business_id,
    ci.channel_name,
    ci.is_active,
    ci.webhook_url,
    b.name as business_name,
    u.email as owner_email
FROM channel_integrations ci
LEFT JOIN businesses b ON ci.business_id = b.id
LEFT JOIN users u ON b.owner_id = u.id
WHERE ci.channel = 'telegram'
ORDER BY ci.created_at DESC;

-- 7. Check if your user's business_id matches any Telegram integration
-- Replace 'your-email@example.com' with your actual email
SELECT 
    u.id as user_id,
    u.email,
    u.business_id as user_business_id,
    ci.id as integration_id,
    ci.business_id as integration_business_id,
    ci.channel_name,
    CASE 
        WHEN u.business_id = ci.business_id THEN 'MATCH ✅'
        WHEN u.business_id IS NULL THEN 'USER HAS NO BUSINESS_ID ❌'
        WHEN ci.business_id IS NULL THEN 'INTEGRATION HAS NO BUSINESS_ID ❌'
        ELSE 'MISMATCH ❌'
    END as status
FROM users u
LEFT JOIN channel_integrations ci ON u.business_id = ci.business_id AND ci.channel = 'telegram'
WHERE u.email = 'your-email@example.com';

-- 8. FIX: Update user's business_id if they own a business but business_id is NULL
-- Replace 'your-email@example.com' with your actual email
-- This will fix users who have a business but NULL business_id
UPDATE users u
SET business_id = b.id
FROM businesses b
WHERE b.owner_id = u.id
  AND u.business_id IS NULL
  AND u.role = 'business_owner'
  AND u.email = 'your-email@example.com'
RETURNING u.id, u.email, u.business_id, b.id as business_id_set;

-- 9. FIX: Assign conversations with NULL business_id to the correct business
-- This fixes conversations that were saved before business_id was properly set
-- Replace YOUR_BUSINESS_ID with your actual business_id
UPDATE conversations c
SET business_id = YOUR_BUSINESS_ID
WHERE c.business_id IS NULL
  AND EXISTS (
    SELECT 1 FROM channel_integrations ci
    WHERE ci.business_id = YOUR_BUSINESS_ID
    AND ci.channel = c.channel
  )
RETURNING c.id, c.user_id, c.channel, c.business_id;

-- 10. Summary: Get complete picture of your account
-- Replace 'your-email@example.com' with your actual email
SELECT 
    'User Info' as section,
    u.id::text as id,
    u.email,
    u.role,
    u.business_id::text as business_id
FROM users u
WHERE u.email = 'your-email@example.com'

UNION ALL

SELECT 
    'Business Info' as section,
    b.id::text as id,
    b.name as email,
    'business' as role,
    b.owner_id::text as business_id
FROM businesses b
JOIN users u ON b.owner_id = u.id
WHERE u.email = 'your-email@example.com'

UNION ALL

SELECT 
    'Conversations Count' as section,
    COUNT(*)::text as id,
    'conversations' as email,
    'total' as role,
    business_id::text as business_id
FROM conversations
WHERE business_id = (
    SELECT business_id FROM users WHERE email = 'your-email@example.com'
)
GROUP BY business_id;







