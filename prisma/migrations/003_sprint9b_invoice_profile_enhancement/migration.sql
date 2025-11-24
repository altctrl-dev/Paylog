-- ============================================================================
-- Sprint 9B Phase 1: InvoiceProfile Enhancement Migration
-- ============================================================================
-- Purpose: Add 7 new fields to InvoiceProfile for comprehensive invoice templates
-- Author: Database Modeler (DBM)
-- Date: 2025-10-24
-- Database: PostgreSQL 17
-- Migration Type: ADDITIVE (No data loss)
-- ============================================================================

-- ============================================================================
-- SAFETY CHECKS: Verify Required Master Data Exists
-- ============================================================================

-- Verify at least one active entity exists
DO $$
DECLARE
  entity_count INT;
BEGIN
  SELECT COUNT(*) INTO entity_count FROM entities WHERE is_active = true;
  IF entity_count = 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: No active entities found. Create at least one active entity before running this migration.';
  END IF;
  RAISE NOTICE 'Safety Check PASSED: % active entity/entities found', entity_count;
END $$;

-- Verify at least one active vendor exists
DO $$
DECLARE
  vendor_count INT;
BEGIN
  SELECT COUNT(*) INTO vendor_count FROM vendors WHERE is_active = true;
  IF vendor_count = 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: No active vendors found. Create at least one active vendor before running this migration.';
  END IF;
  RAISE NOTICE 'Safety Check PASSED: % active vendor(s) found', vendor_count;
END $$;

-- Verify at least one active category exists
DO $$
DECLARE
  category_count INT;
BEGIN
  SELECT COUNT(*) INTO category_count FROM categories WHERE is_active = true;
  IF category_count = 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: No active categories found. Create at least one active category before running this migration.';
  END IF;
  RAISE NOTICE 'Safety Check PASSED: % active category/categories found', category_count;
END $$;

-- Verify at least one active currency exists
DO $$
DECLARE
  currency_count INT;
BEGIN
  SELECT COUNT(*) INTO currency_count FROM currencies WHERE is_active = true;
  IF currency_count = 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: No active currencies found. Create at least one active currency before running this migration.';
  END IF;
  RAISE NOTICE 'Safety Check PASSED: % active currency/currencies found', currency_count;
END $$;

-- ============================================================================
-- STEP 1: Add New Columns (Initially Nullable for Safe Migration)
-- ============================================================================

-- Add entity_id column (nullable during migration)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS entity_id INTEGER;

-- Add vendor_id column (nullable during migration)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS vendor_id INTEGER;

-- Add category_id column (nullable during migration)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Add currency_id column (nullable during migration)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS currency_id INTEGER;

-- Add prepaid_postpaid column (optional)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS prepaid_postpaid VARCHAR(10);

-- Add tds_applicable column (required, default false)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT false NOT NULL;

-- Add tds_percentage column (optional)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS tds_percentage DOUBLE PRECISION;

RAISE NOTICE 'STEP 1 COMPLETE: All 7 columns added to invoice_profiles';

-- ============================================================================
-- STEP 2: Backfill Existing Profiles with Safe Defaults
-- ============================================================================

-- Get first active entity, vendor, category, currency for backfilling
DO $$
DECLARE
  default_entity_id INT;
  default_vendor_id INT;
  default_category_id INT;
  default_currency_id INT;
  profiles_updated INT;
BEGIN
  -- Get first active entity
  SELECT id INTO default_entity_id
  FROM entities
  WHERE is_active = true
  ORDER BY id ASC
  LIMIT 1;

  -- Get first active vendor
  SELECT id INTO default_vendor_id
  FROM vendors
  WHERE is_active = true
  ORDER BY id ASC
  LIMIT 1;

  -- Get first active category
  SELECT id INTO default_category_id
  FROM categories
  WHERE is_active = true
  ORDER BY id ASC
  LIMIT 1;

  -- Get first active currency
  SELECT id INTO default_currency_id
  FROM currencies
  WHERE is_active = true
  ORDER BY id ASC
  LIMIT 1;

  -- Backfill existing profiles
  UPDATE invoice_profiles
  SET
    entity_id = default_entity_id,
    vendor_id = default_vendor_id,
    category_id = default_category_id,
    currency_id = default_currency_id,
    tds_applicable = false,
    tds_percentage = NULL,
    prepaid_postpaid = NULL
  WHERE entity_id IS NULL;

  GET DIAGNOSTICS profiles_updated = ROW_COUNT;

  RAISE NOTICE 'STEP 2 COMPLETE: Backfilled % existing profile(s) with defaults:', profiles_updated;
  RAISE NOTICE '  - Entity ID: %', default_entity_id;
  RAISE NOTICE '  - Vendor ID: %', default_vendor_id;
  RAISE NOTICE '  - Category ID: %', default_category_id;
  RAISE NOTICE '  - Currency ID: %', default_currency_id;
  RAISE NOTICE '  - TDS Applicable: false';
  RAISE NOTICE '  - TDS Percentage: NULL';
  RAISE NOTICE '  - Prepaid/Postpaid: NULL';
END $$;

-- ============================================================================
-- STEP 3: Make Foreign Key Columns NOT NULL
-- ============================================================================

