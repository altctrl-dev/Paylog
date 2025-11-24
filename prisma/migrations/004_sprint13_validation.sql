-- ============================================================================
-- Sprint 13 Phase 1: Migration Validation Queries
-- ============================================================================
-- Purpose: Verify successful migration and data integrity
-- Usage: Run after migration to ensure everything is correct
-- ============================================================================

\echo '═════════════════════════════════════════════════════════════'
\echo 'Sprint 13 Invoice Workflow Migration Validation'
\echo '═════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- SECTION 1: Schema Validation
-- ============================================================================

\echo '1. SCHEMA VALIDATION'
\echo '-------------------'

-- Check InvoiceProfile new column exists
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'invoice_profiles.billing_frequency column exists' AS check_description
FROM information_schema.columns
WHERE table_name = 'invoice_profiles'
  AND column_name = 'billing_frequency';

-- Check Invoice new columns exist
SELECT
  CASE
    WHEN COUNT(*) = 8 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || '/8 columns found)'
  END AS status,
  'invoices table has 8 new columns' AS check_description
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN (
    'is_recurring', 'invoice_profile_id', 'is_paid', 'paid_date',
    'paid_amount', 'paid_currency', 'payment_type_id', 'payment_reference'
  );

\echo ''

-- ============================================================================
-- SECTION 2: Foreign Key Validation
-- ============================================================================

\echo '2. FOREIGN KEY CONSTRAINTS'
\echo '--------------------------'

-- Check invoice_profile_id FK exists
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'invoices.invoice_profile_id FK constraint exists' AS check_description
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'invoices'
  AND ccu.column_name = 'invoice_profile_id'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Check payment_type_id FK exists
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'invoices.payment_type_id FK constraint exists' AS check_description
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'invoices'
  AND ccu.column_name = 'payment_type_id'
  AND tc.constraint_type = 'FOREIGN KEY';

\echo ''

-- ============================================================================
-- SECTION 3: Index Validation
-- ============================================================================

\echo '3. INDEXES'
\echo '----------'

-- Check is_recurring index
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'idx_invoices_recurring exists' AS check_description
FROM pg_indexes
WHERE tablename = 'invoices'
  AND indexname = 'idx_invoices_recurring';

-- Check invoice_profile_id index
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'idx_invoices_invoice_profile exists' AS check_description
FROM pg_indexes
WHERE tablename = 'invoices'
  AND indexname = 'idx_invoices_invoice_profile';

-- Check payment_type_id index
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'idx_invoices_payment_type exists' AS check_description
FROM pg_indexes
WHERE tablename = 'invoices'
  AND indexname = 'idx_invoices_payment_type';

-- Check is_paid index
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'idx_invoices_paid exists' AS check_description
FROM pg_indexes
WHERE tablename = 'invoices'
  AND indexname = 'idx_invoices_paid';

\echo ''

-- ============================================================================
-- SECTION 4: CHECK Constraint Validation
-- ============================================================================

\echo '4. CHECK CONSTRAINTS'
\echo '--------------------'

-- List all CHECK constraints on invoices table
SELECT
  CASE
    WHEN COUNT(*) >= 3 THEN '✓ PASS (' || COUNT(*) || ' constraints found)'
    ELSE '✗ FAIL (' || COUNT(*) || '/3 constraints found)'
  END AS status,
  'invoices table has CHECK constraints' AS check_description
FROM information_schema.table_constraints
WHERE table_name = 'invoices'
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE '%recurring%' OR constraint_name LIKE '%paid%';

\echo ''

-- ============================================================================
-- SECTION 5: Data Integrity Validation
-- ============================================================================

\echo '5. DATA INTEGRITY'
\echo '-----------------'

-- Check that all invoices have is_recurring set
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' invoices with NULL is_recurring)'
  END AS status,
  'All invoices have is_recurring value' AS check_description
FROM invoices
WHERE is_recurring IS NULL;

-- Check that all invoices have is_paid set
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' invoices with NULL is_paid)'
  END AS status,
  'All invoices have is_paid value' AS check_description
FROM invoices
WHERE is_paid IS NULL;

-- Check that recurring invoices have invoice_profile_id
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' recurring invoices without profile_id)'
  END AS status,
  'Recurring invoices have invoice_profile_id' AS check_description
