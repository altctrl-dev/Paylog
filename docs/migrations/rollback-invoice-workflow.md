# Sprint 13 Phase 1: Invoice Workflow Migration Rollback Procedure

**Migration**: `004_sprint13_invoice_workflow_fields`
**Date**: 2025-11-19
**Database**: PostgreSQL 17 on Railway
**Risk Level**: LOW (Additive migration, no data loss)

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Rollback Checklist](#pre-rollback-checklist)
3. [Rollback Procedure](#rollback-procedure)
4. [Verification](#verification)
5. [Recovery](#recovery)
6. [Troubleshooting](#troubleshooting)

---

## Overview

This migration added:
- **InvoiceProfile**: 1 new column (`billing_frequency`)
- **Invoice**: 8 new columns (2 recurring workflow + 6 payment tracking)
- 2 foreign key constraints (SET NULL)
- 6 indexes
- 3 CHECK constraints

### Why Rollback Might Be Needed

- Application code bugs discovered post-migration
- Performance issues with new indexes
- Business logic changes requiring different schema design
- Unexpected constraint violations

### Rollback Safety

This is a **SAFE ROLLBACK** because:
- All new columns are nullable or have defaults
- Foreign keys use SET NULL (no cascade deletes)
- No existing columns were modified
- No data was deleted

---

## Pre-Rollback Checklist

Before proceeding with rollback, verify:

- [ ] **Backup exists**: Confirm recent database backup is available
- [ ] **Downtime scheduled**: Notify stakeholders of maintenance window
- [ ] **Code deployment**: Ensure application code is rolled back first (avoid referencing removed columns)
- [ ] **Dependencies checked**: No critical features depend on new columns
- [ ] **Railway access**: Database credentials and access confirmed

**Estimated Rollback Time**: 2-5 minutes (depends on table size)

---

## Rollback Procedure

### Step 1: Create Checkpoint

Before rollback, create a safety checkpoint:

```bash
# Export current state (optional but recommended)
pg_dump $DATABASE_URL > /tmp/paylog_pre_rollback_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Connect to Database

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL
```

Or use Railway CLI:

```bash
railway connect postgres
```

### Step 3: Execute Rollback SQL

Copy and paste the following SQL to rollback the migration:

```sql
-- ============================================================================
-- ROLLBACK: Sprint 13 Invoice Workflow Enhancement
-- ============================================================================
-- WARNING: This will remove all data in the new columns!
-- Ensure application code is rolled back FIRST to avoid errors.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop CHECK Constraints
-- ============================================================================

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS chk_invoices_recurring_profile;

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS chk_invoices_paid_details;

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS chk_invoices_paid_amount_positive;

RAISE NOTICE 'STEP 1 COMPLETE: Dropped 3 CHECK constraints';

-- ============================================================================
-- STEP 2: Drop Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_invoices_recurring;
DROP INDEX IF EXISTS idx_invoices_invoice_profile;
DROP INDEX IF EXISTS idx_invoices_payment_type;
DROP INDEX IF EXISTS idx_invoices_paid;
DROP INDEX IF EXISTS idx_invoices_recurring_profile;
DROP INDEX IF EXISTS idx_invoices_paid_date;

RAISE NOTICE 'STEP 2 COMPLETE: Dropped 6 indexes';

-- ============================================================================
-- STEP 3: Drop Foreign Key Constraints
-- ============================================================================

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS fk_invoices_invoice_profile;

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS fk_invoices_payment_type;

RAISE NOTICE 'STEP 3 COMPLETE: Dropped 2 foreign key constraints';

-- ============================================================================
-- STEP 4: Drop Columns from Invoice Table
-- ============================================================================

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

RAISE NOTICE 'STEP 4 COMPLETE: Dropped 8 columns from invoices table';

-- ============================================================================
-- STEP 5: Drop Column from InvoiceProfile Table
-- ============================================================================

ALTER TABLE invoice_profiles
DROP COLUMN IF EXISTS billing_frequency;

RAISE NOTICE 'STEP 5 COMPLETE: Dropped billing_frequency column from invoice_profiles';

-- ============================================================================
-- STEP 6: Drop Documentation Comments
-- ============================================================================

COMMENT ON COLUMN invoice_profiles.billing_frequency IS NULL;
COMMENT ON COLUMN invoices.is_recurring IS NULL;
COMMENT ON COLUMN invoices.invoice_profile_id IS NULL;
COMMENT ON COLUMN invoices.is_paid IS NULL;
COMMENT ON COLUMN invoices.paid_date IS NULL;
COMMENT ON COLUMN invoices.paid_amount IS NULL;
COMMENT ON COLUMN invoices.paid_currency IS NULL;
COMMENT ON COLUMN invoices.payment_type_id IS NULL;
COMMENT ON COLUMN invoices.payment_reference IS NULL;

RAISE NOTICE 'STEP 6 COMPLETE: Removed documentation comments';

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

RAISE NOTICE '═════════════════════════════════════════════════════════════';
RAISE NOTICE 'ROLLBACK COMPLETE: Sprint 13 Invoice Workflow Enhancement';
RAISE NOTICE '═════════════════════════════════════════════════════════════';
RAISE NOTICE 'Schema reverted to pre-migration state';
RAISE NOTICE 'All new columns, constraints, and indexes removed';
RAISE NOTICE '═════════════════════════════════════════════════════════════';

COMMIT;
```

### Step 4: Verify Rollback

Check that columns no longer exist:

```sql
-- Verify InvoiceProfile columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoice_profiles'
  AND column_name = 'billing_frequency';
-- Should return 0 rows

-- Verify Invoice columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN (
    'is_recurring', 'invoice_profile_id', 'is_paid', 'paid_date',
    'paid_amount', 'paid_currency', 'payment_type_id', 'payment_reference'
  );
-- Should return 0 rows
```

### Step 5: Regenerate Prisma Client

Update Prisma schema to match rolled-back database:

```bash
# Revert schema.prisma to previous version (use git)
git checkout HEAD~1 schema.prisma

# Regenerate Prisma client
npx prisma generate

# Verify schema matches database
npx prisma db pull --force
```

### Step 6: Deploy Application

Deploy the rolled-back application code:

```bash
# Railway auto-deploys on git push
git push origin main

# Or manually trigger deployment
railway up
```

---

## Verification

After rollback, verify system stability:

### Database Verification

```sql
-- Check invoice count (should match pre-rollback)
SELECT COUNT(*) FROM invoices;

-- Check invoice_profiles count (should match pre-rollback)
SELECT COUNT(*) FROM invoice_profiles;

-- Verify no foreign key errors
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN ('invoices', 'invoice_profiles');
```

### Application Verification

1. Test invoice creation (non-recurring flow)
2. Test invoice payment workflow
3. Test invoice profile viewing
4. Check logs for errors

### Prisma Client Verification

```bash
# Verify TypeScript types match schema
npm run typecheck

# Run tests
npm test
```

---

## Recovery

If rollback fails or causes issues:

### Option 1: Restore from Backup

```bash
# Restore from pre-rollback backup
psql $DATABASE_URL < /tmp/paylog_pre_rollback_TIMESTAMP.sql
```

### Option 2: Re-apply Migration

If rollback was a mistake, re-apply the migration:

```bash
# Re-apply migration
psql $DATABASE_URL < prisma/migrations/004_sprint13_invoice_workflow_fields/migration.sql

# Regenerate Prisma client
npx prisma generate

# Re-run backfill script
npm run backfill:recurring-status
```

### Option 3: Railway Snapshot Restore

Use Railway's built-in backup feature:

1. Go to Railway dashboard
2. Navigate to PostgreSQL service
3. Click "Backups" tab
4. Select snapshot from before migration
5. Click "Restore"

**Warning**: This will restore ALL data to the snapshot time, losing any new data created after the snapshot.

---

## Troubleshooting

### Issue: "Column does not exist" errors after rollback

**Cause**: Application code still references removed columns
**Solution**: Deploy rolled-back application code before rollback

```bash
# Rollback application code first
git checkout <previous-commit>
git push origin main --force

# Wait for deployment to complete
# Then run database rollback
```

### Issue: Foreign key constraint violations

**Cause**: Data in related tables references removed columns
**Solution**: This should not happen with SET NULL cascades, but if it does:

```sql
-- Check for orphaned references
SELECT id, invoice_profile_id
FROM invoices
WHERE invoice_profile_id IS NOT NULL;

-- If any exist, migration was not fully rolled back
-- Re-run rollback SQL from Step 3
```

### Issue: Prisma client out of sync

**Cause**: Prisma schema not updated after rollback
**Solution**:

```bash
# Pull current database schema
npx prisma db pull --force

# This will overwrite schema.prisma with database state
# Review changes and regenerate client
npx prisma generate
```

### Issue: Performance degradation after rollback

**Cause**: Indexes removed during rollback were improving queries
**Solution**: Review query performance and add back specific indexes if needed

```sql
-- Example: Re-add paid status index if needed
CREATE INDEX idx_invoices_paid ON invoices(is_paid);
```

---

## Post-Rollback Actions

After successful rollback:

1. **Update documentation**: Mark migration as rolled back in CHANGELOG.md
2. **Notify team**: Inform stakeholders of rollback completion
3. **Root cause analysis**: Investigate why rollback was needed
4. **Plan forward**: Decide on alternative approach or fixes
5. **Clean up**: Remove test data created during migration testing

---

## Emergency Contact

If rollback fails and database is in inconsistent state:

1. **Stop application**: Prevent further writes
2. **Contact DBA**: Escalate to database administrator
3. **Restore from backup**: Use Railway snapshot or pg_dump backup
4. **Document issue**: Create incident report with error logs

---

## Appendix: SQL Rollback Script

Save this as `004_sprint13_invoice_workflow_fields_ROLLBACK.sql`:

```sql
-- See Step 3 in Rollback Procedure for full SQL script
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Author**: Data & Migration Engineer (DME)
**Status**: Ready for use
