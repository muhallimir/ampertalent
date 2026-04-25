-- Run this in your Supabase dashboard SQL editor (https://supabase.com/dashboard)
-- Project: ampertalent → SQL Editor → paste and run

-- Fix: stripe_customer_id columns that were not applied by the migration
-- Migration: 20260425000000_add_stripe_customer_id
ALTER TABLE "employers"   ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "job_seekers" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;

-- Verify they exist now (should return 2 rows)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('employers', 'job_seekers')
  AND column_name = 'stripe_customer_id';
