-- ============================================================================
-- Migration: Add Phase 1 Clarified Features
-- Created: 2025-10-08
-- Description: Implements all stakeholder-clarified features for Phase 1
--   - Invoice "On Hold" state with tracking
--   - Resubmission counter with 3-attempt limit
--   - Super Admin role with protection
--   - Profile visibility control
--   - Invoice hiding capability
--   - Archive request workflow
--   - Updated Total Due KPI logic
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD "ON HOLD" STATE TO INVOICES
-- ============================================================================

-- Drop existing status constraint
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new status constraint with "on_hold"
ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('pending_approval', 'on_hold', 'unpaid', 'partial', 'paid', 'overdue'));

-- Add hold tracking fields
ALTER TABLE invoices
  ADD COLUMN hold_reason TEXT,
  ADD COLUMN hold_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN hold_at TIMESTAMP;

-- Add comments for hold fields
COMMENT ON COLUMN invoices.hold_reason IS 'Reason provided by admin when placing invoice on hold (e.g., "Missing vendor documentation", "Clarification needed from requester")';
COMMENT ON COLUMN invoices.hold_by IS 'Admin user who placed invoice on hold';
COMMENT ON COLUMN invoices.hold_at IS 'Timestamp when invoice was placed on hold';

-- Add index for hold state queries
CREATE INDEX idx_invoices_on_hold ON invoices (status) WHERE status = 'on_hold';

-- ============================================================================
-- 2. ADD RESUBMISSION COUNTER TO INVOICES
-- ============================================================================

-- Add submission tracking fields
ALTER TABLE invoices
  ADD COLUMN submission_count INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN last_submission_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Add comments for submission fields
COMMENT ON COLUMN invoices.submission_count IS 'Number of times invoice has been submitted for approval. Initial submission = 1. Max allowed = 3. After 3 rejections, auto-rejects on next submission attempt.';
COMMENT ON COLUMN invoices.last_submission_at IS 'Timestamp of most recent submission (initial or resubmission)';

-- Add index for tracking resubmission patterns
CREATE INDEX idx_invoices_submission_count ON invoices (submission_count) WHERE submission_count > 1;

-- Create function to increment submission counter and enforce 3-attempt limit
CREATE OR REPLACE FUNCTION increment_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on resubmission (rejected → pending_approval)
  IF (OLD.status = 'rejected' AND NEW.status = 'pending_approval') THEN
    NEW.submission_count := OLD.submission_count + 1;
    NEW.last_submission_at := CURRENT_TIMESTAMP;

    -- Auto-reject if exceeds 3 attempts
    IF NEW.submission_count > 3 THEN
      NEW.status := 'rejected';
      NEW.rejection_reason := COALESCE(
        NEW.rejection_reason,
        'Auto-rejected: Maximum resubmission attempts (3) exceeded. Please contact an administrator for assistance.'
      );
      NEW.rejected_by := OLD.rejected_by; -- Keep original rejector
      NEW.rejected_at := CURRENT_TIMESTAMP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for resubmission counter
CREATE TRIGGER resubmission_counter
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION increment_submission_count();

COMMENT ON FUNCTION increment_submission_count() IS 'Automatically increments submission_count when invoice is resubmitted (rejected → pending_approval) and enforces 3-attempt limit';

-- ============================================================================
-- 3. ADD SUPER ADMIN ROLE
-- ============================================================================

-- Drop existing role constraint
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new role constraint with "super_admin"
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('standard_user', 'admin', 'super_admin'));

-- Add index for role-based queries
CREATE INDEX idx_users_super_admin ON users (role) WHERE role = 'super_admin' AND is_active = true;

-- Create function to prevent deactivating last super admin
CREATE OR REPLACE FUNCTION prevent_last_superadmin_deactivation()
RETURNS TRIGGER AS $$
DECLARE
  active_superadmin_count INTEGER;
BEGIN
  -- Only check when trying to deactivate a super admin
  IF (OLD.role = 'super_admin' AND OLD.is_active = true AND NEW.is_active = false) THEN
    -- Count remaining active super admins (excluding current user)
    SELECT COUNT(*) INTO active_superadmin_count
    FROM users
    WHERE role = 'super_admin'
      AND is_active = true
      AND id != OLD.id;

    -- Block deactivation if this is the last super admin
    IF active_superadmin_count = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate the last Super Admin user. System requires at least one active Super Admin at all times.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to protect last super admin
