-- =====================================================================
-- PAID STATUS SYNC MIGRATION - SQL REFERENCE
-- =====================================================================
-- Purpose: Manual SQL queries for the paid status sync migration
-- Created: 2025-11-21
--
-- CAUTION: These queries directly modify production data.
--          Always backup before running UPDATE/DELETE queries.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PRE-MIGRATION VERIFICATION
-- ---------------------------------------------------------------------

-- Count total invoices
SELECT COUNT(*) AS total_invoices FROM invoices;

-- Count V2 invoices (have V2 fields)
SELECT COUNT(*) AS v2_invoices
FROM invoices
WHERE currency_id IS NOT NULL
   OR entity_id IS NOT NULL
   OR payment_type_id IS NOT NULL;

-- Count paid vs unpaid
SELECT
  is_paid,
  COUNT(*) AS count
FROM invoices
GROUP BY is_paid
ORDER BY is_paid DESC;

-- Count invoices by status
SELECT
  status,
  COUNT(*) AS count
FROM invoices
GROUP BY status
ORDER BY count DESC;

-- ---------------------------------------------------------------------
-- 2. IDENTIFY INCONSISTENCIES
-- ---------------------------------------------------------------------

-- Inconsistency #1: is_paid=true but status != 'paid'
-- (This is what the migration fixes)
SELECT
  id,
  invoice_number,
  status,
  is_paid,
  currency_id,
  entity_id,
  payment_type_id,
  created_at
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY created_at DESC;

-- Count inconsistency #1
SELECT COUNT(*) AS inconsistent_paid_status
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);

-- Inconsistency #2: status='paid' but is_paid=false
-- (Reverse inconsistency - should not happen)
SELECT
  id,
  invoice_number,
  status,
  is_paid,
  created_at
FROM invoices
WHERE status = 'paid'
  AND is_paid = false
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY created_at DESC;

-- Count inconsistency #2
SELECT COUNT(*) AS reverse_inconsistent_count
FROM invoices
WHERE status = 'paid'
  AND is_paid = false
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- 3. EXPORT AFFECTED RECORDS (BACKUP BEFORE MIGRATION)
-- ---------------------------------------------------------------------

-- Export affected records to CSV (PostgreSQL syntax)
-- Note: Requires superuser or pg_write_server_files role
COPY (
  SELECT
    id,
    invoice_number,
    status AS original_status,
    is_paid,
    currency_id,
    entity_id,
    payment_type_id,
    created_at,
    updated_at
  FROM invoices
  WHERE is_paid = true
    AND status != 'paid'
    AND (currency_id IS NOT NULL
         OR entity_id IS NOT NULL
         OR payment_type_id IS NOT NULL)
  ORDER BY created_at DESC
) TO '/tmp/affected_invoices_backup.csv' WITH CSV HEADER;

-- Alternative: View results to manually copy
SELECT
  id,
  invoice_number,
  status AS original_status,
  is_paid,
  created_at
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY created_at DESC;

-- ---------------------------------------------------------------------
-- 4. MIGRATION QUERY (DO NOT RUN DIRECTLY - USE SCRIPT INSTEAD)
-- ---------------------------------------------------------------------

-- ⚠️  WARNING: This is the actual update query.
-- ⚠️  DO NOT run this manually unless you understand the risks.
-- ⚠️  ALWAYS use the migration script instead: npx tsx scripts/backfill-paid-status-sync.ts
--
-- The migration script provides:
-- - Transaction safety
-- - Pre/post verification
-- - Dry-run mode
-- - Detailed logging
-- - Error handling

-- BEGIN; -- Uncomment if running manually (NOT RECOMMENDED)

UPDATE invoices
SET status = 'paid',
    updated_at = NOW()
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);

-- COMMIT; -- Uncomment if running manually (NOT RECOMMENDED)
-- ROLLBACK; -- Use this if something went wrong

-- ---------------------------------------------------------------------
-- 5. POST-MIGRATION VERIFICATION
-- ---------------------------------------------------------------------

-- Verify no inconsistencies remain (should return 0)
SELECT COUNT(*) AS remaining_inconsistencies
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);

-- Verify updated_at timestamps are recent
-- (All affected invoices should have updated_at within last hour)
SELECT
  id,
  invoice_number,
  status,
  is_paid,
  updated_at,
  NOW() - updated_at AS time_since_update
FROM invoices
WHERE is_paid = true
  AND status = 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Count recently updated invoices
SELECT COUNT(*) AS recently_updated
FROM invoices
WHERE is_paid = true
  AND status = 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
  AND updated_at > NOW() - INTERVAL '1 hour';

-- ---------------------------------------------------------------------
-- 6. DATA INTEGRITY CHECKS
-- ---------------------------------------------------------------------

-- Check for any NULL status values (should not exist)
SELECT COUNT(*) AS null_status_count
FROM invoices
WHERE status IS NULL;

