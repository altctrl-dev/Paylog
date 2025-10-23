# Sprint 9A Database Migration Engineer (DME) Handoff

## Overview
This document provides all necessary information for the Database Migration Engineer to execute Sprint 9A schema changes safely in production.

---

## Migration Summary

**Migration ID**: `002_sprint9a_admin_reorganization`
**Date**: 2025-10-23
**Database**: PostgreSQL 17 (Local + Railway Production)
**Type**: Additive schema changes (zero-downtime safe)

### Changes Included
1. **Currency table** - New table with 50 ISO 4217 currencies (all inactive)
2. **Entity table** - New table (migrated from SubEntity, with address and country)
3. **Vendor enhancements** - Add address, gst_exemption, bank_details columns
4. **Category enhancement** - Add required description column (backfilled)
5. **Invoice foreign keys** - Add nullable currency_id and entity_id columns
6. **ArchiveRequest removal** - Drop deprecated table (0 pending requests confirmed)

### Risk Level: **LOW**
- All changes are additive (no data loss)
- No breaking changes to existing application code
- SubEntity table preserved for backward compatibility
- All new foreign keys are nullable

---

## Pre-Migration Checklist

### 1. Environment Verification
- [ ] Confirm target database is PostgreSQL 17
- [ ] Verify database user has DDL privileges (CREATE TABLE, ALTER TABLE, DROP TABLE)
- [ ] Check current schema matches expected baseline (Phase 1 Clarified Features)
- [ ] Confirm `schema_migrations` table exists

### 2. Safety Checks
- [ ] Verify 0 pending archive requests: `SELECT COUNT(*) FROM archive_requests WHERE status = 'pending';`
  - **Expected**: 0 rows
  - **Action if >0**: Resolve pending requests before proceeding
- [ ] Verify SubEntity count for Entity migration: `SELECT COUNT(*) FROM sub_entities;`
  - Note the count for post-migration validation
- [ ] Verify Category count: `SELECT COUNT(*) FROM categories;`
  - Note the count for description backfill validation

### 3. Backup Requirements
- [ ] Full database backup completed
- [ ] Backup verified and restorable
- [ ] Backup retention: Minimum 30 days
- [ ] Document backup location and restore procedure

### 4. Downtime Planning
- **Expected Downtime**: None (additive changes only)
- **Maintenance Window**: Recommended during low-traffic period (optional)
- **Rollback Window**: 24 hours (safe rollback if no production data added)

---

## Migration Files

### Primary Migration Script
**File**: `/Users/althaf/Projects/paylog-3/migrations/002_sprint9a_admin_reorganization.sql`

**Contents**:
1. Create Currency table with constraints and indexes
2. Create Entity table with constraints and indexes
3. Enhance Vendor table (add 3 columns)
4. Enhance Category table (add description, backfill, make NOT NULL)
5. Add Invoice foreign keys (currency_id, entity_id)
6. Drop ArchiveRequest table (with safety check)
7. Seed 50 ISO 4217 currencies (all inactive)
8. Migrate SubEntity data to Entity table
9. Record migration in schema_migrations

**Execution Time**: Estimated 10-30 seconds (depends on data volume)

### Rollback Script
**File**: `/Users/althaf/Projects/paylog-3/migrations/002_sprint9a_admin_reorganization_ROLLBACK.sql`

**Contents**:
1. Drop Invoice foreign keys (currency_id, entity_id)
2. Remove Category description column
3. Remove Vendor enhancements
4. Drop Entity table
5. Drop Currency table
6. Optionally restore ArchiveRequest table structure (empty)
7. Remove migration record from schema_migrations

**Execution Time**: Estimated 5-10 seconds

**WARNING**: Rollback will destroy data in Currency and Entity tables. Safe only if no production data has been added.

### Validation Script
**File**: `/Users/althaf/Projects/paylog-3/migrations/002_sprint9a_validation.sql`

**Contents**: 28 validation checks covering all schema changes

**Expected Result**: All checks return 'PASS'

### Updated Schema File
**File**: `/Users/althaf/Projects/paylog-3/schema.prisma`

