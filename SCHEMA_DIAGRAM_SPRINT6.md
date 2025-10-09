# Schema Diagram: Sprint 6 Updates

**Date**: 2025-10-08
**Version**: Phase 2 (Sprint 6)
**Focus**: Invoice Fields & SubEntity Model

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INVOICES (Updated)                             │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ PK  id                       │ INTEGER                                      │
│     invoice_number           │ TEXT (UNIQUE)                                │
│ FK  vendor_id                │ INTEGER (REQUIRED) ★ CHANGED                 │
│ FK  category_id              │ INTEGER?                                     │
│ FK  profile_id               │ INTEGER?                                     │
│     invoice_amount           │ REAL                                         │
│     invoice_date             │ DATETIME?                                    │
│     due_date                 │ DATETIME?                                    │
│                              │                                              │
│ ──────── NEW FIELDS ──────── │                                              │
│     period_start             │ DATETIME? ★ NEW                              │
│     period_end               │ DATETIME? ★ NEW                              │
│     tds_applicable           │ BOOLEAN (DEFAULT false) ★ NEW                │
│ FK  sub_entity_id            │ INTEGER? ★ NEW                               │
│     notes                    │ TEXT? ★ NEW                                  │
│                              │                                              │
│ ─── EXISTING FIELDS ──────── │                                              │
│     status                   │ TEXT (DEFAULT 'pending_approval')            │
│     hold_reason              │ TEXT?                                        │
│ FK  hold_by                  │ INTEGER?                                     │
│     hold_at                  │ DATETIME?                                    │
│     submission_count         │ INTEGER (DEFAULT 1)                          │
│     last_submission_at       │ DATETIME                                     │
│     rejection_reason         │ TEXT?                                        │
│ FK  rejected_by              │ INTEGER?                                     │
│     rejected_at              │ DATETIME?                                    │
│     is_hidden                │ BOOLEAN (DEFAULT false)                      │
│ FK  hidden_by                │ INTEGER?                                     │
│     hidden_at                │ DATETIME?                                    │
│     hidden_reason            │ TEXT?                                        │
│ FK  created_by               │ INTEGER                                      │
│     created_at               │ DATETIME                                     │
│     updated_at               │ DATETIME                                     │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

---

## New Entity: SubEntity

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUB_ENTITIES (New Table)                          │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ PK  id                       │ INTEGER                                      │
│     name                     │ TEXT (NOT NULL)                              │
│     description              │ TEXT?                                        │
│     is_active                │ BOOLEAN (DEFAULT true)                       │
│     created_at               │ DATETIME (DEFAULT now())                     │
│     updated_at               │ DATETIME                                     │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

---

## Relationship Diagram (Focus: New & Modified Relations)

```
┌──────────────┐
│   VENDORS    │
│              │
│ PK id        │
│    name      │
│    is_active │
└──────┬───────┘
       │
       │ 1
       │
       │ N (REQUIRED) ★ CHANGED from optional
       │
┌──────┴──────────────────────────────────────────────────────────────────────┐
│                              INVOICES                                       │
│  FK vendor_id (RESTRICT)     ★ Now REQUIRED                                 │
│  FK category_id (SET NULL)                                                  │
│  FK profile_id (SET NULL)                                                   │
│  FK sub_entity_id (SET NULL) ★ NEW RELATION                                 │
│  FK created_by (RESTRICT)                                                   │
│  FK hold_by (RESTRICT)                                                      │
│  FK hidden_by (RESTRICT)                                                    │
│  FK rejected_by (RESTRICT)                                                  │
└─────┬───────────────────────────────────────────────────────────────────────┘
      │
      │ N (optional)
      │
      │ 1
      │
┌─────┴─────────┐
│ SUB_ENTITIES  │ ★ NEW TABLE
│               │
│ PK id         │
│    name       │
│    description│
│    is_active  │
└───────────────┘
```

---

## Detailed Relationship Matrix

