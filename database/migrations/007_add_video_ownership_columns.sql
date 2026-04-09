-- Add ownership columns for personal video projects and template creator permissions

ALTER TABLE video_projects
ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_video_projects_owner_user_id
ON video_projects(owner_user_id);

ALTER TABLE video_templates
ADD COLUMN IF NOT EXISTS creator_user_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_video_templates_creator_user_id
ON video_templates(creator_user_id);

-- Backfill ownership using business owner when available
UPDATE video_projects vp
SET owner_user_id = b.owner_id
FROM businesses b
WHERE vp.business_id = b.id
  AND vp.owner_user_id IS NULL
  AND b.owner_id IS NOT NULL;

UPDATE video_templates vt
SET creator_user_id = b.owner_id
FROM businesses b
WHERE vt.business_id = b.id
  AND vt.creator_user_id IS NULL
  AND b.owner_id IS NOT NULL;

-- Backfill ownership using business owner when available
UPDATE video_projects vp
SET owner_user_id = b.owner_id
FROM businesses b
WHERE vp.business_id = b.id
  AND vp.owner_user_id IS NULL
  AND b.owner_id IS NOT NULL;

UPDATE video_templates vt
SET creator_user_id = b.owner_id
FROM businesses b
WHERE vt.business_id = b.id
  AND vt.creator_user_id IS NULL
  AND b.owner_id IS NOT NULL;