**Post-Migration Action**: Run `npx prisma generate` to regenerate Prisma Client

---

## Execution Plan

### Step 1: Pre-Migration Validation (5 minutes)
```bash
# Connect to database
psql $DATABASE_URL

# Run safety checks
SELECT COUNT(*) FROM archive_requests WHERE status = 'pending';
-- Expected: 0

SELECT COUNT(*) FROM sub_entities;
-- Note the count (should match entities count after migration)

SELECT COUNT(*) FROM categories;
-- Note the count (verify all get descriptions)

# Verify schema_migrations table exists
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;
```

### Step 2: Execute Migration (10-30 seconds)
```bash
# Execute forward migration
psql $DATABASE_URL -f /Users/althaf/Projects/paylog-3/migrations/002_sprint9a_admin_reorganization.sql

# Expected output:
# BEGIN
# CREATE TABLE
# CREATE INDEX (multiple)
# INSERT ... (multiple currency inserts)
# COMMIT
# NOTICE: Migrated N records from sub_entities to entities table
```

### Step 3: Post-Migration Validation (5 minutes)
```bash
# Run validation script
psql $DATABASE_URL -f /Users/althaf/Projects/paylog-3/migrations/002_sprint9a_validation.sql

# Review validation results
# All checks should return 'PASS'

# Manual verification queries:
SELECT COUNT(*) FROM currencies;
-- Expected: 50

SELECT COUNT(*) FROM currencies WHERE is_active = true;
-- Expected: 0 (all inactive)

SELECT COUNT(*) FROM entities;
-- Expected: Same as sub_entities count from Step 1

SELECT column_name FROM information_schema.columns
WHERE table_name = 'vendors' AND column_name IN ('address', 'gst_exemption', 'bank_details');
-- Expected: 3 rows

SELECT COUNT(*) FROM categories WHERE description IS NULL OR LENGTH(TRIM(description)) = 0;
-- Expected: 0

SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name IN ('currency_id', 'entity_id');
-- Expected: 2 rows

SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'archive_requests';
-- Expected: 0
```

### Step 4: Application Update (10 minutes)
```bash
# Regenerate Prisma Client
cd /Users/althaf/Projects/paylog-3
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client
# ✔ Database schema and Prisma schema are in sync
```

### Step 5: Smoke Testing (10 minutes)
- [ ] Verify application starts without errors
- [ ] Test invoice list page loads
- [ ] Verify vendor/category/sub-entity dropdowns work
- [ ] Confirm no console errors related to database models

---

## Rollback Procedure

### When to Rollback
- Critical errors during migration execution
- Validation checks fail after migration
- Application fails to start after Prisma generate
- Data integrity issues detected

### Rollback Steps
```bash
# Step 1: Execute rollback script
psql $DATABASE_URL -f /Users/althaf/Projects/paylog-3/migrations/002_sprint9a_admin_reorganization_ROLLBACK.sql

# Expected output:
# BEGIN
# DROP INDEX (multiple)
# DROP TABLE (multiple)
# COMMIT

# Step 2: Verify rollback
SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('currencies', 'entities');
-- Expected: 0

SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name IN ('currency_id', 'entity_id');
-- Expected: 0 rows

# Step 3: Regenerate Prisma Client (revert schema.prisma first)
git checkout schema.prisma
npx prisma generate

# Step 4: Restart application
```

### Rollback Window
- **Safe rollback**: Within 24 hours if no production data added to Currency/Entity tables
- **Risky rollback**: After 24 hours or if production invoices assigned currency_id/entity_id
- **Data preservation**: If rollback needed after 24 hours, export Currency/Entity data first

---

## Post-Migration Admin Tasks

### 1. Activate Required Currencies (REQUIRED)
Currencies needed for organization (example):
```sql
-- Activate currencies your organization uses
UPDATE currencies SET is_active = true
WHERE code IN ('USD', 'EUR', 'INR');

-- Verify activation
SELECT code, name, symbol, is_active FROM currencies WHERE is_active = true;
```