CREATE TRIGGER protect_last_superadmin
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_superadmin_deactivation();

COMMENT ON FUNCTION prevent_last_superadmin_deactivation() IS 'Prevents deactivating the last Super Admin user to ensure system always has at least one active Super Admin';

-- ============================================================================
-- 4. ADD PROFILE VISIBILITY CONTROL
-- ============================================================================

-- Add visibility flag to invoice_profiles
ALTER TABLE invoice_profiles
  ADD COLUMN visible_to_all BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN invoice_profiles.visible_to_all IS 'If true (default), all users can see this profile. If false, only users explicitly granted access in user_profile_visibility can see it.';

-- Create junction table for user-profile visibility
CREATE TABLE user_profile_visibility (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id BIGINT NOT NULL REFERENCES invoice_profiles(id) ON DELETE CASCADE,
  granted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique user-profile pairs
  CONSTRAINT unique_user_profile UNIQUE(user_id, profile_id)
);

-- Add indexes for common queries
CREATE INDEX idx_user_profile_visibility_user ON user_profile_visibility (user_id);
CREATE INDEX idx_user_profile_visibility_profile ON user_profile_visibility (profile_id);
CREATE INDEX idx_user_profile_visibility_granted_by ON user_profile_visibility (granted_by);

COMMENT ON TABLE user_profile_visibility IS 'Controls which users can see which invoice profiles. If table is empty or profile.visible_to_all=true, all users see the profile. If profile.visible_to_all=false, only users listed here can see it.';
COMMENT ON COLUMN user_profile_visibility.granted_by IS 'Admin user who granted this visibility access';

-- ============================================================================
-- 5. ADD INVOICE HIDE FEATURE
-- ============================================================================

-- Add hidden flag and tracking fields
ALTER TABLE invoices
  ADD COLUMN is_hidden BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN hidden_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN hidden_at TIMESTAMP,
  ADD COLUMN hidden_reason TEXT;

COMMENT ON COLUMN invoices.is_hidden IS 'If true, invoice is hidden from dashboard Quick Peek view. Still visible in full invoice list with "Show Hidden" filter. Use for very old overdue invoices (>90 days) or inactive invoices.';
COMMENT ON COLUMN invoices.hidden_by IS 'Admin user who hid the invoice';
COMMENT ON COLUMN invoices.hidden_at IS 'Timestamp when invoice was hidden';
COMMENT ON COLUMN invoices.hidden_reason IS 'Reason for hiding (e.g., "Very old overdue (>90 days), no longer pursuing payment", "Duplicate invoice entry")';

-- Add index for hidden invoices filter
CREATE INDEX idx_invoices_hidden ON invoices (is_hidden);
CREATE INDEX idx_invoices_active ON invoices (is_hidden) WHERE is_hidden = false;

-- ============================================================================
-- 6. ADD ARCHIVE REQUEST TABLE
-- ============================================================================

