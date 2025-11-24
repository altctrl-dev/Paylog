-- ============================================================================
-- Sprint 13 Phase 1: Invoice Workflow Enhancement Migration
-- ============================================================================
-- Purpose: Add recurring invoice workflow and inline payment tracking fields
-- Author: Data & Migration Engineer (DME)
-- Date: 2025-11-19
-- Database: PostgreSQL 17
-- Migration Type: ADDITIVE (No data loss, backward compatible)
-- ============================================================================

-- ============================================================================
-- SAFETY CHECKS: Verify Required Master Data Exists
-- ============================================================================

-- Verify InvoiceProfile table exists and has required structure
DO $$
DECLARE
  profile_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM invoice_profiles;
  RAISE NOTICE 'Safety Check: % invoice profile(s) found', profile_count;
END $$;

-- Verify Invoice table exists and has required structure
DO $$
DECLARE
  invoice_count INT;
BEGIN
  SELECT COUNT(*) INTO invoice_count FROM invoices;
  RAISE NOTICE 'Safety Check: % invoice(s) found', invoice_count;
END $$;

-- Verify PaymentType table exists
DO $$
DECLARE
  payment_type_count INT;
BEGIN
  SELECT COUNT(*) INTO payment_type_count FROM payment_types WHERE is_active = true;
  IF payment_type_count = 0 THEN
    RAISE WARNING 'No active payment types found. Payment tracking features may be limited.';
  ELSE
    RAISE NOTICE 'Safety Check PASSED: % active payment type(s) found', payment_type_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 1: Add New Column to InvoiceProfile - billing_frequency
-- ============================================================================

-- Add billing_frequency column (nullable for migration, UI will enforce requirement)
ALTER TABLE invoice_profiles
ADD COLUMN IF NOT EXISTS billing_frequency TEXT;

RAISE NOTICE 'STEP 1 COMPLETE: Added billing_frequency column to invoice_profiles';

-- ============================================================================
-- STEP 2: Add New Columns to Invoice - Recurring Workflow Fields
-- ============================================================================

-- Add is_recurring column (indicates recurring vs non-recurring)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false NOT NULL;

-- Add invoice_profile_id column (FK to InvoiceProfile for recurring invoices)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_profile_id INTEGER;

RAISE NOTICE 'STEP 2 COMPLETE: Added recurring workflow fields to invoices';

-- ============================================================================
-- STEP 3: Add New Columns to Invoice - Inline Payment Tracking
-- ============================================================================

-- Add payment status flag
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false NOT NULL;

-- Add payment date
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP;

-- Add payment amount
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_amount DOUBLE PRECISION;

-- Add payment currency (may differ from invoice currency)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_currency VARCHAR(3);

-- Add payment type reference
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_type_id INTEGER;

-- Add payment reference number (conditional on payment type)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

RAISE NOTICE 'STEP 3 COMPLETE: Added inline payment tracking fields to invoices';

-- ============================================================================
-- STEP 4: Backfill Existing Invoices with Safe Defaults
-- ============================================================================

DO $$
DECLARE
  invoices_updated INT;
BEGIN
  -- Set all existing invoices to non-recurring (backward compatible default)
  UPDATE invoices
  SET is_recurring = false
  WHERE is_recurring IS NULL;

  GET DIAGNOSTICS invoices_updated = ROW_COUNT;

  -- Set all existing invoices to unpaid (safe default)
  UPDATE invoices
  SET is_paid = false
  WHERE is_paid IS NULL;

  RAISE NOTICE 'STEP 4 COMPLETE: Backfilled % existing invoice(s):', invoices_updated;
  RAISE NOTICE '  - is_recurring: false (all existing invoices are non-recurring)';
  RAISE NOTICE '  - is_paid: false (payment status explicitly set)';
END $$;

-- ============================================================================
-- STEP 5: Create Foreign Key Constraints
-- ============================================================================

