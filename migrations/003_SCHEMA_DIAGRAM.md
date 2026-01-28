# Schema Diagram: Approval Workflow for CreditNote and AdvancePayment

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER MODEL                                  │
│─────────────────────────────────────────────────────────────────────────│
│ id: INT (PK)                                                             │
│ email: STRING (UNIQUE)                                                   │
│ full_name: STRING                                                        │
│ role: STRING                                                             │
│ status: STRING                                                           │
│ ...                                                                      │
│                                                                          │
│ Relations (Approval Workflow):                                           │
│ - created_credit_notes: CreditNote[] ("CreditNoteCreator")              │
│ - approved_credit_notes: CreditNote[] ("CreditNoteApprover") ✨ NEW     │
│ - deleted_credit_notes: CreditNote[] ("CreditNoteDeleter")              │
│ - created_advance_payments: AdvancePayment[] ("AdvancePaymentCreator")  │
│ - approved_advance_payments: AdvancePayment[] ("AdvancePaymentApprover")✨ NEW │
│ - deleted_advance_payments: AdvancePayment[] ("AdvancePaymentDeleter") ✨ NEW │
└─────────────────────────────────────────────────────────────────────────┘
                    │                             │
                    │                             │
    ┌───────────────┴─────────────────┐          │
    │                                  │          │
    │                                  │          │
    ▼                                  ▼          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CREDIT NOTE MODEL                                │
│─────────────────────────────────────────────────────────────────────────│
│ id: INT (PK)                                                             │
│ invoice_id: INT (FK → Invoice)                                           │
│ credit_note_number: STRING                                               │
│ credit_note_date: DATETIME                                               │
│ amount: FLOAT                                                            │
│ reason: STRING                                                           │
│ notes: STRING?                                                           │
│                                                                          │
│ TDS Support:                                                             │
│ - tds_applicable: BOOLEAN                                                │
│ - tds_amount: FLOAT?                                                     │
│                                                                          │
│ File Attachment:                                                         │
│ - file_name: STRING?                                                     │
│ - file_path: STRING?                                                     │
│ - file_size: INT?                                                        │
│ - file_mime_type: STRING?                                                │
│                                                                          │
│ Reporting:                                                               │
│ - reporting_month: DATETIME?                                             │
│                                                                          │
│ Audit Fields:                                                            │
│ - created_by_id: INT (FK → User)                                         │
│ - created_at: DATETIME                                                   │
│ - updated_at: DATETIME                                                   │
│                                                                          │
│ Soft Delete:                                                             │
│ - deleted_at: DATETIME?                                                  │
│ - deleted_by_id: INT? (FK → User)                                        │
│ - deleted_reason: STRING?                                                │
│                                                                          │
│ ✨ APPROVAL WORKFLOW (NEW):                                             │
│ - status: STRING @default("pending_approval")                            │
│   Values: "pending_approval" | "approved" | "rejected"                  │
│ - approved_by_id: INT? (FK → User) ✨ NEW                               │
│ - approved_at: DATETIME? ✨ NEW                                         │
│ - rejection_reason: STRING? ✨ NEW                                      │
│                                                                          │
│ Indexes:                                                                 │
│ - idx_credit_notes_invoice (invoice_id)                                  │
│ - idx_credit_notes_date (credit_note_date)                               │
│ - idx_credit_notes_reporting_month (reporting_month)                     │
│ - idx_credit_notes_deleted (deleted_at)                                  │
│ - idx_credit_notes_status (status) ✨ NEW                               │
│ - idx_credit_notes_approved_by (approved_by_id) ✨ NEW                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       ADVANCE PAYMENT MODEL                              │
│─────────────────────────────────────────────────────────────────────────│
│ id: INT (PK)                                                             │
│ vendor_id: INT (FK → Vendor)                                             │
│ description: STRING                                                      │
│ amount: FLOAT                                                            │
│ payment_type_id: INT (FK → PaymentType)                                  │
│ payment_date: DATETIME                                                   │
│ payment_reference: STRING?                                               │
│                                                                          │
│ Reporting:                                                               │
│ - reporting_month: DATETIME                                              │
│                                                                          │
│ Invoice Linking:                                                         │
│ - linked_invoice_id: INT? @unique (FK → Invoice)                         │
│ - linked_at: DATETIME?                                                   │
│                                                                          │
│ Audit Fields:                                                            │
│ - notes: STRING?                                                         │
│ - created_by_id: INT? (FK → User)                                        │
│ - created_at: DATETIME                                                   │
│ - updated_at: DATETIME                                                   │
│                                                                          │
│ ✨ APPROVAL WORKFLOW (NEW):                                             │
│ - status: STRING @default("pending_approval") ✨ NEW                    │
│   Values: "pending_approval" | "approved" | "rejected"                  │
│ - approved_by_id: INT? (FK → User) ✨ NEW                               │
│ - approved_at: DATETIME? ✨ NEW                                         │
│ - rejection_reason: STRING? ✨ NEW                                      │
│                                                                          │
│ ✨ SOFT DELETE (NEW):                                                   │
│ - deleted_at: DATETIME? ✨ NEW                                          │
│ - deleted_by_id: INT? (FK → User) ✨ NEW                                │
│ - deleted_reason: STRING? ✨ NEW                                        │
│                                                                          │
│ Indexes:                                                                 │
│ - idx_advance_payments_vendor (vendor_id)                                │
│ - idx_advance_payments_reporting_month (reporting_month)                 │
│ - idx_advance_payments_linked_invoice (linked_invoice_id)                │
│ - idx_advance_payments_payment_type (payment_type_id)                    │
│ - idx_advance_payments_status (status) ✨ NEW                           │
│ - idx_advance_payments_approved_by (approved_by_id) ✨ NEW              │
│ - idx_advance_payments_deleted (deleted_at) ✨ NEW                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Relationships

