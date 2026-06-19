-- Firebase auth migration for usdusers.
-- Adds the Firebase UID link. The table already has is_active + deactivated_at
-- (the existing soft-delete convention), so we reuse those rather than adding
-- a duplicate deleted_at.

ALTER TABLE usdusers ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
ALTER TABLE usdusers ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usdusers ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usdusers_firebase_uid ON usdusers (firebase_uid);

-- Drop the redundant deleted_at column added by an earlier version of this
-- migration (deactivated_at is the canonical soft-delete timestamp).
ALTER TABLE usdusers DROP COLUMN IF EXISTS deleted_at;

-- ---------------------------------------------------------------------------
-- The bcrypt password column is `password_hash`. In this database every user
-- signed up via social auth, so password_hash is entirely NULL and there is
-- nothing to import into Firebase (scripts/migrate-bcrypt-to-firebase.ts will
-- report "No bcrypt users to migrate.").
--
-- If/when you have migrated real bcrypt users and verified Firebase login,
-- the now-unused column can be dropped:
--
--   ALTER TABLE usdusers DROP COLUMN password_hash;
-- ---------------------------------------------------------------------------
