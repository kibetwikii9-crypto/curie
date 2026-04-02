-- Migration: 002_add_ads_system.sql
-- Description: Add comprehensive ads system with campaigns, video projects, A/B testing, and performance tracking
-- Created: 2024

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'telegram', 'webchat', 'email')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'standard' CHECK (campaign_type IN ('standard', 'ab_test', 'video', 'automated')),
    objective VARCHAR(100) NOT NULL,
    target_audience JSONB DEFAULT '{}',
    budget DECIMAL(10,2),
    budget_type VARCHAR(20) DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime', 'unlimited')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_projects table
CREATE TABLE IF NOT EXISTS video_projects (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'editing', 'rendering', 'completed', 'failed')),
    template_id INTEGER REFERENCES video_templates(id) ON DELETE SET NULL,
    video_type VARCHAR(50) NOT NULL DEFAULT 'standard' CHECK (video_type IN ('standard', 'story', 'reel', 'post')),
    duration_seconds INTEGER DEFAULT 30,
    resolution VARCHAR(20) DEFAULT '1080p' CHECK (resolution IN ('720p', '1080p', '4k')),
    aspect_ratio VARCHAR(20) DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1', '4:5')),
    elements JSONB DEFAULT '[]',
    timeline JSONB DEFAULT '{}',
    render_settings JSONB DEFAULT '{}',
    output_formats JSONB DEFAULT '["mp4"]',
    thumbnail_url TEXT,
    video_url TEXT,
    render_progress DECIMAL(5,2) DEFAULT 0.00,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ab_tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('creative', 'audience', 'timing', 'budget')),
    variants JSONB NOT NULL DEFAULT '[]',
    winner_variant_id VARCHAR(100),
    winner_criteria JSONB DEFAULT '{}',
    confidence_level DECIMAL(5,2),
    test_duration_days INTEGER DEFAULT 7,
    min_sample_size INTEGER DEFAULT 1000,
    results JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_performance table
CREATE TABLE IF NOT EXISTS campaign_performance (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0.00,
    ctr DECIMAL(5,4) DEFAULT 0.0000,
    cpc DECIMAL(8,4) DEFAULT 0.0000,
    cpm DECIMAL(8,4) DEFAULT 0.0000,
    roas DECIMAL(8,4) DEFAULT 0.0000,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    frequency DECIMAL(5,2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, date, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_business_status ON campaigns(business_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_business_platform ON campaigns(business_id, platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_business_created ON campaigns(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videoprojects_business_status ON video_projects(business_id, status);
CREATE INDEX IF NOT EXISTS idx_videoprojects_campaign ON video_projects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_videoprojects_business_created ON video_projects(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abtests_business_status ON ab_tests(business_id, status);
CREATE INDEX IF NOT EXISTS idx_abtests_campaign ON ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_abtests_business_created ON ab_tests(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaignperformance_campaign_date ON campaign_performance(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_campaignperformance_business_date ON campaign_performance(business_id, date);
CREATE INDEX IF NOT EXISTS idx_campaignperformance_platform_date ON campaign_performance(platform, date);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_projects_updated_at BEFORE UPDATE ON video_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_performance_updated_at BEFORE UPDATE ON campaign_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();