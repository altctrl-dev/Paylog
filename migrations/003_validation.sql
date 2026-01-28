-- Validation Script: Verify Approval Workflow Migration
-- Date: 2026-01-24
-- Purpose: Comprehensive validation of schema changes and data integrity

-- =============================================================================
-- SECTION 1: Schema Validation
-- =============================================================================

-- Verify credit_notes table structure
SELECT
  'credit_notes' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'credit_notes'
  AND column_name IN ('status', 'approved_by_id', 'approved_at', 'rejection_reason')
ORDER BY ordinal_position;
-- Expected: 4 rows with correct types and defaults

-- Verify advance_payments table structure
SELECT
  'advance_payments' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'advance_payments'
  AND column_name IN (
    'status', 'approved_by_id', 'approved_at', 'rejection_reason',
    'deleted_at', 'deleted_by_id', 'deleted_reason'
  )
ORDER BY ordinal_position;
-- Expected: 7 rows with correct types and defaults

-- =============================================================================
-- SECTION 2: Foreign Key Constraints Validation
-- =============================================================================

-- Verify credit_notes foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'credit_notes'
  AND kcu.column_name = 'approved_by_id';
-- Expected: 1 row (fk_credit_notes_approved_by -> users.id)

-- Verify advance_payments foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'advance_payments'
  AND kcu.column_name IN ('approved_by_id', 'deleted_by_id');
-- Expected: 2 rows (fk_advance_payments_approved_by, fk_advance_payments_deleted_by)

-- =============================================================================
-- SECTION 3: Index Validation
-- =============================================================================

-- Verify credit_notes indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'credit_notes'
  AND indexname IN ('idx_credit_notes_status', 'idx_credit_notes_approved_by')
ORDER BY indexname;
-- Expected: 2 rows

-- Verify advance_payments indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'advance_payments'
  AND indexname IN (
    'idx_advance_payments_status',
    'idx_advance_payments_approved_by',
    'idx_advance_payments_deleted'
  )
ORDER BY indexname;
-- Expected: 3 rows

-- =============================================================================
-- SECTION 4: Data Integrity Validation
-- =============================================================================

-- Validate credit_notes data migration
SELECT
  'credit_notes' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as with_approval_date,
  COUNT(CASE WHEN approved_by_id IS NOT NULL THEN 1 END) as with_approver,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_count
FROM credit_notes;
-- Expected:
--   - null_status_count = 0 (status is NOT NULL)
--   - All existing records should be 'approved'
--   - approved_count should equal total_records for existing data

-- Validate advance_payments data migration
SELECT
  'advance_payments' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as with_approval_date,
  COUNT(CASE WHEN approved_by_id IS NOT NULL THEN 1 END) as with_approver,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted_count,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_count
FROM advance_payments;
-- Expected:
--   - null_status_count = 0 (status is NOT NULL)
--   - All existing records should be 'approved'
--   - approved_count should equal total_records for existing data

-- =============================================================================
-- SECTION 5: Referential Integrity Checks
-- =============================================================================

-- Check for orphaned approved_by_id references in credit_notes
SELECT
  cn.id as credit_note_id,
  cn.approved_by_id,
  'Orphaned approved_by_id' as issue
FROM credit_notes cn
LEFT JOIN users u ON cn.approved_by_id = u.id
WHERE cn.approved_by_id IS NOT NULL
  AND u.id IS NULL;
-- Expected: 0 rows (no orphaned references)

-- Check for orphaned approved_by_id references in advance_payments
SELECT
  ap.id as advance_payment_id,
  ap.approved_by_id,
  'Orphaned approved_by_id' as issue
FROM advance_payments ap
LEFT JOIN users u ON ap.approved_by_id = u.id
WHERE ap.approved_by_id IS NOT NULL
  AND u.id IS NULL;
-- Expected: 0 rows (no orphaned references)

-- Check for orphaned deleted_by_id references in advance_payments
SELECT
  ap.id as advance_payment_id,
  ap.deleted_by_id,
  'Orphaned deleted_by_id' as issue
