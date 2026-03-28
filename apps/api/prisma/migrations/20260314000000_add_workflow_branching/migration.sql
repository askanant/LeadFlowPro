-- AlterTable
ALTER TABLE "workflow_steps" ADD COLUMN     "next_step_on_success" TEXT,
ADD COLUMN     "next_step_on_failure" TEXT,
ADD COLUMN     "conditions" JSONB;