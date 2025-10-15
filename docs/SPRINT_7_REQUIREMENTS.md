# Sprint 7: Advanced Invoice Features - Requirements Document

**Status**: Ready for Implementation
**Story Points**: 14 SP
**Generated**: 2025-10-16
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Feature 1: Bulk Operations](#feature-1-bulk-operations)
3. [Feature 2: Invoice Comments](#feature-2-invoice-comments)
4. [Feature 3: Activity Log](#feature-3-activity-log)
5. [Database Schema Changes](#database-schema-changes)
6. [API Contracts](#api-contracts)
7. [Testing Requirements](#testing-requirements)
8. [Performance Requirements](#performance-requirements)
9. [Security Requirements](#security-requirements)

---

## Overview

### Objective

Sprint 7 implements three Phase 1 advanced features that enhance invoice workflow efficiency and auditability:

1. **Bulk Operations**: Enable admins to perform actions on multiple invoices simultaneously
2. **Invoice Comments**: Add threaded discussion capability for invoice collaboration
3. **Activity Log**: Provide comprehensive audit trail of all invoice changes

### Confirmed Design Decisions

These decisions were confirmed with the user and form the foundation of this requirements document:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bulk Operations Limit | No hard limit (Option C) | Rely on browser/server performance, show loading indicators |
| Comment Deletion | Hybrid permissions | Standard users delete own comments, admins delete any comment |
| Activity Log Retention | Keep forever (Option A) | Full audit trail, optimize with indexing |
| CSV Export Columns | User selects columns (Option C) | Show column picker UI with presets |
| Markdown Support | Basic only (Option A) | Bold, italic, lists, links only. No code blocks or embeds |
| Bulk Failures | Pre-validation (Option C) | Check all invoices before executing, block if any fail |

### User Roles Reference

From `schema.prisma`:
- **standard_user**: Can create/edit own invoices, add comments
- **admin**: Can approve/reject/hold invoices, bulk operations, delete any comment
- **super_admin**: All admin permissions + user management

---

## Feature 1: Bulk Operations

### User Stories

#### Story 1.1: Bulk Selection
**As an** admin
**I want** to select multiple invoices from the list
**So that** I can perform actions on them efficiently

**Acceptance Criteria**:
- ✅ MUST HAVE: Checkbox appears in first column of invoice list table
- ✅ MUST HAVE: "Select All" checkbox in table header selects all invoices on current page
- ✅ MUST HAVE: "Select All [N] Invoices" button above table selects all invoices across all pages
- ✅ MUST HAVE: Selection persists when changing pages (stored in component state)
- ✅ MUST HAVE: Selection count badge shows "[N] selected" above table
- ✅ MUST HAVE: "Clear Selection" button visible when items selected
- ✅ MUST HAVE: Selected rows highlighted with background color (e.g., `bg-accent/50`)

**Edge Cases**:
- Empty list: No checkboxes shown, no selection UI visible
- Single item on page: "Select All" checkbox works correctly
- Filtering applied: Selection persists only for items matching current filters
- User deselects "Select All" header: All items on page deselected
- User manually selects all items on page: "Select All" checkbox becomes checked

**Negative Test Cases**:
- Selecting 0 items: Bulk action buttons disabled
- Selecting items then filtering: Selection cleared when filters change
- Selecting items then sorting: Selection persists (items remain selected)

#### Story 1.2: Bulk Approve
**As an** admin
**I want** to approve multiple pending invoices at once
**So that** I can process approval queue faster

**Acceptance Criteria**:
- ✅ MUST HAVE: "Bulk Approve" button visible when items selected (only for admins)
- ✅ MUST HAVE: Button only enabled if all selected invoices have `status = 'pending_approval'`
- ✅ MUST HAVE: Clicking button shows confirmation dialog (Level 3 panel, 500px)
- ✅ MUST HAVE: Dialog shows list of invoice numbers to be approved (max 10 visible, scrollable)
- ✅ MUST HAVE: Dialog shows pre-validation warnings (e.g., "2 invoices cannot be approved: INV-001 (already paid), INV-002 (on hold)")
- ✅ MUST HAVE: If any invoice would fail validation, block operation and show error details
- ✅ MUST HAVE: On confirm, all invoices updated to `status = 'unpaid'` in single transaction
- ✅ MUST HAVE: Loading indicator shown during operation ("Approving [N] invoices...")
- ✅ MUST HAVE: Success toast: "Successfully approved [N] invoices"
- ✅ MUST HAVE: Activity log entry created for each approved invoice
- ✅ MUST HAVE: Email notifications NOT sent (bulk operations skip email to avoid spam)
- 🔄 SHOULD HAVE: Optimistic update (invoices immediately disappear from pending list)
- 🔄 SHOULD HAVE: Error recovery: If operation fails, revert optimistic update and show error

**Given/When/Then**:

**Scenario 1: Successful bulk approve**
```gherkin
Given I am logged in as admin
And I navigate to Invoices page
And there are 5 invoices with status "pending_approval"
When I select all 5 invoices
And I click "Bulk Approve"
And I confirm the operation
Then all 5 invoices change status to "unpaid"
And I see toast "Successfully approved 5 invoices"
And activity log entries created for all 5 invoices
```

**Scenario 2: Pre-validation blocks operation**
```gherkin
Given I am logged in as admin
And I select 3 invoices: INV-001 (pending_approval), INV-002 (on_hold), INV-003 (pending_approval)
When I click "Bulk Approve"
Then I see pre-validation error dialog
And dialog shows "1 invoice cannot be approved: INV-002 (status: on_hold)"
And "Confirm" button is disabled
And I can click "Cancel" to return
```

**Scenario 3: Mixed status selection**
```gherkin
Given I select invoices with mixed statuses (pending, paid, rejected)
When I look at the bulk action bar
Then "Bulk Approve" button is disabled
And tooltip shows "Can only approve invoices with status: Pending Approval"
```

**Edge Cases**:
- Select 100+ invoices: Operation may take >5 seconds, show progress indicator
- Network failure mid-operation: Show error, allow retry with same selection
- User navigates away during operation: Show warning dialog ("Operation in progress, are you sure?")
- Invoice updated by another user during operation: Skip that invoice, log warning in activity log

**Negative Test Cases**:
- Non-admin user: "Bulk Approve" button not visible
- Standard user impersonating admin (via API): Server returns 403 Forbidden
- Selecting paid invoices: Button disabled with tooltip explanation
- Empty selection: Button disabled

#### Story 1.3: Bulk Reject
**As an** admin
**I want** to reject multiple invoices with a single reason
**So that** I can efficiently handle problematic submissions

**Acceptance Criteria**:
- ✅ MUST HAVE: "Bulk Reject" button visible when items selected (only for admins)
- ✅ MUST HAVE: Button only enabled if all selected invoices have `status = 'pending_approval'`
- ✅ MUST HAVE: Clicking button opens rejection panel (Level 3 panel, 500px)
- ✅ MUST HAVE: Panel shows list of invoices to be rejected (scrollable)
- ✅ MUST HAVE: Textarea for rejection reason (min 10 chars, max 500 chars)
- ✅ MUST HAVE: Pre-validation shows warnings (e.g., "1 invoice at max resubmission limit (3)")
- ✅ MUST HAVE: If any invoice would fail validation, block operation
- ✅ MUST HAVE: On confirm, all invoices updated with same rejection reason
- ✅ MUST HAVE: Each invoice gets `submission_count` incremented
- ✅ MUST HAVE: Each invoice gets `rejected_by`, `rejected_at` populated
- ✅ MUST HAVE: Loading indicator during operation
- ✅ MUST HAVE: Success toast: "Successfully rejected [N] invoices"
- ✅ MUST HAVE: Activity log entry created for each rejected invoice
- ✅ MUST HAVE: Email notifications NOT sent (bulk operations skip email)

**Given/When/Then**:

**Scenario 1: Successful bulk reject**
```gherkin
Given I am logged in as admin
And I select 4 invoices with status "pending_approval"
When I click "Bulk Reject"
And I enter rejection reason "Missing required attachments"
And I click "Confirm"
Then all 4 invoices change status to "rejected"
And all 4 have rejection_reason = "Missing required attachments"
And all 4 have submission_count incremented by 1
And I see toast "Successfully rejected 4 invoices"
```

**Scenario 2: Invoice at resubmission limit**
```gherkin
Given I select invoice INV-001 with submission_count = 3
When I click "Bulk Reject"
Then pre-validation shows warning "INV-001 is at max resubmission limit (3/3)"
And "Confirm" button is disabled
And I must deselect INV-001 to proceed
```

**Edge Cases**:
- Rejection reason empty: Submit button disabled
- Rejection reason too short (<10 chars): Validation error shown inline
- Same rejection reason for all invoices: Valid, applied to all
- User closes panel mid-operation: Operation cancelled, no changes made

**Negative Test Cases**:
- Selecting invoices with status != 'pending_approval': Button disabled
- Rejection reason with XSS payload: Sanitized before storage
- Rejection reason with 1000+ chars: Truncated to 500 chars

#### Story 1.4: Bulk Export (CSV)
**As an** admin or standard user
**I want** to export selected invoices to CSV with custom columns
**So that** I can analyze data in Excel or other tools

**Acceptance Criteria**:
- ✅ MUST HAVE: "Bulk Export" button visible when items selected (all roles)
- ✅ MUST HAVE: Button enabled for any selection (no status restriction)
- ✅ MUST HAVE: Clicking button opens column picker dialog (Level 3 panel, 500px)
- ✅ MUST HAVE: Column picker shows checkboxes for all exportable fields (see list below)
- ✅ MUST HAVE: Preset buttons: "Select All", "Standard Fields", "Clear All"
- ✅ MUST HAVE: "Standard Fields" preset selects: invoice_number, vendor_name, invoice_amount, invoice_date, due_date, status
- ✅ MUST HAVE: Last column selection remembered in localStorage (`bulk_export_columns`)
- ✅ MUST HAVE: On confirm, CSV file downloaded with filename `invoices_export_YYYY-MM-DD_HHmmss.csv`
- ✅ MUST HAVE: CSV includes header row with human-readable column names
- ✅ MUST HAVE: CSV data formatted correctly (dates: YYYY-MM-DD, currency: no symbols, just numbers)
- ✅ MUST HAVE: Success toast: "Exported [N] invoices to CSV"
- 🔄 SHOULD HAVE: Column picker shows field descriptions on hover
- 🔄 SHOULD HAVE: Export progress indicator for large selections (>50 invoices)

**Exportable Fields** (checkbox list in column picker):

| Field ID | Label | Description |
|----------|-------|-------------|
| invoice_number | Invoice Number | Unique invoice identifier |
| vendor_name | Vendor Name | Vendor name |
| category_name | Category | Category name |
| profile_name | Invoice Profile | Profile name |
| sub_entity_name | Sub Entity | Division/department name |
| invoice_amount | Invoice Amount | Amount in numbers (no currency symbol) |
| invoice_date | Invoice Date | Date in YYYY-MM-DD format |
| period_start | Period Start | Service period start date |
| period_end | Period End | Service period end date |
| due_date | Due Date | Due date |
| tds_applicable | TDS Applicable | TRUE/FALSE |
| tds_percentage | TDS Percentage | TDS percentage (if applicable) |
| status | Status | Current invoice status |
| submission_count | Submission Count | Number of times submitted |
| hold_reason | Hold Reason | Reason for hold (if applicable) |
| rejection_reason | Rejection Reason | Reason for rejection (if applicable) |
| notes | Notes | Internal notes |
| created_by_name | Created By | User who created invoice |
| created_at | Created At | Creation timestamp |
| updated_at | Updated At | Last update timestamp |
| total_paid | Total Paid | Sum of all payments |
| remaining_balance | Remaining Balance | Amount still unpaid |

**Given/When/Then**:

**Scenario 1: Export with standard fields**
```gherkin
Given I select 10 invoices
When I click "Bulk Export"
And I click "Standard Fields" preset
And I click "Confirm"
Then CSV file downloads with 10 rows + header
And CSV contains 6 columns (standard fields)
And filename is "invoices_export_2025-10-16_143022.csv"
```

**Scenario 2: Custom column selection**
```gherkin
Given I select 5 invoices
When I click "Bulk Export"
And I select only "invoice_number", "vendor_name", "status"
And I click "Confirm"
Then CSV file contains 3 columns + 5 data rows
And next time I open column picker, same 3 columns are pre-selected (remembered)
```

**Edge Cases**:
- No columns selected: "Confirm" button disabled
- Select all 20+ columns: CSV generated successfully (may take 2-3 seconds for 100+ invoices)
- Invoice has NULL values: CSV shows empty cell (not "null" string)
- Invoice notes contain commas: CSV properly escapes with quotes

**Negative Test Cases**:
- Selecting 0 invoices: Button disabled
- CSV generation fails (disk full): Error toast shown, no partial file created
- User cancels download mid-generation: Operation cancelled, no file created

#### Story 1.5: Bulk Delete
**As a** super admin
**I want** to soft-delete multiple invoices
**So that** I can clean up test data or mistakes

**Acceptance Criteria**:
- ✅ MUST HAVE: "Bulk Delete" button visible ONLY for super_admin role
- ✅ MUST HAVE: Button enabled for any selection
- ✅ MUST HAVE: Clicking button opens confirmation dialog with strong warning
- ✅ MUST HAVE: Warning text: "⚠️ You are about to delete [N] invoices. This action cannot be undone. All related payments and attachments will also be deleted."
- ✅ MUST HAVE: Pre-validation shows blockers (e.g., "Cannot delete invoices with status: paid")
- ✅ MUST HAVE: If any invoice would fail validation, block entire operation
- ✅ MUST HAVE: Requires typing "DELETE" in confirmation field to enable submit
- ✅ MUST HAVE: On confirm, invoices cascade deleted (payments, attachments also deleted per schema)
- ✅ MUST HAVE: Loading indicator during operation
- ✅ MUST HAVE: Success toast: "Deleted [N] invoices"
- ✅ MUST HAVE: Activity log entries created before deletion (for audit trail)

**Given/When/Then**:

**Scenario 1: Successful bulk delete**
```gherkin
Given I am logged in as super_admin
And I select 3 draft invoices (status: pending_approval)
When I click "Bulk Delete"
And I see warning dialog
And I type "DELETE" in confirmation field
And I click "Confirm"
Then all 3 invoices are deleted from database
And related payments and attachments are deleted (cascade)
And I see toast "Deleted 3 invoices"
```

**Scenario 2: Cannot delete paid invoices**
```gherkin
Given I select invoices with mixed statuses (draft, paid, rejected)
When I click "Bulk Delete"
Then pre-validation shows error "Cannot delete invoices with status: paid"
And "Confirm" button is disabled
```

**Edge Cases**:
- Deleting invoices with payments: Payments cascade deleted (per schema `onDelete: Cascade`)
- Deleting invoices with attachments: Attachments cascade deleted, physical files remain (cleanup job handles later)
- Network failure during deletion: Operation may be partially complete, show error and list which invoices were deleted

**Negative Test Cases**:
- Non-super_admin user: Button not visible in UI
- Admin role trying via API: Server returns 403 Forbidden
- Confirmation field empty: Submit button disabled
- Confirmation field = "delete" (lowercase): Submit button disabled (must be exact "DELETE")

### Performance Requirements

- ✅ MUST HAVE: Bulk operations complete within 30 seconds for up to 100 invoices
- ✅ MUST HAVE: UI remains responsive during operation (show loading spinner, disable action buttons)
- 🔄 SHOULD HAVE: Batch operations in chunks of 50 invoices (improves perceived performance)
- 🔄 SHOULD HAVE: Progress indicator for operations >50 invoices ("Processing 25/100...")

### Security Requirements

- ✅ MUST HAVE: All bulk operations check user role on server (never trust client)
- ✅ MUST HAVE: RBAC enforced: standard_user cannot access bulk approve/reject/delete
- ✅ MUST HAVE: Pre-validation runs server-side (prevents race conditions)
- ✅ MUST HAVE: All operations use database transactions (all succeed or all fail)
- ✅ MUST HAVE: Activity log entries created for audit trail
- ✅ MUST HAVE: Bulk delete requires super_admin role

### UI/UX Requirements

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Invoices                                          [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│ [3 selected] [Clear Selection]                              │
│ [Bulk Approve] [Bulk Reject] [Bulk Export] [Bulk Delete]    │
├─────────────────────────────────────────────────────────────┤
│ ☐ │ Invoice # │ Vendor    │ Amount  │ Status │ Actions     │
├───┼───────────┼───────────┼─────────┼────────┼─────────────┤
│ ☑ │ INV-001   │ Acme Corp │ $1,000  │ Pending│ [View][Edit]│
│ ☑ │ INV-002   │ XYZ Inc   │ $2,500  │ Pending│ [View][Edit]│
│ ☐ │ INV-003   │ Tech Co   │ $3,200  │ Paid   │ [View]      │
└─────────────────────────────────────────────────────────────┘
```

**Interactions**:
- Click header checkbox: Toggle all on page
- Click row checkbox: Toggle individual row
- Selected rows: Highlighted with `bg-accent/50`
- Hover over disabled button: Tooltip shows reason ("Can only approve pending invoices")

---

## Feature 2: Invoice Comments

### User Stories

#### Story 2.1: Add Comment
**As a** standard user or admin
**I want** to add comments to invoices
**So that** I can communicate with colleagues about invoice details

**Acceptance Criteria**:
- ✅ MUST HAVE: "Comments" section appears at bottom of invoice detail panel (Level 1)
- ✅ MUST HAVE: Comment form shows textarea with placeholder "Add a comment..."
- ✅ MUST HAVE: Textarea supports basic Markdown (bold, italic, lists, links only)
- ✅ MUST HAVE: Markdown toolbar buttons: **Bold**, *Italic*, • List, [Link]
- ✅ MUST HAVE: Preview toggle: "Write" / "Preview" tabs (like GitHub)
- ✅ MUST HAVE: Character counter shows remaining chars (max 2000)
- ✅ MUST HAVE: "Add Comment" button enabled only when text entered (min 1 char)
- ✅ MUST HAVE: On submit, comment saved with `invoice_id`, `user_id`, `created_at`
- ✅ MUST HAVE: Success toast: "Comment added"
- ✅ MUST HAVE: Comment list immediately updates (optimistic update)
- ✅ MUST HAVE: Activity log entry created: "John Doe added a comment"
- 🔄 SHOULD HAVE: Auto-save draft to localStorage every 10 seconds
- 🔄 SHOULD HAVE: Markdown preview sanitizes HTML (prevent XSS)

**Given/When/Then**:

**Scenario 1: Add basic comment**
```gherkin
Given I am viewing invoice detail panel
When I type "Please review vendor details" in comment textarea
And I click "Add Comment"
Then comment appears in list immediately
And comment shows my name, timestamp, and text
And success toast shows "Comment added"
```

**Scenario 2: Add comment with Markdown**
```gherkin
Given I type "**Urgent**: Check [vendor portal](https://vendor.com)"
When I click "Preview" tab
Then I see bold "Urgent" and clickable link
When I click "Add Comment"
Then comment saved with Markdown formatting
And rendered HTML displays correctly in list
```

**Edge Cases**:
- Empty comment: Button disabled
- Comment with only whitespace: Treated as empty, button disabled
- Comment exactly 2000 chars: Accepted
- Comment >2000 chars: Truncated with warning
- Markdown with malicious HTML: Sanitized (e.g., `<script>` tags removed)
- Network failure on submit: Error toast, comment not added, can retry

**Negative Test Cases**:
- XSS payload in comment: Sanitized before rendering (`<script>alert('xss')</script>` → plain text)
- SQL injection in comment: Escaped by Prisma (parameterized queries)
- Very long URLs (>500 chars): Truncated in Markdown preview

#### Story 2.2: View Comments
**As a** user
**I want** to see all comments on an invoice in chronological order
**So that** I can follow the conversation history

**Acceptance Criteria**:
- ✅ MUST HAVE: Comments displayed in chronological order (oldest first)
- ✅ MUST HAVE: Each comment shows:
  - User avatar (initials in circle)
  - User full name
  - Relative timestamp ("2 hours ago", "Yesterday", "Oct 15")
  - Comment text (Markdown rendered)
  - Edit/Delete buttons (if user is comment author or admin)
- ✅ MUST HAVE: Comment count badge shows total comments (e.g., "Comments (3)")
- ✅ MUST HAVE: If no comments, show empty state: "No comments yet. Be the first to comment!"
- ✅ MUST HAVE: Long comments truncated with "Read more" link (expand inline)
- 🔄 SHOULD HAVE: Comments paginated (20 per page) for invoices with many comments
- 🔄 SHOULD HAVE: Unread comment indicator (since last view)

**Given/When/Then**:

**Scenario 1: View comments list**
```gherkin
Given invoice has 5 comments
When I open invoice detail panel
Then I see "Comments (5)" section
And comments displayed oldest-to-newest
And each comment shows author, time, text
```

**Scenario 2: Empty state**
```gherkin
Given invoice has 0 comments
When I scroll to comments section
Then I see "No comments yet. Be the first to comment!"
And comment form is visible
```

**Edge Cases**:
- Invoice with 100+ comments: Paginated (20 per page, "Load More" button)
- Comment with long URL: URL truncated with ellipsis in middle
- Comment added by deleted user: Shows "[Deleted User]" as author
- Timestamps: Show "Just now" (<1 min), "5 minutes ago" (<1 hour), "2 hours ago" (<1 day), "Yesterday", "Oct 15" (older)

**Negative Test Cases**:
- Comment with broken Markdown syntax: Renders as plain text (graceful degradation)
- Comment with 50 consecutive characters (no spaces): Word-break applied to prevent layout overflow

#### Story 2.3: Edit Comment
**As a** comment author
**I want** to edit my own comments
**So that** I can fix typos or update information

**Acceptance Criteria**:
- ✅ MUST HAVE: "Edit" button visible ONLY if current user is comment author
- ✅ MUST HAVE: Clicking "Edit" replaces comment text with textarea (inline editing)
- ✅ MUST HAVE: Textarea pre-filled with original Markdown text
- ✅ MUST HAVE: "Save" and "Cancel" buttons shown
- ✅ MUST HAVE: On save, comment updated with new text and `edited_at` timestamp
- ✅ MUST HAVE: Comment shows "(edited)" indicator after edit
- ✅ MUST HAVE: Hover over "(edited)" shows tooltip with edit timestamp
- ✅ MUST HAVE: Success toast: "Comment updated"
- ✅ MUST HAVE: Activity log entry: "John Doe edited a comment"
- 🔄 SHOULD HAVE: Edit history preserved (show "Edited by X on Oct 15" on hover)

**Given/When/Then**:

**Scenario 1: Edit own comment**
```gherkin
Given I authored comment "Check vendor details"
When I click "Edit" on my comment
Then textarea appears with original text
When I change text to "Check vendor contact info"
And I click "Save"
Then comment updates immediately
And shows "(edited)" indicator
And I see toast "Comment updated"
```

**Scenario 2: Cancel edit**
```gherkin
Given I click "Edit" on my comment
And I change the text
When I click "Cancel"
Then original comment text restored
And textarea disappears
```

**Edge Cases**:
- Editing comment to empty text: Validation error, "Save" button disabled
- Network failure on save: Error toast, original comment still visible
- Another user edits same comment simultaneously: Last edit wins (no conflict resolution)
- Comment edited multiple times: Only shows "(edited)" once, hover shows last edit time

**Negative Test Cases**:
- User tries to edit another user's comment (via API): Server returns 403 Forbidden
- Admin tries to edit user's comment: Not allowed (admins can only delete, not edit)
- XSS payload in edited comment: Sanitized before save

#### Story 2.4: Delete Comment
**As a** comment author or admin
**I want** to delete comments
**So that** I can remove incorrect or inappropriate content

**Acceptance Criteria**:
- ✅ MUST HAVE: "Delete" button visible if:
  - Current user is comment author (can delete own comments), OR
  - Current user is admin or super_admin (can delete any comment)
- ✅ MUST HAVE: Clicking "Delete" opens confirmation dialog (small inline dialog)
- ✅ MUST HAVE: Dialog text: "Are you sure you want to delete this comment? This action cannot be undone."
- ✅ MUST HAVE: On confirm, comment soft-deleted (`deleted_at` timestamp, `deleted_by` user ID)
- ✅ MUST HAVE: Deleted comment disappears from list immediately
- ✅ MUST HAVE: Comment count badge decremented
- ✅ MUST HAVE: Success toast: "Comment deleted"
- ✅ MUST HAVE: Activity log entry: "John Doe deleted a comment" (author) or "Admin Jane deleted a comment by John" (admin)
- 🔄 SHOULD HAVE: Deleted comments preserved in database (soft delete for audit trail)
- 🔄 SHOULD HAVE: Super admin can view deleted comments (with "Restore" option)

**Given/When/Then**:

**Scenario 1: User deletes own comment**
```gherkin
Given I authored a comment
When I click "Delete" on my comment
And I confirm deletion
Then comment disappears from list
And comment count decrements by 1
And I see toast "Comment deleted"
```

**Scenario 2: Admin deletes any comment**
```gherkin
Given I am logged in as admin
And user "John" added a comment
When I click "Delete" on John's comment
And I confirm deletion
Then comment disappears
And activity log shows "Admin Jane deleted a comment by John Doe"
```

**Edge Cases**:
- Deleting comment while another user is reading it: Comment disappears for both users (real-time update via refetch)
- Network failure during deletion: Error toast, comment still visible
- Comment deleted by another user simultaneously: First deletion succeeds, second returns error "Comment not found"

**Negative Test Cases**:
- Standard user tries to delete admin's comment (via API): Server returns 403 Forbidden
- User tries to delete already-deleted comment: Server returns 404 Not Found
- Deleted comment preserved in database (soft delete): Query excludes `deleted_at IS NOT NULL`

### Database Schema

**New Table: InvoiceComment**

```prisma
model InvoiceComment {
  id         Int       @id @default(autoincrement())
  invoice_id Int
  user_id    Int
  text       String    // Comment text (Markdown, max 2000 chars)
  edited_at  DateTime? // Last edit timestamp
  deleted_at DateTime? // Soft delete timestamp
  deleted_by Int?      // User who deleted (nullable)
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt

  // Relations
  invoice Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
  author  User    @relation("CommentAuthor", fields: [user_id], references: [id], onDelete: Restrict)
  deleter User?   @relation("CommentDeleter", fields: [deleted_by], references: [id], onDelete: Restrict)

  @@index([invoice_id, deleted_at], name: "idx_invoice_comments_active")
  @@index([user_id], name: "idx_invoice_comments_author")
  @@map("invoice_comments")
}
```

**User Model Updates**:
```prisma
model User {
  // ... existing relations ...
  comments         InvoiceComment[] @relation("CommentAuthor")
  deleted_comments InvoiceComment[] @relation("CommentDeleter")
}
```

**Invoice Model Updates**:
```prisma
model Invoice {
  // ... existing relations ...
  comments InvoiceComment[]
}
```

### Markdown Sanitization

**Allowed Markdown**:
- Bold: `**text**` or `__text__` → `<strong>text</strong>`
- Italic: `*text*` or `_text_` → `<em>text</em>`
- Lists: `- item` or `1. item` → `<ul><li>item</li></ul>` or `<ol><li>item</li></ol>`
- Links: `[text](url)` → `<a href="url" target="_blank" rel="noopener">text</a>`

**Blocked Markdown**:
- Code blocks: ` ```code``` ` → Rendered as plain text
- Inline code: `` `code` `` → Rendered as plain text
- Images: `![alt](url)` → Rendered as plain text
- HTML tags: `<div>`, `<script>`, etc. → Stripped
- Tables: `| cell |` → Rendered as plain text
- Headings: `# Heading` → Rendered as plain text

**Implementation**: Use `marked` library with custom renderer that strips unsupported elements.

### Performance Requirements

- ✅ MUST HAVE: Comments load within 1 second for invoices with <100 comments
- ✅ MUST HAVE: Add/Edit/Delete operations complete within 2 seconds
- 🔄 SHOULD HAVE: Pagination for invoices with >20 comments
- 🔄 SHOULD HAVE: Comment list virtualized for invoices with >50 comments (reduces DOM size)

### Security Requirements

- ✅ MUST HAVE: All Markdown sanitized before rendering (prevent XSS)
- ✅ MUST HAVE: Comment deletion checks user permission server-side
- ✅ MUST HAVE: Soft delete preserves audit trail (deleted_at, deleted_by)
- ✅ MUST HAVE: Comment edit only allowed by original author
- ✅ MUST HAVE: Comment text limited to 2000 characters (enforced server-side)

### UI/UX Requirements

**Layout** (inside invoice detail panel):
```
┌──────────────────────────────────────────────────────────┐
│ Invoice Details                                          │
│ [Invoice info cards here...]                             │
├──────────────────────────────────────────────────────────┤
│ Comments (3)                                             │
├──────────────────────────────────────────────────────────┤
│ [JD] John Doe · 2 hours ago                    [Edit][X] │
│      Please review the vendor contact details            │
│      **Update**: Vendor confirmed delivery date          │
├──────────────────────────────────────────────────────────┤
│ [AS] Admin Smith · Yesterday                         [X] │
│      Approved. Proceeding with payment processing.       │
├──────────────────────────────────────────────────────────┤
│ [JD] John Doe · Oct 15                          [Edit][X]│
│      Initial submission. Check [portal](url). (edited)   │
├──────────────────────────────────────────────────────────┤
│ Add a comment...                                         │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [Write] [Preview]                                  │   │
│ │ ┌──────────────────────────────────────────────┐   │   │
│ │ │ Type your comment...                         │   │   │
│ │ │ Supports **bold**, *italic*, lists, [links] │   │   │
│ │ └──────────────────────────────────────────────┘   │   │
│ │ [**B**] [*I*] [• List] [Link]      1500/2000 chars│   │
│ │                              [Cancel] [Add Comment]│   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Interactions**:
- Click [Edit]: Inline textarea appears with original text
- Click [X]: Confirmation dialog appears
- Click Markdown toolbar buttons: Insert Markdown syntax at cursor position
- Hover over "(edited)": Tooltip shows "Edited on Oct 15, 2025 at 3:45 PM"

---

## Feature 3: Activity Log

### User Stories

#### Story 3.1: Automatic Activity Logging
**As an** admin or auditor
**I want** all invoice changes automatically logged
**So that** I can track who did what and when

**Acceptance Criteria**:
- ✅ MUST HAVE: Activity log entry created automatically for all invoice state changes:
  - Invoice created
  - Invoice updated (field changes)
  - Invoice approved
  - Invoice rejected
  - Invoice placed on hold
  - Invoice released from hold
  - Payment added
  - Payment updated
  - Payment deleted
  - Comment added
  - Comment edited
  - Comment deleted
  - Attachment uploaded
  - Attachment deleted
  - Invoice duplicated
  - Bulk operation performed
- ✅ MUST HAVE: Each log entry captures:
  - `invoice_id` (which invoice)
  - `user_id` (who performed action)
  - `action` (what happened, e.g., "invoice_created", "invoice_approved")
  - `old_data` (JSON snapshot of fields before change, nullable)
  - `new_data` (JSON snapshot of fields after change, nullable)
  - `timestamp` (when action occurred)
  - `ip_address` (user's IP, optional)
  - `user_agent` (browser info, optional)
- ✅ MUST HAVE: Log entries created in same database transaction as main operation (never missing entries)
- ✅ MUST HAVE: Log entries immutable (no UPDATE or DELETE operations on activity_logs table)
- 🔄 SHOULD HAVE: Log entries include diff of changed fields (e.g., `{"status": {"old": "pending_approval", "new": "approved"}}`)

**Action Types** (enum):
```typescript
export const ACTIVITY_ACTION = {
  // Invoice lifecycle
  INVOICE_CREATED: 'invoice_created',
  INVOICE_UPDATED: 'invoice_updated',
  INVOICE_APPROVED: 'invoice_approved',
  INVOICE_REJECTED: 'invoice_rejected',
  INVOICE_HOLD_PLACED: 'invoice_hold_placed',
  INVOICE_HOLD_RELEASED: 'invoice_hold_released',
  INVOICE_HIDDEN: 'invoice_hidden',
  INVOICE_UNHIDDEN: 'invoice_unhidden',
  INVOICE_DUPLICATED: 'invoice_duplicated',
  INVOICE_DELETED: 'invoice_deleted',

  // Payments
  PAYMENT_ADDED: 'payment_added',
  PAYMENT_UPDATED: 'payment_updated',
  PAYMENT_DELETED: 'payment_deleted',

  // Comments
  COMMENT_ADDED: 'comment_added',
  COMMENT_EDITED: 'comment_edited',
  COMMENT_DELETED: 'comment_deleted',

  // Attachments
  ATTACHMENT_UPLOADED: 'attachment_uploaded',
  ATTACHMENT_DELETED: 'attachment_deleted',

  // Bulk operations
  BULK_APPROVE: 'bulk_approve',
  BULK_REJECT: 'bulk_reject',
  BULK_EXPORT: 'bulk_export',
  BULK_DELETE: 'bulk_delete',
} as const;
```

**Given/When/Then**:

**Scenario 1: Invoice update logged**
```gherkin
Given I am editing invoice INV-001 with status "pending_approval"
When I change status to "unpaid"
And I save changes
Then activity log entry created with:
  - action: "invoice_approved"
  - user_id: my user ID
  - old_data: {"status": "pending_approval"}
  - new_data: {"status": "unpaid"}
  - timestamp: current time
```

**Scenario 2: Bulk operation logged**
```gherkin
Given I bulk approve 5 invoices
When operation completes
Then 5 activity log entries created:
  - Each with action: "invoice_approved"
  - Each with separate invoice_id
  - All with same timestamp (within 1 second)
  - All with same user_id
```

**Edge Cases**:
- Operation fails mid-transaction: Activity log entries rolled back (never have orphan logs)
- User updates multiple fields at once: Single log entry with all changed fields in old_data/new_data
- Automated system actions (e.g., status auto-change on payment): user_id = system user ID (id: 1, email: "system@paylog.com")

**Negative Test Cases**:
- Attempting to UPDATE activity log: Operation blocked by database (no UPDATE permission)
- Attempting to DELETE activity log: Operation blocked by database (no DELETE permission)
- Activity log table disk full: Operation fails gracefully, shows error to user

#### Story 3.2: View Activity Log
**As an** admin
**I want** to view activity log for an invoice
**So that** I can see full audit trail

**Acceptance Criteria**:
- ✅ MUST HAVE: "Activity Log" tab in invoice detail panel
- ✅ MUST HAVE: Activity log entries displayed in reverse chronological order (newest first)
- ✅ MUST HAVE: Each entry shows:
  - User avatar + full name
  - Action description (human-readable, e.g., "Approved invoice")
  - Timestamp (relative: "2 hours ago", "Yesterday", "Oct 15")
  - Expandable details (click to show old_data/new_data diff)
- ✅ MUST HAVE: Field changes highlighted (e.g., "Status changed from Pending Approval to Unpaid")
- ✅ MUST HAVE: If no activity, show empty state: "No activity yet"
- 🔄 SHOULD HAVE: Filter by action type (dropdown: All, Approvals, Payments, Comments, etc.)
- 🔄 SHOULD HAVE: Filter by user (dropdown: All, or specific user)
- 🔄 SHOULD HAVE: Date range filter (last 7 days, last 30 days, custom)
- 🔄 SHOULD HAVE: Export activity log to CSV

**Given/When/Then**:

**Scenario 1: View activity log**
```gherkin
Given invoice INV-001 has 10 activity log entries
When I open invoice detail panel
And I click "Activity Log" tab
Then I see 10 entries in reverse chronological order
And each entry shows user, action, timestamp
```

**Scenario 2: Expand entry details**
```gherkin
Given I am viewing activity log
When I click on "Approved invoice" entry
Then entry expands to show:
  - Old status: "pending_approval"
  - New status: "unpaid"
  - Timestamp: "2025-10-15 14:32:05"
  - IP Address: "192.168.1.100"
```

**Edge Cases**:
- Invoice with 1000+ activity entries: Paginated (50 per page, "Load More" button)
- Activity by deleted user: Shows "[Deleted User]" with original user ID
- Activity with large old_data/new_data (e.g., full invoice snapshot): Truncate in list, show full in expanded view

**Negative Test Cases**:
- Non-admin viewing activity log: Tab not visible (or shows error "Access denied")
- Activity log query timeout (too many entries): Show error, suggest using filters

### Database Schema

**New Table: ActivityLog**

```prisma
model ActivityLog {
  id         Int      @id @default(autoincrement())
  invoice_id Int
  user_id    Int?     // Nullable for system-generated events
  action     String   // Action type enum (see ACTIVITY_ACTION)
  old_data   String?  // JSON snapshot of fields before change
  new_data   String?  // JSON snapshot of fields after change
  ip_address String?  // User's IP address (optional)
  user_agent String?  // Browser user agent (optional)
  created_at DateTime @default(now())

  // Relations
  invoice Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
  user    User?   @relation("ActivityLogger", fields: [user_id], references: [id], onDelete: SetNull)

  @@index([invoice_id, created_at], name: "idx_activity_log_invoice_time")
  @@index([user_id], name: "idx_activity_log_user")
  @@index([action], name: "idx_activity_log_action")
  @@index([created_at], name: "idx_activity_log_time")
  @@map("activity_logs")
}
```

**User Model Updates**:
```prisma
model User {
  // ... existing relations ...
  activity_logs ActivityLog[] @relation("ActivityLogger")
}
```

**Invoice Model Updates**:
```prisma
model Invoice {
  // ... existing relations ...
  activity_logs ActivityLog[]
}
```

### Performance Requirements

- ✅ MUST HAVE: Activity log queries use indexes (invoice_id + created_at composite index)
- ✅ MUST HAVE: Activity log loading <1 second for invoices with <100 entries
- ✅ MUST HAVE: Pagination for invoices with >50 activity entries
- 🔄 SHOULD HAVE: Archive old activity logs (>1 year) to separate table (reduces query time)
- 🔄 SHOULD HAVE: Activity log table partitioned by month (for large datasets)

### Security Requirements

- ✅ MUST HAVE: Activity log table immutable (INSERT only, no UPDATE/DELETE)
- ✅ MUST HAVE: Only admins and super_admins can view full activity log
- ✅ MUST HAVE: Standard users can view only their own actions (filtered by user_id)
- ✅ MUST HAVE: old_data/new_data sanitized (no sensitive data like passwords)
- ✅ MUST HAVE: IP address and user agent logged for security audit trail

### UI/UX Requirements

**Layout** (Activity Log tab in invoice detail panel):
```
┌──────────────────────────────────────────────────────────┐
│ Activity Log                                   [Filter ▼]│
├──────────────────────────────────────────────────────────┤
│ [JS] John Smith · 2 hours ago                           ▼│
│      Approved invoice                                     │
│      ┌────────────────────────────────────────────────┐  │
│      │ Status: pending_approval → unpaid              │  │
│      │ Timestamp: 2025-10-16 14:32:05                 │  │
│      │ IP: 192.168.1.100                              │  │
│      └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ [JD] Jane Doe · Yesterday                               ▼│
│      Added comment                                        │
├──────────────────────────────────────────────────────────┤
│ [AS] Admin Smith · Oct 15                               ▼│
│      Updated invoice                                      │
│      ┌────────────────────────────────────────────────┐  │
│      │ Invoice Amount: $1,000 → $1,200               │  │
│      │ Notes: Added late fee                          │  │
│      └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ [JD] Jane Doe · Oct 14                                  ▼│
│      Created invoice                                      │
│                                          [Load More...]   │
└──────────────────────────────────────────────────────────┘
```

**Interactions**:
- Click entry: Expand to show full details (old_data/new_data diff)
- Click [Filter ▼]: Dropdown with action type, user, date range filters
- Click [Load More]: Load next 50 entries

---

## Database Schema Changes

### New Tables Summary

```prisma
// 1. Invoice Comments
model InvoiceComment {
  id         Int       @id @default(autoincrement())
  invoice_id Int
  user_id    Int
  text       String    // Max 2000 chars, Markdown
  edited_at  DateTime?
  deleted_at DateTime?
  deleted_by Int?
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt

  invoice Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
  author  User    @relation("CommentAuthor", fields: [user_id], references: [id], onDelete: Restrict)
  deleter User?   @relation("CommentDeleter", fields: [deleted_by], references: [id], onDelete: Restrict)

  @@index([invoice_id, deleted_at])
  @@index([user_id])
  @@map("invoice_comments")
}

// 2. Activity Log
model ActivityLog {
  id         Int      @id @default(autoincrement())
  invoice_id Int
  user_id    Int?
  action     String   // Enum: invoice_created, invoice_approved, etc.
  old_data   String?  // JSON
  new_data   String?  // JSON
  ip_address String?
  user_agent String?
  created_at DateTime @default(now())

  invoice Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
  user    User?   @relation("ActivityLogger", fields: [user_id], references: [id], onDelete: SetNull)

  @@index([invoice_id, created_at])
  @@index([user_id])
  @@index([action])
  @@index([created_at])
  @@map("activity_logs")
}
```

### Migration Strategy

1. **Add InvoiceComment table**: Single migration, no data migration needed
2. **Add ActivityLog table**: Single migration, no data migration needed
3. **Update User model**: Add relations for comments and activity logs
4. **Update Invoice model**: Add relations for comments and activity logs
5. **Seed data**: None required (tables start empty)
6. **Rollback plan**: Drop tables if sprint cancelled

### Index Strategy

**Performance-critical indexes**:
- `idx_invoice_comments_active` (invoice_id, deleted_at): Fast queries for active comments on invoice
- `idx_activity_log_invoice_time` (invoice_id, created_at): Fast queries for activity log sorted by time
- `idx_activity_log_time` (created_at): Fast queries for recent activity across all invoices

---

## API Contracts

### Server Actions

#### 1. Bulk Operations

**File**: `app/actions/bulk-operations.ts`

```typescript
// Bulk Approve
export async function bulkApproveInvoices(
  invoiceIds: number[]
): Promise<ServerActionResult<{ successCount: number; failedIds: number[] }>>

// Bulk Reject
export async function bulkRejectInvoices(
  invoiceIds: number[],
  rejectionReason: string
): Promise<ServerActionResult<{ successCount: number; failedIds: number[] }>>

// Bulk Export
export async function bulkExportInvoices(
  invoiceIds: number[],
  selectedColumns: string[]
): Promise<ServerActionResult<{ csvData: string; filename: string }>>

// Bulk Delete
export async function bulkDeleteInvoices(
  invoiceIds: number[]
): Promise<ServerActionResult<{ successCount: number; failedIds: number[] }>>

// Pre-validation
export async function validateBulkOperation(
  invoiceIds: number[],
  operation: 'approve' | 'reject' | 'delete'
): Promise<ServerActionResult<{ valid: boolean; errors: string[] }>>
```

#### 2. Comments

**File**: `app/actions/comments.ts`

```typescript
// Add Comment
export async function addComment(
  invoiceId: number,
  text: string
): Promise<ServerActionResult<InvoiceComment>>

// Edit Comment
export async function editComment(
  commentId: number,
  text: string
): Promise<ServerActionResult<InvoiceComment>>

// Delete Comment
export async function deleteComment(
  commentId: number
): Promise<ServerActionResult<void>>

// Get Comments
export async function getComments(
  invoiceId: number,
  options?: { page?: number; perPage?: number }
): Promise<ServerActionResult<{
  comments: InvoiceCommentWithAuthor[];
  pagination: { page: number; perPage: number; total: number };
}>>
```

#### 3. Activity Log

**File**: `app/actions/activity-log.ts`

```typescript
// Create Activity Log Entry (internal, called by other actions)
export async function createActivityLog(
  data: {
    invoice_id: number;
    user_id: number | null;
    action: ActivityAction;
    old_data?: Record<string, any>;
    new_data?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }
): Promise<void>

// Get Activity Log
export async function getActivityLog(
  invoiceId: number,
  options?: {
    page?: number;
    perPage?: number;
    action?: ActivityAction;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<ServerActionResult<{
  entries: ActivityLogWithUser[];
  pagination: { page: number; perPage: number; total: number };
}>>

// Export Activity Log to CSV
export async function exportActivityLog(
  invoiceId: number,
  options?: { action?: ActivityAction; userId?: number; startDate?: Date; endDate?: Date }
): Promise<ServerActionResult<{ csvData: string; filename: string }>>
```

### React Query Hooks

#### 1. Bulk Operations

**File**: `hooks/use-bulk-operations.ts`

```typescript
export function useBulkApprove(): UseMutationResult<...>
export function useBulkReject(): UseMutationResult<...>
export function useBulkExport(): UseMutationResult<...>
export function useBulkDelete(): UseMutationResult<...>
export function useValidateBulkOperation(): UseMutationResult<...>
```

#### 2. Comments

**File**: `hooks/use-comments.ts`

```typescript
export function useComments(invoiceId: number): UseQueryResult<...>
export function useAddComment(): UseMutationResult<...>
export function useEditComment(): UseMutationResult<...>
export function useDeleteComment(): UseMutationResult<...>
```

#### 3. Activity Log

**File**: `hooks/use-activity-log.ts`

```typescript
export function useActivityLog(invoiceId: number, options?: ...): UseQueryResult<...>
export function useExportActivityLog(): UseMutationResult<...>
```

---

## Testing Requirements

### Unit Tests

**File**: `__tests__/app/actions/bulk-operations.test.ts`

- ✅ MUST HAVE: Test bulk approve with valid selection (all pending_approval)
- ✅ MUST HAVE: Test bulk approve with invalid selection (mixed statuses) → fails pre-validation
- ✅ MUST HAVE: Test bulk reject with valid selection and reason
- ✅ MUST HAVE: Test bulk reject without reason → validation error
- ✅ MUST HAVE: Test bulk export with selected columns
- ✅ MUST HAVE: Test bulk export with no columns selected → validation error
- ✅ MUST HAVE: Test bulk delete as super_admin → succeeds
- ✅ MUST HAVE: Test bulk delete as admin → fails with 403
- ✅ MUST HAVE: Test pre-validation catches invalid invoices (paid, on_hold, etc.)
- ✅ MUST HAVE: Test transaction rollback on bulk operation failure (all-or-nothing)

**File**: `__tests__/app/actions/comments.test.ts`

- ✅ MUST HAVE: Test add comment with valid text
- ✅ MUST HAVE: Test add comment with empty text → validation error
- ✅ MUST HAVE: Test add comment with XSS payload → sanitized
- ✅ MUST HAVE: Test edit own comment → succeeds
- ✅ MUST HAVE: Test edit another user's comment → fails with 403
- ✅ MUST HAVE: Test delete own comment → succeeds
- ✅ MUST HAVE: Test delete another user's comment as admin → succeeds
- ✅ MUST HAVE: Test delete another user's comment as standard user → fails with 403
- ✅ MUST HAVE: Test soft delete (deleted_at, deleted_by populated)
- ✅ MUST HAVE: Test Markdown rendering (bold, italic, links work, code blocks stripped)

**File**: `__tests__/app/actions/activity-log.test.ts`

- ✅ MUST HAVE: Test activity log entry created on invoice update
- ✅ MUST HAVE: Test activity log entry created on invoice approve
- ✅ MUST HAVE: Test activity log entry created on comment add
- ✅ MUST HAVE: Test activity log entry created on payment add
- ✅ MUST HAVE: Test activity log entry NOT created on failed operation (transaction rollback)
- ✅ MUST HAVE: Test get activity log with pagination
- ✅ MUST HAVE: Test get activity log with filters (action, user, date range)
- ✅ MUST HAVE: Test activity log immutability (UPDATE fails, DELETE fails)
- ✅ MUST HAVE: Test old_data/new_data diff accuracy

### Integration Tests

**File**: `__tests__/integration/bulk-operations.test.ts`

- ✅ MUST HAVE: Test bulk approve 50 invoices → all updated, activity logs created
- ✅ MUST HAVE: Test bulk reject with network failure mid-operation → rollback, retry succeeds
- ✅ MUST HAVE: Test bulk export with 100 invoices and 20 columns → CSV generated correctly

**File**: `__tests__/integration/comments.test.ts`

- ✅ MUST HAVE: Test add comment → appears in list immediately (optimistic update)
- ✅ MUST HAVE: Test edit comment → updates in list, shows "(edited)" indicator
- ✅ MUST HAVE: Test delete comment → disappears from list, activity log entry created

**File**: `__tests__/integration/activity-log.test.ts`

- ✅ MUST HAVE: Test full invoice workflow → all actions logged correctly (create, approve, pay, comment)
- ✅ MUST HAVE: Test activity log pagination → loads 50 entries per page
- ✅ MUST HAVE: Test activity log export to CSV → all entries included

### E2E Tests (Playwright)

**File**: `e2e/bulk-operations.spec.ts`

- ✅ MUST HAVE: User selects 5 invoices and bulk approves → all approved
- ✅ MUST HAVE: User attempts bulk approve with invalid selection → pre-validation error shown
- ✅ MUST HAVE: User bulk exports invoices with custom columns → CSV downloads

**File**: `e2e/comments.spec.ts`

- ✅ MUST HAVE: User adds comment with Markdown → renders correctly in list
- ✅ MUST HAVE: User edits comment → updates shown, "(edited)" indicator appears
- ✅ MUST HAVE: User deletes comment → confirmation dialog shown, comment disappears

**File**: `e2e/activity-log.spec.ts`

- ✅ MUST HAVE: Admin views activity log → all entries shown in reverse chronological order
- ✅ MUST HAVE: Admin expands activity entry → old_data/new_data diff shown
- ✅ MUST HAVE: Admin filters activity log by action type → filtered results shown

### Test Coverage Goals

- ✅ MUST HAVE: 80%+ line coverage for all new server actions
- ✅ MUST HAVE: 90%+ branch coverage for validation logic
- ✅ MUST HAVE: 100% coverage for security-critical paths (RBAC checks, sanitization)

---

## Performance Requirements

### Response Time Targets

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Add comment | <500ms | 1s |
| Load comments (20) | <1s | 2s |
| Load activity log (50 entries) | <1s | 2s |
| Bulk approve (10 invoices) | <3s | 10s |
| Bulk approve (100 invoices) | <30s | 60s |
| Bulk export (100 invoices) | <5s | 15s |
| Pre-validation (100 invoices) | <2s | 5s |

### Scalability Requirements

- ✅ MUST HAVE: Bulk operations support up to 1000 invoices (may take >60s, show progress)
- ✅ MUST HAVE: Activity log queries efficient for tables with 100k+ entries (proper indexing)
- ✅ MUST HAVE: Comment pagination for invoices with 500+ comments
- 🔄 SHOULD HAVE: Background job for bulk operations >100 invoices (improves UX)

### Database Optimization

- ✅ MUST HAVE: Composite index on (invoice_id, deleted_at) for comments (fast active comment queries)
- ✅ MUST HAVE: Composite index on (invoice_id, created_at) for activity log (fast time-sorted queries)
- ✅ MUST HAVE: Index on activity log action field (fast filtering by action type)
- 🔄 SHOULD HAVE: Partition activity_logs table by month (improves query performance for large datasets)

---

## Security Requirements

### Authentication & Authorization

| Feature | Role Required | Server-Side Check |
|---------|---------------|-------------------|
| Bulk Approve | admin, super_admin | ✅ Yes |
| Bulk Reject | admin, super_admin | ✅ Yes |
| Bulk Export | standard_user, admin, super_admin | ✅ Yes |
| Bulk Delete | super_admin only | ✅ Yes |
| Add Comment | standard_user, admin, super_admin | ✅ Yes |
| Edit Own Comment | comment author | ✅ Yes (check user_id) |
| Delete Own Comment | comment author | ✅ Yes (check user_id) |
| Delete Any Comment | admin, super_admin | ✅ Yes |
| View Activity Log | admin, super_admin (full), standard_user (own actions only) | ✅ Yes |

### Input Validation

- ✅ MUST HAVE: All user inputs validated server-side (never trust client)
- ✅ MUST HAVE: Comment text sanitized with allowlist (only basic Markdown allowed)
- ✅ MUST HAVE: Rejection reason length validated (10-500 chars)
- ✅ MUST HAVE: Invoice IDs validated (exist in database, user has access)
- ✅ MUST HAVE: Column selection validated for CSV export (prevent SQL injection via column names)

### XSS Prevention

- ✅ MUST HAVE: All Markdown rendered with `marked` library + custom sanitizer
- ✅ MUST HAVE: Allowlist approach: Only `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a>` tags allowed
- ✅ MUST HAVE: All other HTML tags stripped (including `<script>`, `<iframe>`, `<style>`)
- ✅ MUST HAVE: Link URLs validated (only http:// and https:// protocols allowed)
- ✅ MUST HAVE: All links have `rel="noopener"` and `target="_blank"` attributes

### SQL Injection Prevention

- ✅ MUST HAVE: All database queries use Prisma ORM (parameterized queries)
- ✅ MUST HAVE: No raw SQL queries with user input
- ✅ MUST HAVE: Column names for CSV export validated against allowlist

### Audit Trail

- ✅ MUST HAVE: All bulk operations logged in activity_logs table
- ✅ MUST HAVE: All comment deletions logged (deleted_by, deleted_at)
- ✅ MUST HAVE: Activity log entries immutable (INSERT only, no UPDATE/DELETE)
- ✅ MUST HAVE: IP address and user agent logged for security incidents

### Data Privacy

- ✅ MUST HAVE: Soft delete for comments (preserve audit trail, but exclude from queries)
- ✅ MUST HAVE: Activity log old_data/new_data excludes sensitive fields (if any added in future)
- ✅ MUST HAVE: CSV export respects user permissions (standard users cannot export hidden invoices)

---

## UI/UX Requirements

### Bulk Operations UI

**Selection Indicator**:
```
┌─────────────────────────────────────────────────────────────┐
│ [3 selected] [Clear Selection] [Select All 47 Invoices]     │
│ [Bulk Approve] [Bulk Reject] [Bulk Export] [Bulk Delete]    │
└─────────────────────────────────────────────────────────────┘
```

**Pre-Validation Dialog**:
```
┌────────────────────────────────────────────────────┐
│ ⚠️ Bulk Approve - Validation Errors                 │
├────────────────────────────────────────────────────┤
│ Cannot approve the following invoices:             │
│                                                    │
│ • INV-002 (Status: On Hold)                       │
│ • INV-005 (Status: Paid)                          │
│                                                    │
│ Please deselect these invoices to proceed.        │
│                                                    │
│                              [Cancel] [OK]         │
└────────────────────────────────────────────────────┘
```

### Comments UI

**Comment Form**:
```
┌──────────────────────────────────────────────────────────┐
│ Add a comment...                                         │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [Write] [Preview]                                  │   │
│ │ ┌──────────────────────────────────────────────┐   │   │
│ │ │ Type your comment...                         │   │   │
│ │ │ Supports **bold**, *italic*, lists, [links] │   │   │
│ │ └──────────────────────────────────────────────┘   │   │
│ │ [**B**] [*I*] [• List] [🔗 Link]  1500/2000 chars │   │
│ │                              [Cancel] [Add Comment]│   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Comment in List**:
```
┌──────────────────────────────────────────────────────────┐
│ [JD] John Doe · 2 hours ago                    [Edit][X] │
│      Please review the vendor contact details            │
│      **Update**: Vendor confirmed delivery date          │
└──────────────────────────────────────────────────────────┘
```

### Activity Log UI

**Activity Entry (Collapsed)**:
```
┌──────────────────────────────────────────────────────────┐
│ [JS] John Smith · 2 hours ago                           ▼│
│      Approved invoice                                     │
└──────────────────────────────────────────────────────────┘
```

**Activity Entry (Expanded)**:
```
┌──────────────────────────────────────────────────────────┐
│ [JS] John Smith · 2 hours ago                           ▲│
│      Approved invoice                                     │
│      ┌────────────────────────────────────────────────┐  │
│      │ Status: pending_approval → unpaid              │  │
│      │ Timestamp: 2025-10-16 14:32:05                 │  │
│      │ IP: 192.168.1.100                              │  │
│      │ User Agent: Mozilla/5.0 (Windows NT 10.0)     │  │
│      └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Loading States

- ✅ MUST HAVE: Bulk operations show loading spinner + text ("Approving 10 invoices...")
- ✅ MUST HAVE: Comment submission shows disabled button + spinner
- ✅ MUST HAVE: Activity log shows skeleton loader while fetching

### Error States

- ✅ MUST HAVE: Pre-validation errors shown in dialog with list of blocked invoices
- ✅ MUST HAVE: Network errors shown in toast with retry button
- ✅ MUST HAVE: Permission errors shown in toast ("You don't have permission to perform this action")

### Empty States

- ✅ MUST HAVE: No comments: "No comments yet. Be the first to comment!"
- ✅ MUST HAVE: No activity: "No activity yet"
- ✅ MUST HAVE: No invoices selected: Bulk action buttons disabled

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| Bulk Operation | Action performed on multiple invoices simultaneously |
| Pre-validation | Server-side check before operation to detect failures early |
| Soft Delete | Marking record as deleted (deleted_at timestamp) instead of physical removal |
| Activity Log | Immutable audit trail of all invoice changes |
| Markdown | Lightweight text formatting syntax (bold, italic, lists, links) |
| Optimistic Update | Updating UI immediately before server confirms, for better UX |

### Related Documentation

- [docs/SPRINTS.md](./SPRINTS.md) - Sprint planning and progress
- [docs/ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [docs/API.md](./API.md) - API reference documentation
- [schema.prisma](../schema.prisma) - Database schema

### Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-16 | Requirements Clarifier (RC) | Initial requirements document |

---

**Document Status**: ✅ Ready for Implementation
**Next Step**: Handoff to Implementation Planner & Sprint Architect (IPSA) for sprint plan
**Blockers**: None
**Dependencies**: Sprint 1-6 completed (foundation exists)
