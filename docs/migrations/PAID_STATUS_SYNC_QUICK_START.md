# Paid Status Sync Migration - Quick Start Guide

## TL;DR

Fix inconsistency where invoices show PAID in detail panel but UNPAID in list view.

**Before running**: Backup your database!

## Quick Commands

```bash
# 1. Check current state
npx tsx scripts/verify-paid-status-sync.ts

# 2. Preview changes (safe, no modifications)
npx tsx scripts/backfill-paid-status-sync.ts --dry-run

# 3. Run migration (with confirmation prompt)
npx tsx scripts/backfill-paid-status-sync.ts

# 4. Verify fix
npx tsx scripts/verify-paid-status-sync.ts
```

## Expected Output

### Verification (Before Migration)

```
═════════════════════════════════════════════════════════
PAID STATUS VERIFICATION
═════════════════════════════════════════════════════════

📊 Total invoices: 150
📊 V2 invoices: 45
📊 Paid invoices (is_paid=true): 23
📊 Unpaid invoices (is_paid=false): 127

🔍 Checking Inconsistency #1: is_paid=true but status!="paid"
─────────────────────────────────────────────────────────
Found: 12 invoices

⚠️  INCONSISTENCY DETECTED!
   12 V2 invoices have is_paid=true but status!='paid'
```

### Migration (Dry Run)

```
═════════════════════════════════════════════════════════
PAID STATUS SYNC MIGRATION
═════════════════════════════════════════════════════════
Mode: [DRY RUN] Preview only - no changes
═════════════════════════════════════════════════════════

📋 Pre-flight Check
─────────────────────────────────────────────────────────
Total invoices: 150
V2 invoices (with V2 fields): 45
Inconsistent invoices (is_paid=true but status!='paid'): 12

Sample Records (first 5):
─────────────────────────────────────────────────────────
  Invoice #INV-001 (ID: 123): status='unpaid' → 'paid'
  Invoice #INV-002 (ID: 124): status='pending_approval' → 'paid'
  ...

[DRY RUN] No changes made. Run without --dry-run to apply.
```

### Migration (Live)

```
═════════════════════════════════════════════════════════
PAID STATUS SYNC MIGRATION
═════════════════════════════════════════════════════════

Confirm migration? (yes/no): yes

🔧 Executing Migration...
─────────────────────────────────────────────────────────
✅ Updated 12 invoices

🔍 Post-migration Verification
─────────────────────────────────────────────────────────
Remaining inconsistencies: 0
✅ All inconsistencies resolved!

═════════════════════════════════════════════════════════
MIGRATION SUMMARY
═════════════════════════════════════════════════════════
Total invoices in database: 150
Updated invoices: 12
Remaining inconsistencies (after): 0
Duration: 0.15s
═════════════════════════════════════════════════════════

✅ Migration completed successfully! No inconsistencies remain.
```

## Safety Checklist

Before running migration:

- [ ] Backup database (Railway: `railway backup create` or `pg_dump`)
- [ ] Run verification script to see current state
- [ ] Run migration with `--dry-run` to preview changes
- [ ] Review sample records in dry-run output
- [ ] Ensure you have time to rollback if needed (5-10 minutes)

## What Gets Updated

**Target**: V2 invoices with `is_paid=true` but `status != 'paid'`

**Changes**:
- `status` field: Set to `'paid'`
- `updated_at` field: Set to current timestamp

**Not Changed**:
- `is_paid` field (already correct)
- Any other invoice fields
- Non-V2 invoices (legacy invoices)

## Rollback

⚠️ **IMPORTANT**: True rollback requires a database backup.

**Why?** We don't store the original `status` values (could have been "unpaid", "pending_approval", "on_hold", or "rejected").

**If you need to rollback**:
```bash
# Restore from backup (Railway)
railway backup restore <backup-id>

# Or restore from pg_dump
pg_restore -d paylog_prod backup_before_migration.dump
```

## Troubleshooting

### Migration shows 0 inconsistencies

✅ **Good news!** Your data is already consistent. No migration needed.

### Verification still shows inconsistencies after migration

❌ **Problem**: Migration didn't work as expected.

**Fix**:
1. Check error logs in script output
2. Verify database connection
3. Re-run migration script
4. Contact engineering team if issue persists

### Script fails with connection error

❌ **Problem**: Can't connect to database.

**Fix**:
1. Check `DATABASE_URL` in `.env`
2. Verify database is running
3. Check network connection (VPN?)
4. Retry migration

## CLI Flags Reference

| Flag | Description | Example |
|------|-------------|---------|
| `--dry-run` | Preview changes without applying | `npx tsx scripts/backfill-paid-status-sync.ts --dry-run` |
| `--yes` / `-y` | Skip confirmation prompt | `npx tsx scripts/backfill-paid-status-sync.ts --yes` |
| `--verbose` / `-v` | Show detailed logs | `npx tsx scripts/backfill-paid-status-sync.ts --verbose` |
| `--detailed` | (Verification only) Show all inconsistencies | `npx tsx scripts/verify-paid-status-sync.ts --detailed` |

## Need Help?

- **Full Documentation**: See `docs/migrations/paid-status-sync-migration.md`
- **Scripts**:
  - `scripts/backfill-paid-status-sync.ts` - Migration script
  - `scripts/verify-paid-status-sync.ts` - Verification script

---

**Last Updated**: 2025-11-21
