# Migration Guide: Approval Workflow for CreditNote and AdvancePayment

## Overview

This migration adds unified approval workflow fields to `CreditNote` and `AdvancePayment` models, bringing consistency across all entry types (Invoice, Payment, Vendor, CreditNote, AdvancePayment).

**Migration ID**: 003
**Date**: 2026-01-24
**Type**: Schema Addition (Additive, No Breaking Changes)
**Estimated Duration**: 2-5 minutes (depends on data volume)

---

## Pre-Migration Checklist

- [ ] **Backup Database**: Create full database backup before proceeding
- [ ] **Check Database Connection**: Verify DATABASE_URL is correct
- [ ] **Review Schema Changes**: Read schema.prisma changes (lines 610-613, 651-658)
- [ ] **Verify No Active Transactions**: No long-running operations in progress
- [ ] **Test Environment First**: Run migration on staging/dev before production
- [ ] **Notify Team**: Inform team of maintenance window if needed

---

## Files Changed

### 1. Schema Definition
- **File**: `/Users/althaf/Projects/paylog-3/schema.prisma`
- **Models Modified**:
  - `CreditNote` (lines 610-613, 619, 625-626)
  - `AdvancePayment` (lines 651-658, 664-665, 671-673)
  - `User` (lines 60-62)

### 2. Migration Scripts
- **Forward Migration**: `003_add_approval_workflow_to_credit_notes_and_advance_payments.sql`
- **Rollback Script**: `003_add_approval_workflow_to_credit_notes_and_advance_payments_ROLLBACK.sql`
- **Validation Script**: `003_validation.sql`

### 3. Documentation
- **Schema Diagram**: `003_SCHEMA_DIAGRAM.md`
- **This Guide**: `003_MIGRATION_GUIDE.md`

---

## Changes Summary

### CreditNote Model

#### New Fields
| Field Name         | Type      | Nullable | Default               | Purpose                          |
|--------------------|-----------|----------|-----------------------|----------------------------------|
| `status`           | String    | No       | `"pending_approval"`  | Workflow state                   |
| `approved_by_id`   | Int       | Yes      | NULL                  | User who approved/rejected       |
| `approved_at`      | DateTime  | Yes      | NULL                  | Timestamp of approval/rejection  |
| `rejection_reason` | String    | Yes      | NULL                  | Reason if rejected               |

#### New Relations
- `approved_by`: User? @relation("CreditNoteApprover")

#### New Indexes
- `idx_credit_notes_status` on `status`
- `idx_credit_notes_approved_by` on `approved_by_id`

### AdvancePayment Model

#### New Fields (Approval Workflow)
| Field Name         | Type      | Nullable | Default               | Purpose                          |
|--------------------|-----------|----------|-----------------------|----------------------------------|
| `status`           | String    | No       | `"pending_approval"`  | Workflow state                   |
| `approved_by_id`   | Int       | Yes      | NULL                  | User who approved/rejected       |
| `approved_at`      | DateTime  | Yes      | NULL                  | Timestamp of approval/rejection  |
| `rejection_reason` | String    | Yes      | NULL                  | Reason if rejected               |

#### New Fields (Soft Delete)
| Field Name         | Type      | Nullable | Default | Purpose                          |
|--------------------|-----------|----------|---------|----------------------------------|
| `deleted_at`       | DateTime  | Yes      | NULL    | Soft delete timestamp            |
| `deleted_by_id`    | Int       | Yes      | NULL    | User who deleted                 |
| `deleted_reason`   | String    | Yes      | NULL    | Reason for deletion              |

#### New Relations
- `approved_by`: User? @relation("AdvancePaymentApprover")
- `deleted_by`: User? @relation("AdvancePaymentDeleter")

#### New Indexes
- `idx_advance_payments_status` on `status`
- `idx_advance_payments_approved_by` on `approved_by_id`
- `idx_advance_payments_deleted` on `deleted_at`

### User Model

#### New Relations
- `approved_credit_notes`: CreditNote[] @relation("CreditNoteApprover")
- `approved_advance_payments`: AdvancePayment[] @relation("AdvancePaymentApprover")
- `deleted_advance_payments`: AdvancePayment[] @relation("AdvancePaymentDeleter")

