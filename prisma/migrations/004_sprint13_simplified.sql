-- Sprint 13 Phase 5: Invoice Workflow Enhancement - Simplified Migration
-- This migration adds new fields for recurring invoices and inline payment tracking

-- ============================================================
-- STEP 1: Modify invoice_profiles table
-- ============================================================

-- Make billing_frequency nullable for flexibility
ALTER TABLE invoice_profiles
  ALTER COLUMN billing_frequency DROP DEFAULT,
  ALTER COLUMN billing_frequency DROP NOT NULL;

COMMENT ON COLUMN invoice_profiles.billing_frequency IS 'Billing cycle for recurring invoices (e.g., "30 days", "1 month")';

-- ============================================================
-- STEP 2: Add new columns to invoices table
-- ============================================================

-- Add recurring workflow fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_profile_id INTEGER;

-- Add inline payment tracking fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DOUBLE PRECISION;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_currency VARCHAR(3);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_type_id INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;

COMMENT ON COLUMN invoices.is_recurring IS 'Flag indicating if this is a recurring invoice';
COMMENT ON COLUMN invoices.invoice_profile_id IS 'Foreign key to invoice_profiles for recurring invoices';
COMMENT ON COLUMN invoices.is_paid IS 'Quick payment status flag';
COMMENT ON COLUMN invoices.paid_date IS 'Date payment was received';
COMMENT ON COLUMN invoices.paid_amount IS 'Amount paid (may differ from invoice_amount)';
COMMENT ON COLUMN invoices.paid_currency IS 'Currency code for payment';
COMMENT ON COLUMN invoices.payment_type_id IS 'Foreign key to payment_types';
COMMENT ON COLUMN invoices.payment_reference IS 'Payment reference number';

-- ============================================================
-- STEP 3: Migrate existing data
-- ============================================================

-- Migrate invoice_type to is_recurring
UPDATE invoices
SET is_recurring = true
WHERE invoice_type = 'recurring'
  AND is_recurring = false;

-- Copy profile_id to invoice_profile_id for recurring invoices
UPDATE invoices
SET invoice_profile_id = profile_id
WHERE is_recurring = true
  AND profile_id IS NOT NULL
  AND invoice_profile_id IS NULL;

-- ============================================================
-- STEP 4: Add foreign key constraints
-- ============================================================

-- Foreign key to invoice_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invoices_invoice_profile'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT fk_invoices_invoice_profile
      FOREIGN KEY (invoice_profile_id)
      REFERENCES invoice_profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key to payment_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invoices_payment_type'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT fk_invoices_payment_type
      FOREIGN KEY (payment_type_id)
      REFERENCES payment_types(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- STEP 5: Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_recurring ON invoices(is_recurring);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_profile ON invoices(invoice_profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type ON invoices(payment_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid ON invoices(is_paid);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_profile
  ON invoices(is_recurring, invoice_profile_id)
  WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS idx_invoices_paid_date
  ON invoices(is_paid, paid_date)
  WHERE is_paid = true;

-- ============================================================
-- STEP 6: Verification
-- ============================================================

-- Record migration in schema_migrations table
INSERT INTO schema_migrations (migration_name, description, applied_at)
VALUES (
  '004_sprint13_invoice_workflow_fields',
  'Add recurring invoice and inline payment tracking fields',
  NOW()
)
ON CONFLICT (migration_name) DO NOTHING;

-- Migration complete
