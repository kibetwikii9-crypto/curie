#!/usr/bin/env python3
"""
Apply video projects migration
"""

from app.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

sql_statements = [
    """ALTER TABLE video_projects
ADD COLUMN IF NOT EXISTS duration VARCHAR(10),
ADD COLUMN IF NOT EXISTS scenes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();""",

    """UPDATE video_projects
SET
    duration = '00:30',
    scenes = '[{"id": 1, "name": "Intro", "duration": 5, "caption": "Hook the audience"}, {"id": 2, "name": "Main Message", "duration": 15, "caption": "Make your offer"}]',
    assets = '[]',
    updated_at = NOW()
WHERE duration IS NULL;""",

    """ALTER TABLE video_projects
DROP CONSTRAINT IF EXISTS video_projects_status_check;""",

    """ALTER TABLE video_projects
ADD CONSTRAINT video_projects_status_check
CHECK (status IN ('draft', 'rendering', 'published', 'failed'));""",

    """CREATE OR REPLACE FUNCTION update_video_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;""",

    """DROP TRIGGER IF EXISTS trigger_update_video_projects_updated_at ON video_projects;""",

    """CREATE TRIGGER trigger_update_video_projects_updated_at
    BEFORE UPDATE ON video_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_video_projects_updated_at();"""
]

try:
    log.info('Applying video projects migration...')
    with engine.begin() as connection:
        for i, sql in enumerate(sql_statements, 1):
            log.info(f'Executing statement {i}...')
            connection.execute(text(sql))
    log.info('Migration applied successfully')
except Exception as e:
    log.error(f'Migration failed: {e}')