---

## Migration Steps

### Step 1: Apply Schema Changes

```bash
# Navigate to project root
cd /Users/althaf/Projects/paylog-3

# Verify schema is valid
npx prisma format
npx prisma validate

# Generate Prisma Client with new schema
npx prisma generate
```

### Step 2: Execute Migration SQL

**Option A: Using Prisma Migrate (Recommended for Dev)**
```bash
# Create and apply migration
npx prisma migrate dev --name add_approval_workflow_to_credit_notes_and_advance_payments
```

**Option B: Manual SQL Execution (Recommended for Production)**
```bash
# Connect to database
psql $DATABASE_URL

# Run migration script
\i migrations/003_add_approval_workflow_to_credit_notes_and_advance_payments.sql

# Verify changes
\d credit_notes
\d advance_payments

# Run validation queries
\i migrations/003_validation.sql
```

### Step 3: Verify Migration

```bash
# Run validation script
psql $DATABASE_URL -f migrations/003_validation.sql > validation_results.txt

# Check for any failures
cat validation_results.txt | grep -i "error\|fail\|0 rows"
```

### Step 4: Update Application Code

**Regenerate Prisma Client Types**
```bash
npx prisma generate
```

**Update TypeScript Types**
- Import updated types from `@prisma/client`
- Update components/actions that handle CreditNote and AdvancePayment
- Add status filtering logic where needed

### Step 5: Test Application

- [ ] Create new CreditNote (should default to `pending_approval`)
- [ ] Create new AdvancePayment (should default to `pending_approval`)
- [ ] Verify existing records show as `approved`
- [ ] Test approval workflow (if UI exists)
- [ ] Test rejection workflow (if UI exists)
- [ ] Test soft delete for AdvancePayment (if UI exists)

---

## Data Migration Details

### Existing Records Handling

All existing records are **auto-approved** to maintain backward compatibility:

```sql
-- CreditNote: Existing records set to approved
UPDATE credit_notes
SET status = 'approved',
    approved_at = created_at
WHERE deleted_at IS NULL;

-- AdvancePayment: Existing records set to approved
UPDATE advance_payments
SET status = 'approved',
    approved_at = created_at;
```

**Rationale**:
- Existing records were created before approval workflow existed
- Setting them to `approved` preserves functionality
- `approved_at = created_at` maintains timeline accuracy
- `approved_by_id` stays NULL to indicate auto-approval

### New Records Behavior

After migration, all new records will:
1. Default to `status = 'pending_approval'`
2. Require explicit admin approval before being "active"
3. Have `approved_by_id` set when approved/rejected
4. Have `approved_at` timestamp recorded
5. Have `rejection_reason` if rejected

---

## Rollback Procedure

If migration fails or needs to be undone:

### Step 1: Restore from Backup (Safest)
```bash
# Restore database backup
pg_restore -d database_name backup_file.dump
```

### Step 2: Manual Rollback (If No Backup)
```bash
# Execute rollback script
psql $DATABASE_URL -f migrations/003_add_approval_workflow_to_credit_notes_and_advance_payments_ROLLBACK.sql
```

### Step 3: Revert Schema Changes
```bash
# Checkout previous schema version
git checkout HEAD~1 schema.prisma

# Regenerate client
npx prisma generate
```

---

## Application Code Updates Required

### 1. Server Actions

**File**: `app/actions/credit-notes.ts`
```typescript
// Add status field to create/update actions
export async function createCreditNote(data: CreditNoteInput) {
  const creditNote = await prisma.creditNote.create({
    data: {
      ...data,
      status: "pending_approval", // Explicit default
      // approved_by_id, approved_at will be set on approval
    },
  });
  return creditNote;
}

// Add approval action
export async function approveCreditNote(id: number, userId: number) {
  return await prisma.creditNote.update({
    where: { id },
    data: {
      status: "approved",
      approved_by_id: userId,
      approved_at: new Date(),
    },
  });
}

// Add rejection action
export async function rejectCreditNote(
  id: number,
  userId: number,
  reason: string
) {
  return await prisma.creditNote.update({
    where: { id },
    data: {
      status: "rejected",
      approved_by_id: userId,
      rejection_reason: reason,
    },
  });
}
```

