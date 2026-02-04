-- ========================================
-- FIXED SQL FOR SUPABASE
-- Run this in Supabase SQL Editor
-- ========================================

-- SECURITY TABLES
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    secret VARCHAR NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    backup_codes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);

CREATE TABLE IF NOT EXISTS ip_allowlists (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    ip_address VARCHAR NOT NULL,
    description VARCHAR,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ip_allowlists_business_id ON ip_allowlists(business_id);
CREATE INDEX IF NOT EXISTS idx_ip_allowlists_ip_address ON ip_allowlists(ip_address);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_token VARCHAR UNIQUE NOT NULL,
    ip_address VARCHAR,
    user_agent VARCHAR,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    key_hash VARCHAR NOT NULL,
    permissions TEXT,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_api_keys_business_id ON api_keys(business_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR NOT NULL,
    resource_type VARCHAR,
    resource_id INTEGER,
    ip_address VARCHAR,
    user_agent VARCHAR,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- NOTIFICATION TABLES
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    action_url VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    category VARCHAR NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start VARCHAR,
    quiet_hours_end VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_category ON notification_preferences(category);

-- ONBOARDING TABLES
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id SERIAL PRIMARY KEY,
    step_key VARCHAR UNIQUE NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_step_key ON onboarding_steps(step_key);

CREATE TABLE IF NOT EXISTS onboarding_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    step_key VARCHAR NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_business_id ON onboarding_progress(business_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_step_key ON onboarding_progress(step_key);

-- Insert default onboarding steps WITH explicit created_at
INSERT INTO onboarding_steps (step_key, title, description, "order", is_required, created_at)
VALUES 
    ('welcome', 'Welcome & Setup', 'Get started with your account', 1, TRUE, CURRENT_TIMESTAMP),
    ('connect_channel', 'Connect Channels', 'Integrate your communication channels (Telegram, WhatsApp, etc.)', 2, TRUE, CURRENT_TIMESTAMP),
    ('configure_ai_rules', 'Configure AI Rules', 'Set up your automation rules and responses', 3, TRUE, CURRENT_TIMESTAMP),
    ('add_knowledge', 'Add Knowledge Base', 'Upload FAQs and responses to help your AI', 4, TRUE, CURRENT_TIMESTAMP),
    ('review_analytics', 'Review Analytics', 'Explore your dashboard and insights', 5, FALSE, CURRENT_TIMESTAMP),
    ('invite_team', 'Invite Team Members', 'Add team members to your workspace', 6, FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (step_key) DO NOTHING;