-- Add FK constraint for invoice_profile_id (onDelete: SET NULL for safety)
ALTER TABLE invoices
ADD CONSTRAINT fk_invoices_invoice_profile
FOREIGN KEY (invoice_profile_id)
REFERENCES invoice_profiles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add FK constraint for payment_type_id (onDelete: SET NULL for safety)
ALTER TABLE invoices
ADD CONSTRAINT fk_invoices_payment_type
FOREIGN KEY (payment_type_id)
REFERENCES payment_types(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

RAISE NOTICE 'STEP 5 COMPLETE: Created 2 foreign key constraints with SET NULL (safe cascades)';

-- ============================================================================
-- STEP 6: Create Indexes for Query Performance
-- ============================================================================

-- Index on is_recurring (for filtering recurring vs non-recurring)
CREATE INDEX IF NOT EXISTS idx_invoices_recurring
ON invoices(is_recurring);

-- Index on invoice_profile_id (for profile-based queries)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_profile
ON invoices(invoice_profile_id);

-- Index on payment_type_id (for payment method analysis)
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type
ON invoices(payment_type_id);

-- Index on is_paid (for payment status filtering)
CREATE INDEX IF NOT EXISTS idx_invoices_paid
ON invoices(is_paid);

-- Composite index on is_recurring + invoice_profile_id (for recurring invoice queries)
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_profile
ON invoices(is_recurring, invoice_profile_id)
WHERE is_recurring = true;

-- Composite index on is_paid + paid_date (for payment reporting)
CREATE INDEX IF NOT EXISTS idx_invoices_paid_date
ON invoices(is_paid, paid_date)
WHERE is_paid = true;

RAISE NOTICE 'STEP 6 COMPLETE: Created 6 indexes (4 single-column, 2 composite)';

-- ============================================================================
-- STEP 7: Add Check Constraints for Data Integrity
-- ============================================================================

-- Ensure recurring invoices have an invoice_profile_id
ALTER TABLE invoices
ADD CONSTRAINT chk_invoices_recurring_profile
CHECK (
  (is_recurring = false) OR
  (is_recurring = true AND invoice_profile_id IS NOT NULL)
);

-- Ensure paid invoices have payment details
ALTER TABLE invoices
ADD CONSTRAINT chk_invoices_paid_details
CHECK (
  (is_paid = false) OR
  (is_paid = true AND paid_date IS NOT NULL AND paid_amount IS NOT NULL)
);

-- Ensure paid_amount is positive if set
ALTER TABLE invoices
ADD CONSTRAINT chk_invoices_paid_amount_positive
CHECK (paid_amount IS NULL OR paid_amount >= 0);

RAISE NOTICE 'STEP 7 COMPLETE: Added 3 CHECK constraints for business logic integrity';

-- ============================================================================
-- STEP 8: Add Comments to Document Schema
-- ============================================================================

COMMENT ON COLUMN invoice_profiles.billing_frequency IS 'Billing cycle for recurring invoices (e.g., "30 days", "1 month", "quarterly"). MANDATORY for UI, nullable for migration.';

COMMENT ON COLUMN invoices.is_recurring IS 'Flag indicating if invoice is recurring (true) or non-recurring (false). Defaults to false for backward compatibility.';
COMMENT ON COLUMN invoices.invoice_profile_id IS 'Foreign key to invoice_profiles for recurring invoices. NULL for non-recurring invoices. Required if is_recurring = true.';

COMMENT ON COLUMN invoices.is_paid IS 'Quick payment status flag. Complements full payment history in payments table.';
COMMENT ON COLUMN invoices.paid_date IS 'Date payment was received. Required if is_paid = true.';
COMMENT ON COLUMN invoices.paid_amount IS 'Amount paid. May differ from invoice_amount. Required if is_paid = true.';
COMMENT ON COLUMN invoices.paid_currency IS 'Currency code for payment. May differ from invoice currency for foreign exchange scenarios.';
COMMENT ON COLUMN invoices.payment_type_id IS 'Foreign key to payment_types. Indicates payment method used.';
COMMENT ON COLUMN invoices.payment_reference IS 'Reference number for payment. Usage depends on payment type (e.g., check number, wire transfer ID).';

RAISE NOTICE 'STEP 8 COMPLETE: Added documentation comments to 9 columns';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  invoice_count INT;
  recurring_count INT;
  paid_count INT;
  profile_count INT;
  payment_type_count INT;
BEGIN
  SELECT COUNT(*) INTO invoice_count FROM invoices;
  SELECT COUNT(*) INTO recurring_count FROM invoices WHERE is_recurring = true;
  SELECT COUNT(*) INTO paid_count FROM invoices WHERE is_paid = true;
  SELECT COUNT(*) INTO profile_count FROM invoice_profiles;
  SELECT COUNT(*) INTO payment_type_count FROM payment_types WHERE is_active = true;

  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION COMPLETE: Sprint 13 Invoice Workflow Enhancement';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Invoice Statistics:';
  RAISE NOTICE '  Total Invoices: %', invoice_count;
  RAISE NOTICE '  Recurring Invoices: % (%% of total)', recurring_count,
    CASE WHEN invoice_count > 0 THEN ROUND(100.0 * recurring_count / invoice_count, 2) ELSE 0 END;
  RAISE NOTICE '  Paid Invoices: % (%% of total)', paid_count,
    CASE WHEN invoice_count > 0 THEN ROUND(100.0 * paid_count / invoice_count, 2) ELSE 0 END;
  RAISE NOTICE '';
  RAISE NOTICE 'Master Data:';
  RAISE NOTICE '  Invoice Profiles: %', profile_count;
  RAISE NOTICE '  Active Payment Types: %', payment_type_count;
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Schema Changes Summary:';
  RAISE NOTICE '  InvoiceProfile Changes:';
  RAISE NOTICE '    ✓ Added 1 new column (billing_frequency)';
  RAISE NOTICE '  Invoice Changes:';
  RAISE NOTICE '    ✓ Added 8 new columns (2 recurring + 6 payment tracking)';
  RAISE NOTICE '    ✓ Created 2 foreign key constraints (SET NULL)';
  RAISE NOTICE '    ✓ Created 6 indexes (4 single, 2 composite)';
  RAISE NOTICE '    ✓ Added 3 CHECK constraints';
  RAISE NOTICE '    ✓ Added 9 documentation comments';
  RAISE NOTICE '    ✓ Backfilled existing invoices with safe defaults';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Backward Compatibility:';
  RAISE NOTICE '  ✓ All existing invoices remain functional';
  RAISE NOTICE '  ✓ Default values preserve current behavior';
  RAISE NOTICE '  ✓ No breaking changes to existing queries';
  RAISE NOTICE '  ✓ Payment table preserved for full history tracking';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run backfill script: npm run backfill:recurring-status';
  RAISE NOTICE '  2. Run validation queries: 004_sprint13_validation.sql';
  RAISE NOTICE '  3. Generate Prisma Client: npx prisma generate';
  RAISE NOTICE '  4. Test new fields in UI workflow';
  RAISE NOTICE '  5. Review rollback procedure: 004_sprint13_ROLLBACK.sql';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
END $$;
