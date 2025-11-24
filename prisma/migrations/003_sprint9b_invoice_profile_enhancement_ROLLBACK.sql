-- ============================================================================
-- Sprint 9B Phase 1: InvoiceProfile Enhancement ROLLBACK Migration
-- ============================================================================
-- Purpose: Reverse the 7 new field additions to InvoiceProfile
-- Author: Database Modeler (DBM)
-- Date: 2025-10-24
-- Database: PostgreSQL 17
-- Migration Type: DESTRUCTIVE (Data loss warning)
-- ============================================================================

-- ⚠️  WARNING: This rollback will DROP 7 columns from invoice_profiles.
-- ⚠️  Any data in these columns will be PERMANENTLY LOST.
-- ⚠️  Ensure you have a backup before proceeding!

-- ============================================================================
-- STEP 1: Drop Check Constraints
-- ============================================================================

-- Drop CHECK constraint for tds_percentage
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS chk_invoice_profiles_tds_percentage;

RAISE NOTICE 'STEP 1A: Dropped CHECK constraint chk_invoice_profiles_tds_percentage';

-- Drop CHECK constraint for prepaid_postpaid
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS chk_invoice_profiles_prepaid_postpaid;

RAISE NOTICE 'STEP 1B: Dropped CHECK constraint chk_invoice_profiles_prepaid_postpaid';

-- ============================================================================
-- STEP 2: Drop Indexes
-- ============================================================================

-- Drop index on currency_id
DROP INDEX IF EXISTS idx_invoice_profiles_currency;

RAISE NOTICE 'STEP 2A: Dropped index idx_invoice_profiles_currency';

-- Drop index on category_id
DROP INDEX IF EXISTS idx_invoice_profiles_category;

RAISE NOTICE 'STEP 2B: Dropped index idx_invoice_profiles_category';

-- Drop index on vendor_id
DROP INDEX IF EXISTS idx_invoice_profiles_vendor;

RAISE NOTICE 'STEP 2C: Dropped index idx_invoice_profiles_vendor';

-- Drop index on entity_id
DROP INDEX IF EXISTS idx_invoice_profiles_entity;

RAISE NOTICE 'STEP 2D: Dropped index idx_invoice_profiles_entity';

-- ============================================================================
-- STEP 3: Drop Foreign Key Constraints
-- ============================================================================

-- Drop FK constraint to currencies
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS fk_invoice_profiles_currency;

RAISE NOTICE 'STEP 3A: Dropped FK constraint fk_invoice_profiles_currency';

-- Drop FK constraint to categories
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS fk_invoice_profiles_category;

RAISE NOTICE 'STEP 3B: Dropped FK constraint fk_invoice_profiles_category';

-- Drop FK constraint to vendors
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS fk_invoice_profiles_vendor;

RAISE NOTICE 'STEP 3C: Dropped FK constraint fk_invoice_profiles_vendor';

-- Drop FK constraint to entities
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS fk_invoice_profiles_entity;

RAISE NOTICE 'STEP 3D: Dropped FK constraint fk_invoice_profiles_entity';

-- ============================================================================
-- STEP 4: Archive Column Data (Optional - for recovery)
-- ============================================================================

-- Create archive table with current data before dropping columns
DO $$
DECLARE
  profile_count INT;
BEGIN
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS invoice_profiles_sprint9b_rollback_archive (
    id INTEGER,
    name TEXT,
    entity_id INTEGER,
    vendor_id INTEGER,
    category_id INTEGER,
    currency_id INTEGER,
    prepaid_postpaid VARCHAR(10),
    tds_applicable BOOLEAN,
    tds_percentage DOUBLE PRECISION,
    archived_at TIMESTAMP DEFAULT NOW()
  );

  -- Copy current data to archive
  INSERT INTO invoice_profiles_sprint9b_rollback_archive
    (id, name, entity_id, vendor_id, category_id, currency_id, prepaid_postpaid, tds_applicable, tds_percentage)
  SELECT
    id, name, entity_id, vendor_id, category_id, currency_id, prepaid_postpaid, tds_applicable, tds_percentage
  FROM invoice_profiles;

  GET DIAGNOSTICS profile_count = ROW_COUNT;

  RAISE NOTICE 'STEP 4 COMPLETE: Archived % profile(s) to invoice_profiles_sprint9b_rollback_archive', profile_count;
  RAISE NOTICE 'Archive table: invoice_profiles_sprint9b_rollback_archive';
  RAISE NOTICE 'You can restore data from this table if needed';
END $$;

-- ============================================================================
-- STEP 5: Drop Columns (DATA LOSS!)
-- ============================================================================

-- Drop tds_percentage column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS tds_percentage;

RAISE NOTICE 'STEP 5A: Dropped column tds_percentage';

-- Drop tds_applicable column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS tds_applicable;

RAISE NOTICE 'STEP 5B: Dropped column tds_applicable';

-- Drop prepaid_postpaid column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS prepaid_postpaid;

RAISE NOTICE 'STEP 5C: Dropped column prepaid_postpaid';

-- Drop currency_id column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS currency_id;

RAISE NOTICE 'STEP 5D: Dropped column currency_id';

-- Drop category_id column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS category_id;

RAISE NOTICE 'STEP 5E: Dropped column category_id';

-- Drop vendor_id column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS vendor_id;

RAISE NOTICE 'STEP 5F: Dropped column vendor_id';

-- Drop entity_id column
ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS entity_id;

RAISE NOTICE 'STEP 5G: Dropped column entity_id';

-- ============================================================================
-- ROLLBACK SUMMARY
-- ============================================================================

DO $$
DECLARE
  remaining_columns TEXT[];
BEGIN
  -- Get list of remaining columns
  SELECT ARRAY_AGG(column_name ORDER BY ordinal_position)
  INTO remaining_columns
  FROM information_schema.columns
  WHERE table_name = 'invoice_profiles'
    AND table_schema = 'public';

  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'ROLLBACK COMPLETE: Sprint 9B InvoiceProfile Enhancement';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Schema Changes Reversed:';
  RAISE NOTICE '  ✓ Dropped 7 columns';
  RAISE NOTICE '  ✓ Dropped 4 foreign key constraints';
  RAISE NOTICE '  ✓ Dropped 4 indexes';
  RAISE NOTICE '  ✓ Dropped 2 CHECK constraints';
  RAISE NOTICE '  ✓ Archived data before dropping columns';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Remaining Columns in invoice_profiles:';
  RAISE NOTICE '  %', remaining_columns;
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Archive Table: invoice_profiles_sprint9b_rollback_archive';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Revert schema.prisma to previous version';
  RAISE NOTICE '  2. Run: npx prisma generate';
  RAISE NOTICE '  3. Test Prisma Client';
  RAISE NOTICE '  4. (Optional) Restore data from archive table if needed';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
END $$;
