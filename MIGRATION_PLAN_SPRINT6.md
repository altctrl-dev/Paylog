# Migration Plan: Sprint 6 Invoice Fields & SubEntity Model

**Date**: 2025-10-08
**Database**: SQLite (dev.db)
**Schema Version**: Phase 1 → Phase 2 (Sprint 6)

## Executive Summary

This migration adds 5 new fields to the Invoice model and introduces a new SubEntity model for organizational divisions/departments. The changes are **additive-first** with one constraint change (vendor_id: optional → required).

## Schema Changes Overview

### 1. New SubEntity Model (New Table)

**Table**: `sub_entities`

| Column      | Type    | Constraints              | Purpose                          |
|-------------|---------|--------------------------|----------------------------------|
| id          | INTEGER | PK, AUTO_INCREMENT       | Primary key                      |
| name        | TEXT    | NOT NULL                 | Division/department name         |
| description | TEXT    | NULL                     | Optional description             |
| is_active   | BOOLEAN | NOT NULL, DEFAULT true   | Active status flag               |
| created_at  | DATETIME| NOT NULL, DEFAULT now()  | Record creation timestamp        |
| updated_at  | DATETIME| NOT NULL                 | Record update timestamp          |

**Indexes**: None (small table, indexed via foreign key in invoices)

**Relations**:
- One-to-Many with Invoice (Invoice.sub_entity_id → SubEntity.id)

---

### 2. Invoice Model Updates (Existing Table)

#### New Columns Added

| Column         | Type     | Constraints              | Purpose                                |
|----------------|----------|--------------------------|----------------------------------------|
| period_start   | DATETIME | NULL                     | Invoice period start date              |
| period_end     | DATETIME | NULL                     | Invoice period end date                |
| tds_applicable | BOOLEAN  | NOT NULL, DEFAULT false  | Tax Deducted at Source flag            |
| sub_entity_id  | INTEGER  | NULL, FK → sub_entities  | Link to division/department            |
| notes          | TEXT     | NULL                     | Internal notes about invoice           |

#### Modified Columns

| Column    | Old Type  | New Type | Change Description           |
|-----------|-----------|----------|------------------------------|
| vendor_id | INTEGER?  | INTEGER  | Changed from optional to required |

**OnDelete Behavior**:
- `vendor_id`: Changed from `SET NULL` to `RESTRICT` (prevents vendor deletion if invoices exist)
- `sub_entity_id`: `SET NULL` (invoices remain if sub entity deleted)

#### New Indexes

| Index Name              | Columns         | Purpose                          |
|-------------------------|-----------------|----------------------------------|
| idx_invoices_sub_entity | [sub_entity_id] | Optimize queries by division     |

---

## Migration Strategy

### Phase 1: Pre-Migration Validation

**Objective**: Ensure database is in a safe state for migration

#### 1.1 Check Existing Data

```sql
-- Verify invoice count and vendor distribution
SELECT
  COUNT(*) as total_invoices,
  COUNT(vendor_id) as with_vendor,
  COUNT(*) - COUNT(vendor_id) as null_vendor
FROM invoices;
```

**Current State**: 1 invoice, 1 with vendor, 0 null vendors ✅

#### 1.2 Backup Database

```bash
# Create timestamped backup
cp dev.db dev.db.backup-$(date +%Y%m%d_%H%M%S)
```

---

### Phase 2: Migration Execution

**Objective**: Apply schema changes safely

#### 2.1 Create SubEntity Table

```sql
CREATE TABLE "sub_entities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
```

#### 2.2 Add New Invoice Columns

```sql
-- Add period fields
ALTER TABLE "invoices" ADD COLUMN "period_start" DATETIME;
ALTER TABLE "invoices" ADD COLUMN "period_end" DATETIME;

-- Add TDS flag
ALTER TABLE "invoices" ADD COLUMN "tds_applicable" BOOLEAN NOT NULL DEFAULT 0;

-- Add sub entity foreign key
ALTER TABLE "invoices" ADD COLUMN "sub_entity_id" INTEGER;

-- Add notes field
ALTER TABLE "invoices" ADD COLUMN "notes" TEXT;
```

#### 2.3 Create Foreign Key Constraint for sub_entity_id

**SQLite Limitation**: SQLite does not support adding foreign key constraints to existing tables via ALTER TABLE.

**Workaround**: This will be handled by Prisma's migration system, which creates a new table with constraints and copies data.

#### 2.4 Make vendor_id Required

**Challenge**: SQLite does not support modifying column constraints directly.

**Solution**: Use Prisma's migration system which will:
1. Create new table with correct schema
2. Copy all data
3. Drop old table
4. Rename new table

