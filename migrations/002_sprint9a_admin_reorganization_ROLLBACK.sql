-- ============================================================================
-- ROLLBACK Migration: Sprint 9A - Admin Reorganization & Enhanced Master Data
-- Created: 2025-10-23
-- Description: Rolls back all Sprint 9A schema changes
--   - Removes Invoice foreign keys (currency_id, entity_id)
--   - Restores ArchiveRequest table (optional: see notes)
--   - Removes Category description column (sets to NULL if column exists)
--   - Removes Vendor enhancements (address, gst_exemption, bank_details)
--   - Drops Entity table
--   - Drops Currency table
-- ============================================================================

-- IMPORTANT: This rollback script will DESTROY DATA in the following tables:
--   - currencies (all 50 records)
--   - entities (all migrated records)
--   - Vendor enhancements (address, gst_exemption, bank_details values)
--   - Category descriptions (sets to NULL)
--   - Invoice.currency_id and Invoice.entity_id (sets to NULL)
--
-- BACKUP RECOMMENDATION: Before running this rollback, backup these tables:
--   pg_dump -t currencies -t entities > sprint9a_rollback_backup.sql

BEGIN;

-- ============================================================================
-- 1. REMOVE INVOICE FOREIGN KEYS
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_invoices_currency;
DROP INDEX IF EXISTS idx_invoices_entity;

-- Drop foreign key columns (data will be lost)
ALTER TABLE invoices
  DROP COLUMN IF EXISTS currency_id,
  DROP COLUMN IF EXISTS entity_id;

-- ============================================================================
-- 2. RESTORE CATEGORY TO ORIGINAL STATE
-- ============================================================================

-- Option A: Drop description column entirely (data will be lost)
ALTER TABLE categories
  DROP COLUMN IF EXISTS description;

-- Option B: Set description to NULL instead of dropping (preserves data)
-- Uncomment below if you want to keep descriptions as nullable:
-- ALTER TABLE categories
--   DROP CONSTRAINT IF EXISTS categories_description_not_empty;
-- ALTER TABLE categories
--   ALTER COLUMN description DROP NOT NULL;

-- ============================================================================
-- 3. REMOVE VENDOR ENHANCEMENTS
-- ============================================================================

-- Drop constraints first
ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_bank_details_length;

-- Drop columns (data will be lost)
ALTER TABLE vendors
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS gst_exemption,
  DROP COLUMN IF EXISTS bank_details;

-- ============================================================================
-- 4. DROP ENTITY TABLE
-- ============================================================================

-- Drop foreign key constraints from invoices first (already done in step 1)
-- No additional constraints to drop

-- Drop indexes
DROP INDEX IF EXISTS idx_entities_active;
DROP INDEX IF EXISTS idx_entities_country;
DROP INDEX IF EXISTS idx_entities_name;

-- Drop table (all data will be lost)
DROP TABLE IF EXISTS entities;

-- ============================================================================
-- 5. DROP CURRENCY TABLE
-- ============================================================================

-- Drop foreign key constraints from invoices first (already done in step 1)
-- No additional constraints to drop

-- Drop indexes
DROP INDEX IF EXISTS idx_currencies_active;
DROP INDEX IF EXISTS idx_currencies_code;

-- Drop table (all data will be lost)
DROP TABLE IF EXISTS currencies;

-- ============================================================================
-- 6. RESTORE ARCHIVE REQUEST TABLE (OPTIONAL)
-- ============================================================================

-- WARNING: This recreates the table structure but does NOT restore data.
-- If you need to restore data, use a backup from before migration.

CREATE TABLE IF NOT EXISTS archive_requests (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
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

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_archive_requests_status ON archive_requests (status);
CREATE INDEX IF NOT EXISTS idx_archive_requests_entity ON archive_requests (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_archive_requests_requested_by ON archive_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_archive_requests_pending ON archive_requests (status, requested_at DESC) WHERE status = 'pending';

-- Add comments
COMMENT ON TABLE archive_requests IS 'Allows standard users to request archival of outdated master data (vendors, categories, sub-entities, profiles). Requests go to admin approval queue. Admins can approve (archives the entity) or reject (entity remains active).';

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Remove migration record
DELETE FROM schema_migrations
WHERE migration_name = '002_sprint9a_admin_reorganization';

COMMIT;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after rollback to verify success:

-- 1. Verify currencies table dropped
-- SELECT COUNT(*)
-- FROM information_schema.tables
-- WHERE table_name = 'currencies';
-- Expected: 0

-- 2. Verify entities table dropped
-- SELECT COUNT(*)
-- FROM information_schema.tables
-- WHERE table_name = 'entities';
-- Expected: 0

-- 3. Verify invoice columns removed
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'invoices' AND column_name IN ('currency_id', 'entity_id');
-- Expected: 0 rows

-- 4. Verify vendor columns removed
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'vendors' AND column_name IN ('address', 'gst_exemption', 'bank_details');
-- Expected: 0 rows

-- 5. Verify category description removed (Option A) OR nullable (Option B)
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'categories' AND column_name = 'description';
-- Expected: 0 rows (Option A) OR is_nullable = 'YES' (Option B)

-- 6. Verify ArchiveRequest table restored (if optional step executed)
-- SELECT COUNT(*)
-- FROM information_schema.tables
-- WHERE table_name = 'archive_requests';
-- Expected: 1

-- ============================================================================
-- ROLLBACK NOTES
-- ============================================================================

-- 1. DATA LOSS: This rollback will permanently delete:
--    - All 50 currency records
--    - All entity records (migrated from SubEntity)
--    - Vendor address, gst_exemption, bank_details values
--    - Category descriptions
--    - Invoice currency_id and entity_id references
--
-- 2. SUBENTITY PRESERVED: The original sub_entities table remains untouched.
--    All invoice references to sub_entity_id remain intact.
--
-- 3. ARCHIVE REQUESTS: The restored archive_requests table is EMPTY.
--    If you need to restore old archive request data, use a database backup.
--
-- 4. APPLICATION CODE: After rollback, you must:
--    - Revert Prisma schema changes
--    - Run: prisma generate
--    - Remove references to Currency and Entity models in application code
--    - Restore ArchiveRequest model if table was restored
--
-- 5. SAFE ROLLBACK WINDOW: This rollback is safe ONLY if:
--    - No invoices have been assigned currency_id or entity_id
--    - No production data relies on Currency or Entity tables
--    - No users have updated Vendor enhancements or Category descriptions
--
-- 6. POINT OF NO RETURN: Once invoices are actively using currency_id or
--    entity_id in production, this rollback becomes DATA DESTRUCTIVE.
--    Consider a data migration rollback instead (copy currency_id → NULL,
--    entity_id → NULL, then drop tables).

-- ============================================================================
-- ALTERNATIVE: SAFE ROLLBACK WITH DATA PRESERVATION
-- ============================================================================

-- If you need to preserve data before rollback:
--
-- 1. Export currency and entity data:
--    COPY (SELECT * FROM currencies) TO '/tmp/currencies_backup.csv' CSV HEADER;
--    COPY (SELECT * FROM entities) TO '/tmp/entities_backup.csv' CSV HEADER;
--
-- 2. Export invoice references:
--    COPY (SELECT id, currency_id, entity_id FROM invoices WHERE currency_id IS NOT NULL OR entity_id IS NOT NULL)
--    TO '/tmp/invoice_references_backup.csv' CSV HEADER;
--
-- 3. Run this rollback script
--
-- 4. Data can be re-imported if needed in the future

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