-- Check for any NULL is_paid values (should not exist after migration)
SELECT COUNT(*) AS null_is_paid_count
FROM invoices
WHERE is_paid IS NULL;

-- Verify all paid invoices have status='paid'
SELECT
  is_paid,
  status,
  COUNT(*) AS count
FROM invoices
WHERE is_paid = true
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
GROUP BY is_paid, status
ORDER BY count DESC;

-- Expected result:
-- is_paid | status | count
-- --------+--------+-------
-- true    | paid   | 23     (all paid invoices should have status='paid')

-- ---------------------------------------------------------------------
-- 7. ROLLBACK QUERIES (MANUAL - USE WITH CAUTION)
-- ---------------------------------------------------------------------

-- ⚠️  WARNING: Manual rollback is NOT RECOMMENDED.
-- ⚠️  We cannot determine the original status values accurately.
-- ⚠️  Restore from backup instead: pg_restore or railway backup restore

-- If you MUST rollback without a backup (NOT RECOMMENDED):
-- This assumes all invoices were originally 'unpaid', which may not be true.

-- Option 1: Rollback to 'unpaid' (GUESS - may be inaccurate)
-- UPDATE invoices
-- SET status = 'unpaid',
--     updated_at = NOW()
-- WHERE is_paid = true
--   AND status = 'paid'
--   AND (currency_id IS NOT NULL
--        OR entity_id IS NOT NULL
--        OR payment_type_id IS NOT NULL)
--   AND updated_at > NOW() - INTERVAL '1 hour';

-- Option 2: Rollback using backup CSV
-- Requires importing backup CSV and using UPDATE FROM

-- Step 1: Create temp table
-- CREATE TEMP TABLE invoice_backup (
--   id INT,
--   invoice_number VARCHAR,
--   original_status VARCHAR,
--   is_paid BOOLEAN,
--   currency_id INT,
--   entity_id INT,
--   payment_type_id INT,
--   created_at TIMESTAMP,
--   updated_at TIMESTAMP
-- );

-- Step 2: Import backup CSV
-- COPY invoice_backup FROM '/tmp/affected_invoices_backup.csv' WITH CSV HEADER;

-- Step 3: Rollback using backup
-- UPDATE invoices
-- SET status = invoice_backup.original_status,
--     updated_at = NOW()
-- FROM invoice_backup
-- WHERE invoices.id = invoice_backup.id;

-- Step 4: Cleanup
-- DROP TABLE invoice_backup;

-- ---------------------------------------------------------------------
-- 8. MONITORING QUERIES
-- ---------------------------------------------------------------------

-- Count invoices by consistency state
SELECT
  CASE
    WHEN is_paid = true AND status = 'paid' THEN 'Consistent (Paid)'
    WHEN is_paid = false AND status != 'paid' THEN 'Consistent (Unpaid)'
    WHEN is_paid = true AND status != 'paid' THEN 'Inconsistent (Should be Paid)'
    WHEN is_paid = false AND status = 'paid' THEN 'Inconsistent (Should be Unpaid)'
    ELSE 'Unknown'
  END AS consistency_state,
  COUNT(*) AS count
FROM invoices
WHERE currency_id IS NOT NULL
   OR entity_id IS NOT NULL
   OR payment_type_id IS NOT NULL
GROUP BY consistency_state
ORDER BY count DESC;

-- Show recent invoice updates (last 24 hours)
SELECT
  id,
  invoice_number,
  status,
  is_paid,
  updated_at,
  NOW() - updated_at AS age
FROM invoices
WHERE updated_at > NOW() - INTERVAL '24 hours'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY updated_at DESC
LIMIT 50;

-- Monitor for new inconsistencies (should always return 0 after migration)
-- Run this periodically to ensure bug is truly fixed
SELECT COUNT(*) AS new_inconsistencies
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
  AND created_at > NOW() - INTERVAL '1 day';

-- ---------------------------------------------------------------------
-- 9. SAMPLE DATA QUERIES
-- ---------------------------------------------------------------------

-- Show 10 random paid invoices
SELECT
  id,
  invoice_number,
  status,
  is_paid,
  invoice_amount,
  paid_date,
  paid_amount
FROM invoices
WHERE is_paid = true
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY RANDOM()
LIMIT 10;

-- Show 10 random unpaid invoices
SELECT
  id,
  invoice_number,
  status,
  is_paid,
  invoice_amount,
  due_date
FROM invoices
WHERE is_paid = false
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY RANDOM()
LIMIT 10;

-- =====================================================================
-- END OF SQL REFERENCE
-- =====================================================================

-- RECOMMENDED WORKFLOW:
-- 1. Run verification queries (Section 1-2)
-- 2. Export affected records (Section 3) - BACKUP!
-- 3. Use migration script (NOT manual query): npx tsx scripts/backfill-paid-status-sync.ts
-- 4. Run post-migration verification (Section 5)
-- 5. Run data integrity checks (Section 6)
-- 6. Monitor for new inconsistencies (Section 8)