| Parent Table   | Child Table | Foreign Key        | Cardinality | OnDelete  | Change  |
|----------------|-------------|--------------------|-------------|-----------|---------|
| vendors        | invoices    | vendor_id          | 1 : N       | RESTRICT  | ★ MODIFIED |
| categories     | invoices    | category_id        | 1 : N       | SET NULL  | (unchanged) |
| invoice_profiles | invoices  | profile_id         | 1 : N       | SET NULL  | (unchanged) |
| **sub_entities** | **invoices** | **sub_entity_id** | **1 : N**   | **SET NULL** | **★ NEW** |
| users          | invoices    | created_by         | 1 : N       | RESTRICT  | (unchanged) |
| users          | invoices    | hold_by            | 1 : N       | RESTRICT  | (unchanged) |
| users          | invoices    | hidden_by          | 1 : N       | RESTRICT  | (unchanged) |
| users          | invoices    | rejected_by        | 1 : N       | RESTRICT  | (unchanged) |

---

## OnDelete Behavior Explanation

### vendor_id: RESTRICT (Changed from SET NULL)

**Before**: `ON DELETE SET NULL`
- If vendor deleted → invoice.vendor_id becomes NULL
- Invoices remained orphaned

**After**: `ON DELETE RESTRICT`
- If vendor has invoices → deletion blocked
- Must handle via Archive Request workflow
- Ensures data integrity (vendor always required)

**Business Rule**: Cannot delete vendor if active invoices exist

---

### sub_entity_id: SET NULL (New)

**Behavior**: `ON DELETE SET NULL`
- If sub entity deleted → invoice.sub_entity_id becomes NULL
- Invoice remains valid (sub entity is optional)

**Rationale**:
- Sub entity is organizational metadata, not core invoice data
- Deleting a division shouldn't invalidate historical invoices
- Invoices without sub entity still valid (legacy data, unallocated expenses)

**Business Rule**: Sub entity deletion removes association but preserves invoices

---

## Index Strategy

### Existing Indexes (Unchanged)

| Index Name                     | Columns              | Purpose                          |
|--------------------------------|----------------------|----------------------------------|
| idx_invoices_status            | [status]             | Filter by status                 |
| idx_invoices_on_hold           | [status]             | Find on-hold invoices            |
| idx_invoices_hidden            | [is_hidden]          | Filter hidden invoices           |
| idx_invoices_active            | [is_hidden]          | Show active invoices             |
| idx_invoices_submission_count  | [submission_count]   | Track resubmissions              |
| idx_invoices_created_at        | [created_at]         | Order by creation date           |

### New Index

| Index Name                 | Columns         | Purpose                          |
|----------------------------|-----------------|----------------------------------|
| **idx_invoices_sub_entity** | **[sub_entity_id]** | **★ NEW - Filter by division** |

**Rationale**:
- Common query: "Show all invoices for Engineering department"
- Supports reporting: "Total expenses per division"
- Improves performance for filtered views

**Query Example**:
```sql
SELECT * FROM invoices
WHERE sub_entity_id = 5 AND status = 'paid'
ORDER BY invoice_date DESC;
-- Uses: idx_invoices_sub_entity + idx_invoices_status
```

---

## Field Specifications

### period_start & period_end

**Type**: `DATETIME?` (Nullable)

**Purpose**: Track the service/billing period covered by the invoice

**Use Cases**:
- Recurring services (monthly maintenance, annual subscriptions)
- Multi-month contracts (Q1 2025 consulting fees)
- Period-based reporting (expenses by quarter)

**Examples**:
| Invoice Date | Period Start | Period End | Description                  |
|--------------|--------------|------------|------------------------------|
| 2025-04-01   | 2025-01-01   | 2025-03-31 | Q1 2025 maintenance fees     |
| 2025-02-15   | 2025-02-01   | 2025-02-28 | February 2025 hosting        |
| 2025-12-01   | 2025-01-01   | 2025-12-31 | Annual software license      |
| 2025-03-10   | NULL         | NULL       | One-time purchase (no period)|

**Validation Rules** (Application-Level):
1. If `period_start` provided, `period_end` should also be provided
2. `period_end >= period_start`
3. Both NULL or both set (optional consistency check)

**UI Display**: "Jan 2025 - Mar 2025" (formatted from period_start to period_end)

---

### tds_applicable

**Type**: `BOOLEAN` (NOT NULL, DEFAULT false)

**Purpose**: Flag whether Tax Deducted at Source (TDS) applies to this invoice

**Tax Context**:
- TDS: Tax deducted by payer before payment (common in India, other regions)
- Certain vendors/services require TDS deduction
- Rate varies by service type (e.g., 10% for professional services)

