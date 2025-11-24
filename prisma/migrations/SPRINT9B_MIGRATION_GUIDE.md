# Sprint 9B Phase 1: InvoiceProfile Enhancement Migration Guide

## Overview

**Migration ID**: `003_sprint9b_invoice_profile_enhancement`
**Date**: 2025-10-24
**Author**: Database Modeler (DBM)
**Database**: PostgreSQL 17
**ORM**: Prisma 5.22.0
**Migration Type**: ADDITIVE (No data loss)

## Summary

This migration enhances the `InvoiceProfile` model with 7 new fields to support comprehensive invoice templates, enabling users to define default values for entities, vendors, categories, currencies, prepaid/postpaid billing, and TDS (Tax Deducted at Source) settings.

## Schema Changes

### New Fields Added to `invoice_profiles` Table

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `entity_id` | INTEGER | NO | - | Foreign key to `entities` table |
| `vendor_id` | INTEGER | NO | - | Foreign key to `vendors` table |
| `category_id` | INTEGER | NO | - | Foreign key to `categories` table |
| `currency_id` | INTEGER | NO | - | Foreign key to `currencies` table |
| `prepaid_postpaid` | VARCHAR(10) | YES | NULL | Billing type: 'prepaid' or 'postpaid' |
| `tds_applicable` | BOOLEAN | NO | false | Whether TDS applies to invoices |
| `tds_percentage` | DOUBLE PRECISION | YES | NULL | TDS rate (0-100) if applicable |

### Foreign Key Constraints

All foreign keys use `ON DELETE RESTRICT` to prevent deletion of master data with active profiles:

- `fk_invoice_profiles_entity` → `entities(id)`
- `fk_invoice_profiles_vendor` → `vendors(id)`
- `fk_invoice_profiles_category` → `categories(id)`
- `fk_invoice_profiles_currency` → `currencies(id)`

### Indexes Created

Performance indexes on all foreign key columns:

- `idx_invoice_profiles_entity` on `entity_id`
- `idx_invoice_profiles_vendor` on `vendor_id`
- `idx_invoice_profiles_category` on `category_id`
- `idx_invoice_profiles_currency` on `currency_id`

### CHECK Constraints

Data integrity constraints:

- `chk_invoice_profiles_prepaid_postpaid`: Ensures value is NULL, 'prepaid', or 'postpaid'
- `chk_invoice_profiles_tds_percentage`: Ensures value is NULL or between 0 and 100

## Migration Strategy

### Pre-Migration Requirements

Before running this migration, ensure:

1. At least one **active entity** exists in the `entities` table
2. At least one **active vendor** exists in the `vendors` table
3. At least one **active category** exists in the `categories` table
4. At least one **active currency** exists in the `currencies` table

The migration will **abort** if any of these requirements are not met.

### Migration Steps

The migration executes in 7 steps:

1. **Add Columns** (nullable initially)
2. **Backfill Existing Profiles** with safe defaults
3. **Make FK Columns NOT NULL**
4. **Create Foreign Key Constraints**
5. **Create Performance Indexes**
6. **Add CHECK Constraints** for data validation
7. **Verification** queries to confirm success

### Backfill Logic

Existing invoice profiles are automatically backfilled with:

- **First active entity** (ordered by ID ascending)
- **First active vendor** (ordered by ID ascending)
- **First active category** (ordered by ID ascending)
- **First active currency** (ordered by ID ascending)
- `tds_applicable` = `false`
- `tds_percentage` = `NULL`
- `prepaid_postpaid` = `NULL`

**Action Required**: After migration, review and update these default values to match your business requirements.

## Running the Migration

### Option 1: Using TypeScript Script (Recommended)

```bash
# Run the migration
npx tsx scripts/run-migration-sprint9b.ts

# Verify the migration
npx tsx scripts/validate-migration-sprint9b.ts

# Regenerate Prisma Client
npx prisma generate
```

### Option 2: Using Raw SQL (Advanced)

If you need to run the migration manually:

```bash
# Connect to your PostgreSQL database
psql postgresql://localhost:5432/paylog_dev

# Run the migration SQL
\i prisma/migrations/003_sprint9b_invoice_profile_enhancement/migration.sql

# Run validation queries
\i prisma/migrations/003_sprint9b_validation.sql

# Exit psql
\q

# Regenerate Prisma Client
npx prisma generate
```

## Rollback Procedure

If you need to rollback this migration:

