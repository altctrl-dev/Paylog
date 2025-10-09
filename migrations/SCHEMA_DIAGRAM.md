# Database Schema Diagram - Phase 1 Clarified Features

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USERS                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ PK  id                    BIGINT                                        │
│     email                 VARCHAR(255) UNIQUE                           │
│     full_name             VARCHAR(255)                                  │
│     role                  ENUM('standard_user', 'admin', 'super_admin') │
│     is_active             BOOLEAN DEFAULT true                          │
│     created_at            TIMESTAMP                                     │
│     updated_at            TIMESTAMP                                     │
└─────────────────────────────────────────────────────────────────────────┘
                    │         │         │         │         │
                    │         │         │         │         │
         ┌──────────┘         │         │         │         └──────────┐
         │                    │         │         │                    │
         │ created_by         │         │         │ granted_by        │
         ▼                    │         │         │                    ▼
┌──────────────────┐          │         │         │       ┌─────────────────────────┐
│    INVOICES      │          │         │         │       │ USER_PROFILE_VISIBILITY │
├──────────────────┤          │         │         │       ├─────────────────────────┤
│ PK  id           │          │         │         │       │ PK  id                  │
│     invoice_no   │◄─────────┘         │         │       │ FK  user_id             │
│ FK  vendor_id    │ hold_by            │         │       │ FK  profile_id          │
│ FK  category_id  │                    │         │       │ FK  granted_by          │
│ FK  profile_id   │                    │         │       │     granted_at          │
│     amount       │                    │         │       └─────────────────────────┘
│     invoice_date │                    │         │                    │
│     due_date     │                    │         │                    │
│                  │                    │         │                    │
│ *** STATUS ***   │                    │         │                    │
│     status ──────┼───┐                │         │                    │
│                  │   │                │         │                    │
│ *** ON HOLD ***  │   │                │         │                    │
│     hold_reason  │   │                │         │                    │
│ FK  hold_by      │───┘                │         │                    │
│     hold_at      │                    │         │                    │
│                  │                    │         │                    │
│ *** RESUBMIT *** │                    │         │                    │
│     sub_count    │                    │         │                    │
│     last_sub_at  │                    │         │                    │
│                  │                    │         │                    │
│ *** REJECT ***   │                    │         │                    │
│     reject_rsn   │◄───────────────────┘         │                    │
│ FK  rejected_by  │ rejected_by                  │                    │
│     rejected_at  │                              │                    │
│                  │                              │                    │
│ *** HIDDEN ***   │                              │                    │
│     is_hidden    │◄─────────────────────────────┘                    │
│ FK  hidden_by    │ hidden_by                                         │
│     hidden_at    │                                                   │
│     hidden_rsn   │                                                   │
│                  │                                                   │
│ FK  created_by   │                                                   │
│     created_at   │                                                   │
│     updated_at   │                                                   │
└──────────────────┘                                                   │
         │                                                             │
         │                                                             │
         │ invoice_id                                                  │
         ▼                                                             ▼
┌──────────────────┐                                        ┌────────────────────┐
│    PAYMENTS      │                                        │  INVOICE_PROFILES  │
├──────────────────┤                                        ├────────────────────┤
│ PK  id           │                                        │ PK  id             │
│ FK  invoice_id   │                                        │     name           │
│     amount_paid  │                                        │     description    │
│     payment_date │                                        │ *** VISIBILITY *** │
│     payment_mthd │                                        │     visible_to_all │
│     status       │                                        │     created_at     │
│     created_at   │                                        │     updated_at     │
│     updated_at   │                                        └────────────────────┘
└──────────────────┘                                                   │
                                                                       │ profile_id
                                                                       │
                                                                       ▼
                                                          ┌─────────────────────────┐
                                                          │ USER_PROFILE_VISIBILITY │
                                                          │  (junction table)       │
                                                          └─────────────────────────┘


┌──────────────────┐                    ┌──────────────────┐
│     VENDORS      │                    │   CATEGORIES     │
├──────────────────┤                    ├──────────────────┤
│ PK  id           │                    │ PK  id           │
│     name         │                    │     name         │
│     is_active    │                    │     is_active    │
│     created_at   │                    │     created_at   │
│     updated_at   │                    │     updated_at   │
└──────────────────┘                    └──────────────────┘
         │                                       │
         │ vendor_id                             │ category_id
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   INVOICES   │
                      └──────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      ARCHIVE_REQUESTS                           │
├─────────────────────────────────────────────────────────────────┤
│ PK  id                 BIGINT                                   │
│     entity_type        ENUM('vendor', 'category', 'sub_entity', │
│                             'profile')                          │
│     entity_id          BIGINT (polymorphic reference)           │
│ FK  requested_by       BIGINT → users(id)                       │
│ FK  reviewed_by        BIGINT → users(id) NULLABLE              │
│     status             ENUM('pending', 'approved', 'rejected')  │
│     reason             TEXT                                     │
│     rejection_reason   TEXT NULLABLE                            │
│     requested_at       TIMESTAMP                                │
│     reviewed_at        TIMESTAMP NULLABLE                       │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ requested_by, reviewed_by
                             ▼
                      ┌──────────────┐
                      │    USERS     │
                      └──────────────┘
