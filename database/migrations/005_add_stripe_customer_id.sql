-- Migration: Add stripe_customer_id column to subscriptions table
-- This column stores the Stripe customer ID for billing integration

ALTER TABLE subscriptions ADD COLUMN stripe_customer_id VARCHAR(255);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
