# Paid Status Sync Migration

**Created**: 2025-11-21
**Status**: Ready for execution
**Priority**: High (data consistency issue)

## Overview

This migration fixes a data inconsistency between the `is_paid` and `status` fields for V2 invoices in the PayLog system.

## Problem Statement

### Bug Description

Invoices created with `is_paid=true` were not having their `status` field updated to `"paid"`. This caused inconsistent behavior:

- **Detail Panel**: Uses `is_paid` field → showed PAID (correct)
- **List View**: Uses `status` field → showed UNPAID (incorrect)

### Root Cause

The bug has been fixed for NEW invoices (as of 2025-11-21), but **existing V2 invoices** may still have inconsistent data.

### Impact

- **Affected Users**: All users viewing invoice lists
- **Data Integrity**: Inconsistent payment status display
- **Reporting**: Incorrect paid/unpaid counts in reports
- **Severity**: Medium (UI inconsistency, no financial impact)

## Technical Details

### Database Schema

**Table**: `invoices`

**Relevant Fields**:
```sql
is_paid             BOOLEAN DEFAULT false
status              VARCHAR DEFAULT 'pending_approval'
                    -- Values: 'paid', 'unpaid', 'pending_approval', 'on_hold', 'rejected'
```

### Affected Records

**Query to identify affected records**:
```sql
SELECT id, invoice_number, status, is_paid
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);
```

**V2 Invoice Identification**:
V2 invoices are identified by having at least one of these fields populated:
- `currency_id IS NOT NULL`
- `entity_id IS NOT NULL`
- `payment_type_id IS NOT NULL`

### Migration Operation

**Update Statement**:
```sql
UPDATE invoices
SET status = 'paid', updated_at = NOW()
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);
```

## Migration Scripts

### 1. Verification Script

**File**: `scripts/verify-paid-status-sync.ts`

**Purpose**: Check for inconsistencies without making changes

**Usage**:
```bash
# Quick verification
npx tsx scripts/verify-paid-status-sync.ts

# Detailed report (show all inconsistencies)
npx tsx scripts/verify-paid-status-sync.ts --detailed
```

**Output**:
- Total invoices count
- V2 invoices count
- Paid/unpaid counts
- Inconsistency detection (both directions)
- Exit code 0 if consistent, 1 if inconsistent

### 2. Migration Script

**File**: `scripts/backfill-paid-status-sync.ts`

**Purpose**: Fix inconsistencies by syncing status field

**Usage**:
```bash
# Step 1: Preview changes (DRY RUN)
npx tsx scripts/backfill-paid-status-sync.ts --dry-run

# Step 2: Run migration with confirmation prompt
npx tsx scripts/backfill-paid-status-sync.ts

# Step 3 (optional): Run without confirmation (automated)
npx tsx scripts/backfill-paid-status-sync.ts --yes

# Verbose logging
npx tsx scripts/backfill-paid-status-sync.ts --verbose
```

**CLI Flags**:
- `--dry-run`: Preview changes without applying
- `--yes` / `-y`: Skip confirmation prompt
- `--verbose` / `-v`: Show detailed logging

## Safety Measures

### Pre-Migration Checklist

- [ ] **Backup Database**: Create full database backup
- [ ] **Run Verification**: Use verification script to check current state
- [ ] **Dry Run**: Preview changes with `--dry-run` flag
- [ ] **Review Samples**: Check sample records in dry-run output
- [ ] **Maintenance Window**: Schedule during low-traffic period (optional)
- [ ] **Stakeholder Notification**: Inform team before migration

### Migration Safety Features

1. **Idempotent**: Safe to run multiple times
2. **Transaction-based**: All-or-nothing execution
3. **Scoped Updates**: Only affects V2 invoices with is_paid=true and status!='paid'
4. **Pre-flight Checks**: Counts and displays affected records before execution
5. **Post-migration Verification**: Automatically checks for remaining inconsistencies
6. **Verbose Logging**: Optional detailed logging for troubleshooting

### Rollback Limitations

⚠️ **IMPORTANT**: True rollback is NOT possible because we don't store the original status values.

**What we know**:
- We know `status != 'paid'` before migration
- We set `status = 'paid'` after migration

**What we DON'T know**:
- Whether original status was `"unpaid"`, `"pending_approval"`, `"on_hold"`, or `"rejected"`

**Rollback Options**:

#### Option 1: Restore from Backup (RECOMMENDED)
```bash
# Restore full database backup
pg_restore -d paylog_prod backup_before_paid_status_sync_20251121.dump
```

#### Option 2: Export Affected Records BEFORE Migration
```bash
# Run this BEFORE migration
npx tsx scripts/backfill-paid-status-sync.ts --dry-run > affected_records.log

# Then manually parse the log to extract invoice IDs and current status values
```

#### Option 3: Manual Reversal (NOT RECOMMENDED)
If you don't have a backup, you can set status back to `"unpaid"`, but this may not be accurate:
```sql
UPDATE invoices
SET status = 'unpaid'  -- Guess: might have been pending_approval, on_hold, or rejected
WHERE id IN (1, 2, 3, ...);  -- IDs from migration log
```

