-- ============================================================================
-- Validation Queries: Sprint 9A Migration
-- Created: 2025-10-23
-- Description: Validation queries to verify Sprint 9A migration success
-- ============================================================================

-- Run these queries after executing 002_sprint9a_admin_reorganization.sql

-- ============================================================================
-- 1. CURRENCY TABLE VALIDATION
-- ============================================================================

-- Check: Currency table exists
SELECT
  'Currency table exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'currencies'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Currency table has 50 records
SELECT
  'Currency count = 50' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM currencies) = 50 THEN 'PASS'
    ELSE 'FAIL - Count: ' || (SELECT COUNT(*) FROM currencies)
  END AS status;

-- Check: All currencies are inactive
SELECT
  'All currencies inactive' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM currencies WHERE is_active = true) = 0 THEN 'PASS'
    ELSE 'FAIL - Active currencies: ' || (SELECT COUNT(*) FROM currencies WHERE is_active = true)
  END AS status;

-- Check: Currency codes are uppercase
SELECT
  'Currency codes uppercase' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM currencies WHERE code != UPPER(code)) = 0 THEN 'PASS'
    ELSE 'FAIL - Lowercase codes: ' || (SELECT COUNT(*) FROM currencies WHERE code != UPPER(code))
  END AS status;

-- Check: Currency codes are 3 characters
SELECT
  'Currency codes length = 3' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM currencies WHERE LENGTH(code) != 3) = 0 THEN 'PASS'
    ELSE 'FAIL - Invalid length: ' || (SELECT COUNT(*) FROM currencies WHERE LENGTH(code) != 3)
  END AS status;

-- Check: Currency indexes exist
SELECT
  'Currency indexes exist' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'currencies'
      AND indexname IN ('idx_currencies_active', 'idx_currencies_code')
    ) = 2 THEN 'PASS'
    ELSE 'FAIL - Missing indexes'
  END AS status;

-- ============================================================================
-- 2. ENTITY TABLE VALIDATION
-- ============================================================================

-- Check: Entity table exists
SELECT
  'Entity table exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'entities'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Entity count matches SubEntity count
SELECT
  'Entity count matches SubEntity' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM entities) = (SELECT COUNT(*) FROM sub_entities) THEN 'PASS'
    ELSE 'FAIL - Entity: ' || (SELECT COUNT(*) FROM entities) || ' SubEntity: ' || (SELECT COUNT(*) FROM sub_entities)
  END AS status;

-- Check: Entity country codes are uppercase
SELECT
  'Entity countries uppercase' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM entities WHERE country != UPPER(country)) = 0 THEN 'PASS'
    ELSE 'FAIL - Lowercase countries: ' || (SELECT COUNT(*) FROM entities WHERE country != UPPER(country))
  END AS status;

-- Check: Entity country codes are 2 characters
SELECT
  'Entity countries length = 2' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM entities WHERE LENGTH(country) != 2) = 0 THEN 'PASS'
    ELSE 'FAIL - Invalid length: ' || (SELECT COUNT(*) FROM entities WHERE LENGTH(country) != 2)
  END AS status;

-- Check: Entity indexes exist
SELECT
  'Entity indexes exist' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'entities'
      AND indexname IN ('idx_entities_active', 'idx_entities_country', 'idx_entities_name')
    ) = 3 THEN 'PASS'
    ELSE 'FAIL - Missing indexes'
  END AS status;

-- Check: SubEntity table still exists (preserved)
SELECT
  'SubEntity table preserved' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'sub_entities'
    ) THEN 'PASS'
    ELSE 'FAIL - SubEntity table dropped (should be preserved)'
  END AS status;

-- ============================================================================
-- 3. VENDOR TABLE ENHANCEMENTS VALIDATION
-- ============================================================================

-- Check: Vendor.address column exists
SELECT
  'Vendor.address exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'vendors' AND column_name = 'address'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Vendor.gst_exemption column exists
SELECT
  'Vendor.gst_exemption exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'vendors' AND column_name = 'gst_exemption'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Vendor.bank_details column exists
SELECT
  'Vendor.bank_details exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'vendors' AND column_name = 'bank_details'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Vendor.gst_exemption defaults to false
SELECT
  'Vendor.gst_exemption defaults false' AS check_name,
  CASE
    WHEN (
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'vendors' AND column_name = 'gst_exemption'
    ) = 'false' THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- ============================================================================
-- 4. CATEGORY TABLE ENHANCEMENTS VALIDATION
-- ============================================================================

-- Check: Category.description column exists
SELECT
  'Category.description exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Category.description is NOT NULL
SELECT
  'Category.description NOT NULL' AS check_name,
  CASE
    WHEN (
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'categories' AND column_name = 'description'
    ) = 'NO' THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: All categories have non-empty descriptions
SELECT
  'All categories have descriptions' AS check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM categories WHERE description IS NULL OR LENGTH(TRIM(description)) = 0) = 0 THEN 'PASS'
    ELSE 'FAIL - Empty descriptions: ' || (SELECT COUNT(*) FROM categories WHERE description IS NULL OR LENGTH(TRIM(description)) = 0)
  END AS status;

-- ============================================================================
-- 5. INVOICE TABLE FOREIGN KEYS VALIDATION
-- ============================================================================

-- Check: Invoice.currency_id column exists
SELECT
  'Invoice.currency_id exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'currency_id'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Invoice.entity_id column exists
SELECT
  'Invoice.entity_id exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'entity_id'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Invoice.currency_id is nullable