FROM advance_payments ap
LEFT JOIN users u ON ap.deleted_by_id = u.id
WHERE ap.deleted_by_id IS NOT NULL
  AND u.id IS NULL;
-- Expected: 0 rows (no orphaned references)

-- =============================================================================
-- SECTION 6: Business Logic Validation
-- =============================================================================

-- Validate credit_notes: approved records should have approved_at
SELECT
  COUNT(*) as approved_without_date_count
FROM credit_notes
WHERE status = 'approved'
  AND approved_at IS NULL
  AND deleted_at IS NULL;
-- Expected: 0 rows (all approved records should have approved_at)

-- Validate advance_payments: approved records should have approved_at
SELECT
  COUNT(*) as approved_without_date_count
FROM advance_payments
WHERE status = 'approved'
  AND approved_at IS NULL;
-- Expected: 0 rows (all approved records should have approved_at)

-- Validate credit_notes: rejected records should have rejection_reason
SELECT
  id,
  status,
  rejection_reason
FROM credit_notes
WHERE status = 'rejected'
  AND (rejection_reason IS NULL OR rejection_reason = '');
-- Expected: 0 rows (rejected records should have reason)

-- Validate advance_payments: rejected records should have rejection_reason
SELECT
  id,
  status,
  rejection_reason
FROM advance_payments
WHERE status = 'rejected'
  AND (rejection_reason IS NULL OR rejection_reason = '');
-- Expected: 0 rows (rejected records should have reason)

-- =============================================================================
-- SECTION 7: Performance Validation
-- =============================================================================

-- Test credit_notes status index usage
EXPLAIN ANALYZE
SELECT * FROM credit_notes WHERE status = 'pending_approval';
-- Expected: Index Scan using idx_credit_notes_status

-- Test advance_payments status index usage
EXPLAIN ANALYZE
SELECT * FROM advance_payments WHERE status = 'pending_approval';
-- Expected: Index Scan using idx_advance_payments_status

-- Test credit_notes approved_by_id index usage
EXPLAIN ANALYZE
SELECT * FROM credit_notes WHERE approved_by_id = 1;
-- Expected: Index Scan using idx_credit_notes_approved_by

-- Test advance_payments approved_by_id index usage
EXPLAIN ANALYZE
SELECT * FROM advance_payments WHERE approved_by_id = 1;
-- Expected: Index Scan using idx_advance_payments_approved_by

-- Test advance_payments soft delete index usage
EXPLAIN ANALYZE
SELECT * FROM advance_payments WHERE deleted_at IS NULL;
-- Expected: Index Scan using idx_advance_payments_deleted

-- =============================================================================
-- SECTION 8: Summary Report
-- =============================================================================

-- Generate comprehensive summary
SELECT
  'Migration Validation Summary' as report_type,
  (SELECT COUNT(*) FROM credit_notes) as total_credit_notes,
  (SELECT COUNT(*) FROM credit_notes WHERE status = 'approved') as approved_credit_notes,
  (SELECT COUNT(*) FROM advance_payments) as total_advance_payments,
  (SELECT COUNT(*) FROM advance_payments WHERE status = 'approved') as approved_advance_payments,
  (SELECT COUNT(*) FROM advance_payments WHERE deleted_at IS NOT NULL) as soft_deleted_advance_payments;

-- =============================================================================
-- NOTES
-- =============================================================================

/*
SUCCESS CRITERIA:
1. All schema changes present (columns, indexes, constraints)
2. All existing records have status = 'approved'
3. All existing records have approved_at = created_at
4. No orphaned foreign key references
5. All indexes are properly created and used
6. No NULL status values (NOT NULL constraint enforced)

FAILURE INDICATORS:
- Missing columns or indexes
- NULL status values in any record
- Orphaned foreign key references
- approved_at is NULL for approved records
- Indexes not being used in query plans

NEXT STEPS:
1. Run all validation queries
2. Verify all expected results match
3. Test application endpoints for credit notes and advance payments
4. Monitor query performance with new indexes
5. Update application code to use new approval workflow
*/