```

## Cardinality Legend

- `│` - One-to-Many relationship (vertical line from parent to child)
- `◄─` - Foreign key reference (arrow points to referenced table)
- `PK` - Primary Key
- `FK` - Foreign Key
- `UNIQUE` - Unique constraint
- `ENUM` - Enumerated type

## Relationships Detail

### Users Table
**Outgoing Relationships:**
1. **One-to-Many** with `invoices.created_by` - User creates many invoices
2. **One-to-Many** with `invoices.hold_by` - User (admin) can hold many invoices
3. **One-to-Many** with `invoices.hidden_by` - User (admin) can hide many invoices
4. **One-to-Many** with `invoices.rejected_by` - User (admin) can reject many invoices
5. **One-to-Many** with `user_profile_visibility.user_id` - User has access to many profiles
6. **One-to-Many** with `user_profile_visibility.granted_by` - User (admin) grants access to many profiles
7. **One-to-Many** with `archive_requests.requested_by` - User requests many archives
8. **One-to-Many** with `archive_requests.reviewed_by` - User (admin) reviews many archive requests

### Invoices Table
**Incoming Relationships:**
1. `created_by` → `users.id` (RESTRICT on delete)
2. `hold_by` → `users.id` (RESTRICT on delete) *[Phase 1]*
3. `hidden_by` → `users.id` (RESTRICT on delete) *[Phase 1]*
4. `rejected_by` → `users.id` (RESTRICT on delete)
5. `vendor_id` → `vendors.id` (SET NULL on delete)
6. `category_id` → `categories.id` (SET NULL on delete)
7. `profile_id` → `invoice_profiles.id` (SET NULL on delete)

**Outgoing Relationships:**
1. **One-to-Many** with `payments` - Invoice has many payments

### InvoiceProfiles Table
**Incoming Relationships:**
1. `profile_id` referenced by `invoices.profile_id`

**Outgoing Relationships:**
1. **One-to-Many** with `user_profile_visibility` - Profile can be granted to many users *[Phase 1]*

### UserProfileVisibility (Junction Table) *[Phase 1]*
**Type:** Many-to-Many resolver between Users and InvoiceProfiles

**Incoming Relationships:**
1. `user_id` → `users.id` (CASCADE on delete)
2. `profile_id` → `invoice_profiles.id` (CASCADE on delete)
3. `granted_by` → `users.id` (RESTRICT on delete)

**Constraints:**
- `UNIQUE(user_id, profile_id)` - User can be granted access to each profile only once

### ArchiveRequests Table *[Phase 1]*
**Purpose:** Polymorphic reference to archivable entities (vendors, categories, sub_entities, profiles)

**Incoming Relationships:**
1. `requested_by` → `users.id` (RESTRICT on delete)
2. `reviewed_by` → `users.id` (RESTRICT on delete)

**Polymorphic Reference:**
- `entity_type` + `entity_id` together reference different tables based on type:
  - `vendor` → `vendors.id`
  - `category` → `categories.id`
  - `sub_entity` → `sub_entities.id`
  - `profile` → `invoice_profiles.id`

## State Machine Diagrams

### Invoice Status State Machine

```
┌─────────────────────┐
│  pending_approval   │ ◄─────────┐
└──────────┬──────────┘           │
           │                      │
           │ (admin action)       │ (admin action)
           ▼                      │ clarified & ready
    ┌──────────────┐              │
    │   on_hold    │ ─────────────┘
    └──────┬───────┘
           │
           │ (admin action)
           │ clarified & approved
           ▼
    ┌──────────────┐
    │   unpaid     │
    └──────┬───────┘
           │
           │ (payment received)
           ▼
    ┌──────────────┐
    │   partial    │
    └──────┬───────┘
           │
           │ (full payment)
           ▼
    ┌──────────────┐
    │     paid     │
    └──────────────┘

         OR

┌─────────────────────┐
│  pending_approval   │
└──────────┬──────────┘
           │
           │ (admin action: reject)
           ▼
    ┌──────────────┐
    │   rejected   │
    └──────┬───────┘
           │
           │ (user resubmits, count++)
           ▼
┌─────────────────────┐
│  pending_approval   │ (if submission_count <= 3)
└─────────────────────┘

    OR auto-reject if submission_count > 3
```

### Resubmission Counter Logic

```
submission_count = 1 (initial submission)
         │
         ▼
    [ REJECTED ]
         │
         │ (user resubmits)
         ▼
submission_count = 2
         │
         ▼
    [ REJECTED ]
         │
         │ (user resubmits)
         ▼