### Option 1: Manual SQL Rollback

```bash
# Connect to your database
psql postgresql://localhost:5432/paylog_dev

# Run the rollback script
\i prisma/migrations/003_sprint9b_invoice_profile_enhancement_ROLLBACK.sql

# Exit psql
\q

# Revert schema.prisma to previous version
git checkout HEAD~1 -- schema.prisma

# Regenerate Prisma Client
npx prisma generate
```

### Option 2: Database Restore from Backup

If you have a backup before the migration:

```bash
# Restore from backup
pg_restore -d paylog_dev /path/to/backup.dump

# Revert schema.prisma
git checkout HEAD~1 -- schema.prisma

# Regenerate Prisma Client
npx prisma generate
```

**Warning**: The rollback script will **archive data** in `invoice_profiles_sprint9b_rollback_archive` before dropping columns, but the 7 new columns will be permanently deleted.

## Post-Migration Tasks

### 1. Update Existing Profiles

Review and update the backfilled default values:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Example: Update a profile with correct values
await prisma.invoiceProfile.update({
  where: { id: 1 },
  data: {
    entity_id: 2,      // Correct entity
    vendor_id: 5,      // Correct vendor
    category_id: 3,    // Correct category
    currency_id: 2,    // Correct currency (e.g., INR)
    prepaid_postpaid: 'postpaid',
    tds_applicable: true,
    tds_percentage: 10.0,
  },
});
```

### 2. Update Application Code

Import and use the new Zod validation schemas:

```typescript
import { invoiceProfileFormSchema } from '@/lib/validations/master-data';

// Validate form data
const result = invoiceProfileFormSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
  console.error(result.error.flatten());
}
```

### 3. Update UI Components

Update forms and displays to include the new fields:

```tsx
// Example form fields
<FormField name="entity_id" label="Entity" required />
<FormField name="vendor_id" label="Vendor" required />
<FormField name="category_id" label="Category" required />
<FormField name="currency_id" label="Currency" required />
<FormField name="prepaid_postpaid" label="Billing Type" type="select" options={['prepaid', 'postpaid']} />
<FormField name="tds_applicable" label="TDS Applicable" type="checkbox" />
{tdsApplicable && <FormField name="tds_percentage" label="TDS %" type="number" min={0} max={100} />}
```

### 4. Update Tests

Add tests for the new fields and validation logic:

```typescript
describe('InvoiceProfile Validation', () => {
  it('should require entity_id, vendor_id, category_id, currency_id', () => {
    // Test required fields
  });

  it('should enforce TDS percentage when TDS is applicable', () => {
    // Test conditional validation
  });

  it('should only allow "prepaid" or "postpaid" for prepaid_postpaid', () => {
    // Test enum validation
  });
});
```

## Verification

### Check Schema Changes

```sql
-- Verify columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoice_profiles'
  AND column_name IN ('entity_id', 'vendor_id', 'category_id', 'currency_id', 'prepaid_postpaid', 'tds_applicable', 'tds_percentage');

-- Verify foreign key constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'invoice_profiles'
  AND constraint_type = 'FOREIGN KEY';

-- Verify indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'invoice_profiles';
```

### Check Data Integrity

```sql
-- Count profiles
SELECT COUNT(*) FROM invoice_profiles;

-- Verify all profiles have valid FKs
SELECT COUNT(*) FROM invoice_profiles
WHERE entity_id IS NULL
   OR vendor_id IS NULL
   OR category_id IS NULL
   OR currency_id IS NULL;
-- Should return 0

-- Sample data
SELECT
  ip.id,
  ip.name,
  e.name AS entity_name,
  v.name AS vendor_name,
  c.name AS category_name,
  cur.code AS currency_code,
  ip.prepaid_postpaid,
  ip.tds_applicable,
  ip.tds_percentage