**Pre-Migration Data Fix** (if needed):
```sql
-- Check for NULL vendor_ids (should return 0)
SELECT COUNT(*) FROM invoices WHERE vendor_id IS NULL;

-- If any NULL vendors exist, create fallback vendor
INSERT INTO vendors (name, is_active, created_at, updated_at)
SELECT 'Unknown Vendor', 1, datetime('now'), datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Unknown Vendor');

-- Update NULL vendor_ids (if any)
UPDATE invoices
SET vendor_id = (SELECT id FROM vendors WHERE name = 'Unknown Vendor')
WHERE vendor_id IS NULL;
```

#### 2.5 Create Index for sub_entity_id

```sql
CREATE INDEX "idx_invoices_sub_entity" ON "invoices"("sub_entity_id");
```

---

### Phase 3: Post-Migration Validation

**Objective**: Verify migration success and data integrity

#### 3.1 Schema Verification

```sql
-- Verify sub_entities table exists
SELECT sql FROM sqlite_master WHERE type='table' AND name='sub_entities';

-- Verify new invoice columns
PRAGMA table_info(invoices);

-- Verify indexes
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='invoices';
```

#### 3.2 Data Integrity Checks

```sql
-- Verify all invoices have vendor_id
SELECT COUNT(*) FROM invoices WHERE vendor_id IS NULL;
-- Expected: 0

-- Verify foreign key constraints are enforced
PRAGMA foreign_key_check(invoices);
-- Expected: empty result

-- Verify new columns have correct defaults
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN tds_applicable = 0 THEN 1 ELSE 0 END) as tds_false_count,
  SUM(CASE WHEN period_start IS NULL THEN 1 ELSE 0 END) as null_period_start,
  SUM(CASE WHEN sub_entity_id IS NULL THEN 1 ELSE 0 END) as null_sub_entity
FROM invoices;
```

#### 3.3 Relation Verification

```sql
-- Test sub_entity relation (should work without errors)
SELECT i.id, i.invoice_number, s.name as sub_entity_name
FROM invoices i
LEFT JOIN sub_entities s ON i.sub_entity_id = s.id;

-- Test vendor relation (should always have vendor)
SELECT i.id, i.invoice_number, v.name as vendor_name
FROM invoices i
INNER JOIN vendors v ON i.vendor_id = v.id;
```

---

## Prisma Migration Commands

### Generate Migration

```bash
npx prisma migrate dev --name add_invoice_fields_and_sub_entities
```

**What This Does**:
1. Analyzes schema.prisma vs current database
2. Generates SQL migration file
3. Applies migration to dev.db
4. Regenerates Prisma Client

### Expected Migration File Structure

**Location**: `prisma/migrations/{timestamp}_add_invoice_fields_and_sub_entities/migration.sql`

**Contents**:
```sql
-- CreateTable
CREATE TABLE "sub_entities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables (Prisma's approach for SQLite)
-- This section will recreate invoices table with new schema

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_invoices" (
    -- [Full schema with new columns]
);

INSERT INTO "new_invoices"
SELECT
  id, invoice_number, vendor_id, category_id, profile_id,
  invoice_amount, invoice_date, due_date,
  NULL as period_start, NULL as period_end,
  0 as tds_applicable, NULL as sub_entity_id, NULL as notes,
  status, hold_reason, hold_by, hold_at,
  submission_count, last_submission_at,
  rejection_reason, rejected_by, rejected_at,
  is_hidden, hidden_by, hidden_at, hidden_reason,
  created_by, created_at, updated_at
FROM "invoices";

DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "idx_invoices_sub_entity" ON "invoices"("sub_entity_id");
```

---

## Rollback Strategy

### Immediate Rollback (During Migration)

If migration fails:

```bash
# Restore from backup
cp dev.db.backup-{timestamp} dev.db

# Reset Prisma migration state
npx prisma migrate resolve --rolled-back {migration_name}
```

### Post-Migration Rollback (After Deployment)

**If issues discovered after deployment**:

1. **Revert Schema Changes**:
   ```bash
   git revert {commit_hash}
   ```

2. **Create Down Migration**:
   ```sql
   -- Remove new columns (SQLite limitation: requires table rebuild)
   -- Drop sub_entities table
   DROP TABLE IF EXISTS "sub_entities";

   -- Revert invoices table (Prisma will handle via migration)
   ```

3. **Apply Rollback**:
   ```bash
   npx prisma migrate dev --name rollback_sprint6_invoice_fields
   ```

**Data Loss Warning**: Rolling back will lose data in:
- `period_start`, `period_end`, `tds_applicable`, `notes` columns
- All `sub_entities` records
- `sub_entity_id` associations

**Mitigation**: Export data before rollback:
```sql
-- Export new field data
.mode csv
.output invoice_sprint6_data.csv
SELECT id, period_start, period_end, tds_applicable, sub_entity_id, notes
FROM invoices;
.output stdout
```

---

## Risk Assessment

### High Risk Items

None identified ✅

### Medium Risk Items