-- Now that all existing rows have values, make columns NOT NULL
ALTER TABLE invoice_profiles
ALTER COLUMN entity_id SET NOT NULL;

ALTER TABLE invoice_profiles
ALTER COLUMN vendor_id SET NOT NULL;

ALTER TABLE invoice_profiles
ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE invoice_profiles
ALTER COLUMN currency_id SET NOT NULL;

RAISE NOTICE 'STEP 3 COMPLETE: Made FK columns NOT NULL';

-- ============================================================================
-- STEP 4: Create Foreign Key Constraints
-- ============================================================================

-- Add FK constraint to entities (onDelete: RESTRICT)
ALTER TABLE invoice_profiles
ADD CONSTRAINT fk_invoice_profiles_entity
FOREIGN KEY (entity_id)
REFERENCES entities(id)
ON DELETE RESTRICT;

-- Add FK constraint to vendors (onDelete: RESTRICT)
ALTER TABLE invoice_profiles
ADD CONSTRAINT fk_invoice_profiles_vendor
FOREIGN KEY (vendor_id)
REFERENCES vendors(id)
ON DELETE RESTRICT;

-- Add FK constraint to categories (onDelete: RESTRICT)
ALTER TABLE invoice_profiles
ADD CONSTRAINT fk_invoice_profiles_category
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE RESTRICT;

-- Add FK constraint to currencies (onDelete: RESTRICT)
ALTER TABLE invoice_profiles
ADD CONSTRAINT fk_invoice_profiles_currency
FOREIGN KEY (currency_id)
REFERENCES currencies(id)
ON DELETE RESTRICT;

RAISE NOTICE 'STEP 4 COMPLETE: Created 4 foreign key constraints with RESTRICT';

-- ============================================================================
-- STEP 5: Create Indexes for Query Performance
-- ============================================================================

-- Index on entity_id
CREATE INDEX IF NOT EXISTS idx_invoice_profiles_entity
ON invoice_profiles(entity_id);

-- Index on vendor_id
CREATE INDEX IF NOT EXISTS idx_invoice_profiles_vendor
ON invoice_profiles(vendor_id);

-- Index on category_id
CREATE INDEX IF NOT EXISTS idx_invoice_profiles_category
ON invoice_profiles(category_id);

-- Index on currency_id
CREATE INDEX IF NOT EXISTS idx_invoice_profiles_currency
ON invoice_profiles(currency_id);

RAISE NOTICE 'STEP 5 COMPLETE: Created 4 indexes on FK columns';

-- ============================================================================
-- STEP 6: Add Check Constraint for prepaid_postpaid
-- ============================================================================

-- Ensure prepaid_postpaid is either 'prepaid', 'postpaid', or NULL
ALTER TABLE invoice_profiles
ADD CONSTRAINT chk_invoice_profiles_prepaid_postpaid
CHECK (prepaid_postpaid IS NULL OR prepaid_postpaid IN ('prepaid', 'postpaid'));

RAISE NOTICE 'STEP 6 COMPLETE: Added CHECK constraint for prepaid_postpaid';

-- ============================================================================
-- STEP 7: Add Check Constraint for tds_percentage
-- ============================================================================

-- Ensure tds_percentage is between 0 and 100 if not NULL
ALTER TABLE invoice_profiles
ADD CONSTRAINT chk_invoice_profiles_tds_percentage
CHECK (tds_percentage IS NULL OR (tds_percentage >= 0 AND tds_percentage <= 100));

RAISE NOTICE 'STEP 7 COMPLETE: Added CHECK constraint for tds_percentage (0-100)';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  profile_count INT;
  entity_count INT;
  vendor_count INT;
  category_count INT;
  currency_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM invoice_profiles;
  SELECT COUNT(DISTINCT entity_id) INTO entity_count FROM invoice_profiles;
  SELECT COUNT(DISTINCT vendor_id) INTO vendor_count FROM invoice_profiles;
  SELECT COUNT(DISTINCT category_id) INTO category_count FROM invoice_profiles;
  SELECT COUNT(DISTINCT currency_id) INTO currency_count FROM invoice_profiles;

  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION COMPLETE: Sprint 9B InvoiceProfile Enhancement';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total Profiles: %', profile_count;
  RAISE NOTICE 'Unique Entities Referenced: %', entity_count;
  RAISE NOTICE 'Unique Vendors Referenced: %', vendor_count;
  RAISE NOTICE 'Unique Categories Referenced: %', category_count;
  RAISE NOTICE 'Unique Currencies Referenced: %', currency_count;
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Schema Changes:';
  RAISE NOTICE '  ✓ Added 7 new columns';
  RAISE NOTICE '  ✓ Created 4 foreign key constraints (RESTRICT)';
  RAISE NOTICE '  ✓ Created 4 indexes for performance';
  RAISE NOTICE '  ✓ Added 2 CHECK constraints';
  RAISE NOTICE '  ✓ Backfilled existing profiles with safe defaults';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run validation queries (003_sprint9b_validation.sql)';
  RAISE NOTICE '  2. Review backfilled data and update as needed';
  RAISE NOTICE '  3. Run: npx prisma generate';
  RAISE NOTICE '  4. Test Prisma Client with new fields';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
END $$;
