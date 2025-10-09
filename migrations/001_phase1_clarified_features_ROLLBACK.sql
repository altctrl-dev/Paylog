-- ============================================================================
-- Rollback Migration: 001_phase1_clarified_features
-- Created: 2025-10-08
-- Description: Rollback script to undo all Phase 1 clarified features
-- WARNING: This will drop columns containing data. Ensure backup exists.
-- ============================================================================

BEGIN;

-- ============================================================================
-- ROLLBACK IN REVERSE ORDER (LIFO - Last In, First Out)
-- ============================================================================

-- ============================================================================
-- 7. ROLLBACK: Total Due KPI Logic
-- ============================================================================

-- Drop updated view
DROP VIEW IF EXISTS dashboard_kpis;

-- Restore original view (if schema existed before this migration)
-- Note: If this is the first migration, this view didn't exist.
-- Replace with original CREATE VIEW statement if rolling back from existing system.

-- ============================================================================
-- 6. ROLLBACK: Archive Request Table
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_archive_requests_pending;
DROP INDEX IF EXISTS idx_archive_requests_requested_by;
DROP INDEX IF EXISTS idx_archive_requests_entity;
DROP INDEX IF EXISTS idx_archive_requests_status;

-- Drop table (CASCADE will remove foreign key references)
DROP TABLE IF EXISTS archive_requests CASCADE;

-- ============================================================================
-- 5. ROLLBACK: Invoice Hide Feature
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_invoices_active;
DROP INDEX IF EXISTS idx_invoices_hidden;

-- Drop columns
ALTER TABLE invoices
  DROP COLUMN IF EXISTS hidden_reason,
  DROP COLUMN IF EXISTS hidden_at,
  DROP COLUMN IF EXISTS hidden_by,
  DROP COLUMN IF EXISTS is_hidden;

-- ============================================================================
-- 4. ROLLBACK: Profile Visibility Control
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_user_profile_visibility_granted_by;
DROP INDEX IF EXISTS idx_user_profile_visibility_profile;
DROP INDEX IF EXISTS idx_user_profile_visibility_user;

-- Drop junction table
DROP TABLE IF EXISTS user_profile_visibility CASCADE;

-- Drop visibility flag from invoice_profiles
ALTER TABLE invoice_profiles
  DROP COLUMN IF EXISTS visible_to_all;

-- ============================================================================
-- 3. ROLLBACK: Super Admin Role
-- ============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS protect_last_superadmin ON users;

-- Drop function
DROP FUNCTION IF EXISTS prevent_last_superadmin_deactivation();

-- Drop index
DROP INDEX IF EXISTS idx_users_super_admin;

-- Restore original role constraint (without super_admin)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('standard_user', 'admin'));

-- Update any super_admin users to admin (data migration)
UPDATE users
SET role = 'admin'
WHERE role = 'super_admin';

-- ============================================================================
-- 2. ROLLBACK: Resubmission Counter
-- ============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS resubmission_counter ON invoices;

-- Drop function
DROP FUNCTION IF EXISTS increment_submission_count();

-- Drop index
DROP INDEX IF EXISTS idx_invoices_submission_count;

-- Drop columns
ALTER TABLE invoices
  DROP COLUMN IF EXISTS last_submission_at,
  DROP COLUMN IF EXISTS submission_count;

-- ============================================================================
-- 1. ROLLBACK: "On Hold" State
-- ============================================================================

-- Drop index
DROP INDEX IF EXISTS idx_invoices_on_hold;

-- Drop columns
ALTER TABLE invoices
  DROP COLUMN IF EXISTS hold_at,
  DROP COLUMN IF EXISTS hold_by,
  DROP COLUMN IF EXISTS hold_reason;

-- Update any "on_hold" invoices to "pending_approval" (data migration)
UPDATE invoices
SET status = 'pending_approval'
WHERE status = 'on_hold';

-- Restore original status constraint (without on_hold)
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('pending_approval', 'unpaid', 'partial', 'paid', 'overdue'));

-- ============================================================================
-- ROLLBACK: Migration Metadata
-- ============================================================================

-- Remove migration record
DELETE FROM schema_migrations
WHERE migration_name = '001_phase1_clarified_features';

COMMIT;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- All Phase 1 clarified features have been removed.
-- Database schema restored to pre-migration state.
-- ============================================================================

-- ============================================================================
-- POST-ROLLBACK VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after rollback to verify clean state:

-- 1. Check for any remaining "on_hold" invoices
-- SELECT COUNT(*) FROM invoices WHERE status = 'on_hold';
-- Expected: 0

-- 2. Check for any remaining "super_admin" users
-- SELECT COUNT(*) FROM users WHERE role = 'super_admin';
-- Expected: 0

-- 3. Verify tables dropped
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('archive_requests', 'user_profile_visibility');
-- Expected: Empty result

-- 4. Verify columns dropped from invoices
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'invoices'
--   AND column_name IN ('hold_reason', 'hold_by', 'hold_at',
--                       'submission_count', 'last_submission_at',
--                       'is_hidden', 'hidden_by', 'hidden_at', 'hidden_reason');
-- Expected: Empty result