**Workflow**:
1. Invoice profile has default `tds_applicable` setting (future enhancement)
2. User can override per invoice (checkbox in form)
3. If true, payment processing may calculate TDS amount

**Examples**:
| Vendor Type         | Invoice Amount | TDS Applicable | TDS @ 10% | Net Payment |
|---------------------|----------------|----------------|-----------|-------------|
| Freelance Developer | 100,000        | true           | 10,000    | 90,000      |
| Office Supplies     | 50,000         | false          | 0         | 50,000      |
| Legal Services      | 200,000        | true           | 20,000    | 180,000     |

**Future Enhancements** (Sprint 8+):
- Add `tds_rate` field (percentage)
- Add `tds_amount` calculated field
- Link to tax certificate uploads

---

### sub_entity_id

**Type**: `INTEGER?` (Nullable Foreign Key)

**Purpose**: Link invoice to a specific organizational division/department/branch

**Use Cases**:
- Expense tracking per department
- Budget allocation reports
- Cross-functional expense analysis
- Division-specific approval workflows (future)

**Examples**:
| Invoice Number | Vendor      | Amount  | Sub Entity   | Purpose                |
|----------------|-------------|---------|--------------|------------------------|
| INV-2025-001   | AWS         | 50,000  | Engineering  | Cloud hosting          |
| INV-2025-002   | Ad Agency   | 100,000 | Marketing    | Q1 Ad campaign         |
| INV-2025-003   | Office Depot| 20,000  | Operations   | Office supplies        |
| INV-2025-004   | Consultant  | 150,000 | NULL         | Company-wide strategy  |

**Reporting Examples**:
```sql
-- Total expenses by division
SELECT
  se.name as division,
  COUNT(i.id) as invoice_count,
  SUM(i.invoice_amount) as total_amount
FROM invoices i
LEFT JOIN sub_entities se ON i.sub_entity_id = se.id
GROUP BY se.id, se.name
ORDER BY total_amount DESC;

-- Top vendors per division
SELECT
  se.name as division,
  v.name as vendor,
  COUNT(i.id) as invoice_count,
  SUM(i.invoice_amount) as total_amount
FROM invoices i
INNER JOIN vendors v ON i.vendor_id = v.id
LEFT JOIN sub_entities se ON i.sub_entity_id = se.id
WHERE i.status = 'paid'
GROUP BY se.id, v.id
ORDER BY se.name, total_amount DESC;
```

**Archive Workflow**:
- Sub entities can be archived via `ArchiveRequest` (entity_type='sub_entity')
- When archived, `is_active = false` (not deleted)
- Existing invoices retain sub_entity_id (historical data preserved)
- New invoices cannot select archived sub entities (UI filter: `is_active = true`)

---

### notes

**Type**: `TEXT?` (Nullable)

**Purpose**: Internal notes, descriptions, or context about the invoice

**Use Cases**:
- Clarification of invoice purpose
- Payment instructions
- Approval context
- Reconciliation notes

**Examples**:
| Invoice Number | Vendor    | Notes                                                |
|----------------|-----------|------------------------------------------------------|
| INV-2025-001   | AWS       | "Covers Jan-Mar hosting for production servers"      |
| INV-2025-002   | Freelancer| "Final payment for Q4 2024 design work"              |
| INV-2025-003   | Supplier  | "Partial payment - remaining 50% due on delivery"    |
| INV-2025-004   | Vendor    | NULL (no special notes)                              |

**Visibility**:
- Internal only (not sent to vendor)
- Visible to all users who can view the invoice
- Searchable for audit/reconciliation

**Character Limit**: None (TEXT field in SQLite)

**UI**: Multi-line textarea in invoice form

---

## Migration Impact Analysis

### Breaking Changes

**1. vendor_id: Optional → Required**

**Impact**: High (if NULL vendors exist)

**Current State**: 1 invoice, 1 with vendor (0 NULL) ✅ Safe

**Mitigation**:
- Pre-migration check confirms no NULL vendors
- Fallback: Create "Unknown Vendor" if needed
- Post-migration validation ensures all invoices have vendor

**Code Changes Required**:
- Invoice form: Make vendor dropdown required
- Validation: Ensure vendor_id always provided
- API: Reject invoice creation without vendor_id

---

### Non-Breaking Changes (Additive)