1. **vendor_id Constraint Change**:
   - **Risk**: Existing NULL vendor_ids will cause migration failure
   - **Mitigation**: Pre-migration check shows 0 NULL vendors (✅ Safe)
   - **Fallback**: Create "Unknown Vendor" if needed

2. **SQLite Table Rebuild**:
   - **Risk**: Prisma will rebuild invoices table (data copy operation)
   - **Mitigation**: Backup before migration, validate after
   - **Impact**: Brief table lock during migration (acceptable for dev)

### Low Risk Items

1. **New Optional Columns**: All new columns are nullable or have defaults (no data required)
2. **SubEntity Table**: New table, no existing data dependencies
3. **Index Addition**: Non-breaking, improves query performance

---

## Success Criteria

### Migration Success

- [ ] `npx prisma migrate dev` completes without errors
- [ ] All schema validations pass (`npx prisma validate`)
- [ ] Database backup created before migration
- [ ] Post-migration queries return expected results

### Data Integrity

- [ ] Zero invoices with NULL vendor_id
- [ ] All existing invoices have `tds_applicable = false` (default)
- [ ] All new columns accessible in Prisma Client
- [ ] Foreign key constraints enforced (vendor, sub_entity)

### Application Compatibility

- [ ] Existing queries continue to work (backward compatible)
- [ ] New fields accessible in TypeScript (Prisma Client regenerated)
- [ ] No breaking changes to existing API contracts

---

## Timeline

### Estimated Duration: 10 minutes

1. **Pre-Migration Checks**: 2 minutes
   - Backup database
   - Verify current state
   - Review schema changes

2. **Migration Execution**: 3 minutes
   - Run `npx prisma migrate dev`
   - Prisma generates and applies migration
   - Client regeneration

3. **Post-Migration Validation**: 5 minutes
   - Schema verification queries
   - Data integrity checks
   - Test CRUD operations on new fields

---

## Next Steps

### Immediate (After Migration)

1. **Seed Sub Entities** (Optional):
   ```typescript
   await prisma.subEntity.createMany({
     data: [
       { name: 'Engineering', description: 'Engineering Department', is_active: true },
       { name: 'Marketing', description: 'Marketing Department', is_active: true },
       { name: 'Operations', description: 'Operations Department', is_active: true },
     ]
   });
   ```

2. **Update TypeScript Types**:
   - Regenerate Prisma Client: `npx prisma generate`
   - Import new types: `SubEntity`, updated `Invoice` type

3. **Update Application Code** (Sprint 6 Implementation):
   - Add period fields to invoice form
   - Add TDS checkbox to invoice form
   - Add sub entity dropdown to invoice form
   - Add notes textarea to invoice form
   - Update invoice creation/update logic
   - Update invoice display components

### Future (Sprint 9+)

1. **SubEntity Admin UI**:
   - Create SubEntity management page
   - Add to Master Data Request workflow
   - Add Archive Request support

2. **Invoice Profile TDS Default**:
   - Add `tds_applicable` to InvoiceProfile model
   - Default invoice TDS from profile (user can override)

3. **Period Validation**:
   - Add application-level validation: `period_end >= period_start`
   - Display period as "Jan 2025 - Mar 2025" in UI

---

## Appendix

### A. Schema Diff Summary

**New Models**: 1 (SubEntity)
**Modified Models**: 1 (Invoice)
**New Columns**: 5 (period_start, period_end, tds_applicable, sub_entity_id, notes)
**Modified Columns**: 1 (vendor_id: optional → required)
**New Indexes**: 1 (idx_invoices_sub_entity)
**New Foreign Keys**: 1 (Invoice.sub_entity_id → SubEntity.id)

### B. SQLite Compatibility

All changes are SQLite-compatible:
- ✅ DateTime fields supported
- ✅ Boolean fields supported (stored as INTEGER 0/1)
- ✅ TEXT fields for notes (no size limit)
- ✅ Foreign key constraints supported (with PRAGMA foreign_keys=ON)
- ✅ Indexes supported
- ⚠️ ALTER TABLE limitations handled by Prisma (table rebuild)

### C. Production Considerations

**When migrating to Production PostgreSQL**:

1. **Data Type Changes**:
   - SQLite REAL → PostgreSQL DECIMAL for invoice_amount
   - SQLite INTEGER → PostgreSQL BIGINT for high-volume IDs

2. **Performance**:
   - Consider partitioning invoices table by date
   - Add composite indexes for common query patterns
   - Monitor sub_entity_id index effectiveness

3. **Constraints**:
   - Add CHECK constraint: `period_end >= period_start`
   - Consider adding CHECK constraints for status enums

---

## Contact

**Database Modeler (DBM)**: Claude
**Migration Engineer (DME)**: To be coordinated
**Implementation Engineer (IE)**: To be coordinated

**Questions/Issues**: Escalate to Main Agent
