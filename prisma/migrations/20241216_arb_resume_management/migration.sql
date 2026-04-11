-- ARB (Automatic Recurring Billing) & Resume Management Migration
-- Date: December 16, 2024
-- Purpose: Add fields for ARB subscription tracking and resume lifecycle management

-- ============================================
-- PHASE 1: JOB SEEKERS - Resume Carryover Fields
-- ============================================
-- These fields track resume credits and carryover between billing periods

-- Add resume_carryover_count to track resumes carried from previous billing period
ALTER TABLE "job_seekers" 
ADD COLUMN IF NOT EXISTS "resume_carryover_count" INTEGER NOT NULL DEFAULT 0;

-- Add last_billing_period_start to track when current billing period began
ALTER TABLE "job_seekers" 
ADD COLUMN IF NOT EXISTS "last_billing_period_start" TIMESTAMP(6);

-- ============================================
-- PHASE 2: SUBSCRIPTIONS - ARB Fields
-- ============================================
-- These fields support automatic recurring billing and webhook processing

-- Add current_period_start to track billing period start
ALTER TABLE "subscriptions" 
ADD COLUMN IF NOT EXISTS "current_period_start" TIMESTAMP(6);

-- Add billing_frequency for ARB interval tracking (1-month, 2-months, 3-months, 12-months)
ALTER TABLE "subscriptions" 
ADD COLUMN IF NOT EXISTS "billing_frequency" VARCHAR(50);

-- Add next_billing_date for cron job renewal processing
ALTER TABLE "subscriptions" 
ADD COLUMN IF NOT EXISTS "next_billing_date" TIMESTAMP(6);

-- Index for efficient billing period queries
CREATE INDEX IF NOT EXISTS "idx_subscriptions_current_period" 
ON "subscriptions" ("current_period_start", "current_period_end");

-- ============================================
-- PHASE 3: RESUMES - Soft Delete & Lifecycle
-- ============================================
-- These fields support soft deletion and recovery window

-- Add status field for resume lifecycle (active, deleted, archived)
ALTER TABLE "resumes" 
ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'active';

-- Add deleted_at for soft delete timestamp (30-day recovery window)
ALTER TABLE "resumes" 
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(6);

-- Add s3_key for S3 file management during cleanup
ALTER TABLE "resumes"
ADD COLUMN IF NOT EXISTS "s3_key" VARCHAR(500);

-- Add user_id for linking resume to user profile
ALTER TABLE "resumes"
ADD COLUMN IF NOT EXISTS "user_id" VARCHAR(255);

-- Add file_name column if not exists (alias for filename)
ALTER TABLE "resumes"
ADD COLUMN IF NOT EXISTS "file_name" VARCHAR(500);

-- Index for efficient resume status queries
CREATE INDEX IF NOT EXISTS "idx_resumes_seeker_id_status" 
ON "resumes" ("seeker_id", "status");

-- ============================================
-- PHASE 4: APPLICATIONS - Resume Tracking
-- ============================================
-- Link applications to specific resumes for tracking

-- Add resume_id foreign key to applications
ALTER TABLE "applications" 
ADD COLUMN IF NOT EXISTS "resume_id" VARCHAR(255);

-- Add foreign key constraint
ALTER TABLE "applications" 
ADD CONSTRAINT "fk_applications_resume_id" 
FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") 
ON UPDATE NO ACTION ON DELETE SET NULL;

-- Index for efficient resume lookups on applications
CREATE INDEX IF NOT EXISTS "idx_applications_resume_id" 
ON "applications" ("resume_id");

-- ============================================
-- PHASE 5: MIGRATION STATE TRACKING
-- ============================================
-- Track migration progress for large data migrations

CREATE TABLE IF NOT EXISTS "migration_state" (
  "id" SERIAL PRIMARY KEY,
  "migration_name" VARCHAR(255) UNIQUE NOT NULL,
  "last_migrated_id" BIGINT DEFAULT 0,
  "last_migrated_at" TIMESTAMP(6),
  "total_migrated" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_migration_state_name" 
ON "migration_state" ("migration_name");

-- ============================================
-- DATA BACKFILL (Run manually if needed)
-- ============================================
-- Backfill existing active subscriptions with billing_frequency

/*
UPDATE "subscriptions" 
SET 
  "billing_frequency" = CASE 
    WHEN "plan" = 'trial_monthly' THEN '1-month'
    WHEN "plan" = 'gold_bimonthly' THEN '2-months'
    WHEN "plan" = 'vip_quarterly' THEN '3-months'
    WHEN "plan" = 'annual_platinum' THEN '12-months'
    ELSE '1-month'
  END,
  "current_period_start" = COALESCE("created_at", NOW()),
  "next_billing_date" = COALESCE("current_period_end", NOW() + INTERVAL '30 days')
WHERE "billing_frequency" IS NULL 
  AND "status" IN ('active', 'past_due');
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful

/*
-- Check job_seekers new columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'job_seekers' 
  AND column_name IN ('resume_carryover_count', 'last_billing_period_start');

-- Check subscriptions new columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
  AND column_name IN ('current_period_start', 'billing_frequency', 'next_billing_date');

-- Check resumes new columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'resumes' 
  AND column_name IN ('status', 'deleted_at');

-- Check applications resume_id
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name = 'resume_id';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('subscriptions', 'resumes', 'applications') 
  AND indexname LIKE 'idx_%';
*/