-- Create archive requests table
CREATE TABLE archive_requests (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT NOT NULL,
  requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  rejection_reason TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,

  -- Constraints
  CONSTRAINT archive_requests_entity_type_check
    CHECK (entity_type IN ('vendor', 'category', 'sub_entity', 'profile')),
  CONSTRAINT archive_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT archive_requests_rejection_reason_required
    CHECK (status != 'rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT archive_requests_reviewed_fields_consistency
    CHECK (
      (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
      (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

-- Add indexes for common queries
CREATE INDEX idx_archive_requests_status ON archive_requests (status);
CREATE INDEX idx_archive_requests_entity ON archive_requests (entity_type, entity_id);
CREATE INDEX idx_archive_requests_requested_by ON archive_requests (requested_by);
CREATE INDEX idx_archive_requests_pending ON archive_requests (status, requested_at DESC) WHERE status = 'pending';

COMMENT ON TABLE archive_requests IS 'Allows standard users to request archival of outdated master data (vendors, categories, sub-entities, profiles). Requests go to admin approval queue. Admins can approve (archives the entity) or reject (entity remains active).';
COMMENT ON COLUMN archive_requests.entity_type IS 'Type of entity to archive: vendor, category, sub_entity, or profile';
COMMENT ON COLUMN archive_requests.entity_id IS 'ID of the entity to archive (references specific table based on entity_type)';
COMMENT ON COLUMN archive_requests.reason IS 'User-provided explanation for why this entity should be archived (e.g., "Vendor no longer used", "Duplicate category")';
COMMENT ON COLUMN archive_requests.rejection_reason IS 'Admin-provided explanation for rejecting the archive request';

-- ============================================================================
-- 7. UPDATE TOTAL DUE KPI LOGIC
-- ============================================================================

-- Drop existing KPI view if it exists
DROP VIEW IF EXISTS dashboard_kpis;

-- Create updated KPI view with new Total Due logic
CREATE OR REPLACE VIEW dashboard_kpis AS
SELECT
  -- Total Due: outstanding balance (unpaid/partial/overdue) + full pending approval amounts
  -- Includes: All unpaid/partial/overdue amounts + all pending_approval amounts
  -- Excludes: Hidden invoices
  (
    -- Outstanding balance from approved but unpaid/partially paid invoices
    SELECT COALESCE(SUM(
      invoices.invoice_amount - COALESCE(payments_summary.paid_amount, 0)
    ), 0)
    FROM invoices
    LEFT JOIN (
      SELECT invoice_id, SUM(amount_paid) AS paid_amount
      FROM payments
      WHERE status = 'approved'
      GROUP BY invoice_id
    ) AS payments_summary ON invoices.id = payments_summary.invoice_id
    WHERE invoices.status IN ('unpaid', 'partial', 'overdue')
      AND invoices.is_hidden = false
  ) + (
    -- Full amount from pending approval invoices (may or may not be approved)
    SELECT COALESCE(SUM(invoice_amount), 0)
    FROM invoices
    WHERE status = 'pending_approval'
      AND is_hidden = false
  ) AS total_due,

  -- Paid This Month: Sum of approved payments in current month
  (
    SELECT COALESCE(SUM(amount_paid), 0)
    FROM payments
    WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      AND status = 'approved'
  ) AS paid_this_month,

  -- Pending Count: All invoices awaiting action (pending approval, on hold, unpaid, partial)
  -- Excludes: Hidden invoices
  (
    SELECT COUNT(*)
    FROM invoices
    WHERE status IN ('pending_approval', 'on_hold', 'unpaid', 'partial')
      AND is_hidden = false
  ) AS pending_count,

  -- Average Processing Time: Days from invoice creation to first payment (last 90 days)
  -- Only includes fully or partially paid invoices
  (
    SELECT COALESCE(
      AVG(EXTRACT(EPOCH FROM (first_payment_date - created_at)) / 86400),
      0
    )
    FROM invoices
    JOIN (
      SELECT invoice_id, MIN(payment_date) AS first_payment_date
      FROM payments
      WHERE status = 'approved'
      GROUP BY invoice_id
    ) AS first_payments ON invoices.id = first_payments.invoice_id
    WHERE invoices.status IN ('paid', 'partial')
      AND invoices.created_at >= CURRENT_DATE - INTERVAL '90 days'
  ) AS avg_processing_days;

COMMENT ON VIEW dashboard_kpis IS 'Real-time KPI calculations for dashboard. total_due includes outstanding balances AND full pending approval amounts. Excludes hidden invoices.';

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (migration_name, description)
VALUES (
  '001_phase1_clarified_features',
  'Phase 1 Clarified Features: On Hold state, resubmission counter, Super Admin role, profile visibility, invoice hiding, archive requests, updated KPI logic'
);

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Execute this migration in sequence order (dependencies resolved):
-- 1. Status and role constraint updates (no dependencies)
-- 2. New columns on existing tables (invoice hold fields, submission counter, hidden fields)
-- 3. New tables (user_profile_visibility, archive_requests)
-- 4. Triggers and functions (depend on columns existing)
-- 5. Views (depend on all schema changes)
-- 6. Indexes (performance optimization, can be last)
-- ============================================================================