FROM invoices
WHERE is_recurring = true
  AND invoice_profile_id IS NULL;

-- Check that paid invoices have payment details
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' paid invoices without payment details)'
  END AS status,
  'Paid invoices have payment date and amount' AS check_description
FROM invoices
WHERE is_paid = true
  AND (paid_date IS NULL OR paid_amount IS NULL);

-- Check for negative paid amounts
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' invoices with negative paid_amount)'
  END AS status,
  'No negative paid amounts' AS check_description
FROM invoices
WHERE paid_amount < 0;

\echo ''

-- ============================================================================
-- SECTION 6: Foreign Key Referential Integrity
-- ============================================================================

\echo '6. REFERENTIAL INTEGRITY'
\echo '------------------------'

-- Check for orphaned invoice_profile_id references
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' invoices with invalid invoice_profile_id)'
  END AS status,
  'No orphaned invoice_profile_id references' AS check_description
FROM invoices
WHERE invoice_profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoice_profiles
    WHERE invoice_profiles.id = invoices.invoice_profile_id
  );

-- Check for orphaned payment_type_id references
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL (' || COUNT(*) || ' invoices with invalid payment_type_id)'
  END AS status,
  'No orphaned payment_type_id references' AS check_description
FROM invoices
WHERE payment_type_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_types
    WHERE payment_types.id = invoices.payment_type_id
  );

\echo ''

-- ============================================================================
-- SECTION 7: Statistics and Summary
-- ============================================================================

\echo '7. MIGRATION STATISTICS'
\echo '------------------------'

-- Invoice type distribution
SELECT
  'Invoice Type Distribution' AS metric,
  CONCAT(
    'Recurring: ', SUM(CASE WHEN is_recurring THEN 1 ELSE 0 END),
    ' | Non-recurring: ', SUM(CASE WHEN NOT is_recurring THEN 1 ELSE 0 END)
  ) AS value
FROM invoices;

-- Payment status distribution
SELECT
  'Payment Status Distribution' AS metric,
  CONCAT(
    'Paid: ', SUM(CASE WHEN is_paid THEN 1 ELSE 0 END),
    ' | Unpaid: ', SUM(CASE WHEN NOT is_paid THEN 1 ELSE 0 END)
  ) AS value
FROM invoices;

-- Invoice profiles with billing_frequency
SELECT
  'Profiles with Billing Frequency' AS metric,
  CONCAT(
    COUNT(CASE WHEN billing_frequency IS NOT NULL THEN 1 END),
    ' / ', COUNT(*), ' profiles'
  ) AS value
FROM invoice_profiles;

-- Invoices with payment tracking data
SELECT
  'Invoices with Payment Tracking' AS metric,
  CONCAT(
    COUNT(CASE WHEN payment_type_id IS NOT NULL THEN 1 END),
    ' / ', COUNT(*), ' invoices'
  ) AS value
FROM invoices;

\echo ''

-- ============================================================================
-- SECTION 8: Sample Data Queries
-- ============================================================================

\echo '8. SAMPLE DATA VERIFICATION'
\echo '----------------------------'

-- Sample recurring invoices
\echo 'Sample Recurring Invoices:'
SELECT
  invoice_number,
  invoice_amount,
  is_recurring,
  invoice_profile_id,
  CASE WHEN is_paid THEN 'Paid' ELSE 'Unpaid' END AS payment_status
FROM invoices
WHERE is_recurring = true
LIMIT 5;

\echo ''

-- Sample paid invoices with tracking
\echo 'Sample Paid Invoices with Tracking:'
SELECT
  invoice_number,
  invoice_amount,
  paid_amount,
  paid_date,
  paid_currency,
  payment_type_id
FROM invoices
WHERE is_paid = true
  AND payment_type_id IS NOT NULL
LIMIT 5;

\echo ''

-- ============================================================================
-- VALIDATION COMPLETE
-- ============================================================================

\echo '═════════════════════════════════════════════════════════════'
\echo 'VALIDATION COMPLETE'
\echo '═════════════════════════════════════════════════════════════'
\echo 'Review the results above. All checks should show ✓ PASS.'
\echo 'If any checks show ✗ FAIL, investigate and remediate before'
\echo 'proceeding with application deployment.'
\echo '═════════════════════════════════════════════════════════════'
