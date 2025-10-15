# Sprint 7 Database Schema Diagram

## New Tables & Relations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SPRINT 7: NEW TABLES                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐          ┌─────────────────────────┐
│      User (existing)    │          │   Invoice (existing)    │
├─────────────────────────┤          ├─────────────────────────┤
│ • id (PK)               │          │ • id (PK)               │
│ • email                 │          │ • invoice_number        │
│ • full_name             │          │ • vendor_id             │
│ • role                  │          │ • invoice_amount        │
│ • ...                   │          │ • status                │
└─────────────────────────┘          │ • ...                   │
         │                           └─────────────────────────┘
         │                                      │
         │                                      │
         │                                      │
         ├──────────────────────────────────────┼─────────────────────┐
         │                                      │                     │
         │                                      │                     │
         ▼                                      ▼                     ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│     InvoiceComment (NEW)            │  │      ActivityLog (NEW)              │
├─────────────────────────────────────┤  ├─────────────────────────────────────┤
│ • id (PK)                           │  │ • id (PK)                           │
│ • invoice_id (FK → Invoice)         │  │ • invoice_id (FK → Invoice)         │
│ • user_id (FK → User "author")      │  │ • user_id (FK → User, nullable)     │
│ • content (TEXT, Markdown)          │  │ • action (TEXT, enum)               │
│ • is_edited (BOOLEAN)               │  │ • old_data (TEXT, JSON, nullable)   │
│ • created_at (DATETIME)             │  │ • new_data (TEXT, JSON, nullable)   │
│ • updated_at (DATETIME)             │  │ • ip_address (TEXT, nullable)       │
│ • deleted_at (DATETIME, nullable)   │  │ • user_agent (TEXT, nullable)       │
│ • deleted_by (FK → User, nullable)  │  │ • created_at (DATETIME)             │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
```

---

## Relationship Details

### User ↔ InvoiceComment (3 Relations)

```
User.comments (1:N)
├─ Relation: "CommentAuthor"
├─ Description: User who created the comment
├─ onDelete: Restrict
└─ Why Restrict: Preserve comments when user deleted, show "[Deleted User]"

User.deleted_comments (1:N)
├─ Relation: "CommentDeleter"
├─ Description: User who soft-deleted the comment
├─ onDelete: Restrict
└─ Why Restrict: Preserve audit trail of who deleted

InvoiceComment.author (N:1)
├─ Relation: "CommentAuthor"
├─ Description: Author of this comment
├─ onDelete: Restrict
└─ Foreign Key: user_id → users.id

InvoiceComment.deleter (N:1)
├─ Relation: "CommentDeleter"
├─ Description: User who deleted this comment (nullable)
├─ onDelete: Restrict
└─ Foreign Key: deleted_by → users.id
```

### Invoice ↔ InvoiceComment (1 Relation)

```
Invoice.comments (1:N)
├─ Description: All comments on this invoice
├─ onDelete: Cascade
└─ Why Cascade: Delete comments when invoice deleted

InvoiceComment.invoice (N:1)
├─ Description: Invoice this comment belongs to
├─ onDelete: Cascade
└─ Foreign Key: invoice_id → invoices.id
```

### User ↔ ActivityLog (1 Relation)

```
User.activity_logs (1:N)
├─ Relation: "ActivityLogger"
├─ Description: All actions performed by this user
├─ onDelete: SetNull
└─ Why SetNull: Preserve logs when user deleted, lose user reference

ActivityLog.user (N:1)
├─ Relation: "ActivityLogger"
├─ Description: User who performed this action (nullable)
├─ onDelete: SetNull
└─ Foreign Key: user_id → users.id (nullable)
```

### Invoice ↔ ActivityLog (1 Relation)

```
Invoice.activity_logs (1:N)
├─ Description: All activity entries for this invoice
├─ onDelete: Cascade
└─ Why Cascade: Delete activity logs when invoice deleted

