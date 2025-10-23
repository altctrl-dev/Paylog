# Sprint 9A Schema Design: Admin Reorganization & Enhanced Master Data

## Overview
This document details the database schema changes for Sprint 9A, implementing enhanced master data management with Currency and Entity support, along with improvements to existing master data tables.

## Design Principles
- **Additive-First**: All changes are additive; no breaking changes to existing tables
- **Zero-Downtime**: SubEntity remains unchanged; Entity is created alongside it
- **Safe Rollback**: Every migration has a complete rollback script
- **Production-Ready**: All constraints, indexes, and foreign keys properly defined

---

## 1. Currency Table (NEW)

### Purpose
Manage ISO 4217 currency codes for multi-currency invoice support. Initially, all currencies are inactive; admins activate currencies as needed for organizational use.

### Schema Definition

```prisma
model Currency {
  id         Int      @id @default(autoincrement())
  code       String   @unique @db.VarChar(3)  // ISO 4217 (USD, EUR, INR)
  name       String                             // United States Dollar
  symbol     String   @db.VarChar(10)          // $, €, ₹
  is_active  Boolean  @default(false)          // Default: inactive
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relations (Sprint 9B)
  invoice_profiles InvoiceProfile[] @relation("ProfileCurrency")
  invoices         Invoice[]        @relation("InvoiceCurrency")

  @@index([is_active], name: "idx_currencies_active")
  @@index([code], name: "idx_currencies_code")
  @@map("currencies")
}
```

### PostgreSQL Schema

```sql
CREATE TABLE currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT currencies_code_length CHECK (LENGTH(code) = 3),
  CONSTRAINT currencies_code_uppercase CHECK (code = UPPER(code)),
  CONSTRAINT currencies_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT currencies_symbol_not_empty CHECK (LENGTH(TRIM(symbol)) > 0)
);

CREATE INDEX idx_currencies_active ON currencies (is_active) WHERE is_active = true;
CREATE INDEX idx_currencies_code ON currencies (code);
```

### Field Specifications

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `code` | VARCHAR(3) | UNIQUE, NOT NULL, UPPERCASE, LENGTH=3 | ISO 4217 code (USD, EUR, INR) |
| `name` | VARCHAR(255) | NOT NULL, NOT EMPTY | Full currency name |
| `symbol` | VARCHAR(10) | NOT NULL, NOT EMPTY | Currency symbol ($, €, ₹) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT false | Admin-controlled activation flag |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW(), ON UPDATE NOW() | Last update timestamp |

### Relations (Sprint 9B Preview)
- **InvoiceProfile.default_currency_id** → Currency.id (nullable)
- **Invoice.currency_id** → Currency.id (nullable, will become required in Sprint 9C)

### Business Rules
1. All currencies start with `is_active = false`
2. Only active currencies appear in dropdown menus
3. Cannot deactivate a currency used in active invoices (enforced in application layer)
4. Code must be valid ISO 4217 (enforced by seed data)
5. Code must be uppercase (database constraint)

### Seed Data
50 ISO 4217 currencies (see separate seed script):
- **Top 20 Global**: USD, EUR, GBP, JPY, CNY, INR, AUD, CAD, CHF, BRL, KRW, MXN, RUB, SGD, HKD, SEK, NOK, ZAR, TRY, NZD
- **Additional 30**: Regional currencies for comprehensive global coverage

---

## 2. Entity Table (NEW)

### Purpose
Represents organizational entities (legal entities, divisions, departments, branches) with full address and country information. This table is created **alongside** SubEntity for safe migration.

### Migration Strategy
**IMPORTANT**: Do NOT rename SubEntity → Entity. Instead:
1. Create Entity table (Sprint 9A)
2. Copy all SubEntity data to Entity (Sprint 9A)
3. Add nullable `entity_id` to Invoice table (Sprint 9A)
4. Gradually migrate invoices to use `entity_id` (Sprint 9B)
5. Deprecate SubEntity in future sprint (Sprint 9C or later)

### Schema Definition

