-- CRM SYNC SCHEMA MIGRATION REFERENCE
-- Created: December 31, 2025
-- Purpose: Reference migration for CRM Sync feature
-- IMPORTANT: This is for reference only - actual deployment uses manual SQL execution via Supabase SQL Editor

-- =====================================================
-- PHASE 1: CORE CRM SYNC TABLES
-- =====================================================

-- Create CRM Sync Change Log table (audit trail)
CREATE TABLE IF NOT EXISTS "crm_sync_change_logs" (
    "id" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "super_admin_name" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_details" JSONB NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_sync_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crm_sync_change_logs_super_admin_id_idx" ON "crm_sync_change_logs"("super_admin_id");
CREATE INDEX IF NOT EXISTS "crm_sync_change_logs_action_type_idx" ON "crm_sync_change_logs"("action_type");
CREATE INDEX IF NOT EXISTS "crm_sync_change_logs_created_at_idx" ON "crm_sync_change_logs"("created_at");

-- Create CRM Sync Settings table (global configuration)
CREATE TABLE IF NOT EXISTS "crm_sync_settings" (
    "id" TEXT NOT NULL,
    "is_global_sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_sync_direction" TEXT NOT NULL DEFAULT 'app_to_ghl',
    "sync_on_create" BOOLEAN NOT NULL DEFAULT true,
    "sync_on_update" BOOLEAN NOT NULL DEFAULT true,
    "sync_batch_size" INTEGER NOT NULL DEFAULT 50,
    "retry_attempts" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_seconds" INTEGER NOT NULL DEFAULT 60,
    "ghl_api_key" TEXT,
    "ghl_location_id" TEXT,
    "ghl_connection_status" TEXT NOT NULL DEFAULT 'disconnected',
    "ghl_last_tested" TIMESTAMP(3),
    "ghl_last_tested_by" TEXT,
    "last_updated_by" TEXT NOT NULL,
    "last_saved_by" TEXT,
    "last_saved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_sync_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_sync_settings_last_saved_by_key" ON "crm_sync_settings"("last_saved_by");

ALTER TABLE "crm_sync_settings" 
ADD CONSTRAINT "crm_sync_settings_last_saved_by_fkey" 
FOREIGN KEY ("last_saved_by") 
REFERENCES "user_profiles"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- =====================================================
-- PHASE 2: FIELD DEFINITION TABLES
-- =====================================================

-- Create GoHighLevel Fields table
CREATE TABLE IF NOT EXISTS "ghl_fields" (
    "id" TEXT NOT NULL,
    "ghl_field_id" TEXT NOT NULL,
    "ghl_field_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "picklist_options" JSONB,
    "is_system_field" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ghl_fields_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ghl_fields_ghl_field_id_key" ON "ghl_fields"("ghl_field_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ghl_fields_ghl_field_key_key" ON "ghl_fields"("ghl_field_key");

-- Create Field Groups table
CREATE TABLE IF NOT EXISTS "field_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_groups_pkey" PRIMARY KEY ("id")
);

-- Create App Fields table
CREATE TABLE IF NOT EXISTS "app_fields" (
    "id" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "model_name" TEXT,
    "is_system_field" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_fields_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_fields_field_key_key" ON "app_fields"("field_key");
CREATE INDEX IF NOT EXISTS "app_fields_group_id_idx" ON "app_fields"("group_id");

ALTER TABLE "app_fields" 
ADD CONSTRAINT "app_fields_group_id_fkey" 
FOREIGN KEY ("group_id") 
REFERENCES "field_groups"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- =====================================================
-- PHASE 3: FIELD MAPPINGS TABLE
-- =====================================================

-- Create Field Mappings table (core sync logic)
CREATE TABLE IF NOT EXISTS "field_mappings" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "ghl_field_id" TEXT NOT NULL,
    "app_field_id" TEXT NOT NULL,
    "sync_direction" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "display_label" TEXT,
    "transform_rules" JSONB,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_synced_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "field_mappings_ghl_field_id_app_field_id_key" 
ON "field_mappings"("ghl_field_id", "app_field_id");

CREATE INDEX IF NOT EXISTS "field_mappings_group_id_idx" ON "field_mappings"("group_id");
CREATE INDEX IF NOT EXISTS "field_mappings_is_enabled_idx" ON "field_mappings"("is_enabled");

ALTER TABLE "field_mappings" 
ADD CONSTRAINT "field_mappings_app_field_id_fkey" 
FOREIGN KEY ("app_field_id") 
REFERENCES "app_fields"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

ALTER TABLE "field_mappings" 
ADD CONSTRAINT "field_mappings_ghl_field_id_fkey" 
FOREIGN KEY ("ghl_field_id") 
REFERENCES "ghl_fields"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

ALTER TABLE "field_mappings" 
ADD CONSTRAINT "field_mappings_group_id_fkey" 
FOREIGN KEY ("group_id") 
REFERENCES "field_groups"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- =====================================================
-- PHASE 4: SYNC LOGS TABLE
-- =====================================================

-- Create CRM Sync Logs table (debugging and monitoring)
CREATE TABLE IF NOT EXISTS "crm_sync_logs" (
    "id" TEXT NOT NULL,
    "mapping_id" TEXT NOT NULL,
    "user_id" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "data_snapshot" JSONB,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crm_sync_logs_mapping_id_idx" ON "crm_sync_logs"("mapping_id");
CREATE INDEX IF NOT EXISTS "crm_sync_logs_status_idx" ON "crm_sync_logs"("status");
CREATE INDEX IF NOT EXISTS "crm_sync_logs_created_at_idx" ON "crm_sync_logs"("created_at");

-- =====================================================
-- NOTES FOR DEVELOPERS
-- =====================================================

-- 1. Table Dependencies (creation order matters):
--    a. user_profiles (already exists)
--    b. field_groups
--    c. ghl_fields, app_fields
--    d. field_mappings
--    e. crm_sync_settings, crm_sync_change_logs, crm_sync_logs

-- 2. Foreign Key Relationships:
--    - crm_sync_settings.last_saved_by -> user_profiles.id
--    - app_fields.group_id -> field_groups.id
--    - field_mappings.app_field_id -> app_fields.id
--    - field_mappings.ghl_field_id -> ghl_fields.id
--    - field_mappings.group_id -> field_groups.id

-- 3. Cascade Behaviors:
--    - field_mappings cascades DELETE from app_fields and ghl_fields
--    - Other relations use SET NULL on delete

-- 4. Unique Constraints:
--    - ghl_fields: ghl_field_id, ghl_field_key
--    - app_fields: field_key
--    - field_mappings: (ghl_field_id, app_field_id) combination
--    - crm_sync_settings: last_saved_by

-- 5. Indexes for Performance:
--    - All primary keys are automatically indexed
--    - Foreign keys have explicit indexes
--    - Timestamp columns for filtering (created_at)
--    - Status/type columns for filtering
--    - is_enabled flag for active mappings

-- 6. JSONB Columns (flexible data storage):
--    - crm_sync_change_logs: action_details, old_value, new_value
--    - ghl_fields: picklist_options
--    - field_mappings: transform_rules
--    - crm_sync_logs: data_snapshot

-- =====================================================
-- ROLLBACK PROCEDURE (if needed)
-- =====================================================

-- To rollback this migration, run in reverse order:
-- DROP TABLE IF EXISTS "crm_sync_logs" CASCADE;
-- DROP TABLE IF EXISTS "field_mappings" CASCADE;
-- DROP TABLE IF EXISTS "app_fields" CASCADE;
-- DROP TABLE IF EXISTS "ghl_fields" CASCADE;
-- DROP TABLE IF EXISTS "field_groups" CASCADE;
-- DROP TABLE IF EXISTS "crm_sync_settings" CASCADE;
-- DROP TABLE IF EXISTS "crm_sync_change_logs" CASCADE;

-- =====================================================
-- END OF MIGRATION REFERENCE
-- =====================================================
