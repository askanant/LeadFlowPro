/*
  Warnings:

  - You are about to drop the column `lead_quota` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `leads_used` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_sub_id` on the `subscriptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "lead_quota",
DROP COLUMN "leads_used",
DROP COLUMN "stripe_sub_id",
ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_period_start" TIMESTAMP(3),
ADD COLUMN     "stripe_subscription_id" VARCHAR(100);