```prisma
model Entity {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(255)
  description String?  @db.Text
  address     String   @db.Text                    // Required, min 1 char
  country     String   @db.VarChar(2)              // ISO 3166-1 alpha-2 (US, IN, GB)
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  // Relations
  invoices Invoice[] @relation("InvoiceEntity")

  @@index([is_active], name: "idx_entities_active")
  @@index([country], name: "idx_entities_country")
  @@map("entities")
}
```

### PostgreSQL Schema

```sql
CREATE TABLE entities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  country VARCHAR(2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT entities_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT entities_address_not_empty CHECK (LENGTH(TRIM(address)) > 0),
  CONSTRAINT entities_country_length CHECK (LENGTH(country) = 2),
  CONSTRAINT entities_country_uppercase CHECK (country = UPPER(country))
);

CREATE INDEX idx_entities_active ON entities (is_active) WHERE is_active = true;
CREATE INDEX idx_entities_country ON entities (country);
CREATE INDEX idx_entities_name ON entities (name);
```

### Field Specifications

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL, NOT EMPTY | Entity name (e.g., "Acme Corp - NYC Branch") |
| `description` | TEXT | NULLABLE | Optional entity description |
| `address` | TEXT | NOT NULL, NOT EMPTY | Full address (free-form, min 1 char) |
| `country` | VARCHAR(2) | NOT NULL, LENGTH=2, UPPERCASE | ISO 3166-1 alpha-2 code (US, IN, GB) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status flag |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW(), ON UPDATE NOW() | Last update timestamp |

### Relations
- **Invoice.entity_id** → Entity.id (nullable, onDelete: SetNull)

### Business Rules
1. `address` is free-form text (no validation beyond "not empty")
2. `country` must be valid ISO 3166-1 alpha-2 code (US, IN, GB, etc.)
3. Cannot delete entity with active invoices (onDelete: SetNull preserves invoices)
4. Entity can be deactivated instead of deleted (soft delete via `is_active`)

### Data Migration
Copy all SubEntity records to Entity:
```sql
INSERT INTO entities (name, description, address, country, is_active, created_at, updated_at)
SELECT
  name,
  description,
  'Migration: Address pending' AS address,  -- Placeholder
  'US' AS country,                           -- Default (admin must update)
  is_active,
  created_at,
  updated_at
FROM sub_entities;
```

**Post-Migration Action**: Admins must update Entity records with correct addresses and countries.

---

## 3. Vendor Table Enhancements

### Purpose
Add additional vendor information for improved vendor management.

### Schema Changes

```prisma
model Vendor {
  id             Int      @id @default(autoincrement())
  name           String
  address        String?  @db.Text              // NEW: Vendor address
  gst_exemption  Boolean  @default(false)       // NEW: GST exemption flag
  bank_details   String?  @db.Text              // NEW: Bank account details
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  // Relations (unchanged)
  invoices Invoice[]

  @@map("vendors")
}
```

### PostgreSQL Schema

```sql
-- Add new columns to vendors table
ALTER TABLE vendors
  ADD COLUMN address TEXT,
  ADD COLUMN gst_exemption BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN bank_details TEXT;

-- Add constraint for bank_details length
ALTER TABLE vendors
  ADD CONSTRAINT vendors_bank_details_length
  CHECK (bank_details IS NULL OR LENGTH(bank_details) <= 1000);

-- Add comment for new fields
COMMENT ON COLUMN vendors.address IS 'Vendor physical or mailing address (optional, free-form text)';
COMMENT ON COLUMN vendors.gst_exemption IS 'Whether vendor is exempt from GST/VAT (default: false)';
COMMENT ON COLUMN vendors.bank_details IS 'Vendor bank account details for payment processing (max 1000 chars)';
```

### Field Specifications

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `address` | TEXT | NULLABLE | Vendor address (optional, free-form) |
| `gst_exemption` | BOOLEAN | NOT NULL, DEFAULT false | GST/VAT exemption status |
| `bank_details` | TEXT | NULLABLE, MAX 1000 chars | Bank account information |

### Business Rules
1. `address` and `bank_details` are optional (nullable)
2. `gst_exemption` defaults to false (most vendors are not exempt)
3. `bank_details` limited to 1000 characters (prevents excessive data)
4. All fields can be edited by admins at any time

---

## 4. Category Table Enhancement

