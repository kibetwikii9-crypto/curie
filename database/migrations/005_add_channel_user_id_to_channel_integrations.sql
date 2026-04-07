-- Migration: 005_add_channel_user_id_to_channel_integrations.sql
-- Add channel_user_id to channel_integrations for webhook routing and platform account matching

ALTER TABLE channel_integrations
ADD COLUMN IF NOT EXISTS channel_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_channel_integrations_channel_user_id
ON channel_integrations(channel_user_id);