submission_count = 3
         │
         ▼
    [ REJECTED ]
         │
         │ (user resubmits)
         ▼
submission_count = 4
         │
         ▼
  [ AUTO-REJECTED ]
  (trigger blocks resubmission)
```

### Archive Request Workflow

```
┌─────────┐
│ PENDING │ (user creates request)
└────┬────┘
     │
     │ (admin reviews)
     ├──────────┬──────────┐
     ▼          ▼          ▼
┌─────────┐  ┌──────┐  ┌──────────┐
│APPROVED │  │REJECT│  │ (timeout)│
└─────────┘  └──────┘  └──────────┘
     │
     │ (entity marked is_active=false)
     ▼
[ ENTITY ARCHIVED ]
```

## Index Strategy

### High-Performance Query Indexes

1. **Invoice Queries**
   - `idx_invoices_status` - Filter by status (most common query)
   - `idx_invoices_on_hold` - Partial index for on-hold invoices only
   - `idx_invoices_hidden` - Filter hidden invoices
   - `idx_invoices_active` - Partial index for active (non-hidden) invoices
   - `idx_invoices_submission_count` - Find resubmitted invoices

2. **User Queries**
   - `idx_users_super_admin` - Partial index for active super admins
   - `idx_users_role_active` - Composite for role-based access control

3. **Profile Visibility**
   - `idx_user_profile_visibility_user` - Fast lookup: "What profiles can this user see?"
   - `idx_user_profile_visibility_profile` - Fast lookup: "Who can see this profile?"
   - `idx_user_profile_visibility_granted_by` - Audit: "Who granted what access?"

4. **Archive Requests**
   - `idx_archive_requests_status` - Filter pending/approved/rejected
   - `idx_archive_requests_entity` - Find all requests for specific entity
   - `idx_archive_requests_pending` - Partial index for admin queue (pending only, sorted by date)

5. **Payment Queries**
   - `idx_payments_invoice` - Find all payments for an invoice
   - `idx_payments_status` - Filter by payment status
   - `idx_payments_date` - KPI calculations (paid this month)

## Constraints Summary

### Check Constraints
1. `invoices_status_check` - Valid invoice statuses including `on_hold`
2. `users_role_check` - Valid user roles including `super_admin`
3. `archive_requests_entity_type_check` - Valid entity types
4. `archive_requests_status_check` - Valid request statuses
5. `archive_requests_rejection_reason_required` - Rejection requires reason
6. `archive_requests_reviewed_fields_consistency` - Reviewed status requires reviewer + timestamp

### Unique Constraints
1. `users.email` - One account per email
2. `invoices.invoice_number` - Unique invoice numbers
3. `user_profile_visibility(user_id, profile_id)` - User granted access to profile only once

### Foreign Key Constraints
**ON DELETE RESTRICT** (prevent deletion if referenced):
- `invoices.created_by` → `users.id`
- `invoices.hold_by` → `users.id`
- `invoices.hidden_by` → `users.id`
- `invoices.rejected_by` → `users.id`
- `user_profile_visibility.granted_by` → `users.id`
- `archive_requests.requested_by` → `users.id`
- `archive_requests.reviewed_by` → `users.id`

**ON DELETE CASCADE** (delete related records):
- `user_profile_visibility.user_id` → `users.id`
- `user_profile_visibility.profile_id` → `invoice_profiles.id`
- `payments.invoice_id` → `invoices.id`

**ON DELETE SET NULL** (clear reference):
- `invoices.vendor_id` → `vendors.id`
- `invoices.category_id` → `categories.id`
- `invoices.profile_id` → `invoice_profiles.id`

## Trigger Functions

### 1. increment_submission_count()
**Fires:** BEFORE UPDATE on `invoices`
**Condition:** Status changes from `rejected` to `pending_approval`
**Actions:**
1. Increment `submission_count`
2. Update `last_submission_at`
3. If `submission_count > 3`: Auto-reject and block resubmission

### 2. prevent_last_superadmin_deactivation()
**Fires:** BEFORE UPDATE on `users`
**Condition:** Attempting to deactivate a `super_admin`
**Actions:**
1. Count remaining active super admins
2. If count = 0: Raise exception and block deactivation
3. If count >= 1: Allow deactivation

## Views

### dashboard_kpis
**Purpose:** Real-time KPI calculations for dashboard
**Columns:**
1. `total_due` - Outstanding balance + pending approval amounts (excludes hidden)
2. `paid_this_month` - Sum of approved payments in current month
3. `pending_count` - Count of invoices awaiting action (pending/on_hold/unpaid/partial, excludes hidden)
4. `avg_processing_days` - Average days from invoice creation to first payment (last 90 days)

**Performance:** Uses optimized subqueries with indexes, typically <50ms for 10K invoices

---

**Version:** 001_phase1_clarified_features
**Last Updated:** 2025-10-08
**Author:** Database Modeler (DBM)