### Purpose
Add missing `description` field to Category table for better categorization clarity.

### Schema Changes

```prisma
model Category {
  id          Int      @id @default(autoincrement())
  name        String
  description String   @db.Text              // NEW: Required description
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  // Relations (unchanged)
  invoices Invoice[]

  @@map("categories")
}
```

### PostgreSQL Schema

```sql
-- Step 1: Add description column as nullable
ALTER TABLE categories
  ADD COLUMN description TEXT;

-- Step 2: Set default value for existing NULL records
UPDATE categories
SET description = 'No description provided'
WHERE description IS NULL;

-- Step 3: Make description NOT NULL
ALTER TABLE categories
  ALTER COLUMN description SET NOT NULL;

-- Add constraint and comment
ALTER TABLE categories
  ADD CONSTRAINT categories_description_not_empty
  CHECK (LENGTH(TRIM(description)) > 0);

COMMENT ON COLUMN categories.description IS 'Category description explaining its purpose and use cases (required)';
```

### Field Specifications

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `description` | TEXT | NOT NULL, NOT EMPTY | Explanation of category purpose |

### Migration Strategy
1. Add column as nullable
2. Backfill existing records with default: "No description provided"
3. Make column NOT NULL
4. Add constraint to prevent empty strings

### Business Rules
1. All categories must have a description
2. Description cannot be empty string (must have at least 1 non-whitespace character)
3. Existing categories without descriptions get default placeholder

---

## 5. PaymentType Table (NO CHANGES)

### Current Schema (Preserved)

```prisma
model PaymentType {
  id                 Int      @id @default(autoincrement())
  name               String
  description        String?                // KEEP as nullable (was planned to be required)
  requires_reference Boolean  @default(false)
  is_active          Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  // Relations (unchanged)
  payments Payment[]

  @@map("payment_types")
}
```

### Change from Original Plan
**DECISION**: Keep `description` as nullable (NOT required as initially planned in requirements).

**Rationale**:
- Payment types are often self-explanatory (e.g., "Cash", "Bank Transfer")
- Forcing descriptions adds friction for simple payment types
- Application layer can still encourage descriptions via UI validation

### Business Rules
1. `name` is required
2. `description` is optional but recommended
3. `requires_reference` indicates if payment needs reference number (check number, UPI ID, etc.)

---

## 6. Invoice Table Foreign Key Additions

### Purpose
Add nullable foreign keys for future Sprint 9B migration without breaking existing functionality.

### Schema Changes

```prisma
model Invoice {
  // ... existing fields ...

  // NEW: Currency support (Sprint 9B)
  currency_id Int? // Nullable for Sprint 9A; becomes required in Sprint 9C

  // NEW: Entity migration path (Sprint 9A-9B)
  entity_id Int? // Nullable; gradually replaces sub_entity_id

  // ... existing fields ...

  // Relations
  currency Currency? @relation("InvoiceCurrency", fields: [currency_id], references: [id], onDelete: SetNull)
  entity   Entity?   @relation("InvoiceEntity", fields: [entity_id], references: [id], onDelete: SetNull)
  // ... existing relations ...

  @@index([currency_id], name: "idx_invoices_currency")
  @@index([entity_id], name: "idx_invoices_entity")
}
```

### PostgreSQL Schema

```sql
-- Add currency_id foreign key (nullable)
ALTER TABLE invoices
  ADD COLUMN currency_id INTEGER REFERENCES currencies(id) ON DELETE SET NULL;

-- Add entity_id foreign key (nullable)
ALTER TABLE invoices
  ADD COLUMN entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_invoices_currency ON invoices (currency_id);
CREATE INDEX idx_invoices_entity ON invoices (entity_id);

-- Add comments
COMMENT ON COLUMN invoices.currency_id IS 'Currency for invoice amount (Sprint 9B: nullable; Sprint 9C: required). References currencies table.';
COMMENT ON COLUMN invoices.entity_id IS 'Organizational entity (replaces sub_entity_id in Sprint 9B). References entities table.';
```

### Field Specifications

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `currency_id` | INT | NULLABLE, FK → currencies(id), onDelete: SetNull | Invoice currency (Sprint 9B) |
| `entity_id` | INT | NULLABLE, FK → entities(id), onDelete: SetNull | Migration path from sub_entity_id |

