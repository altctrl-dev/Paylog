-- Migration: Add Approval Workflow to CreditNote and AdvancePayment Models
-- Date: 2026-01-24
-- Purpose: Unify entry approval system across CreditNote and AdvancePayment
-- Reference: Payment and Vendor model approval patterns

-- =============================================================================
-- PART 1: Add approval workflow fields to credit_notes table
-- =============================================================================

-- Add new columns to credit_notes
ALTER TABLE credit_notes
  ADD COLUMN status VARCHAR(50) DEFAULT 'pending_approval' NOT NULL,
  ADD COLUMN approved_by_id INTEGER,
  ADD COLUMN approved_at TIMESTAMP,
  ADD COLUMN rejection_reason TEXT;

-- Backfill existing records: auto-approve all existing credit notes
-- Set status to 'approved' and approved_at to created_at
UPDATE credit_notes
SET
  status = 'approved',
  approved_at = created_at
WHERE deleted_at IS NULL;

-- Add foreign key constraint for approved_by_id
ALTER TABLE credit_notes
  ADD CONSTRAINT fk_credit_notes_approved_by
  FOREIGN KEY (approved_by_id)
  REFERENCES users(id)
  ON DELETE RESTRICT;

-- Add indexes for query performance
CREATE INDEX idx_credit_notes_status ON credit_notes(status);
CREATE INDEX idx_credit_notes_approved_by ON credit_notes(approved_by_id);

-- =============================================================================
-- PART 2: Add approval workflow and soft delete fields to advance_payments table
-- =============================================================================

-- Add approval workflow columns
ALTER TABLE advance_payments
  ADD COLUMN status VARCHAR(50) DEFAULT 'pending_approval' NOT NULL,
  ADD COLUMN approved_by_id INTEGER,
  ADD COLUMN approved_at TIMESTAMP,
  ADD COLUMN rejection_reason TEXT;

-- Add soft delete columns
ALTER TABLE advance_payments
  ADD COLUMN deleted_at TIMESTAMP,
  ADD COLUMN deleted_by_id INTEGER,
  ADD COLUMN deleted_reason TEXT;

-- Backfill existing records: auto-approve all existing advance payments
-- Set status to 'approved' and approved_at to created_at
UPDATE advance_payments
SET
  status = 'approved',
  approved_at = created_at;

-- Add foreign key constraints
ALTER TABLE advance_payments
  ADD CONSTRAINT fk_advance_payments_approved_by
  FOREIGN KEY (approved_by_id)
  REFERENCES users(id)
  ON DELETE RESTRICT;

ALTER TABLE advance_payments
  ADD CONSTRAINT fk_advance_payments_deleted_by
  FOREIGN KEY (deleted_by_id)
  REFERENCES users(id)
  ON DELETE RESTRICT;

-- Add indexes for query performance
CREATE INDEX idx_advance_payments_status ON advance_payments(status);
CREATE INDEX idx_advance_payments_approved_by ON advance_payments(approved_by_id);
CREATE INDEX idx_advance_payments_deleted ON advance_payments(deleted_at);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify credit_notes columns were added
SELECT
  COUNT(*) as total_credit_notes,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_count
FROM credit_notes;

-- Verify advance_payments columns were added
SELECT
  COUNT(*) as total_advance_payments,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_count
FROM advance_payments;

-- =============================================================================
-- NOTES
-- =============================================================================

/*
DESIGN DECISIONS:
1. Status field values: "pending_approval", "approved", "rejected"
   - Consistent with Payment and Vendor models
   - Default to "pending_approval" for new records

2. Auto-approval of existing records:
   - All existing records are set to "approved" status
   - Approved_at set to created_at (preserves timeline)
   - Approved_by_id left NULL (system auto-approval, not user action)

3. Soft delete for AdvancePayment:
   - Added deleted_at, deleted_by_id, deleted_reason
   - Matches CreditNote pattern for consistency

4. Indexes:
   - Status indexed for filtering workflows (pending, approved, rejected)
   - Approved_by_id indexed for auditing and reporting
   - Deleted_at indexed for soft delete queries

IMPACT:
- No data loss (all columns nullable except status)
- Existing records remain functional (auto-approved)
- New records will require explicit approval workflow
- Backward compatible with existing queries (WHERE deleted_at IS NULL)

ROLLBACK INSTRUCTIONS:
See 003_add_approval_workflow_to_credit_notes_and_advance_payments_ROLLBACK.sql
*/