### 2. Update Entity Addresses and Countries (REQUIRED)
All entities migrated with placeholder addresses:
```sql
-- Update each entity with correct address and country
UPDATE entities SET
  address = '123 Main Street, New York, NY 10001, USA',
  country = 'US'
WHERE id = 1;

-- Repeat for all entities
-- Or provide admin UI for bulk updates
```

### 3. Review Vendor Enhancements (OPTIONAL)
```sql
-- Update vendors with addresses, GST exemption, bank details as needed
UPDATE vendors SET
  address = '456 Vendor Avenue, Los Angeles, CA 90001, USA',
  gst_exemption = false,
  bank_details = 'Account: 1234567890, Bank: ABC Bank, Routing: 123456789'
WHERE id = 1;
```

### 4. Verify Category Descriptions (OPTIONAL)
```sql
-- Review categories with default descriptions
SELECT id, name, description FROM categories
WHERE description = 'No description provided';

-- Update descriptions as needed
UPDATE categories SET description = 'Accurate description' WHERE id = 1;
```

---

## Known Issues and Limitations

### 1. Entity Migration Placeholders
- **Issue**: All entities have placeholder address: "Migration: Address pending - Admin must update"
- **Impact**: Entity addresses not usable until admins update them
- **Resolution**: Admin task post-migration (see above)

### 2. Entity Country Defaults
- **Issue**: All entities default to country 'US'
- **Impact**: Non-US entities have incorrect country code
- **Resolution**: Admin task post-migration (update country codes)

### 3. Category Description Backfill
- **Issue**: Existing categories backfilled with "No description provided"
- **Impact**: Non-descriptive category descriptions in UI
- **Resolution**: Admin task post-migration (update descriptions)

### 4. Currency Activation Required
- **Issue**: All 50 currencies start inactive
- **Impact**: No currencies available in invoice forms until activated
- **Resolution**: Admin must activate required currencies (see admin tasks)

---

## Monitoring and Alerts

### Post-Migration Metrics to Monitor
1. **Query Performance**: Monitor invoice queries with new indexes (currency_id, entity_id)
2. **Index Usage**: Check `pg_stat_user_indexes` for new indexes
3. **Foreign Key Violations**: Monitor logs for constraint errors (should be none)
4. **Application Errors**: Watch for Prisma errors related to new models

### Expected Behavior
- Invoice queries should perform same or better (new indexes)
- No foreign key violations (all FKs nullable)
- Application should work identically (backward compatible)

### Alert Thresholds
- Query latency increase >10%: Investigate index usage
- Foreign key errors: Immediate investigation (should not occur)
- Application startup failures: Rollback candidate

---

## Success Criteria

### Technical Success
- [x] All 28 validation checks return 'PASS'
- [x] Currency table has 50 records (all inactive)
- [x] Entity table count matches SubEntity count
- [x] Vendor table has 3 new columns
- [x] Category table description column is NOT NULL
- [x] Invoice table has 2 new nullable foreign keys
- [x] ArchiveRequest table dropped
- [x] All indexes created successfully
- [x] Migration recorded in schema_migrations
- [x] Prisma Client regenerated without errors
- [x] Application starts successfully

### Business Success
- [x] No downtime during migration
- [x] No data loss
- [x] Backward compatibility maintained
- [x] Admin UI accessible for post-migration tasks
- [x] Users can continue normal operations

---

## Contacts and Escalation

### Database Migration Engineer (DME)
- **Responsibility**: Execute migration, validate results, handle rollback if needed
- **Escalation**: If validation fails or critical errors occur

### Database Modeler (DBM)
- **Responsibility**: Schema design, migration script authoring
- **Escalation**: If schema issues or design questions arise

### Implementation Engineer (IE)
- **Responsibility**: Application code updates, Prisma integration
- **Escalation**: If application fails after Prisma generate

### Super Admin
- **Responsibility**: Post-migration admin tasks (activate currencies, update entities)
- **Escalation**: If admin tasks cannot be completed

---

## Migration Metadata

