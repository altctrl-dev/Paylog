-- ============================================================================
-- ROLLBACK: Sprint 13 Invoice Workflow Enhancement
-- ============================================================================
-- WARNING: This will remove all data in the new columns!
-- Ensure application code is rolled back FIRST to avoid errors.
-- ============================================================================
-- Migration: 004_sprint13_invoice_workflow_fields
-- Date: 2025-11-19
-- Database: PostgreSQL 17
-- ============================================================================

BEGIN;

\echo '═════════════════════════════════════════════════════════════'
\echo 'ROLLBACK: Sprint 13 Invoice Workflow Enhancement'
\echo '═════════════════════════════════════════════════════════════'
\echo 'WARNING: This will drop 9 columns and all associated data'
\echo 'Press Ctrl+C within 5 seconds to abort...'
\echo ''

-- Safety pause (if running interactively)
SELECT pg_sleep(5);

-- ============================================================================
-- STEP 1: Drop CHECK Constraints
-- ============================================================================

\echo 'STEP 1: Dropping CHECK constraints...'

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS chk_invoices_recurring_profile;

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS chk_invoices_paid_details;

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS chk_invoices_paid_amount_positive;

\echo 'STEP 1 COMPLETE: Dropped 3 CHECK constraints'
\echo ''

-- ============================================================================
-- STEP 2: Drop Indexes
-- ============================================================================

\echo 'STEP 2: Dropping indexes...'

DROP INDEX IF EXISTS idx_invoices_recurring;
DROP INDEX IF EXISTS idx_invoices_invoice_profile;
DROP INDEX IF EXISTS idx_invoices_payment_type;
DROP INDEX IF EXISTS idx_invoices_paid;
DROP INDEX IF EXISTS idx_invoices_recurring_profile;
DROP INDEX IF EXISTS idx_invoices_paid_date;

\echo 'STEP 2 COMPLETE: Dropped 6 indexes'
\echo ''

-- ============================================================================
-- STEP 3: Drop Foreign Key Constraints
-- ============================================================================

\echo 'STEP 3: Dropping foreign key constraints...'

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS fk_invoices_invoice_profile;

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS fk_invoices_payment_type;

\echo 'STEP 3 COMPLETE: Dropped 2 foreign key constraints'
\echo ''

-- ============================================================================
-- STEP 4: Drop Columns from Invoice Table
-- ============================================================================

\echo 'STEP 4: Dropping columns from invoices table...'

ALTER TABLE invoices
DROP COLUMN IF EXISTS is_recurring;

ALTER TABLE invoices
DROP COLUMN IF EXISTS invoice_profile_id;

ALTER TABLE invoices
DROP COLUMN IF EXISTS is_paid;

ALTER TABLE invoices
DROP COLUMN IF EXISTS paid_date;

ALTER TABLE invoices
DROP COLUMN IF EXISTS paid_amount;

ALTER TABLE invoices
DROP COLUMN IF EXISTS paid_currency;

ALTER TABLE invoices
DROP COLUMN IF EXISTS payment_type_id;

ALTER TABLE invoices
DROP COLUMN IF EXISTS payment_reference;

\echo 'STEP 4 COMPLETE: Dropped 8 columns from invoices table'
\echo ''

-- ============================================================================
-- STEP 5: Drop Column from InvoiceProfile Table
-- ============================================================================

\echo 'STEP 5: Dropping column from invoice_profiles table...'

ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS billing_frequency;

\echo 'STEP 5 COMPLETE: Dropped billing_frequency column'
\echo ''

-- ============================================================================
-- STEP 6: Drop Documentation Comments
-- ============================================================================

\echo 'STEP 6: Removing documentation comments...'

