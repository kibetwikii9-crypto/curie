-- De-duplicate channel integrations and enforce one active integration per channel/business

WITH ranked AS (
    SELECT
        id,
        business_id,
        channel,
        is_active,
        ROW_NUMBER() OVER (
            PARTITION BY business_id, channel
            ORDER BY is_active DESC, updated_at DESC, created_at DESC, id DESC
        ) AS rn
    FROM channel_integrations
)
UPDATE channel_integrations ci
SET is_active = FALSE,
    updated_at = NOW()
FROM ranked r
WHERE ci.id = r.id
  AND r.rn > 1
  AND ci.is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_integrations_business_channel_active
ON channel_integrations(business_id, channel)
WHERE is_active = TRUE;