## Execution Plan

### Timeline

**Estimated Duration**: < 1 minute (for databases with < 1000 invoices)

**Recommended Window**: Non-critical (no downtime required)

### Step-by-Step Procedure

#### Phase 1: Preparation (5 minutes)

1. **Backup Database**:
   ```bash
   # Railway PostgreSQL backup
   railway backup create --environment production

   # Or manual backup
   pg_dump $DATABASE_URL > backup_before_paid_status_sync_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Verification**:
   ```bash
   npx tsx scripts/verify-paid-status-sync.ts
   ```

3. **Review Current State**:
   - Note total inconsistent invoices count
   - Review sample invoice IDs

#### Phase 2: Dry Run (2 minutes)

4. **Preview Changes**:
   ```bash
   npx tsx scripts/backfill-paid-status-sync.ts --dry-run
   ```

5. **Review Output**:
   - Verify affected record count matches expectations
   - Check sample records for correctness
   - Confirm SQL statement is correct

#### Phase 3: Execution (1 minute)

6. **Run Migration**:
   ```bash
   # With confirmation prompt
   npx tsx scripts/backfill-paid-status-sync.ts

   # Or without confirmation (if you're confident)
   npx tsx scripts/backfill-paid-status-sync.ts --yes
   ```

7. **Review Output**:
   - Confirm updated count matches expected
   - Verify "Remaining inconsistencies: 0"
   - Check exit code (0 = success)

#### Phase 4: Verification (2 minutes)

8. **Re-run Verification**:
   ```bash
   npx tsx scripts/verify-paid-status-sync.ts
   ```

9. **Manual UI Check**:
   - Open invoice list view
   - Verify paid invoices show "PAID" status
   - Check 3-5 random invoices in detail panel

10. **Confirm Success**:
    - Verification script shows 0 inconsistencies
    - UI displays correct status
    - No errors in logs

### Post-Migration Tasks

- [ ] **Document Results**: Record final stats in team channel
- [ ] **Monitor Errors**: Check error logs for 24 hours
- [ ] **User Notification**: Inform users of fix (optional)
- [ ] **Archive Backup**: Keep backup for 30 days

## Success Criteria

Migration is successful if ALL of these are true:

1. ✅ Script completes without errors (exit code 0)
2. ✅ Remaining inconsistencies count = 0
3. ✅ Verification script shows "ALL INVOICES CONSISTENT"
4. ✅ UI list view shows correct "PAID" status for paid invoices
5. ✅ No errors in application logs
6. ✅ Invoice counts match before/after migration

## Failure Recovery

### If Migration Fails Mid-Execution

**Scenario**: Script crashes or connection drops during migration

**Recovery**:
1. Transaction will automatically rollback (no partial updates)
2. Re-run verification script to confirm no changes were applied
3. Investigate error in logs
4. Fix issue (e.g., connection, permissions)
5. Re-run migration script

### If Migration Succeeds But Results Are Incorrect

**Scenario**: Migration completes but data looks wrong

**Recovery**:
1. IMMEDIATELY restore from backup:
   ```bash
   pg_restore -d paylog_prod backup_before_paid_status_sync_20251121.dump
   ```
2. Investigate what went wrong
3. Test fix on staging database first
4. Re-run migration on production

### If Rollback Is Needed After Migration

**Scenario**: Business requirement changed, need to revert

**Recovery**:
1. Restore from backup (see Rollback Options above)
2. If no backup: Manual reversal (see Rollback Limitations)
3. Document reason for rollback
4. Plan alternative fix if needed

## Monitoring & Validation

### Key Metrics to Monitor

- **Inconsistency Count**: Should be 0 after migration
- **Application Errors**: Watch for errors related to invoice status
- **User Reports**: Monitor support tickets for status display issues

### SQL Queries for Manual Verification

**Check for inconsistencies (should return 0)**:
```sql
SELECT COUNT(*) AS inconsistent_count
FROM invoices
WHERE is_paid = true
  AND status != 'paid'
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);
```

**Check reverse inconsistencies (should return 0)**:
```sql
SELECT COUNT(*) AS reverse_inconsistent_count
FROM invoices
WHERE status = 'paid'
  AND is_paid = false
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL);
```

**Sample affected invoices**:
```sql
SELECT id, invoice_number, status, is_paid, created_at
FROM invoices
WHERE is_paid = true
  AND (currency_id IS NOT NULL
       OR entity_id IS NOT NULL
       OR payment_type_id IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;
```

## Related Documentation

- **Bug Fix PR**: [Link to PR fixing the bug for new invoices]
- **Invoice V2 Architecture**: `docs/INVOICES_V2.md` (if exists)
- **Schema Documentation**: `schema.prisma`

## Contact & Support

**Questions?** Contact:
- **DBA/DevOps**: [Your Name]
- **Product Owner**: [PM Name]
- **Engineering Lead**: [Tech Lead Name]

**Issue Tracking**:
- **Jira Ticket**: [PAYLOG-XXX]
- **GitHub Issue**: [#XXX]

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21
**Author**: Data & Migration Engineer (DME)
