-- ============================================
-- Update plans for Paystack (KES) and plan codes
-- ============================================
-- Note:
-- - Monthly plan codes are provided and mapped below.
-- - Annual plan codes are intentionally left NULL until provided.
-- - Enterprise remains manual onboarding (checkout blocked in backend).

UPDATE plans
SET
    currency = 'KES',
    stripe_price_id_monthly = CASE name
        WHEN 'starter' THEN 'PLN_apdo5ak986b3974'
        WHEN 'business' THEN 'PLN_jl6qtx7xhwneask'
        WHEN 'pro' THEN 'PLN_18252chlog4d8d7'
        WHEN 'enterprise' THEN 'PLN_l822d52oss061ca'
        ELSE stripe_price_id_monthly
    END,
    stripe_price_id_annual = CASE name
        WHEN 'starter' THEN NULL
        WHEN 'business' THEN NULL
        WHEN 'pro' THEN NULL
        WHEN 'enterprise' THEN NULL
        ELSE stripe_price_id_annual
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE name IN ('starter', 'business', 'pro', 'enterprise');
