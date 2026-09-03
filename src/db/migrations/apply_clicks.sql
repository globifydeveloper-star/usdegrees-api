CREATE TABLE IF NOT EXISTS usd_apply_clicks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NULL REFERENCES usdusers(id) ON DELETE SET NULL,
    university_id VARCHAR(50) NULL,
    university_name VARCHAR(255) NULL,
    cip_code VARCHAR(20) NULL,
    degree VARCHAR(255) NULL,
    credential_level INT NULL,
    credential_title VARCHAR(255) NULL,
    school_url TEXT NULL,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usd_apply_clicks
    ADD COLUMN IF NOT EXISTS university_name VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_usd_apply_clicks_user_id
    ON usd_apply_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_usd_apply_clicks_university_id
    ON usd_apply_clicks(university_id);
CREATE INDEX IF NOT EXISTS idx_usd_apply_clicks_clicked_at
    ON usd_apply_clicks(clicked_at);