-- AddTable TokenBlacklist
CREATE TABLE "token_blacklist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token_jti" TEXT NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- AddConstraint for user relation
ALTER TABLE "token_blacklist" ADD CONSTRAINT "token_blacklist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for user lookups
CREATE INDEX "token_blacklist_user_id_idx" ON "token_blacklist"("user_id");

-- CreateIndex for expiration cleanup
CREATE INDEX "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");

-- CreateIndex for tenant lookups
CREATE INDEX "token_blacklist_tenant_id_idx" ON "token_blacklist"("tenant_id");

-- CreateUnique constraint for preventing duplicate blacklist entries
CREATE UNIQUE INDEX "token_blacklist_user_id_token_jti_key" ON "token_blacklist"("user_id", "token_jti");