SELECT
  'Invoice.currency_id nullable' AS check_name,
  CASE
    WHEN (
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'currency_id'
    ) = 'YES' THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Invoice.entity_id is nullable
SELECT
  'Invoice.entity_id nullable' AS check_name,
  CASE
    WHEN (
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'entity_id'
    ) = 'YES' THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Invoice currency_id foreign key exists
SELECT
  'Invoice.currency_id FK exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'invoices'
      AND kcu.column_name = 'currency_id'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Invoice entity_id foreign key exists
SELECT
  'Invoice.entity_id FK exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'invoices'
      AND kcu.column_name = 'entity_id'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- Check: Invoice indexes exist
SELECT
  'Invoice currency/entity indexes exist' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'invoices'
      AND indexname IN ('idx_invoices_currency', 'idx_invoices_entity')
    ) = 2 THEN 'PASS'
    ELSE 'FAIL - Missing indexes'
  END AS status;

-- ============================================================================
-- 6. ARCHIVE REQUEST TABLE REMOVAL VALIDATION
-- ============================================================================

-- Check: ArchiveRequest table dropped
SELECT
  'ArchiveRequest table dropped' AS check_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'archive_requests'
    ) THEN 'PASS'
    ELSE 'FAIL - ArchiveRequest table still exists'
  END AS status;

-- ============================================================================
-- 7. MIGRATION METADATA VALIDATION
-- ============================================================================

-- Check: Migration recorded in schema_migrations
SELECT
  'Migration recorded' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM schema_migrations
      WHERE migration_name = '002_sprint9a_admin_reorganization'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- List all validation checks with status
SELECT
  ROW_NUMBER() OVER (ORDER BY check_name) AS "#",
  check_name,
  status
FROM (
  -- (All checks combined - rerun individual check queries above for detailed results)
  VALUES
    ('Currency table exists', 'CHECK MANUALLY'),
    ('Currency count = 50', 'CHECK MANUALLY'),
    ('All currencies inactive', 'CHECK MANUALLY'),
    ('Currency codes uppercase', 'CHECK MANUALLY'),
    ('Currency codes length = 3', 'CHECK MANUALLY'),
    ('Currency indexes exist', 'CHECK MANUALLY'),
    ('Entity table exists', 'CHECK MANUALLY'),
    ('Entity count matches SubEntity', 'CHECK MANUALLY'),
    ('Entity countries uppercase', 'CHECK MANUALLY'),
    ('Entity countries length = 2', 'CHECK MANUALLY'),
    ('Entity indexes exist', 'CHECK MANUALLY'),
    ('SubEntity table preserved', 'CHECK MANUALLY'),
    ('Vendor.address exists', 'CHECK MANUALLY'),
    ('Vendor.gst_exemption exists', 'CHECK MANUALLY'),
    ('Vendor.bank_details exists', 'CHECK MANUALLY'),
    ('Vendor.gst_exemption defaults false', 'CHECK MANUALLY'),
    ('Category.description exists', 'CHECK MANUALLY'),
    ('Category.description NOT NULL', 'CHECK MANUALLY'),
    ('All categories have descriptions', 'CHECK MANUALLY'),
    ('Invoice.currency_id exists', 'CHECK MANUALLY'),
    ('Invoice.entity_id exists', 'CHECK MANUALLY'),
    ('Invoice.currency_id nullable', 'CHECK MANUALLY'),
    ('Invoice.entity_id nullable', 'CHECK MANUALLY'),
    ('Invoice.currency_id FK exists', 'CHECK MANUALLY'),
    ('Invoice.entity_id FK exists', 'CHECK MANUALLY'),
    ('Invoice currency/entity indexes exist', 'CHECK MANUALLY'),
    ('ArchiveRequest table dropped', 'CHECK MANUALLY'),
    ('Migration recorded', 'CHECK MANUALLY')
) AS checks(check_name, status);

-- ============================================================================
-- MANUAL VERIFICATION QUERIES
-- ============================================================================

-- Verify Currency data sample
SELECT 'Currency Sample' AS section, code, name, symbol, is_active
FROM currencies
ORDER BY code
LIMIT 10;

-- Verify Entity data sample
SELECT 'Entity Sample' AS section, id, name, address, country, is_active
FROM entities
ORDER BY id
LIMIT 10;

-- Verify Vendor enhancements sample
SELECT 'Vendor Sample' AS section, id, name, address, gst_exemption,
       CASE WHEN bank_details IS NULL THEN 'NULL' ELSE 'HAS DATA' END AS bank_details_status
FROM vendors
LIMIT 10;

-- Verify Category descriptions sample
SELECT 'Category Sample' AS section, id, name,
       LEFT(description, 50) || '...' AS description_preview
FROM categories
LIMIT 10;

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================

-- After successful migration, all checks should return 'PASS'
-- If any check returns 'FAIL', review the migration script and database state

-- ============================================================================
-- POST-MIGRATION ADMIN TASKS
-- ============================================================================

-- 1. Activate required currencies (example):
-- UPDATE currencies SET is_active = true WHERE code IN ('USD', 'EUR', 'INR');

-- 2. Update Entity addresses and countries (example):
-- UPDATE entities SET
--   address = '123 Main St, New York, NY 10001, USA',
--   country = 'US'
-- WHERE id = 1;

-- 3. Review and update Vendor fields (optional)
-- UPDATE vendors SET
--   address = '456 Vendor Ave, Los Angeles, CA 90001, USA',
--   gst_exemption = true,
--   bank_details = 'Account: 1234567890, Bank: ABC Bank, Routing: 123456789'
-- WHERE id = 1;

-- 4. Verify Category descriptions are accurate (review manually)
