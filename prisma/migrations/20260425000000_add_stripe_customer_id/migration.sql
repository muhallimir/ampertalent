-- Add stripe_customer_id to job_seekers table
ALTER TABLE "job_seekers" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;

-- Add stripe_customer_id to employers table
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