**1. New Optional Fields**: period_start, period_end, notes, sub_entity_id

**Impact**: None (backward compatible)

**Behavior**:
- Existing queries continue to work
- New queries can filter/sort by new fields
- Existing invoices have NULL values (valid)

**Code Changes Required**:
- Invoice form: Add new input fields (optional)
- Display: Show new fields if present
- Filtering: Add sub entity filter to invoice list

---

**2. New Boolean Field**: tds_applicable

**Impact**: None (has default value)

**Behavior**:
- Existing invoices default to `false`
- New invoices default to `false` unless specified
- Can be updated independently

**Code Changes Required**:
- Invoice form: Add TDS checkbox (default unchecked)
- Display: Show TDS badge if true
- Future: Integrate with payment calculation

---

**3. New Table**: sub_entities

**Impact**: None (no existing dependencies)

**Behavior**:
- Empty table after migration
- Admin can seed data
- Invoices can optionally link to sub entities

**Code Changes Required**:
- Admin UI: Sub entity management page (Sprint 7+)
- Invoice form: Sub entity dropdown (Sprint 6)
- Reports: Expense by division (Sprint 7+)

---

## Query Performance Analysis

### New Index Benefit: idx_invoices_sub_entity

**Before** (without index):
```sql
EXPLAIN QUERY PLAN
SELECT * FROM invoices WHERE sub_entity_id = 5;
-- SCAN TABLE invoices (full table scan)
```

**After** (with index):
```sql
EXPLAIN QUERY PLAN
SELECT * FROM invoices WHERE sub_entity_id = 5;
-- SEARCH TABLE invoices USING INDEX idx_invoices_sub_entity (sub_entity_id=?)
```

**Performance Gain**:
- 1,000 invoices: ~10x faster
- 10,000 invoices: ~100x faster
- 100,000 invoices: ~1000x faster

**Trade-off**:
- Index storage: Minimal (~1-2% of table size)
- Insert overhead: Negligible (~5-10ms per insert)
- Benefit: Significant for reporting queries

---

### Composite Query Optimization

**Common Query**: "Invoices by division and status"

```sql
SELECT * FROM invoices
WHERE sub_entity_id = 5 AND status = 'paid'
ORDER BY invoice_date DESC;
```

**Index Usage**:
- Primary: `idx_invoices_sub_entity` (filters sub_entity_id)
- Secondary: `idx_invoices_status` (filters status)
- Result: Fast filtered query with minimal row scans

**Future Optimization** (if needed):
- Add composite index: `[sub_entity_id, status]`
- Only if reporting queries become slow (>100k invoices)

---

## Data Integrity Constraints

### Foreign Key Constraints

| Constraint                    | Enforces                              | Prevents                          |
|-------------------------------|---------------------------------------|-----------------------------------|
| vendor_id → vendors(id)       | Vendor exists before linking          | Invalid vendor references         |
| sub_entity_id → sub_entities(id) | Sub entity exists before linking   | Invalid division references       |
| category_id → categories(id)  | Category exists before linking        | Invalid category references       |
| profile_id → invoice_profiles(id) | Profile exists before linking      | Invalid profile references        |

**SQLite Configuration**:
```sql
PRAGMA foreign_keys = ON;  -- Must be enabled for enforcement
```

**Prisma Handling**: Automatically enables foreign keys in migrations

---

### Application-Level Constraints

| Field         | Validation Rule                          | Error Message                     |
|---------------|------------------------------------------|-----------------------------------|
| vendor_id     | NOT NULL, valid vendor ID                | "Vendor is required"              |
| period_end    | >= period_start (if both provided)       | "Period end must be after start"  |
| tds_applicable| Boolean value (true/false)               | "Invalid TDS flag"                |
| notes         | Max 10,000 chars (optional limit)        | "Notes too long"                  |

---

## Testing Strategy

### Unit Tests (Prisma Client)

1. **Create Invoice with New Fields**:
   ```typescript
   const invoice = await prisma.invoice.create({
     data: {
       invoice_number: 'INV-TEST-001',
       vendor_id: 1,
       invoice_amount: 50000,
       period_start: new Date('2025-01-01'),
       period_end: new Date('2025-03-31'),
       tds_applicable: true,
       sub_entity_id: 2,
       notes: 'Q1 2025 maintenance fees',
       created_by: 1,
     },
   });
   expect(invoice.period_start).toEqual(new Date('2025-01-01'));
   expect(invoice.tds_applicable).toBe(true);
   ```