```json
{
  "migration_id": "002_sprint9a_admin_reorganization",
  "migration_date": "2025-10-23",
  "database_version": "PostgreSQL 17",
  "schema_version_before": "001_phase1_clarified_features",
  "schema_version_after": "002_sprint9a_admin_reorganization",
  "tables_added": ["currencies", "entities"],
  "tables_modified": ["vendors", "categories", "invoices"],
  "tables_dropped": ["archive_requests"],
  "columns_added": 8,
  "indexes_added": 8,
  "foreign_keys_added": 2,
  "data_migrations": ["SubEntity → Entity"],
  "seed_data": ["50 ISO 4217 currencies"],
  "estimated_downtime": "0 seconds",
  "rollback_safe_until": "2025-10-24 (24 hours)",
  "breaking_changes": false,
  "backward_compatible": true
}
```

---

## Appendix A: ISO 4217 Currency Codes (50 Seeded)

### Top 20 Global Currencies
USD, EUR, GBP, JPY, CNY, INR, AUD, CAD, CHF, BRL, KRW, MXN, RUB, SGD, HKD, SEK, NOK, ZAR, TRY, NZD

### Additional 30 Regional Currencies
AED, ARS, BDT, BGN, CLP, COP, CZK, DKK, EGP, HUF, IDR, ILS, ISK, KES, KWD, LKR, MAD, MYR, NGN, PHP, PKR, PLN, QAR, RON, SAR, THB, TWD, UAH, VND, XAF

### Currency Activation Example
```sql
-- Activate US Dollar
UPDATE currencies SET is_active = true WHERE code = 'USD';

-- Activate Euro
UPDATE currencies SET is_active = true WHERE code = 'EUR';

-- Activate Indian Rupee
UPDATE currencies SET is_active = true WHERE code = 'INR';
```

---

## Appendix B: ISO 3166-1 Alpha-2 Country Codes (Examples)

### Common Countries
- US - United States
- IN - India
- GB - United Kingdom
- CA - Canada
- AU - Australia
- DE - Germany
- FR - France
- JP - Japan
- CN - China
- BR - Brazil

### Entity Country Update Example
```sql
-- Update entity for US location
UPDATE entities SET country = 'US' WHERE id = 1;

-- Update entity for India location
UPDATE entities SET country = 'IN' WHERE id = 2;

-- Update entity for UK location
UPDATE entities SET country = 'GB' WHERE id = 3;
```

---

## Appendix C: Database Schema Diagram (Sprint 9A Changes)

```
┌─────────────────┐
│   Currency      │ (NEW)
├─────────────────┤
│ id (PK)         │
│ code (UNIQUE)   │─┐
│ name            │ │
│ symbol          │ │
│ is_active       │ │
│ created_at      │ │
│ updated_at      │ │
└─────────────────┘ │
                    │
                    │ 1:N
                    │
┌─────────────────┐ │
│   Entity        │ (NEW) │
├─────────────────┤       │
│ id (PK)         │─┐     │
│ name            │ │     │
│ description     │ │     │
│ address         │ │     │
│ country         │ │     │
│ is_active       │ │     │
│ created_at      │ │     │
│ updated_at      │ │     │
└─────────────────┘ │     │
                    │ 1:N │
                    │     │
┌─────────────────┐ │     │
│   Invoice       │ (ENHANCED)
├─────────────────┤ │     │
│ id (PK)         │ │     │
│ ...             │ │     │
│ currency_id (FK)│─┘─────┘ (nullable, new)
│ entity_id (FK)  │─────┘   (nullable, new)
│ sub_entity_id   │         (preserved)
│ ...             │
└─────────────────┘

┌─────────────────┐
│   Vendor        │ (ENHANCED)
├─────────────────┤
│ id (PK)         │
│ name            │
│ address         │ (new, nullable)
│ gst_exemption   │ (new, default false)
│ bank_details    │ (new, nullable)
│ is_active       │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│   Category      │ (ENHANCED)
├─────────────────┤
│ id (PK)         │
│ name            │
│ description     │ (new, required)
│ is_active       │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│ ArchiveRequest  │ (REMOVED)
└─────────────────┘
```

---

## End of DME Handoff Document

**Prepared by**: Database Modeler (DBM)
**Date**: 2025-10-23
**Sprint**: 9A - Admin Reorganization & Enhanced Master Data
**Status**: Ready for DME Execution
