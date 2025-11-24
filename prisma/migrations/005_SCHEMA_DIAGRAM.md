# Schema Diagram: Invoice Model with invoice_received_date

## Invoice Model Structure (After Migration 005)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INVOICE TABLE                               │
├─────────────────────────────────────────────────────────────────────────┤
│ Primary Key                                                              │
│ ├─ id                        : Int (PK, Auto-increment)                 │
│                                                                          │
│ Basic Invoice Information                                                │
│ ├─ invoice_number            : String (UNIQUE)                          │
│ ├─ invoice_amount            : Float                                    │
│ ├─ description               : String? (nullable)                       │
│                                                                          │
│ Date Fields (Chronological Flow) ⭐ UPDATED                             │
│ ├─ invoice_date              : DateTime? (date on invoice)              │
│ ├─ invoice_received_date     : DateTime? (NEW - when received) 🆕       │
│ ├─ due_date                  : DateTime? (payment due)                  │
│ ├─ period_start              : DateTime? (billing period start)         │
│ ├─ period_end                : DateTime? (billing period end)           │
│ ├─ paid_date                 : DateTime? (when payment made)            │
│                                                                          │
│ Foreign Key Relationships                                                │
│ ├─ vendor_id                 : Int → vendors.id                         │
│ ├─ category_id               : Int? → categories.id                     │
│ ├─ currency_id               : Int? → currencies.id                     │
│ ├─ entity_id                 : Int? → entities.id                       │
│ ├─ sub_entity_id             : Int? → sub_entities.id                   │
│ ├─ profile_id                : Int? → invoice_profiles.id (legacy)      │
│ ├─ invoice_profile_id        : Int? → invoice_profiles.id (v2)          │
│ ├─ payment_type_id           : Int? → payment_types.id                  │
│                                                                          │
│ Invoice Type & Recurrence                                                │
│ ├─ invoice_type              : String? (default: "non-recurring")       │
│ ├─ is_recurring              : Boolean (default: false)                 │
│                                                                          │
│ Payment Status (Inline)                                                  │
│ ├─ is_paid                   : Boolean (default: false)                 │
│ ├─ paid_amount               : Float?                                   │
│ ├─ paid_currency             : String?                                  │
│ ├─ payment_reference         : String?                                  │
│                                                                          │
│ TDS (Tax Deducted at Source)                                             │
│ ├─ tds_applicable            : Boolean (default: false)                 │
│ ├─ tds_percentage            : Float?                                   │
│                                                                          │
│ Workflow Status                                                          │
│ ├─ status                    : String (default: "pending_approval")     │
│ ├─ submission_count          : Int (default: 1)                         │
│ ├─ last_submission_at        : DateTime (default: now())                │
│                                                                          │
│ Hold Management                                                          │
│ ├─ hold_reason               : String?                                  │
│ ├─ hold_by                   : Int? → users.id                          │
│ ├─ hold_at                   : DateTime?                                │
│                                                                          │
│ Rejection Management                                                     │
│ ├─ rejection_reason          : String?                                  │
│ ├─ rejected_by               : Int? → users.id                          │
│ ├─ rejected_at               : DateTime?                                │
│                                                                          │
│ Soft Delete (Hidden)                                                     │
│ ├─ is_hidden                 : Boolean (default: false)                 │
│ ├─ hidden_by                 : Int? → users.id                          │
│ ├─ hidden_at                 : DateTime?                                │
│ ├─ hidden_reason             : String?                                  │
│                                                                          │
│ Audit Fields                                                             │
│ ├─ created_by                : Int → users.id                           │
│ ├─ created_at                : DateTime (default: now())                │
│ ├─ updated_at                : DateTime (auto-update)                   │
│ ├─ notes                     : String?                                  │
│                                                                          │
│ Relations (One-to-Many)                                                  │
│ ├─ payments                  : Payment[] (cascade delete)               │
│ ├─ attachments               : InvoiceAttachment[] (cascade delete)     │
│ ├─ comments                  : InvoiceComment[] (cascade delete)        │
│ ├─ activity_logs             : ActivityLog[] (cascade delete)           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Date Field Relationships

### Chronological Flow
```
1. invoice_date (vendor prints invoice)
         ↓
2. invoice_received_date (org receives invoice) 🆕 NEW FIELD
         ↓
3. created_at (record created in system)
         ↓
4. due_date (payment deadline)
         ↓
5. paid_date (payment executed)
```

