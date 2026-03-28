-- Add encrypted credential fields to ad_platform_credentials
-- Migration: Add encrypted credentials support (Phase 2 Security)
-- Date: 2026-03-29

-- Create new columns for encrypted credentials
ALTER TABLE "ad_platform_credentials" ADD COLUMN "encrypted_credentials" TEXT;
ALTER TABLE "ad_platform_credentials" ADD COLUMN "credentials_iv" VARCHAR(64);

-- Add updated_at timestamp
ALTER TABLE "ad_platform_credentials" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index on credentials_iv for performance
CREATE INDEX "ad_platform_credentials_credentials_iv_idx" ON "ad_platform_credentials"("credentials_iv");

-- Note: Legacy columns (access_token, refresh_token, app_secret) are maintained for backward compatibility.
-- They can be deprecated after migration period (1-2 weeks).
-- TODO: In Phase 3, migrate existing credentials to encrypted storage and drop legacy columns.