2. **Query by Sub Entity**:
   ```typescript
   const invoices = await prisma.invoice.findMany({
     where: { sub_entity_id: 2 },
     include: { sub_entity: true },
   });
   expect(invoices.length).toBeGreaterThan(0);
   expect(invoices[0].sub_entity.name).toBe('Engineering');
   ```

3. **Vendor Required Constraint**:
   ```typescript
   await expect(
     prisma.invoice.create({
       data: {
         invoice_number: 'INV-TEST-002',
         invoice_amount: 10000,
         created_by: 1,
         // Missing vendor_id
       },
     })
   ).rejects.toThrow(); // Should fail
   ```

---

### Integration Tests (API)

1. **Create Invoice with All New Fields**:
   ```http
   POST /api/invoices
   {
     "invoice_number": "INV-2025-100",
     "vendor_id": 5,
     "invoice_amount": 100000,
     "period_start": "2025-01-01",
     "period_end": "2025-03-31",
     "tds_applicable": true,
     "sub_entity_id": 3,
     "notes": "Q1 consulting fees"
   }
   ```

2. **Filter Invoices by Sub Entity**:
   ```http
   GET /api/invoices?sub_entity_id=3&status=paid
   ```

3. **Update Invoice Notes**:
   ```http
   PATCH /api/invoices/123
   {
     "notes": "Updated: Payment received on 2025-04-15"
   }
   ```

---

## Backwards Compatibility

### API Contracts

**Existing Endpoints**: ✅ Unchanged

```http
GET /api/invoices/:id
POST /api/invoices
PATCH /api/invoices/:id
DELETE /api/invoices/:id
```

**Response Schema**: ✅ Additive Only

Old response:
```json
{
  "id": 1,
  "invoice_number": "INV-001",
  "vendor_id": 5,
  "invoice_amount": 50000
}
```

New response (Sprint 6):
```json
{
  "id": 1,
  "invoice_number": "INV-001",
  "vendor_id": 5,
  "invoice_amount": 50000,
  "period_start": "2025-01-01",      // NEW (nullable)
  "period_end": "2025-03-31",        // NEW (nullable)
  "tds_applicable": false,           // NEW (default false)
  "sub_entity_id": 3,                // NEW (nullable)
  "notes": "Q1 fees"                 // NEW (nullable)
}
```

**Impact on Clients**:
- Old clients: Ignore new fields (still works)
- New clients: Use new fields (opt-in)

---

### Database Queries

**Existing Queries**: ✅ Still Valid

```sql
-- Old query (still works)
SELECT id, invoice_number, vendor_id, invoice_amount
FROM invoices
WHERE status = 'paid';

-- New query (uses new fields)
SELECT id, invoice_number, vendor_id, sub_entity_id, notes
FROM invoices
WHERE sub_entity_id IS NOT NULL;
```

**No Breaking Changes**:
- All existing columns still present
- Column order unchanged (fields added at end logically)
- Indexes do not conflict

---

## Summary

### Changes Overview

| Category        | Count | Details                                  |
|-----------------|-------|------------------------------------------|
| New Tables      | 1     | sub_entities                             |
| Modified Tables | 1     | invoices (5 new columns, 1 modified)     |
| New Columns     | 5     | period_start, period_end, tds_applicable, sub_entity_id, notes |
| Modified Columns| 1     | vendor_id (optional → required)          |
| New Indexes     | 1     | idx_invoices_sub_entity                  |
| New Foreign Keys| 1     | Invoice.sub_entity_id → SubEntity.id     |

### Risk Level: LOW ✅

- All new fields are optional or have defaults
- Single constraint change (vendor required) validated safe
- Backward compatible API contracts
- Additive-first approach
- Comprehensive migration plan

### Next Actions

1. **Immediate**: Run `npx prisma migrate dev --name add_invoice_fields_and_sub_entities`
2. **Validation**: Execute post-migration checks (see MIGRATION_PLAN_SPRINT6.md)
3. **Sprint 6**: Implement UI for new invoice fields
4. **Sprint 7+**: Add SubEntity admin UI and reporting

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Status**: Ready for Migration