**Similar changes needed for**: `app/actions/advance-payments.ts`

### 2. Queries (Filtering)

**Before**:
```typescript
// Get all credit notes
const creditNotes = await prisma.creditNote.findMany({
  where: { deleted_at: null },
});
```

**After** (Admin View):
```typescript
// Get pending credit notes
const pendingCreditNotes = await prisma.creditNote.findMany({
  where: {
    status: "pending_approval",
    deleted_at: null,
  },
  include: {
    created_by: true,
  },
});

// Get approved credit notes
const approvedCreditNotes = await prisma.creditNote.findMany({
  where: {
    status: "approved",
    deleted_at: null,
  },
  include: {
    approved_by: true, // ✨ NEW relation
  },
});
```

### 3. TypeScript Types

**Type Definitions**:
```typescript
// Status enum
export type ApprovalStatus = "pending_approval" | "approved" | "rejected";

// CreditNote with approval fields
export interface CreditNoteWithApproval {
  id: number;
  invoice_id: number;
  credit_note_number: string;
  credit_note_date: Date;
  amount: number;
  reason: string;
  notes?: string;
  // Approval workflow
  status: ApprovalStatus;
  approved_by_id?: number;
  approved_at?: Date;
  rejection_reason?: string;
  // Relations
  created_by: User;
  approved_by?: User;
  deleted_by?: User;
}
```

### 4. UI Components

**Components to Update**:
- `components/v3/credit-notes/credit-note-form.tsx` (if exists)
- `components/v3/credit-notes/credit-note-list.tsx` (if exists)
- `components/v3/advance-payments/advance-payment-form.tsx` (if exists)
- `components/v3/advance-payments/advance-payment-list.tsx` (if exists)

**Status Badge Component**:
```tsx
export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const variants = {
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const labels = {
    pending_approval: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${variants[status]}`}>
      {labels[status]}
    </span>
  );
}
```

---

## Performance Considerations

### Index Usage

The new indexes will optimize these common queries:

1. **Get pending approvals** (Admin Dashboard):
```sql
SELECT * FROM credit_notes WHERE status = 'pending_approval';
-- Uses: idx_credit_notes_status
```

2. **Get user's approval history**:
```sql
SELECT * FROM credit_notes WHERE approved_by_id = 123;
-- Uses: idx_credit_notes_approved_by
```

3. **Get active advance payments** (Reports):
```sql
SELECT * FROM advance_payments WHERE deleted_at IS NULL;
-- Uses: idx_advance_payments_deleted
```

### Expected Performance Impact

- **Query Performance**: 10-20% faster for status filtering
- **Write Performance**: Minimal impact (<1% slower due to index maintenance)
- **Storage**: ~5KB per 1000 records (indexes + new columns)

---

## Validation Checklist

After migration completes:

### Schema Validation
- [ ] `credit_notes` table has 4 new columns (status, approved_by_id, approved_at, rejection_reason)
- [ ] `advance_payments` table has 7 new columns (approval + soft delete)
- [ ] All foreign keys are properly created
- [ ] All indexes are properly created

### Data Validation
- [ ] All existing `credit_notes` have `status = 'approved'`
- [ ] All existing `advance_payments` have `status = 'approved'`
- [ ] No NULL values in `status` columns
- [ ] `approved_at = created_at` for all existing records

### Application Validation
- [ ] Prisma Client regenerated successfully
- [ ] TypeScript compiles without errors
- [ ] Can create new CreditNote with `pending_approval` status
- [ ] Can create new AdvancePayment with `pending_approval` status
- [ ] Existing records are visible and functional

### Performance Validation
- [ ] Queries using `WHERE status = 'pending_approval'` use index
- [ ] Queries using `WHERE approved_by_id = ?` use index
- [ ] Queries using `WHERE deleted_at IS NULL` use index

---

## Troubleshooting

### Issue: Migration Fails with "column already exists"

**Cause**: Migration was partially applied or run multiple times.

**Solution**:
```sql
-- Check which columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name IN ('credit_notes', 'advance_payments')
  AND column_name IN ('status', 'approved_by_id', 'approved_at', 'rejection_reason', 'deleted_at', 'deleted_by_id', 'deleted_reason');