### Semantic Distinctions
| Field | Owner | Purpose | Example Scenario |
|-------|-------|---------|------------------|
| `invoice_date` | Vendor | Date printed on invoice | Invoice dated Nov 1 |
| `invoice_received_date` 🆕 | Organization | When org received invoice | Received by mail Nov 5 |
| `created_at` | System | Record creation timestamp | Data entry on Nov 6 |
| `due_date` | Vendor/Agreement | Payment deadline | Due Nov 30 |
| `paid_date` | Organization | When payment was made | Paid Dec 1 |

### Use Cases for invoice_received_date

1. **Receipt Latency Tracking**
   ```sql
   -- Calculate average delay between invoice date and receipt
   SELECT AVG(invoice_received_date - invoice_date) as avg_receipt_delay
   FROM invoices
   WHERE invoice_received_date IS NOT NULL;
   ```

2. **Compliance Reporting**
   ```sql
   -- Find invoices received but not entered in system within 3 days
   SELECT * FROM invoices
   WHERE invoice_received_date IS NOT NULL
     AND created_at > invoice_received_date + INTERVAL '3 days';
   ```

3. **Aging Analysis**
   ```sql
   -- Age invoices from received date, not invoice date
   SELECT
     invoice_number,
     CURRENT_DATE - invoice_received_date::date as days_since_received
   FROM invoices
   WHERE status = 'pending_approval'
     AND invoice_received_date IS NOT NULL;
   ```

## Indexes

### Current Indexes (Unchanged)
- `idx_invoices_status` on status
- `idx_invoices_hidden` on is_hidden
- `idx_invoices_created_at` on created_at
- `idx_invoices_recurring` on is_recurring
- `idx_invoices_paid` on is_paid
- ... (other existing indexes)

### Potential Future Index (Not Yet Added)
```sql
-- If filtering/sorting by received date becomes common:
CREATE INDEX "idx_invoices_received_date"
ON "invoices"("invoice_received_date")
WHERE invoice_received_date IS NOT NULL; -- Partial index for efficiency
```

**Decision**: Index NOT added in this migration to keep changes minimal. Can be added later based on query patterns.

## Migration Impact Summary

### ✅ What Changed
- Added 1 new nullable column: `invoice_received_date`
- Type: `DateTime?` (TIMESTAMP(3) in PostgreSQL)
- Placement: Between `invoice_date` and `due_date` for semantic clarity

### ✅ What Did NOT Change
- No existing columns modified
- No existing indexes changed
- No existing constraints affected
- No data transformation required
- No breaking changes to queries

### ✅ Backward Compatibility
- All existing records remain valid (field is nullable)
- All existing queries continue to work
- No application code changes required
- Can be safely deployed without downtime

## ORM Access Examples

### TypeScript (Prisma Client)

```typescript
// Import types
import { Prisma } from '@prisma/client';

// Create invoice with received date
const invoice = await prisma.invoice.create({
  data: {
    invoice_number: 'INV-2025-001',
    vendor_id: 1,
    invoice_amount: 5000.00,
    invoice_date: new Date('2025-11-01'),
    invoice_received_date: new Date('2025-11-05'), // NEW
    due_date: new Date('2025-11-30'),
    created_by: userId,
  },
});

// Update existing invoice
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    invoice_received_date: new Date(), // Set received date
  },
});

// Query invoices received in last 30 days
const recentInvoices = await prisma.invoice.findMany({
  where: {
    invoice_received_date: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  },
  orderBy: {
    invoice_received_date: 'desc',
  },
});

// Calculate receipt latency
const invoicesWithLatency = await prisma.$queryRaw<
  Array<{ invoice_number: string; latency_days: number }>
>`
  SELECT
    invoice_number,
    EXTRACT(DAY FROM (invoice_received_date - invoice_date)) as latency_days
  FROM invoices
  WHERE invoice_received_date IS NOT NULL
    AND invoice_date IS NOT NULL
  ORDER BY latency_days DESC;
`;
```

## Legend

🆕 **NEW** - Field added in this migration
⭐ **UPDATED** - Section modified in this migration
→ - Foreign key relationship
[] - One-to-many relationship
? - Nullable field