COMMENT ON COLUMN invoice_profiles.billing_frequency IS NULL;
COMMENT ON COLUMN invoices.is_recurring IS NULL;
COMMENT ON COLUMN invoices.invoice_profile_id IS NULL;
COMMENT ON COLUMN invoices.is_paid IS NULL;
COMMENT ON COLUMN invoices.paid_date IS NULL;
COMMENT ON COLUMN invoices.paid_amount IS NULL;
COMMENT ON COLUMN invoices.paid_currency IS NULL;
COMMENT ON COLUMN invoices.payment_type_id IS NULL;
COMMENT ON COLUMN invoices.payment_reference IS NULL;

\echo 'STEP 6 COMPLETE: Removed documentation comments'
\echo ''

-- ============================================================================
-- ROLLBACK VERIFICATION
-- ============================================================================

\echo '═════════════════════════════════════════════════════════════'
\echo 'ROLLBACK VERIFICATION'
\echo '═════════════════════════════════════════════════════════════'

-- Verify columns no longer exist in invoices table
DO $$
DECLARE
  remaining_cols INT;
BEGIN
  SELECT COUNT(*) INTO remaining_cols
  FROM information_schema.columns
  WHERE table_name = 'invoices'
    AND column_name IN (
      'is_recurring', 'invoice_profile_id', 'is_paid', 'paid_date',
      'paid_amount', 'paid_currency', 'payment_type_id', 'payment_reference'
    );

  IF remaining_cols > 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % column(s) still exist in invoices table', remaining_cols;
  END IF;

  RAISE NOTICE '✓ All new invoice columns removed';
END $$;

-- Verify column no longer exists in invoice_profiles table
DO $$
DECLARE
  remaining_cols INT;
BEGIN
  SELECT COUNT(*) INTO remaining_cols
  FROM information_schema.columns
  WHERE table_name = 'invoice_profiles'
    AND column_name = 'billing_frequency';

  IF remaining_cols > 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: billing_frequency column still exists';
  END IF;

  RAISE NOTICE '✓ billing_frequency column removed from invoice_profiles';
END $$;

-- Verify foreign key constraints removed
DO $$
DECLARE
  remaining_fks INT;
BEGIN
  SELECT COUNT(*) INTO remaining_fks
  FROM information_schema.table_constraints
  WHERE table_name = 'invoices'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name IN (
      'fk_invoices_invoice_profile',
      'fk_invoices_payment_type'
    );

  IF remaining_fks > 0 THEN
    RAISE WARNING 'Some foreign key constraints may still exist: %', remaining_fks;
  ELSE
    RAISE NOTICE '✓ All new foreign key constraints removed';
  END IF;
END $$;

-- Verify indexes removed
DO $$
DECLARE
  remaining_indexes INT;
BEGIN
  SELECT COUNT(*) INTO remaining_indexes
  FROM pg_indexes
  WHERE tablename = 'invoices'
    AND indexname IN (
      'idx_invoices_recurring',
      'idx_invoices_invoice_profile',
      'idx_invoices_payment_type',
      'idx_invoices_paid',
      'idx_invoices_recurring_profile',
      'idx_invoices_paid_date'
    );

  IF remaining_indexes > 0 THEN
    RAISE WARNING 'Some indexes may still exist: %', remaining_indexes;
  ELSE
    RAISE NOTICE '✓ All new indexes removed';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK SUMMARY
-- ============================================================================

\echo ''
\echo '═════════════════════════════════════════════════════════════'
\echo 'ROLLBACK COMPLETE: Sprint 13 Invoice Workflow Enhancement'
\echo '═════════════════════════════════════════════════════════════'
\echo 'Schema reverted to pre-migration state'
\echo 'All new columns, constraints, and indexes removed'
\echo ''
\echo 'Next Steps:'
\echo '  1. Regenerate Prisma Client: npx prisma generate'
\echo '  2. Deploy rolled-back application code'
\echo '  3. Verify application functionality'
\echo '  4. Monitor for errors in logs'
\echo '═════════════════════════════════════════════════════════════'

COMMIT;

\echo ''
\echo 'Rollback transaction committed successfully.'