ActivityLog.invoice (N:1)
├─ Description: Invoice this activity entry belongs to
├─ onDelete: Cascade
└─ Foreign Key: invoice_id → invoices.id
```

---

## Index Strategy

### InvoiceComment Indexes (3)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_comments_invoice_active                             │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Composite Index                                               │
│ Columns: (invoice_id, deleted_at)                                   │
│ Purpose: Fast queries for active comments on specific invoice       │
│ Query Pattern: WHERE invoice_id = ? AND deleted_at IS NULL          │
│ Usage Frequency: Very High (every invoice detail view)              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_comments_author                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Single Column Index                                           │
│ Columns: (user_id)                                                  │
│ Purpose: Fast queries for all comments by specific user             │
│ Query Pattern: WHERE user_id = ?                                    │
│ Usage Frequency: Medium (user profile, admin views)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_comments_time                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Single Column Index                                           │
│ Columns: (created_at)                                               │
│ Purpose: Chronological sorting of all comments                      │
│ Query Pattern: ORDER BY created_at DESC                             │
│ Usage Frequency: Low (admin reports, analytics)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ActivityLog Indexes (4)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_activity_invoice_time                               │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Composite Index                                               │
│ Columns: (invoice_id, created_at)                                   │
│ Purpose: Fast queries for activity log sorted by time               │
│ Query Pattern: WHERE invoice_id = ? ORDER BY created_at DESC        │
│ Usage Frequency: Very High (every invoice detail view)              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_activity_user                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Single Column Index                                           │
│ Columns: (user_id)                                                  │
│ Purpose: Fast queries for all actions by specific user              │
│ Query Pattern: WHERE user_id = ?                                    │
│ Usage Frequency: Medium (user activity reports, admin views)        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_activity_action                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Single Column Index                                           │
│ Columns: (action)                                                   │
│ Purpose: Fast queries filtering by action type                      │
│ Query Pattern: WHERE action = 'invoice_approved'                    │
│ Usage Frequency: Medium (filtered activity views, reports)          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Index Name: idx_activity_time                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Single Column Index                                           │
│ Columns: (created_at)                                               │
│ Purpose: Fast queries for recent activity across all invoices       │
│ Query Pattern: ORDER BY created_at DESC LIMIT 50                    │
│ Usage Frequency: High (dashboard, global activity feed)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: User Adds Comment

```
1. User submits comment form
   ├─ Input: invoice_id, user_id, content (Markdown)
   └─ Validation: content 1-5000 chars, Markdown sanitized

2. Server creates InvoiceComment record
   ├─ INSERT INTO invoice_comments (invoice_id, user_id, content, ...)
   └─ Returns: comment.id

3. Server creates ActivityLog record
   ├─ INSERT INTO activity_logs (invoice_id, user_id, action, ...)
   ├─ action: 'comment_added'
   └─ new_data: { comment_id: X, content_preview: "First 50 chars..." }

4. UI updates optimistically
   └─ Comment appears in list immediately
```

### Example 2: Admin Approves Invoice

```
1. Admin clicks "Approve" button
   └─ Input: invoice_id

2. Server updates Invoice record
   ├─ UPDATE invoices SET status = 'unpaid', ...
   └─ Transaction starts

3. Server creates ActivityLog record
   ├─ INSERT INTO activity_logs (invoice_id, user_id, action, ...)
   ├─ action: 'invoice_approved'
   ├─ old_data: { status: 'pending_approval' }
   └─ new_data: { status: 'unpaid' }

4. Transaction commits
   └─ Both invoice update and activity log created atomically

5. UI updates
   ├─ Invoice status changes to "Unpaid"
   └─ Activity log shows "Admin approved invoice"
```

### Example 3: User Soft-Deletes Comment

```
1. User clicks "Delete" on own comment
   └─ Confirmation dialog shown

2. Server updates InvoiceComment record
   ├─ UPDATE invoice_comments SET deleted_at = NOW(), deleted_by = ?
   └─ Soft delete (record preserved)

3. Server creates ActivityLog record
   ├─ INSERT INTO activity_logs (invoice_id, user_id, action, ...)
   ├─ action: 'comment_deleted'
   └─ old_data: { comment_id: X, content_preview: "..." }

4. UI updates
   ├─ Comment disappears from list
   └─ Activity log shows "User deleted a comment"
```

---

## Query Patterns

### Common Queries for InvoiceComment

```sql
-- 1. Get active comments for invoice (most common)
SELECT * FROM invoice_comments
WHERE invoice_id = ?
  AND deleted_at IS NULL
ORDER BY created_at ASC;
-- Uses: idx_comments_invoice_active

-- 2. Get all comments by user
SELECT * FROM invoice_comments
WHERE user_id = ?
  AND deleted_at IS NULL
ORDER BY created_at DESC;
-- Uses: idx_comments_author

-- 3. Get comment with author details
SELECT c.*, u.full_name AS author_name
FROM invoice_comments c
JOIN users u ON c.user_id = u.id
WHERE c.id = ?;
-- Uses: Primary key index

-- 4. Count active comments for invoice
SELECT COUNT(*) FROM invoice_comments
WHERE invoice_id = ?
  AND deleted_at IS NULL;
-- Uses: idx_comments_invoice_active

-- 5. Get recently deleted comments (admin view)
SELECT c.*, u.full_name AS deleter_name
FROM invoice_comments c
LEFT JOIN users u ON c.deleted_by = u.id
WHERE c.deleted_at IS NOT NULL
ORDER BY c.deleted_at DESC
LIMIT 50;
-- Uses: idx_comments_time
```

### Common Queries for ActivityLog

```sql
-- 1. Get activity log for invoice (most common)
SELECT * FROM activity_logs
WHERE invoice_id = ?
ORDER BY created_at DESC
LIMIT 50;
-- Uses: idx_activity_invoice_time

-- 2. Get all actions by user
SELECT * FROM activity_logs
WHERE user_id = ?
ORDER BY created_at DESC;
-- Uses: idx_activity_user

