-- Seed default onboarding steps
-- Run this in your Supabase SQL editor

INSERT INTO onboarding_steps (step_key, title, description, "order", is_required) VALUES
    ('welcome', 'Welcome & Setup', 'Get started with your account', 1, true),
    ('connect_channel', 'Connect Channels', 'Integrate your communication channels (Telegram, WhatsApp, etc.)', 2, true),
    ('configure_ai_rules', 'Configure AI Rules', 'Set up your automation rules and responses', 3, true),
    ('add_knowledge', 'Add Knowledge Base', 'Upload FAQs and responses to help your AI', 4, true),
    ('review_analytics', 'Review Analytics', 'Explore your dashboard and insights', 5, false),
    ('invite_team', 'Invite Team Members', 'Add team members to your workspace', 6, false)
ON CONFLICT (step_key) DO NOTHING;



