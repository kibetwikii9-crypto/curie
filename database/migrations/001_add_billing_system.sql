-- ============================================
-- BILLING SYSTEM MIGRATION
-- ============================================
-- This migration adds the complete billing system to the database
-- Run this on your Render PostgreSQL database

-- Step 1: Add columns to existing tables
-- ============================================

-- Add billing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;

-- Add billing columns to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'active';

-- Create index on stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer_id ON businesses(stripe_customer_id);

-- Step 2: Create new billing tables
-- ============================================

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly FLOAT NOT NULL,
    price_annual FLOAT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    conversation_limit INTEGER,
    channel_limit INTEGER,
    user_limit INTEGER,
    storage_limit INTEGER,
    ai_tokens_limit INTEGER,
    features TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    stripe_product_id VARCHAR(255),
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_annual VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255) UNIQUE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal FLOAT NOT NULL,
    tax FLOAT DEFAULT 0.0,
    total FLOAT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'draft',
    paid_at TIMESTAMP,
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    pdf_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

-- Invoice Line Items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price FLOAT NOT NULL,
    amount FLOAT NOT NULL,
    item_type VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount FLOAT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method_id INTEGER,
    payment_method_type VARCHAR(50),
    failure_reason TEXT,
    receipt_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_business_id ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE,
    type VARCHAR(20) DEFAULT 'card',
    card_brand VARCHAR(20),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_business_id ON payment_methods(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_payment_method_id ON payment_methods(stripe_payment_method_id);

-- Add FK constraint for payment_method_id in payments table
ALTER TABLE payments ADD CONSTRAINT fk_payments_payment_method 
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id);

-- Usage Records table
CREATE TABLE IF NOT EXISTS usage_records (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    resource_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    resource_metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_records_business_id ON usage_records(business_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_resource_type ON usage_records(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start, period_end);

-- Add-ons table
CREATE TABLE IF NOT EXISTS addons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly FLOAT NOT NULL,
    price_annual FLOAT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    addon_type VARCHAR(50) NOT NULL,
    limits TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    stripe_product_id VARCHAR(255),
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_annual VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addons_name ON addons(name);
CREATE INDEX IF NOT EXISTS idx_addons_is_active ON addons(is_active);

-- Subscription Add-ons table
CREATE TABLE IF NOT EXISTS subscription_addons (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    addon_id INTEGER NOT NULL REFERENCES addons(id),
    stripe_subscription_item_id VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_subscription_id ON subscription_addons(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_addon_id ON subscription_addons(addon_id);

-- Billing Events table (Audit log)
CREATE TABLE IF NOT EXISTS billing_events (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    event_metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_events_business_id ON billing_events(business_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);

-- Step 3: Insert default plans
-- ============================================

INSERT INTO plans (name, display_name, description, price_monthly, price_annual, conversation_limit, channel_limit, user_limit, storage_limit, ai_tokens_limit, features, is_popular, sort_order)
VALUES 
    ('starter', 'Starter', 'Perfect for small businesses getting started with AI automation', 25.00, 240.00, 1000, 2, 3, 100, 10000, 
     '{"basic_ai": true, "webhook_support": true, "email_support": true}', false, 1),
    
    ('business', 'Business', 'Ideal for growing businesses with multiple channels', 49.00, 470.00, 5000, 5, 10, 500, 50000,
     '{"basic_ai": true, "webhook_support": true, "email_support": true, "priority_support": true, "advanced_analytics": true}', true, 2),
    
    ('pro', 'Pro', 'Advanced features for established businesses', 99.00, 950.00, 20000, 15, 50, 2000, 200000,
     '{"basic_ai": true, "voice_ai": true, "webhook_support": true, "api_access": true, "priority_support": true, "advanced_analytics": true, "custom_integrations": true}', false, 3),
    
    ('enterprise', 'Enterprise', 'Unlimited power for large organizations', 299.00, 2870.00, NULL, NULL, NULL, NULL, NULL,
     '{"basic_ai": true, "voice_ai": true, "webhook_support": true, "api_access": true, "priority_support": true, "advanced_analytics": true, "custom_integrations": true, "white_label": true, "dedicated_account_manager": true}', false, 4)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Insert default add-ons
-- ============================================

INSERT INTO addons (name, display_name, description, price_monthly, price_annual, addon_type, limits, sort_order)
VALUES
    ('voice_ai', 'Voice AI', 'Add voice call handling and speech recognition', 15.00, 144.00, 'feature', '{"voice_minutes": 500}', 1),
    ('image_recognition', 'Image Recognition', 'AI-powered image analysis and description', 10.00, 96.00, 'feature', '{"images_per_month": 1000}', 2),
    ('advanced_crm', 'Advanced CRM', 'Enhanced customer relationship management features', 20.00, 192.00, 'feature', '{}', 3),
    ('payment_processing', 'Payment Processing', 'Accept payments directly in conversations', 25.00, 240.00, 'feature', '{"transactions_per_month": 100}', 4),
    ('custom_integrations', 'Custom Integrations', 'Build your own integrations with our API', 30.00, 288.00, 'feature', '{"api_calls_per_day": 10000}', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