-- Drop existing columns if needed
ALTER TABLE credit_notes DROP COLUMN IF EXISTS status;
-- Repeat for other columns

-- Re-run migration
```

### Issue: Foreign Key Constraint Violation

**Cause**: `approved_by_id` or `deleted_by_id` references non-existent user.

**Solution**:
```sql
-- Find orphaned references
SELECT id, approved_by_id
FROM credit_notes
WHERE approved_by_id IS NOT NULL
  AND approved_by_id NOT IN (SELECT id FROM users);

-- Set to NULL or fix references
UPDATE credit_notes SET approved_by_id = NULL WHERE approved_by_id = <orphaned_id>;
```

### Issue: Prisma Client Type Errors

**Cause**: Prisma Client not regenerated after schema change.

**Solution**:
```bash
# Clean and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: Status Column NULL Values

**Cause**: Data migration UPDATE didn't run or failed.

**Solution**:
```sql
-- Backfill NULL status values
UPDATE credit_notes
SET status = 'approved', approved_at = created_at
WHERE status IS NULL;

UPDATE advance_payments
SET status = 'approved', approved_at = created_at
WHERE status IS NULL;
```

---

## Post-Migration Tasks

### Immediate (within 1 hour)
- [ ] Monitor database performance metrics
- [ ] Check application logs for errors
- [ ] Verify user-facing features work correctly
- [ ] Test approval workflow (if UI exists)

### Short-term (within 1 week)
- [ ] Update API documentation (if public API)
- [ ] Train admins on new approval workflow
- [ ] Monitor query performance with new indexes
- [ ] Gather user feedback on workflow

### Long-term (within 1 month)
- [ ] Analyze approval patterns and bottlenecks
- [ ] Optimize indexes based on query patterns
- [ ] Consider adding notifications for pending approvals
- [ ] Review and refine workflow based on usage

---

## Success Criteria

Migration is considered successful when:

1. ✅ All schema changes are applied without errors
2. ✅ All existing records are auto-approved
3. ✅ No orphaned foreign key references
4. ✅ All indexes are created and used
5. ✅ Prisma Client regenerated successfully
6. ✅ Application starts without errors
7. ✅ Can create new entries with `pending_approval` status
8. ✅ Existing entries remain visible and functional
9. ✅ No performance degradation
10. ✅ All validation queries pass

---

## Contact & Support

If you encounter issues:

1. **Check Validation Results**: Review `migrations/003_validation.sql` output
2. **Review Schema Diagram**: See `migrations/003_SCHEMA_DIAGRAM.md`
3. **Inspect Logs**: Check database and application logs
4. **Rollback if Needed**: Use rollback script if critical issues arise
5. **Document Issues**: Log errors and unexpected behaviors

---

## Appendix: SQL Reference

### Get Pending Approvals
```sql
SELECT
  cn.*,
  u.full_name as created_by_name
FROM credit_notes cn
JOIN users u ON cn.created_by_id = u.id
WHERE cn.status = 'pending_approval'
  AND cn.deleted_at IS NULL
ORDER BY cn.created_at DESC;
```

### Approve Credit Note
```sql
UPDATE credit_notes
SET
  status = 'approved',
  approved_by_id = <user_id>,
  approved_at = NOW()
WHERE id = <credit_note_id>;
```

### Reject Credit Note
```sql
UPDATE credit_notes
SET
  status = 'rejected',
  approved_by_id = <user_id>,
  rejection_reason = 'Reason text here'
WHERE id = <credit_note_id>;
```

### Get User's Approval History
```sql
SELECT
  'credit_note' as type,
  cn.id,
  cn.status,
  cn.approved_at,
  cn.rejection_reason
FROM credit_notes cn
WHERE cn.approved_by_id = <user_id>

UNION ALL

SELECT
  'advance_payment' as type,
  ap.id,
  ap.status,
  ap.approved_at,
  ap.rejection_reason
FROM advance_payments ap
WHERE ap.approved_by_id = <user_id>

ORDER BY approved_at DESC;
```

---

**End of Migration Guide**
