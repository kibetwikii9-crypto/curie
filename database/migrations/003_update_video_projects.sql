-- Migration: 003_update_video_projects.sql
-- Description: Update video_projects table to match the new VideoProject model with scenes and assets
-- Created: 2026

-- Add new columns to video_projects table
ALTER TABLE video_projects
ADD COLUMN IF NOT EXISTS duration VARCHAR(10),
ADD COLUMN IF NOT EXISTS scenes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have default values
UPDATE video_projects
SET
    duration = '00:30',
    scenes = '[{"id": 1, "name": "Intro", "duration": 5, "caption": "Hook the audience"}, {"id": 2, "name": "Main Message", "duration": 15, "caption": "Make your offer"}]',
    assets = '[]',
    updated_at = NOW()
WHERE duration IS NULL;

-- Update status enum to match frontend expectations
ALTER TABLE video_projects
DROP CONSTRAINT IF EXISTS video_projects_status_check;

ALTER TABLE video_projects
ADD CONSTRAINT video_projects_status_check
CHECK (status IN ('draft', 'rendering', 'published', 'failed'));

-- Update the updated_at trigger
CREATE OR REPLACE FUNCTION update_video_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_video_projects_updated_at ON video_projects;

CREATE TRIGGER trigger_update_video_projects_updated_at
    BEFORE UPDATE ON video_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_video_projects_updated_at();