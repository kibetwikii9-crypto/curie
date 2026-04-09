-- Migration: 004_add_missing_video_project_columns.sql
-- Description: Add missing columns to video_projects table (edits, output_formats, render_progress, output_urls)
-- Created: 2026

-- Add missing columns to video_projects table
ALTER TABLE video_projects
ADD COLUMN IF NOT EXISTS edits TEXT,
ADD COLUMN IF NOT EXISTS output_formats TEXT,
ADD COLUMN IF NOT EXISTS render_progress FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS output_urls TEXT;

-- Update existing records to have default values
UPDATE video_projects
SET
    edits = NULL,
    output_formats = NULL,
    render_progress = 0.0,
    output_urls = NULL
WHERE edits IS NULL
   OR output_formats IS NULL
   OR render_progress IS NULL
   OR output_urls IS NULL;