### CreditNote Relationships

```
CreditNote ─┬─── (created_by_id) ──→ User (creator)
            ├─── (deleted_by_id) ──→ User (deleter) [optional]
            ├─── (approved_by_id) ─→ User (approver) [optional] ✨ NEW
            └─── (invoice_id) ─────→ Invoice (parent invoice)
```

### AdvancePayment Relationships

```
AdvancePayment ─┬─── (created_by_id) ──→ User (creator)
                ├─── (approved_by_id) ─→ User (approver) [optional] ✨ NEW
                ├─── (deleted_by_id) ──→ User (deleter) [optional] ✨ NEW
                ├─── (vendor_id) ─────→ Vendor
                ├─── (payment_type_id) → PaymentType
                └─── (linked_invoice_id) → Invoice [optional, unique]
```

## Approval Workflow State Machine

### Status Flow

```
┌─────────────────────┐
│  pending_approval   │ ← Default state for new entries
│  (default)          │
└──────────┬──────────┘
           │
           ├─── Admin Approves ──→ ┌──────────┐
           │                        │ approved │ ← Terminal state (success)
           │                        └──────────┘
           │
           └─── Admin Rejects ───→ ┌──────────┐
                                    │ rejected │ ← Terminal state (failed)
                                    └──────────┘
```

### State Transitions

| From State         | Action        | To State         | Required Fields                                      |
|--------------------|---------------|------------------|-----------------------------------------------------|
| `pending_approval` | Admin Approve | `approved`       | `approved_by_id`, `approved_at`                     |
| `pending_approval` | Admin Reject  | `rejected`       | `approved_by_id` (rejector), `rejection_reason`     |
| `approved`         | None          | Terminal         | Cannot transition                                   |
| `rejected`         | Resubmit      | `pending_approval` | Create new entry or modify existing               |

## Consistency with Existing Models

### Payment Model Pattern

```prisma
model Payment {
  status             String   @default("pending")
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejection_reason    String?

  created_by   User? @relation("PaymentCreator", fields: [created_by_user_id], references: [id])
  approved_by  User? @relation("PaymentApprover", fields: [approved_by_user_id], references: [id])
}
```

### Vendor Model Pattern

```prisma
model Vendor {
  status              String    @default("PENDING_APPROVAL")
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejected_reason     String?  // Note: different field name

  created_by       User? @relation("VendorCreatedBy", fields: [created_by_user_id], references: [id])
  approved_by      User? @relation("VendorApprovedBy", fields: [approved_by_user_id], references: [id])
}
```

### Unified Pattern (CreditNote & AdvancePayment)

```prisma
// CreditNote follows Payment naming convention
model CreditNote {
  status           String    @default("pending_approval")
  created_by_id    Int
  approved_by_id   Int?
  approved_at      DateTime?
  rejection_reason String?  // Matches Payment model

  created_by   User  @relation("CreditNoteCreator", fields: [created_by_id], references: [id])
  approved_by  User? @relation("CreditNoteApprover", fields: [approved_by_id], references: [id])
}

// AdvancePayment follows same pattern
model AdvancePayment {
  status           String    @default("pending_approval")
  created_by_id    Int?
  approved_by_id   Int?
  approved_at      DateTime?
  rejection_reason String?  // Matches Payment model

  created_by   User? @relation("AdvancePaymentCreator", fields: [created_by_id], references: [id])
  approved_by  User? @relation("AdvancePaymentApprover", fields: [approved_by_id], references: [id])
}
```

## Index Strategy

### Query Patterns Optimized

1. **Filter by Status**: `WHERE status = 'pending_approval'`
   - Index: `idx_credit_notes_status`, `idx_advance_payments_status`

2. **Find by Approver**: `WHERE approved_by_id = ?`
   - Index: `idx_credit_notes_approved_by`, `idx_advance_payments_approved_by`

3. **Active Records (Not Deleted)**: `WHERE deleted_at IS NULL`
   - Index: `idx_advance_payments_deleted`

4. **Composite Queries**: `WHERE status = 'approved' AND deleted_at IS NULL`
   - Uses both status and deleted_at indexes

### Index Cardinality

| Index                                | Cardinality | Selectivity | Usage                     |
|--------------------------------------|-------------|-------------|---------------------------|
| `idx_credit_notes_status`            | Low (3)     | High        | Workflow filtering        |
| `idx_credit_notes_approved_by`       | Medium      | Medium      | Auditing, reporting       |
| `idx_advance_payments_status`        | Low (3)     | High        | Workflow filtering        |
| `idx_advance_payments_approved_by`   | Medium      | Medium      | Auditing, reporting       |
| `idx_advance_payments_deleted`       | Very Low (2)| Very High   | Active/deleted filtering  |

## Migration Safety

### No-Regression Guarantees

1. **Existing Records**: All auto-approved with `status = 'approved'`
2. **No Data Loss**: All new columns are nullable (except status with default)
3. **Backward Compatible**: Existing queries work with `WHERE deleted_at IS NULL`
4. **Foreign Keys**: RESTRICT prevents cascade deletion issues
5. **Indexes**: Improve query performance without breaking existing queries

### Data Migration Strategy

```sql
-- CreditNote: Set existing records to approved
UPDATE credit_notes
SET status = 'approved', approved_at = created_at
WHERE deleted_at IS NULL;

-- AdvancePayment: Set existing records to approved
UPDATE advance_payments
SET status = 'approved', approved_at = created_at;
```

## Legend

- `✨ NEW`: Newly added field or relation
- `PK`: Primary Key
- `FK`: Foreign Key
- `@default()`: Default value
- `?`: Nullable field
- `@unique`: Unique constraint
- `[]`: One-to-Many relation
