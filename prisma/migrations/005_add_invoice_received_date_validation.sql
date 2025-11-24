-- Validation Script: 005_add_invoice_received_date
-- Purpose: Verify the migration was applied successfully
-- Author: Database Modeler (DBM)
-- Date: 2025-11-20

-- This script should be run AFTER applying the migration to verify:
-- 1. Column exists with correct type
-- 2. Column is nullable
-- 3. No data integrity issues
-- 4. Schema is consistent with Prisma model

\echo '=== Validation: 005_add_invoice_received_date ==='
\echo ''

-- Test 1: Verify column exists
\echo 'Test 1: Verify invoice_received_date column exists'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name = 'invoice_received_date';
-- Expected: 1 row showing column exists

\echo ''

-- Test 2: Verify column properties
\echo 'Test 2: Verify column type and nullability'
SELECT
    CASE
        WHEN data_type = 'timestamp without time zone' THEN '✓ Type is correct (timestamp)'
        ELSE '✗ Type is incorrect: ' || data_type
    END as type_check,
    CASE
        WHEN is_nullable = 'YES' THEN '✓ Column is nullable (backward compatible)'
        ELSE '✗ Column is NOT NULL (may break existing records)'
    END as nullable_check
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name = 'invoice_received_date';

\echo ''

-- Test 3: Check existing records are not affected
\echo 'Test 3: Verify existing invoices have NULL invoice_received_date'
SELECT
    COUNT(*) as total_invoices,
    COUNT(invoice_received_date) as invoices_with_received_date,
    COUNT(*) - COUNT(invoice_received_date) as invoices_with_null_received_date
FROM invoices;
-- Expected: invoices_with_null_received_date should equal total_invoices (all existing records should have NULL)

\echo ''

-- Test 4: Verify table constraints are intact
\echo 'Test 4: Verify no constraints were broken'
SELECT
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
  AND contype IN ('p', 'f', 'c', 'u');
-- Expected: All existing constraints should still be present

\echo ''

-- Test 5: Test insert with new field
\echo 'Test 5: Test inserting a record with invoice_received_date'
BEGIN;
    -- This is a dry-run test, will be rolled back
    INSERT INTO invoices (
        invoice_number,
        vendor_id,
        invoice_amount,
        invoice_date,
        invoice_received_date,
        created_by,
        status
    )
    SELECT
        'TEST-VALIDATION-' || gen_random_uuid()::text,
        (SELECT id FROM vendors LIMIT 1),
        100.00,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '2 days',
        (SELECT id FROM users LIMIT 1),
        'pending_approval'
    WHERE EXISTS (SELECT 1 FROM vendors LIMIT 1)
      AND EXISTS (SELECT 1 FROM users LIMIT 1);

    SELECT
        invoice_number,
        invoice_date,
        invoice_received_date,
        CASE
            WHEN invoice_received_date IS NOT NULL THEN '✓ Field accepts values correctly'
            ELSE '✗ Field did not accept value'
        END as insert_check
    FROM invoices
    WHERE invoice_number LIKE 'TEST-VALIDATION-%'
    ORDER BY created_at DESC
    LIMIT 1;

ROLLBACK;

\echo ''
\echo '=== Validation Complete ==='
\echo ''
\echo 'Expected Results Summary:'
\echo '  Test 1: 1 row showing column exists'
\echo '  Test 2: Both checks show ✓'
\echo '  Test 3: All existing invoices have NULL invoice_received_date'
\echo '  Test 4: All existing constraints still present'
\echo '  Test 5: Insert test shows ✓ (transaction rolled back)'
\echo ''
\echo 'If all tests pass, migration is successful!'