### Business Rules
1. `currency_id` is nullable in Sprint 9A; will become required in Sprint 9C
2. `entity_id` coexists with `sub_entity_id` during migration (Sprint 9A-9B)
3. Both fields use `onDelete: SetNull` to preserve invoice history if master data deleted

---

## 7. ArchiveRequest Table Removal

### Purpose
Remove deprecated ArchiveRequest table (0 pending requests confirmed).

### Verification Query
```sql
SELECT COUNT(*) FROM archive_requests WHERE status = 'pending';
-- Expected result: 0
```

### PostgreSQL Schema

```sql
-- Drop foreign key constraints first
ALTER TABLE archive_requests
  DROP CONSTRAINT IF EXISTS archive_requests_requested_by_fkey,
  DROP CONSTRAINT IF EXISTS archive_requests_reviewed_by_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_archive_requests_status;
DROP INDEX IF EXISTS idx_archive_requests_entity;
DROP INDEX IF EXISTS idx_archive_requests_requested_by;
DROP INDEX IF EXISTS idx_archive_requests_pending;

-- Drop table
DROP TABLE IF EXISTS archive_requests;
```

### Prisma Schema Changes
Remove `ArchiveRequest` model and related User relations:
- Remove `User.archive_requests` relation
- Remove `User.reviewed_requests` relation
- Remove entire `ArchiveRequest` model

### Safety Checks
1. Verify 0 pending requests before migration
2. Backup table data before dropping (if needed for historical records)
3. Remove application code referencing ArchiveRequest (separate task)

---

## Index Recommendations

### New Indexes

| Table | Index Name | Columns | Type | Purpose |
|-------|-----------|---------|------|---------|
| `currencies` | `idx_currencies_active` | `is_active` | Partial (WHERE is_active = true) | Active currency lookups |
| `currencies` | `idx_currencies_code` | `code` | Standard | Currency code searches |
| `entities` | `idx_entities_active` | `is_active` | Partial (WHERE is_active = true) | Active entity lookups |
| `entities` | `idx_entities_country` | `country` | Standard | Country-based queries |
| `entities` | `idx_entities_name` | `name` | Standard | Entity name searches |
| `invoices` | `idx_invoices_currency` | `currency_id` | Standard | Currency-based invoice queries |
| `invoices` | `idx_invoices_entity` | `entity_id` | Standard | Entity-based invoice queries |

