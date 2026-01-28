-- ROLLBACK Migration: Add Approval Workflow to CreditNote and AdvancePayment Models
-- Date: 2026-01-24
-- Purpose: Safely revert schema changes if migration fails or needs to be undone

-- WARNING: This will remove approval workflow data
-- Make sure to backup the database before running this rollback

-- =============================================================================
-- PART 1: Rollback credit_notes table changes
-- =============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_credit_notes_status;
DROP INDEX IF EXISTS idx_credit_notes_approved_by;

-- Drop foreign key constraint
ALTER TABLE credit_notes
  DROP CONSTRAINT IF EXISTS fk_credit_notes_approved_by;

-- Drop columns
ALTER TABLE credit_notes
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS approved_by_id,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS rejection_reason;

-- =============================================================================
-- PART 2: Rollback advance_payments table changes
-- =============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_advance_payments_status;
DROP INDEX IF EXISTS idx_advance_payments_approved_by;
DROP INDEX IF EXISTS idx_advance_payments_deleted;

-- Drop foreign key constraints
ALTER TABLE advance_payments
  DROP CONSTRAINT IF EXISTS fk_advance_payments_approved_by,
  DROP CONSTRAINT IF EXISTS fk_advance_payments_deleted_by;

-- Drop approval workflow columns
ALTER TABLE advance_payments
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS approved_by_id,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS rejection_reason;

-- Drop soft delete columns
ALTER TABLE advance_payments
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by_id,
  DROP COLUMN IF EXISTS deleted_reason;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify credit_notes columns were removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'credit_notes'
  AND column_name IN ('status', 'approved_by_id', 'approved_at', 'rejection_reason');
-- Should return 0 rows

-- Verify advance_payments columns were removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'advance_payments'
  AND column_name IN (
    'status', 'approved_by_id', 'approved_at', 'rejection_reason',
    'deleted_at', 'deleted_by_id', 'deleted_reason'
  );
-- Should return 0 rows

-- =============================================================================
-- NOTES
-- =============================================================================

/*
ROLLBACK IMPACT:
- All approval workflow data will be lost
- Soft delete data for advance_payments will be lost
- Records will revert to pre-migration state
- Application code expecting approval fields will break until code rollback

PREREQUISITES:
1. Backup database before running rollback
2. Ensure application code is rolled back to pre-migration version
3. Verify no critical approval workflow data needs preservation

RECOVERY:
If data needs to be preserved:
1. Export approval data before rollback:
   SELECT id, status, approved_by_id, approved_at, rejection_reason
   FROM credit_notes
   WHERE status != 'approved' OR approved_by_id IS NOT NULL;

2. Export soft delete data:
   SELECT id, deleted_at, deleted_by_id, deleted_reason
   FROM advance_payments
   WHERE deleted_at IS NOT NULL;

3. Store in temporary tables or CSV for future re-import
*/
