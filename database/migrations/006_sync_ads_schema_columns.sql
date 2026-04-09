-- Migration: 006_sync_ads_schema_columns.sql
-- Description: Ensure ads-related tables contain all columns required by current models/routes
-- Created: 2026

-- =========================
-- campaigns table alignment
-- =========================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS budget DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS budget_type VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- status compatibility guard (safe replace)
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_status_check
CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'));

-- campaign_type compatibility guard (safe replace)
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_campaign_type_check
CHECK (campaign_type IN ('standard', 'ab_test', 'video', 'automated'));

-- ========================
-- video_projects alignment
-- ========================
ALTER TABLE video_projects
ADD COLUMN IF NOT EXISTS duration VARCHAR(10),
ADD COLUMN IF NOT EXISTS scenes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS edits TEXT,
ADD COLUMN IF NOT EXISTS output_formats JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS render_progress DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS output_urls JSONB DEFAULT '[]'::jsonb;

-- Normalize video status constraint to current app enum
ALTER TABLE video_projects
DROP CONSTRAINT IF EXISTS video_projects_status_check;

ALTER TABLE video_projects
ADD CONSTRAINT video_projects_status_check
CHECK (status IN ('draft', 'rendering', 'published', 'failed'));

-- ====================
-- ab_tests alignment
-- ====================
ALTER TABLE ab_tests
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS winner_variant_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS winner_criteria JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS test_duration_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS min_sample_size INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ===============================
-- campaign_performance alignment
-- ===============================
ALTER TABLE campaign_performance
ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagements INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpm DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS conversion_rate DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS frequency DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