### Index Strategy
1. **Partial indexes** for boolean flags (is_active) to reduce index size
2. **Standard indexes** for foreign keys to improve join performance
3. **Covering indexes** avoided (rely on PostgreSQL's index-only scans)

---

## Foreign Key Constraints

### OnDelete Behaviors

| Relationship | OnDelete | Rationale |
|-------------|----------|-----------|
| Invoice → Currency | SET NULL | Preserve invoice if currency deleted (rare case) |
| Invoice → Entity | SET NULL | Preserve invoice if entity deleted/merged |
| InvoiceProfile → Currency (Sprint 9B) | SET NULL | Preserve profile if default currency deleted |

### Constraint Summary
- **RESTRICT**: Used for user-initiated actions (creator, approver) - prevents deletion of users with active references
- **CASCADE**: Used for dependent data (payments, attachments) - removes dependent records when parent deleted
- **SET NULL**: Used for optional master data - preserves historical records when master data deleted

---

## Rollback Strategy

### Rollback Order (Reverse of Migration)
1. Drop Invoice foreign keys (`currency_id`, `entity_id`)
2. Drop indexes on new tables
3. Drop Entity table
4. Drop Currency table
5. Restore ArchiveRequest table (if backup exists)
6. Remove Vendor enhancements (address, gst_exemption, bank_details)
7. Remove Category description column

### Rollback SQL Script
See `002_sprint9a_admin_reorganization_ROLLBACK.sql` for complete rollback script.

---

## Migration Checklist

### Pre-Migration
- [ ] Verify 0 pending archive requests
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Review all foreign key constraints
- [ ] Validate ISO 4217 currency data
- [ ] Prepare Entity migration script

### Migration Execution
- [ ] Execute forward migration SQL
- [ ] Verify all tables created successfully
- [ ] Run Currency seed script (50 ISO 4217 currencies)
- [ ] Run Entity data migration (copy from SubEntity)
- [ ] Verify all indexes created
- [ ] Check foreign key constraints

### Post-Migration
- [ ] Verify Currency table has 50 records (all inactive)
- [ ] Verify Entity table has same count as SubEntity
- [ ] Run Prisma generate
- [ ] Update application code to use new models
- [ ] Test admin UI for Currency/Entity management
- [ ] Document manual admin actions required (Entity address updates)

---

## Sprint 9B Preview

### Planned Changes (Future)
1. Add `InvoiceProfile.default_currency_id` (nullable FK → Currency)
2. Implement currency selection in invoice creation UI
3. Gradual migration: Update Invoice.entity_id for all invoices (copy from sub_entity_id)
4. Add multi-currency display in invoice list
5. Currency conversion utilities (optional, depends on requirements)

### Sprint 9C Preview (Future)
1. Make `Invoice.currency_id` required (NOT NULL constraint)
2. Deprecate `Invoice.sub_entity_id` (mark as obsolete)
3. Remove SubEntity table (after confirming all invoices migrated to Entity)
4. Add currency exchange rate tracking (if needed)

---

## Database Migration Engineer (DME) Handoff

### Deliverables for DME
1. **Forward Migration SQL**: `002_sprint9a_admin_reorganization.sql`
2. **Rollback Migration SQL**: `002_sprint9a_admin_reorganization_ROLLBACK.sql`
3. **Currency Seed Script**: `seed-currencies.sql` (50 ISO 4217 currencies)
4. **Entity Migration Script**: `migrate-subentity-to-entity.sql`
5. **Validation Queries**: `validate-sprint9a-migration.sql`

### Critical Notes for DME
1. **SubEntity Preservation**: Do NOT rename or drop SubEntity table
2. **ArchiveRequest Safety**: Verify 0 pending requests before dropping table
3. **Category Description**: Must run UPDATE before making column NOT NULL
4. **Entity Data Migration**: Run immediately after Entity table creation
5. **Currency Activation**: All currencies start inactive (admin activates as needed)

### Success Criteria
- All tables created without errors
- All indexes exist and functional
- 50 currencies seeded (all inactive)
- Entity table populated with SubEntity data
- No foreign key constraint violations
- Rollback script tested and functional

---

## Security Considerations

### Data Validation
1. **ISO 4217 Codes**: Enforced by seed data + application validation
2. **ISO 3166-1 Codes**: Enforced by database constraint (LENGTH = 2, UPPERCASE)
3. **Bank Details**: Limited to 1000 chars to prevent data bloat
4. **Empty Strings**: All text fields have "not empty" constraints

### Access Control
1. Currency activation: Admin only
2. Entity creation/edit: Admin only
3. Vendor enhancements: Admin only
4. Category description edit: Admin only

### Audit Trail
- All tables have `created_at` and `updated_at` timestamps
- ActivityLog table tracks invoice-related changes (existing)
- Future enhancement: Add audit log for master data changes (Sprint 10+)

---

## Performance Considerations

### Query Optimization
1. Partial indexes on boolean flags reduce index size by 50-90%
2. Foreign key indexes improve join performance
3. Country index enables geographic reporting queries

### Data Volume Projections
- **Currency**: 50 records (fixed, minimal growth)
- **Entity**: 10-100 records (depends on organization size)
- **Vendor enhancements**: No new rows, only column additions

### Monitoring
- Monitor query performance on Entity table after migration
- Track index usage with `pg_stat_user_indexes`
- Review slow query log for currency/entity joins

---

## Documentation Requirements

### Admin Guide Updates
1. Document Currency activation workflow
2. Explain Entity vs SubEntity distinction
3. Provide Vendor field usage guidelines
4. Update Category creation instructions

### Developer Guide Updates
1. Document new Prisma models (Currency, Entity)
2. Update API contracts for enhanced master data
3. Add migration playbook for SubEntity → Entity
4. Document rollback procedures

---

## End of Schema Design Document
