-- ============================================================================
-- Seed Data: Phase 1 Clarified Features Testing
-- Created: 2025-10-08
-- Description: Test data for Phase 1 features
--   - 1 Super Admin user
--   - 3 invoices in "On Hold" state
--   - 2 archive requests (1 pending, 1 approved)
--   - Profile visibility mappings for 2 users
-- ============================================================================
-- Prerequisites: Run 001_phase1_clarified_features.sql first
-- ============================================================================

BEGIN;

-- ============================================================================
-- SETUP: Verify Required Tables Exist
-- ============================================================================

DO $$
BEGIN
  -- Check if migration was applied
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE migration_name = '001_phase1_clarified_features'
  ) THEN
    RAISE EXCEPTION 'Migration 001_phase1_clarified_features must be applied before running seed data';
  END IF;
END $$;

-- ============================================================================
-- 1. SEED: Super Admin User
-- ============================================================================

-- Insert Super Admin (assuming users table exists with standard fields)
INSERT INTO users (
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'superadmin@paylog.example',
  'Super Admin',
  'super_admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE
  SET role = 'super_admin',
      is_active = true;

-- Get Super Admin ID for reference
DO $$
DECLARE
  super_admin_id BIGINT;
  admin_user_id BIGINT;
  standard_user1_id BIGINT;
  standard_user2_id BIGINT;
  vendor1_id BIGINT;
  vendor2_id BIGINT;
  profile1_id BIGINT;
  profile2_id BIGINT;
  invoice1_id BIGINT;
  invoice2_id BIGINT;
  invoice3_id BIGINT;
BEGIN

  -- Get or create users
  SELECT id INTO super_admin_id FROM users WHERE email = 'superadmin@paylog.example';

  -- Insert regular admin for testing
  INSERT INTO users (email, full_name, role, is_active, created_at, updated_at)
  VALUES ('admin@paylog.example', 'Regular Admin', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = true
  RETURNING id INTO admin_user_id;

  -- Insert standard users for visibility testing
  INSERT INTO users (email, full_name, role, is_active, created_at, updated_at)
  VALUES ('user1@paylog.example', 'Standard User 1', 'standard_user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT (email) DO UPDATE SET role = 'standard_user', is_active = true
  RETURNING id INTO standard_user1_id;

  INSERT INTO users (email, full_name, role, is_active, created_at, updated_at)
  VALUES ('user2@paylog.example', 'Standard User 2', 'standard_user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT (email) DO UPDATE SET role = 'standard_user', is_active = true
  RETURNING id INTO standard_user2_id;

  -- ============================================================================
  -- 2. SEED: Vendors (if table exists)
  -- ============================================================================

  -- Check if vendors table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors'
  ) THEN
    INSERT INTO vendors (name, is_active, created_at, updated_at)
    VALUES
      ('Test Vendor A', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Test Vendor B (Outdated)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING
    RETURNING id INTO vendor1_id;

    SELECT id INTO vendor1_id FROM vendors WHERE name = 'Test Vendor A' LIMIT 1;
    SELECT id INTO vendor2_id FROM vendors WHERE name = 'Test Vendor B (Outdated)' LIMIT 1;
  END IF;

  -- ============================================================================
  -- 3. SEED: Invoice Profiles (if table exists)
  -- ============================================================================

  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_profiles'
  ) THEN
    -- Profile 1: Visible to all (default)
    INSERT INTO invoice_profiles (name, description, visible_to_all, created_at, updated_at)
    VALUES (
      'General Office Supplies',
      'For routine office supply purchases',
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO profile1_id;

    -- Profile 2: Restricted visibility
    INSERT INTO invoice_profiles (name, description, visible_to_all, created_at, updated_at)
    VALUES (
      'Executive Travel',
      'For executive travel expenses - restricted access',
      false,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO profile2_id;

    -- Get IDs if already existed
    IF profile1_id IS NULL THEN
      SELECT id INTO profile1_id FROM invoice_profiles WHERE name = 'General Office Supplies' LIMIT 1;
    END IF;
    IF profile2_id IS NULL THEN
      SELECT id INTO profile2_id FROM invoice_profiles WHERE name = 'Executive Travel' LIMIT 1;
    END IF;
  END IF;

  -- ============================================================================
  -- 4. SEED: Profile Visibility Mappings
  -- ============================================================================

  IF profile2_id IS NOT NULL THEN
    -- Grant Standard User 1 access to restricted profile
    INSERT INTO user_profile_visibility (user_id, profile_id, granted_by, granted_at)
    VALUES (standard_user1_id, profile2_id, super_admin_id, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, profile_id) DO NOTHING;

    -- Standard User 2 does NOT have access to Executive Travel profile
    -- (demonstrating restricted visibility)
  END IF;

  -- ============================================================================
  -- 5. SEED: Invoices in "On Hold" State
  -- ============================================================================

  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices'
  ) THEN
    -- Invoice 1: On Hold - Missing vendor documentation
    INSERT INTO invoices (
      invoice_number,
      vendor_id,
      invoice_amount,
      status,
      hold_reason,
      hold_by,
      hold_at,
      submission_count,
      last_submission_at,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      'INV-HOLD-001',
      vendor1_id,
      1500.00,
      'on_hold',
      'Missing vendor W-9 form and proof of insurance',
      admin_user_id,
      CURRENT_TIMESTAMP - INTERVAL '2 days',
      1,
      CURRENT_TIMESTAMP - INTERVAL '5 days',
      standard_user1_id,
      CURRENT_TIMESTAMP - INTERVAL '5 days',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (invoice_number) DO NOTHING
    RETURNING id INTO invoice1_id;

    -- Invoice 2: On Hold - Clarification needed from requester
    INSERT INTO invoices (
      invoice_number,
      vendor_id,
      invoice_amount,
      status,
      hold_reason,
      hold_by,
      hold_at,
      submission_count,
      last_submission_at,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      'INV-HOLD-002',
      vendor1_id,
      3200.50,
      'on_hold',
      'Line item descriptions unclear - requester needs to provide more detail on equipment purchased',
      admin_user_id,
      CURRENT_TIMESTAMP - INTERVAL '1 day',
      1,
      CURRENT_TIMESTAMP - INTERVAL '3 days',
      standard_user2_id,
      CURRENT_TIMESTAMP - INTERVAL '3 days',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (invoice_number) DO NOTHING
    RETURNING id INTO invoice2_id;

    -- Invoice 3: On Hold - Budget verification needed
    INSERT INTO invoices (
      invoice_number,
      vendor_id,
      invoice_amount,
      status,
      hold_reason,
      hold_by,
      hold_at,
      submission_count,
      last_submission_at,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      'INV-HOLD-003',
      vendor1_id,
      15000.00,
      'on_hold',
      'Amount exceeds approved budget - need CFO approval before processing',
      super_admin_id,
      CURRENT_TIMESTAMP - INTERVAL '6 hours',
      1,
      CURRENT_TIMESTAMP - INTERVAL '1 day',
      standard_user1_id,
      CURRENT_TIMESTAMP - INTERVAL '1 day',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (invoice_number) DO NOTHING
    RETURNING id INTO invoice3_id;

    -- Additional invoice: Hidden (very old overdue)
    INSERT INTO invoices (
      invoice_number,
      vendor_id,
      invoice_amount,
      status,
      is_hidden,
      hidden_by,
      hidden_at,
      hidden_reason,
      submission_count,
      last_submission_at,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      'INV-OLD-001',
      vendor1_id,
      450.00,
      'overdue',
      true,
      admin_user_id,
      CURRENT_TIMESTAMP,
      'Very old overdue invoice (>120 days), vendor out of business, not pursuing payment',
      1,
      CURRENT_TIMESTAMP - INTERVAL '150 days',
      standard_user1_id,
      CURRENT_TIMESTAMP - INTERVAL '150 days',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Additional invoice: Resubmitted twice (testing counter)
    INSERT INTO invoices (
      invoice_number,
      vendor_id,
      invoice_amount,
      status,
      rejection_reason,
      submission_count,
      last_submission_at,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      'INV-RESUB-001',
      vendor1_id,
      890.00,
      'pending_approval',
      'Previous rejection: Missing receipt attachments',
      2,
      CURRENT_TIMESTAMP - INTERVAL '1 hour',
      standard_user2_id,
      CURRENT_TIMESTAMP - INTERVAL '10 days',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;

  -- ============================================================================
  -- 6. SEED: Archive Requests
  -- ============================================================================

  IF vendor2_id IS NOT NULL THEN
    -- Archive Request 1: Pending - Vendor no longer used
    INSERT INTO archive_requests (
      entity_type,
      entity_id,
      requested_by,
      status,
      reason,
      requested_at
    ) VALUES (
      'vendor',
      vendor2_id,
      standard_user1_id,
      'pending',
      'This vendor has not been used in over 18 months and is no longer in business. All historical invoices are closed.',
      CURRENT_TIMESTAMP - INTERVAL '2 days'
    );

    -- Archive Request 2: Approved - Duplicate category archived
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'categories'
    ) THEN
      -- Create a test category to archive
      INSERT INTO categories (name, is_active, created_at, updated_at)
      VALUES ('Duplicate Office Supplies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING;

      DECLARE
        category_id BIGINT;
      BEGIN
        SELECT id INTO category_id FROM categories WHERE name = 'Duplicate Office Supplies' LIMIT 1;

        IF category_id IS NOT NULL THEN
          INSERT INTO archive_requests (
            entity_type,
            entity_id,
            requested_by,
            reviewed_by,
            status,
            reason,
            requested_at,
            reviewed_at
          ) VALUES (
            'category',
            category_id,
            standard_user2_id,
            admin_user_id,
            'approved',
            'This category is a duplicate of "Office Supplies" and should be consolidated.',
            CURRENT_TIMESTAMP - INTERVAL '5 days',
            CURRENT_TIMESTAMP - INTERVAL '3 days'
          );

          -- Mark category as archived (if is_active field exists)
          UPDATE categories SET is_active = false WHERE id = category_id;
        END IF;
      END;
    END IF;
  END IF;

END $$;

COMMIT;

-- ============================================================================
-- SEED DATA VERIFICATION QUERIES
-- ============================================================================

-- 1. Verify Super Admin created
SELECT id, email, full_name, role, is_active
FROM users
WHERE role = 'super_admin';

-- 2. Verify invoices on hold
SELECT invoice_number, status, hold_reason, hold_by, hold_at
FROM invoices
WHERE status = 'on_hold'
ORDER BY hold_at DESC;

-- 3. Verify hidden invoice
SELECT invoice_number, status, is_hidden, hidden_reason
FROM invoices
WHERE is_hidden = true;

-- 4. Verify profile visibility mappings
SELECT
  upv.id,
  u.email AS user_email,
  ip.name AS profile_name,
  ip.visible_to_all,
  g.email AS granted_by_email
FROM user_profile_visibility upv
JOIN users u ON upv.user_id = u.id
JOIN invoice_profiles ip ON upv.profile_id = ip.id
JOIN users g ON upv.granted_by = g.id;

-- 5. Verify archive requests
SELECT
  ar.id,
  ar.entity_type,
  ar.entity_id,
  ar.status,
  ar.reason,
  u.email AS requested_by_email,
  r.email AS reviewed_by_email
FROM archive_requests ar
JOIN users u ON ar.requested_by = u.id
LEFT JOIN users r ON ar.reviewed_by = r.id
ORDER BY ar.requested_at DESC;

-- 6. Verify resubmission counter
SELECT invoice_number, status, submission_count, last_submission_at
FROM invoices
WHERE submission_count > 1;

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================
-- Test data ready for Phase 1 feature validation:
-- ✓ 1 Super Admin user (superadmin@paylog.example)
-- ✓ 3 invoices in "On Hold" state with reasons
-- ✓ 1 hidden invoice (very old overdue)
-- ✓ 1 invoice with resubmission count = 2
-- ✓ 2 invoice profiles (1 public, 1 restricted)
-- ✓ 2 users with profile visibility mappings
-- ✓ 2 archive requests (1 pending, 1 approved)
-- ============================================================================
