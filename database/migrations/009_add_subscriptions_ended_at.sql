-- Fix production schema mismatch for Subscription ORM model
-- Error seen: psycopg.errors.UndefinedColumn: subscriptions.ended_at

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITHOUT TIME ZONE;
