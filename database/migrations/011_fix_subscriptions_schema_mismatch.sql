-- Fix production schema mismatch for Subscription ORM model.
-- Errors seen:
-- - psycopg.errors.UndefinedColumn: subscriptions.amount does not exist
-- - (previously) subscriptions.ended_at

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Keep existing rows valid for ORM non-null expectations.
UPDATE subscriptions
SET amount = 0
WHERE amount IS NULL;
