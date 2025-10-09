# Phase 1 Migration Guide

## Overview

This guide covers the execution of Phase 1 Clarified Features migration for the Paylog invoice management system.

## Migration Files

1. **001_phase1_clarified_features.sql** - Main migration (forward)
2. **001_phase1_clarified_features_ROLLBACK.sql** - Rollback script
3. **001_phase1_seed_data.sql** - Test data for validation

## Prerequisites

- PostgreSQL 12+ database
- Backup of production database (if applying to prod)
- Database connection with DDL privileges (ALTER, CREATE, DROP)
- Existing schema with base tables:
  - `users` (id, email, full_name, role, is_active, created_at, updated_at)
  - `invoices` (id, invoice_number, vendor_id, invoice_amount, status, created_by, created_at, updated_at)
  - `payments` (id, invoice_id, amount_paid, payment_date, status)
  - `invoice_profiles` (id, name, description, created_at, updated_at)
  - `vendors` (id, name, is_active, created_at, updated_at)
  - `categories` (id, name, is_active, created_at, updated_at)

## Migration Sequence

### Step 1: Pre-Migration Checks

```sql
-- 1. Verify database connection
SELECT version();

-- 2. Check current schema version
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

-- 3. Check table existence
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'invoices', 'payments', 'invoice_profiles', 'vendors');

-- 4. Check current invoice statuses
SELECT status, COUNT(*) FROM invoices GROUP BY status;

-- 5. Check current user roles
SELECT role, COUNT(*) FROM users GROUP BY role;

-- 6. Verify no "on_hold" or "super_admin" values exist (should be clean)
SELECT COUNT(*) FROM invoices WHERE status = 'on_hold'; -- Should be 0
SELECT COUNT(*) FROM users WHERE role = 'super_admin'; -- Should be 0
```

### Step 2: Backup

```bash
# Backup entire database
pg_dump -h localhost -U postgres -d paylog_prod -F c -b -v -f paylog_backup_$(date +%Y%m%d_%H%M%S).dump

# Or backup specific tables if preferred
pg_dump -h localhost -U postgres -d paylog_prod -t users -t invoices -t invoice_profiles \
  -F c -b -v -f paylog_tables_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Step 3: Apply Migration (Non-Production)

```bash
# Apply to development/staging first
psql -h localhost -U postgres -d paylog_dev -f migrations/001_phase1_clarified_features.sql

# Check for errors
echo $?  # Should be 0 if successful
```

### Step 4: Verify Migration

```sql
-- 1. Check migration record
SELECT * FROM schema_migrations WHERE migration_name = '001_phase1_clarified_features';

-- 2. Verify new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN ('hold_reason', 'hold_by', 'hold_at', 'submission_count',
                      'last_submission_at', 'is_hidden', 'hidden_by', 'hidden_at', 'hidden_reason');

-- 3. Verify new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('user_profile_visibility', 'archive_requests');

-- 4. Verify constraints updated
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name IN ('invoices_status_check', 'users_role_check');

-- 5. Verify triggers created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('resubmission_counter', 'protect_last_superadmin');

-- 6. Verify view created
SELECT table_name FROM information_schema.views WHERE table_name = 'dashboard_kpis';
```

### Step 5: Apply Seed Data (Optional - Development Only)

```bash
# Apply test data for feature validation
psql -h localhost -U postgres -d paylog_dev -f migrations/001_phase1_seed_data.sql

# Verify seed data
psql -h localhost -U postgres -d paylog_dev -c "SELECT COUNT(*) FROM invoices WHERE status = 'on_hold';"
# Expected: 3

psql -h localhost -U postgres -d paylog_dev -c "SELECT COUNT(*) FROM users WHERE role = 'super_admin';"
# Expected: 1
```

### Step 6: Smoke Tests

Run these queries to ensure functionality:

```sql
-- 1. Test "On Hold" state constraint
INSERT INTO invoices (invoice_number, invoice_amount, status, created_by)
VALUES ('TEST-001', 100.00, 'on_hold', 1);
-- Should succeed

-- 2. Test invalid status constraint
INSERT INTO invoices (invoice_number, invoice_amount, status, created_by)
VALUES ('TEST-002', 100.00, 'invalid_status', 1);
-- Should fail with constraint violation

-- 3. Test Super Admin protection trigger
-- First, verify there's only one super admin
SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND is_active = true;
-- If count = 1, test protection:
UPDATE users SET is_active = false WHERE role = 'super_admin' LIMIT 1;
-- Should fail with "Cannot deactivate the last Super Admin user"

-- 4. Test resubmission counter trigger
-- Create a rejected invoice
INSERT INTO invoices (invoice_number, invoice_amount, status, rejection_reason, created_by, submission_count)
VALUES ('TEST-RESUB', 500.00, 'rejected', 'Test rejection', 1, 1);

-- Resubmit it
UPDATE invoices SET status = 'pending_approval' WHERE invoice_number = 'TEST-RESUB';

-- Check counter incremented
SELECT submission_count, last_submission_at FROM invoices WHERE invoice_number = 'TEST-RESUB';
-- Expected: submission_count = 2

-- 5. Test profile visibility
INSERT INTO user_profile_visibility (user_id, profile_id, granted_by)
VALUES (1, 1, 2);
-- Should succeed

INSERT INTO user_profile_visibility (user_id, profile_id, granted_by)
VALUES (1, 1, 2);
-- Should fail with unique constraint violation