-- 3. Get all approvals across invoices
SELECT * FROM activity_logs
WHERE action = 'invoice_approved'
ORDER BY created_at DESC
LIMIT 100;
-- Uses: idx_activity_action

-- 4. Get recent activity (global feed)
SELECT a.*, i.invoice_number, u.full_name AS user_name
FROM activity_logs a
JOIN invoices i ON a.invoice_id = i.id
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 50;
-- Uses: idx_activity_time

-- 5. Get activity for invoice filtered by action
SELECT * FROM activity_logs
WHERE invoice_id = ?
  AND action IN ('invoice_approved', 'invoice_rejected')
ORDER BY created_at DESC;
-- Uses: idx_activity_invoice_time (composite index covers both columns)
```

---

## Performance Characteristics

### InvoiceComment Table

```
┌──────────────────────────────────────────────────────────────┐
│ Expected Data Volume                                         │
├──────────────────────────────────────────────────────────────┤
│ Average comments per invoice: 3                              │
│ Invoices per month: 1,000                                    │
│ Comments per month: 3,000                                    │
│ Comments per year: 36,000                                    │
│ Storage per comment: ~500 bytes                              │
│ Storage per year: ~18 MB                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Query Performance (Expected)                                 │
├──────────────────────────────────────────────────────────────┤
│ Get active comments (100 comments): <50ms                    │
│ Get all comments by user (500 comments): <100ms              │
│ Count comments for invoice: <10ms                            │
│ Insert new comment: <5ms                                     │
│ Soft delete comment: <5ms                                    │
└──────────────────────────────────────────────────────────────┘
```

### ActivityLog Table

```
┌──────────────────────────────────────────────────────────────┐
│ Expected Data Volume                                         │
├──────────────────────────────────────────────────────────────┤
│ Average log entries per invoice: 10                          │
│ Invoices per month: 1,000                                    │
│ Log entries per month: 10,000                                │
│ Log entries per year: 120,000                                │
│ Storage per entry: ~300 bytes                                │
│ Storage per year: ~36 MB                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Query Performance (Expected)                                 │
├──────────────────────────────────────────────────────────────┤
│ Get activity log (1000 entries): <100ms                      │
│ Filter by action (10k entries): <200ms                       │
│ Get all actions by user (5k entries): <150ms                 │
│ Recent activity (50k entries): <500ms                        │
│ Insert new log entry: <5ms                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Scaling Considerations

### When to Archive (Future)

```
┌────────────────────────────────────────────────────────────────────┐
│ Archive ActivityLog when ANY of these conditions met:              │
├────────────────────────────────────────────────────────────────────┤
│ • Table size > 1 million rows                                      │
│ • Query time > 2 seconds for filtered queries                      │
│ • Database size > 1 GB                                             │
│ • Disk I/O becomes bottleneck                                      │
└────────────────────────────────────────────────────────────────────┘

Archive Strategy:
1. Create archive table: activity_logs_archive
2. Move entries older than 1 year: INSERT INTO ... SELECT ... WHERE ...
3. Delete from main table: DELETE FROM activity_logs WHERE ...
4. Run VACUUM to reclaim space
5. Schedule as monthly cron job

Expected Timeline:
- Year 1: ~120k entries (no archive needed)
- Year 2: ~240k entries (no archive needed)
- Year 3: ~360k entries (no archive needed)
- Year 5: ~600k entries (consider archive)
- Year 10: ~1.2M entries (archive recommended)
```

---

## Summary

### Key Design Decisions

1. **Soft Delete for Comments** (deleted_at, deleted_by)
   - ✅ Preserves audit trail
   - ✅ Can show "X deleted comments" in admin views
   - ✅ Allows "restore" feature in future

2. **Immutable Activity Log** (no updated_at field)
   - ✅ Guarantees audit integrity
   - ✅ Simplifies queries (no UPDATE or DELETE operations)
   - ✅ Prevents tampering

3. **Composite Indexes** ((invoice_id, deleted_at), (invoice_id, created_at))
   - ✅ Optimizes most common query patterns
   - ✅ Covers multiple WHERE/ORDER BY clauses
   - ✅ Reduces need for separate indexes

4. **Cascade vs Restrict** (onDelete behaviors)
   - ✅ Cascade: Invoice deleted → comments/logs deleted (acceptable loss)
   - ✅ Restrict: User deleted → preserve comments/logs (show "[Deleted User]")
   - ✅ SetNull: User deleted → preserve activity logs with NULL user_id

5. **JSON Storage** (old_data, new_data as TEXT)
   - ✅ SQLite has no native JSON type
   - ✅ Application-layer validation with Zod
   - ✅ Flexible schema (can store any fields)
   - ⚠️ No database-level JSON validation

---

**Diagram Version**: 1.0
**Last Updated**: 2025-10-16
**Source**: Sprint 7 Migration Schema Design