FROM invoice_profiles ip
JOIN entities e ON ip.entity_id = e.id
JOIN vendors v ON ip.vendor_id = v.id
JOIN categories c ON ip.category_id = c.id
JOIN currencies cur ON ip.currency_id = cur.id;
```

## Prisma Client Usage Examples

### Create a New Profile

```typescript
const newProfile = await prisma.invoiceProfile.create({
  data: {
    name: 'Cloud Services Template',
    description: 'For AWS/GCP invoices',
    entity_id: 1,
    vendor_id: 3,
    category_id: 2,
    currency_id: 1, // USD
    prepaid_postpaid: 'postpaid',
    tds_applicable: false,
    visible_to_all: true,
  },
  include: {
    entity: true,
    vendor: true,
    category: true,
    currency: true,
  },
});
```

### Query Profiles with Relations

```typescript
const profiles = await prisma.invoiceProfile.findMany({
  include: {
    entity: true,
    vendor: true,
    category: true,
    currency: true,
  },
  where: {
    tds_applicable: true,
    currency: {
      code: 'INR',
    },
  },
});
```

### Update a Profile

```typescript
await prisma.invoiceProfile.update({
  where: { id: 1 },
  data: {
    tds_applicable: true,
    tds_percentage: 10.0,
    prepaid_postpaid: 'prepaid',
  },
});
```

## TypeScript Types

The Prisma Client now includes updated types:

```typescript
import { Prisma } from '@prisma/client';

// InvoiceProfile with all fields
type InvoiceProfile = Prisma.InvoiceProfileGetPayload<{}>;

// InvoiceProfile with relations
type InvoiceProfileWithRelations = Prisma.InvoiceProfileGetPayload<{
  include: {
    entity: true;
    vendor: true;
    category: true;
    currency: true;
  };
}>;

// Create input type
type InvoiceProfileCreateInput = Prisma.InvoiceProfileCreateInput;

// Update input type
type InvoiceProfileUpdateInput = Prisma.InvoiceProfileUpdateInput;
```

## Troubleshooting

### Migration Fails with "No active entities found"

**Cause**: The database has no active entities.

**Solution**: Create at least one active entity before running the migration:

```typescript
await prisma.entity.create({
  data: {
    name: 'Head Office',
    address: '123 Main St, City, Country',
    country: 'US',
    is_active: true,
  },
});
```

### Migration Fails with "Constraint already exists"

**Cause**: The migration was partially run before.

**Solution**: Rollback first, then re-run:

```bash
# Rollback
psql postgresql://localhost:5432/paylog_dev -f prisma/migrations/003_sprint9b_invoice_profile_enhancement_ROLLBACK.sql

# Re-run migration
npx tsx scripts/run-migration-sprint9b.ts
```

### Prisma Client doesn't recognize new fields

**Cause**: Prisma Client not regenerated.

**Solution**: Regenerate Prisma Client:

```bash
npx prisma generate
```

If still not working, delete `node_modules/.prisma` and regenerate:

```bash
rm -rf node_modules/.prisma
npx prisma generate
```

## Files Modified/Created

### Schema Files
- `/Users/althaf/Projects/paylog-3/schema.prisma` - Updated InvoiceProfile model

### Migration Files
- `/Users/althaf/Projects/paylog-3/prisma/migrations/003_sprint9b_invoice_profile_enhancement/migration.sql` - Forward migration
- `/Users/althaf/Projects/paylog-3/prisma/migrations/003_sprint9b_invoice_profile_enhancement_ROLLBACK.sql` - Rollback migration
- `/Users/althaf/Projects/paylog-3/prisma/migrations/003_sprint9b_validation.sql` - Validation queries

### Script Files
- `/Users/althaf/Projects/paylog-3/scripts/run-migration-sprint9b.ts` - Migration runner
- `/Users/althaf/Projects/paylog-3/scripts/validate-migration-sprint9b.ts` - Validation runner

### Validation Files
- `/Users/althaf/Projects/paylog-3/lib/validations/master-data.ts` - Updated with InvoiceProfile Zod schemas

## Success Criteria

- [x] Prisma schema updated with 7 new fields
- [x] Foreign key constraints created with `onDelete: Restrict`
- [x] Indexes created on all FK fields
- [x] Migration tested successfully (forward migration completed)
- [x] Existing profiles migrated with safe defaults
- [x] Validation queries pass
- [x] Prisma client regenerated
- [x] Zero TypeScript errors
- [x] Zod schemas updated with conditional TDS validation
- [x] Documentation complete

## Next Steps (Sprint 9B Phase 2)

1. Update Server Actions for CRUD operations
2. Update UI components (forms, tables, filters)
3. Add API endpoints for InvoiceProfile management
4. Write integration tests
5. Deploy to Railway production

## Contact

For questions or issues with this migration, contact:
- Database Modeler (DBM)
- Sprint 9B Team

---

**Migration Status**: ✅ COMPLETE
**Last Updated**: 2025-10-24
**Version**: 1.0