-- 6. Test archive request creation
INSERT INTO archive_requests (entity_type, entity_id, requested_by, reason)
VALUES ('vendor', 1, 1, 'Test archive request');
-- Should succeed with status = 'pending'

-- 7. Test dashboard KPIs view
SELECT * FROM dashboard_kpis;
-- Should return 1 row with: total_due, paid_this_month, pending_count, avg_processing_days

-- Cleanup test data
DELETE FROM invoices WHERE invoice_number LIKE 'TEST-%';
DELETE FROM archive_requests WHERE reason = 'Test archive request';
```

### Step 7: Apply to Production

**Only after thorough testing in staging!**

```bash
# 1. Schedule maintenance window (if needed)
# 2. Notify users
# 3. Final backup
pg_dump -h prod-db -U postgres -d paylog_prod -F c -b -v -f paylog_prod_final_backup_$(date +%Y%m%d_%H%M%S).dump

# 4. Apply migration
psql -h prod-db -U postgres -d paylog_prod -f migrations/001_phase1_clarified_features.sql

# 5. Verify (run Step 4 queries)
# 6. Monitor application logs for errors
# 7. Test critical user workflows
```

## Rollback Procedure

If issues arise, rollback using the provided script:

```bash
# 1. Stop application traffic (if possible)

# 2. Apply rollback
psql -h prod-db -U postgres -d paylog_prod -f migrations/001_phase1_clarified_features_ROLLBACK.sql

# 3. Verify rollback
psql -h prod-db -U postgres -d paylog_prod -c "
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_name = 'invoices' AND column_name IN ('hold_reason', 'submission_count', 'is_hidden');
"
# Expected: 0

# 4. Restore from backup if rollback script fails
pg_restore -h prod-db -U postgres -d paylog_prod -c paylog_backup_TIMESTAMP.dump

# 5. Resume application traffic
```

## Post-Migration Tasks

1. **Update application code** to use new fields and states
2. **Update API documentation** with new endpoints and fields
3. **Train users** on new features (On Hold workflow, archive requests, etc.)
4. **Monitor performance** of new indexes and triggers
5. **Review dashboard KPIs** calculation accuracy
6. **Document operational procedures** for:
   - Placing invoices on hold
   - Reviewing archive requests
   - Managing profile visibility
   - Handling resubmission limits

## Troubleshooting

### Issue: Migration fails with "relation does not exist"

**Cause**: Base tables not present in database

**Solution**: Ensure prerequisite tables exist before running migration

```sql
-- Check missing tables
SELECT unnest(ARRAY['users', 'invoices', 'payments', 'invoice_profiles', 'vendors']) AS required_table
EXCEPT
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Issue: Constraint violation on existing data

**Cause**: Existing data violates new constraints

**Solution**: Clean data before migration

```sql
-- Check for problematic invoice statuses
SELECT DISTINCT status FROM invoices
WHERE status NOT IN ('pending_approval', 'unpaid', 'partial', 'paid', 'overdue');

-- Check for problematic user roles
SELECT DISTINCT role FROM users
WHERE role NOT IN ('standard_user', 'admin');
```

### Issue: Trigger not firing

**Cause**: Trigger function syntax error or permissions

**Solution**: Verify function creation and test manually

```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname IN ('increment_submission_count', 'prevent_last_superadmin_deactivation');

-- Check trigger exists and is enabled
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname IN ('resubmission_counter', 'protect_last_superadmin');
```

### Issue: View query fails

**Cause**: Subquery references missing columns or tables

**Solution**: Verify all prerequisite columns exist

```sql
-- Check required columns for KPI view
SELECT table_name, column_name
FROM information_schema.columns
WHERE (table_name = 'invoices' AND column_name IN ('invoice_amount', 'status', 'is_hidden'))
   OR (table_name = 'payments' AND column_name IN ('amount_paid', 'payment_date', 'status'));
```

## Performance Considerations

### Index Usage

The migration creates several indexes for query optimization:

- `idx_invoices_on_hold` - Speeds up "On Hold" invoice queries
- `idx_invoices_hidden` - Optimizes hidden invoice filtering
- `idx_invoices_active` - Partial index for active invoice queries
- `idx_archive_requests_pending` - Optimizes admin queue queries
- `idx_user_profile_visibility_user` - Fast user permission lookups

### Expected Performance Impact

- **Minimal impact** on insert/update operations (<5% overhead from triggers)
- **Significant improvement** on dashboard queries (KPI view uses optimized aggregations)
- **No impact** on existing queries (additive changes only)

### Monitoring Queries

```sql
-- Check index usage after 7 days
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Monitor trigger execution time (if pg_stat_statements enabled)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%increment_submission_count%' OR query LIKE '%prevent_last_superadmin_deactivation%';
```

## Success Criteria

Migration is considered successful when:

- ✅ All SQL statements execute without errors
- ✅ Migration record appears in `schema_migrations` table
- ✅ All new columns, tables, indexes, triggers, and views exist
- ✅ Smoke tests pass
- ✅ Application can read/write new fields
- ✅ No performance degradation on existing queries
- ✅ Rollback script tested and verified (in staging)

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
3. Contact database team with:
   - Error message
   - PostgreSQL version
   - Migration step where failure occurred
   - Output of pre-migration checks

---

**Migration Version**: 001
**Created**: 2025-10-08
**Author**: Database Modeler (DBM)
**Status**: Ready for execution
