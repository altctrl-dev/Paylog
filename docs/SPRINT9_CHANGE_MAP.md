# Sprint 9: Archive Request Workflow - Change Navigation Map

**Generated**: 2025-10-16
**Analyst**: CN (Code Navigator & Impact Analyzer)
**Sprint**: 9 (Archive Request Workflow)
**Estimated Effort**: 11 SP (~2,000-2,500 lines)

---

## Executive Summary

### Files Overview
- **New Files**: 14 files (~2,300 lines)
- **Modified Files**: 7 files (~180 lines modified)
- **Total Touch**: ~2,480 lines
- **Risk Level**: MEDIUM (requires careful coordination with Sprint 8 master data functions)

### Key Changes
1. **Archive Request Workflow**: New approval-based workflow for entities with >0 invoices
2. **Smart Archive Logic**: Direct archive for admin + 0 invoices, approval required for >0 invoices
3. **Email Notifications**: 3 new templates integrated with existing Sprint 5 email service
4. **Admin Dashboard**: New archive requests tab with pending badge
5. **Master Data Integration**: Modify existing archive functions to route to approval workflow

### Critical Risks
1. **HIGH**: Breaking Sprint 8 direct archive functionality if not carefully integrated
2. **MEDIUM**: Race conditions on approval (multiple admins approve simultaneously)
3. **MEDIUM**: Email notification failures blocking workflow
4. **LOW**: Performance issues with N+1 queries in request list views

---

## 1. Existing Code Analysis

### 1.1 ArchiveRequest Database Schema

**File**: `prisma/schema.prisma`
**Lines**: 277-300 (existing, no changes needed)

**Current State**:
```prisma
model ArchiveRequest {
  id               Int       @id @default(autoincrement())
  entity_type      String    // 'vendor' | 'category' | 'sub_entity' | 'profile'
  entity_id        Int
  requested_by     Int
  reviewed_by      Int?
  status           String    @default("pending") // 'pending' | 'approved' | 'rejected'
  reason           String
  rejection_reason String?
  requested_at     DateTime  @default(now())
  reviewed_at      DateTime?

  requester User  @relation("ArchiveRequester", fields: [requested_by], references: [id], onDelete: Restrict)
  reviewer  User? @relation("ArchiveReviewer", fields: [reviewed_by], references: [id], onDelete: Restrict)

  @@index([status], name: "idx_archive_requests_status")
  @@index([entity_type, entity_id], name: "idx_archive_requests_entity")
  @@index([requested_by], name: "idx_archive_requests_requested_by")
  @@index([status, requested_at], name: "idx_archive_requests_pending")
  @@map("archive_requests")
}
```

**Analysis**:
- Schema already exists (Sprint 5 preparation)
- Supports `vendor`, `category`, `sub_entity`, `profile` entity types
- `payment_type` will be handled via app-level validation (SQLite stores enum as TEXT)
- All required indexes present for efficient queries
- No migration needed

**Contracts at Risk**: None (read-only analysis)

---

### 1.2 Master Data Archive Functions

**File**: `app/actions/master-data.ts`
**Current Functions**:
- `archiveVendor()` (lines 354-404)
- `restoreVendor()` (lines 409-462)
- `archiveCategory()` (lines 736-786)
- `restoreCategory()` (lines 789-842)

**Current Logic** (archiveVendor example):
```typescript
export async function archiveVendor(id: number): Promise<ServerActionResult<void>> {
  await requireAdmin(); // Admin-only

  const vendor = await db.vendor.findUnique({
    where: { id },
    include: { _count: { select: { invoices: true } } },
  });

  if (vendor._count.invoices > 0) {
    return {
      success: false,
      error: `Cannot archive vendor with ${vendor._count.invoices} invoice(s)`
    };
  }

  await db.vendor.update({
    where: { id },
    data: { is_active: false }
  });

  revalidatePath('/settings');
  revalidatePath('/invoices');

  return { success: true, data: undefined };
}
```

**Behavior**:
- Admin-only (RBAC via `requireAdmin()`)
- Blocks archive if invoice count > 0 (hard error)
- Direct archive if invoice count = 0
- No approval workflow

**Contracts**:
- Input: `id: number`
- Output: `Promise<ServerActionResult<void>>`
- Side effects: Database update, path revalidation

**Risk Analysis**:
- **BREAKING CHANGE**: Error message will change from "Cannot archive..." to "Please create archive request..."
- **MITIGATION**: Keep same function signature, only change behavior for >0 invoices case

---

### 1.3 Vendor & Category List Components

**File**: `components/master-data/vendor-list.tsx`
**Lines**: 1-121

**Current Archive Button Logic** (lines 93-101):
```typescript
<button
  onClick={() => handleArchive(vendor.id)}
  disabled={vendor.invoiceCount > 0}
  className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
  aria-label="Archive vendor"
  title={vendor.invoiceCount > 0 ? 'Cannot archive vendor with invoices' : 'Archive vendor'}
>
  <Archive className="h-4 w-4" />
</button>
```

**Behavior**:
- Archive button disabled if `invoiceCount > 0`
- Shows tooltip: "Cannot archive vendor with invoices"
- Calls `archiveMutation.mutate(id)` on click
- Admin-only action (no RBAC check in component, handled by server action)

**Analysis**:
- Current approach: Hard block for >0 invoices (disabled button)
- Sprint 9 requirement: Enable button, open archive request form for >0 invoices
- Need to determine user role (admin vs standard_user) to show correct button

**Contracts at Risk**:
- UI behavior change (button enabled instead of disabled)
- Button label change ("Archive" vs "Request Archive")

---

### 1.4 Admin Dashboard Structure

**File**: `app/(dashboard)/admin/page.tsx`
**Lines**: 1-311

**Current Tabs**:
1. Dashboard (Statistics and overview)
2. Master Data Requests (Sprint 7/8 approval workflow)

**Current Features**:
- Pending request count badge (lines 158-162)
- Request filters (entity type, status)
- Request cards with status badges
- Panel-based detail view (uses `usePanel` hook)

**Analysis**:
- Already has tab-based structure (can add new tab for Archive Requests)
- Already has pending count badge pattern (can reuse for archive requests)
- Uses panel system for detail views (consistent pattern)
- Has filter UI pattern (can adapt for archive request filters)

**Contracts at Risk**: None (additive changes only)

---

### 1.5 Layout Sidebar Structure

**File**: `app/(dashboard)/layout.tsx`
**Lines**: 1-22

**Current Structure**:
```typescript
export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <QueryProvider>
      <DashboardShell user={session.user}>{children}</DashboardShell>
    </QueryProvider>
  );
}
```

**Analysis**:
- Uses `DashboardShell` component (not visible in this file)
- Sidebar is likely in `components/layout/dashboard-shell.tsx`
- Need to find and modify sidebar component to add archive requests badge

**Note**: Need to locate actual sidebar component file.

---

### 1.6 Email Service Integration

**File**: `lib/email/service.ts`
**Lines**: 1-415

**Current Email Methods**:
1. `sendNewRequestNotification()` (lines 140-223) - For master data requests
2. `sendApprovalNotification()` (lines 231-309) - For request approvals
3. `sendRejectionNotification()` (lines 317-389) - For request rejections

**Pattern Analysis**:
- HTML + text email templates (inline in service methods)
- Fire-and-forget async sending (`sendEmailAsync` utility)
- Retry logic with exponential backoff
- Preview mode for development
- Admin emails from `ADMIN_EMAILS` env var

**Template Structure**:
- Styled HTML with inline CSS
- Plain text fallback
- Responsive design (max-width: 600px)
- Color-coded headers (grey=new, green=approved, red=rejected)

**Analysis**:
- Can follow same pattern for archive request emails
- 3 new methods needed:
  1. `sendArchiveRequestCreatedNotification()` (to admins)
  2. `sendArchiveRequestApprovedNotification()` (to requester)
  3. `sendArchiveRequestRejectedNotification()` (to requester)

**Contracts at Risk**: None (additive changes only)

---

### 1.7 Email Types

**File**: `lib/email/types.ts`
**Lines**: 1-83

**Current Template Data Types**:
- `NewRequestTemplateData` (lines 37-50)
- `ApprovalTemplateData` (lines 55-66)
- `RejectionTemplateData` (lines 71-82)

**Analysis**:
- Need to add 3 new template data types for archive requests
- Should follow same naming convention
- Fields will be similar but adapted for archive workflow

**Contracts at Risk**: None (additive changes only)

---

## 2. New Files to Create

### 2.1 Server Actions - Archive Requests

**File**: `app/actions/archive-requests.ts`
**Estimated Lines**: ~850
**Purpose**: CRUD operations for archive requests with RBAC and validation

**Exports**:
```typescript
// Types
export type { ArchiveRequestWithDetails }

// Actions
export async function createArchiveRequest(data: CreateArchiveRequestInput): Promise<ServerActionResult<ArchiveRequest>>
export async function getArchiveRequests(filters?: GetArchiveRequestsFilters): Promise<ServerActionResult<{ requests: ArchiveRequestWithDetails[]; pagination: Pagination }>>
export async function getArchiveRequestById(id: number): Promise<ServerActionResult<ArchiveRequestWithDetails>>
export async function cancelArchiveRequest(id: number): Promise<ServerActionResult<void>>
export async function getEntityArchiveHistory(entityType: string, entityId: number): Promise<ServerActionResult<ArchiveRequestWithDetails[]>>
export async function getPendingArchiveRequestsCount(): Promise<ServerActionResult<number>>
```

**Dependencies**:
- `@/lib/auth` (getCurrentUser, requireAdmin)
- `@/lib/db` (Prisma client)
- `@/lib/validations/archive-request` (Zod schemas)
- `@/lib/email/service` (emailService)
- `next/cache` (revalidatePath)

**Key Functions**:

1. **createArchiveRequest** (~100 lines)
   - Input: `{ entity_type, entity_id, reason }`
   - Validation: Check entity exists, check no duplicate pending request
   - Create ArchiveRequest with status="pending"
   - Send email to admins (fire-and-forget)
   - Revalidate paths
   - RBAC: Any authenticated user

2. **getArchiveRequests** (~120 lines)
   - Input: Optional filters (status, entity_type, date range, pagination)
   - Query with joins (requester, reviewer, entity name via dynamic join)
   - Calculate current invoice count for each entity
   - Return paginated results
   - RBAC: Admin only

3. **getArchiveRequestById** (~80 lines)
   - Input: Request ID
   - Query with all relations
   - RBAC: Requester can view own, admin can view all

4. **cancelArchiveRequest** (~70 lines)
   - Input: Request ID
   - Validation: Status must be "pending"
   - RBAC: Requester can cancel own, admin can cancel any
   - Hard delete record
   - Revalidate paths

5. **getEntityArchiveHistory** (~90 lines)
   - Input: Entity type and ID
   - Query all requests for this entity (ordered by requested_at DESC)
   - Include relations (requester, reviewer)
   - RBAC: All authenticated users (read-only)

6. **getPendingArchiveRequestsCount** (~40 lines)
   - Query count where status="pending"
   - RBAC: Admin only
   - Used for sidebar badge

**Database Queries**:
- All queries use existing indexes (`idx_archive_requests_status`, `idx_archive_requests_entity`)
- Join patterns:
  ```typescript
  // Dynamic entity join based on entity_type
  const entityData = await (async () => {
    switch (request.entity_type) {
      case 'vendor': return db.vendor.findUnique({ where: { id: request.entity_id } });
      case 'category': return db.category.findUnique({ where: { id: request.entity_id } });
      // ... etc
    }
  })();
  ```

**Error Handling**:
- All functions wrapped in try-catch
- Validation errors return `{ success: false, error: string }`
- Prisma errors logged and returned as generic messages

---

### 2.2 Server Actions - Archive Approval

**File**: `app/actions/admin/archive-approval.ts`
**Estimated Lines**: ~400
**Purpose**: Admin-only approval and rejection actions with transaction safety

**Exports**:
```typescript
export async function approveArchiveRequest(requestId: number, adminNotes?: string): Promise<ServerActionResult<void>>
export async function rejectArchiveRequest(requestId: number, rejectionReason: string): Promise<ServerActionResult<void>>
```

**Dependencies**:
- `@/lib/auth` (requireAdmin)
- `@/lib/db` (Prisma client with transactions)
- `@/lib/validations/archive-request` (Zod schemas)
- `@/lib/email/service` (emailService)
- `next/cache` (revalidatePath)

**Key Functions**:

1. **approveArchiveRequest** (~200 lines)
   - RBAC: Admin only, cannot approve own request
   - Atomic transaction:
     1. Lock ArchiveRequest row (SELECT FOR UPDATE equivalent)
     2. Verify status="pending"
     3. Load entity and re-validate invoice count = 0
     4. If invoice count >0, abort with error
     5. Update entity: `is_active = false`
     6. Update ArchiveRequest: `status = "approved"`, `reviewed_by`, `reviewed_at`
     7. Create ActivityLog entry
   - Send email to requester (fire-and-forget, after transaction)
   - Revalidate paths: `/settings`, `/invoices`, `/admin`

2. **rejectArchiveRequest** (~150 lines)
   - RBAC: Admin only
   - Update ArchiveRequest: `status = "rejected"`, `rejection_reason`, `reviewed_by`, `reviewed_at`
   - Send email to requester (fire-and-forget)
   - Entity remains active (no entity update)
   - Revalidate paths: `/settings`, `/admin`

**Transaction Safety**:
```typescript
await db.$transaction(async (tx) => {
  // 1. Check request status
  const request = await tx.archiveRequest.findUnique({
    where: { id: requestId },
  });

  if (request.status !== 'pending') {
    throw new Error('Request already processed');
  }

  // 2. Re-validate invoice count
  const vendor = await tx.vendor.findUnique({
    where: { id: request.entity_id },
    include: { _count: { select: { invoices: true } } },
  });

  if (vendor._count.invoices > 0) {
    throw new Error(`Cannot archive: entity now has ${vendor._count.invoices} invoice(s)`);
  }

  // 3. Archive entity
  await tx.vendor.update({
    where: { id: request.entity_id },
    data: { is_active: false },
  });

  // 4. Update request
  await tx.archiveRequest.update({
    where: { id: requestId },
    data: {
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date(),
    },
  });
});
```

**Race Condition Mitigation**:
- Transaction isolation prevents concurrent approvals
- Second admin attempting approval will see status != "pending" and abort

---

### 2.3 Validation Schemas

**File**: `lib/validations/archive-request.ts`
**Estimated Lines**: ~120
**Purpose**: Zod schemas for archive request operations

**Exports**:
```typescript
export const createArchiveRequestSchema: z.ZodSchema
export const archiveRequestFiltersSchema: z.ZodSchema
export const approveArchiveRequestSchema: z.ZodSchema
export const rejectArchiveRequestSchema: z.ZodSchema

export type CreateArchiveRequestInput = z.infer<typeof createArchiveRequestSchema>
export type ArchiveRequestFilters = z.infer<typeof archiveRequestFiltersSchema>
export type ApproveArchiveRequestInput = z.infer<typeof approveArchiveRequestSchema>
export type RejectArchiveRequestInput = z.infer<typeof rejectArchiveRequestSchema>
```

**Schemas**:

1. **createArchiveRequestSchema**:
```typescript
z.object({
  entity_type: z.enum(['vendor', 'category', 'invoice_profile', 'payment_type']),
  entity_id: z.number().int().positive(),
  reason: z.string().min(10).max(500).trim(),
})
```

2. **archiveRequestFiltersSchema**:
```typescript
z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  entity_type: z.enum(['vendor', 'category', 'invoice_profile', 'payment_type']).optional(),
  requested_by: z.number().int().positive().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(100).default(20),
})
```

3. **approveArchiveRequestSchema**:
```typescript
z.object({
  requestId: z.number().int().positive(),
  adminNotes: z.string().max(500).trim().optional(),
})
```

4. **rejectArchiveRequestSchema**:
```typescript
z.object({
  requestId: z.number().int().positive(),
  rejectionReason: z.string().min(10).max(500).trim(),
})
```

**Pattern**: Follows same structure as `lib/validations/invoice.ts`

---

### 2.4 TypeScript Types

**File**: `types/archive-request.ts`
**Estimated Lines**: ~80
**Purpose**: Type definitions for archive request domain

**Exports**:
```typescript
export type ArchiveRequestStatus = 'pending' | 'approved' | 'rejected'
export type ArchiveRequestEntityType = 'vendor' | 'category' | 'invoice_profile' | 'payment_type'

export interface ArchiveRequest {
  id: number
  entity_type: ArchiveRequestEntityType
  entity_id: number
  status: ArchiveRequestStatus
  reason: string
  rejection_reason: string | null
  requested_by: number
  reviewed_by: number | null
  requested_at: Date
  reviewed_at: Date | null
}

export interface ArchiveRequestWithDetails extends ArchiveRequest {
  entity_name: string
  entity_invoice_count: number
  requester: {
    id: number
    full_name: string
    email: string
  }
  reviewer: {
    id: number
    full_name: string
  } | null
}

export interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}
```

**Pattern**: Follows same structure as `types/invoice.ts`

---

### 2.5 React Query Hooks

**File**: `hooks/use-archive-requests.ts`
**Estimated Lines**: ~320
**Purpose**: React Query hooks for archive request operations

**Exports**:
```typescript
export function useArchiveRequests(filters?: ArchiveRequestFilters)
export function useArchiveRequestById(id: number)
export function useCreateArchiveRequest()
export function useCancelArchiveRequest()
export function useApproveArchiveRequest()
export function useRejectArchiveRequest()
export function useEntityArchiveHistory(entityType: string, entityId: number)
export function usePendingArchiveRequestsCount()
```

**Key Hooks**:

1. **useArchiveRequests** (Query)
```typescript
export function useArchiveRequests(filters?: ArchiveRequestFilters) {
  return useQuery({
    queryKey: ['archive-requests', filters],
    queryFn: () => getArchiveRequests(filters),
    staleTime: 30000, // 30 seconds
  });
}
```

2. **useCreateArchiveRequest** (Mutation)
```typescript
export function useCreateArchiveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createArchiveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-archive-count'] });
      toast.success('Archive request submitted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit archive request');
    },
  });
}
```

3. **useApproveArchiveRequest** (Mutation)
```typescript
export function useApproveArchiveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, adminNotes }: { requestId: number; adminNotes?: string }) =>
      approveArchiveRequest(requestId, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-archive-count'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Archive request approved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve archive request');
    },
  });
}
```

**Cache Invalidation Strategy**:
- Approve/Reject: Invalidate archive requests, pending count, and entity lists
- Create: Invalidate archive requests and pending count
- Cancel: Invalidate archive requests and pending count

**Pattern**: Follows same structure as `hooks/use-invoices.ts`

---

### 2.6 Archive Request Form Panel

**File**: `components/archive-requests/archive-request-form-panel.tsx`
**Estimated Lines**: ~200
**Purpose**: Panel component for creating archive requests

**Props**:
```typescript
interface ArchiveRequestFormPanelProps {
  entityType: ArchiveRequestEntityType
  entityId: number
  entityName: string
  invoiceCount: number
  onClose: () => void
}
```

**UI Structure**:
```
┌─────────────────────────────────────────────────┐
│ Request Archive: [Entity Name]              [X] │
├─────────────────────────────────────────────────┤
│ Entity Details (Read-Only Card)                 │
│   Type: Vendor                                   │
│   Name: Acme Corporation                         │
│   Linked Invoices: 3 ⚠️                          │
│                                                  │
│   ℹ️ This entity has linked invoices.           │
│      Admin approval is required.                │
├─────────────────────────────────────────────────┤
│ Reason for Archive Request *                    │
│ ┌───────────────────────────────────────────┐   │
│ │ [Textarea: 10-500 characters]              │   │
│ │                                            │   │
│ └───────────────────────────────────────────┘   │
│                             45/500 characters    │
│                                                  │
│ ⚠️ Once submitted, you cannot edit this request.│
├─────────────────────────────────────────────────┤
│              [Cancel]  [Submit Request]          │
└─────────────────────────────────────────────────┘
```

**Features**:
- Character counter (real-time)
- Submit button disabled until 10+ chars
- Validation error display
- Loading state during submission
- Auto-close on success

**Dependencies**:
- `@/hooks/use-archive-requests` (useCreateArchiveRequest)
- `@/lib/validations/archive-request` (createArchiveRequestSchema)
- `react-hook-form` + `@hookform/resolvers/zod`
- Shadcn UI components (Card, Button, Textarea, Badge)

---

### 2.7 Archive Request List

**File**: `components/archive-requests/archive-request-list.tsx`
**Estimated Lines**: ~280
**Purpose**: Table component displaying archive requests with filters

**Props**:
```typescript
interface ArchiveRequestListProps {
  filters: ArchiveRequestFilters
  onFilterChange: (filters: ArchiveRequestFilters) => void
  onViewRequest: (request: ArchiveRequestWithDetails) => void
}
```

**UI Structure**:
```
┌────────────────────────────────────────────────────────────┐
│ Archive Requests                    [Export] [Refresh]     │
├────┬──────────┬─────────────┬──────────┬─────────┬─────────┤
│ ID │ Type     │ Entity      │ Requester│ Invoices│ Actions │
├────┼──────────┼─────────────┼──────────┼─────────┼─────────┤
│ 45 │ 🏢 Vendor│ Acme Corp   │ John Doe │ 3       │ [👁️][✅]│
│ 44 │ 📁 Cat...│ IT Services │ Jane S.  │ 0       │ [👁️][✅]│
└────┴──────────┴─────────────┴──────────┴─────────┴─────────┘
              < Prev   Page 1 of 3   Next >
```

**Features**:
- Sortable columns (Requested Date, Entity Type, Invoice Count)
- Pagination controls
- Quick action buttons (View, Approve, Reject)
- Status badges (Pending=blue, Approved=green, Rejected=red)
- Empty state ("No pending archive requests. All caught up!")
- Loading state skeleton

**Dependencies**:
- `@/hooks/use-archive-requests` (useArchiveRequests)
- `@/hooks/use-panel` (openPanel for detail view)
- Shadcn UI components (Table, Badge, Button)

---

### 2.8 Archive Request Detail Panel

**File**: `components/archive-requests/archive-request-detail-panel.tsx`
**Estimated Lines**: ~240
**Purpose**: Panel component for viewing and reviewing archive requests

**Props**:
```typescript
interface ArchiveRequestDetailPanelProps {
  requestId: number
  onClose: () => void
}
```

**UI Structure**:
```
┌─────────────────────────────────────────────────┐
│ Archive Request #45                 [Badge] [X] │
├─────────────────────────────────────────────────┤
│ Request Details                                  │
│   Entity: Acme Corporation (Vendor)              │
│   Current Invoices: 3                            │
│   Requester: John Doe (john@example.com)         │
│   Requested: 2 days ago                          │
│   Reason: "This vendor is no longer..."          │
├─────────────────────────────────────────────────┤
│ Admin Notes (Optional)                           │
│ ┌───────────────────────────────────────────┐   │
│ │ [Textarea: 0-500 characters]               │   │
│ └───────────────────────────────────────────┘   │
│                             0/500 characters     │
├─────────────────────────────────────────────────┤
│ [If status = pending]                            │
│       [Cancel]  [Reject]  [Approve]              │
│                                                  │
│ [If status = approved/rejected]                  │
│ Review Details                                   │
│   Reviewed By: Jane Admin                        │
│   Reviewed: 1 day ago                            │
│   [Rejection Reason if rejected]                 │
└─────────────────────────────────────────────────┘
```

**Features**:
- Status-specific actions (Pending vs Reviewed)
- Rejection reason modal (opens on Reject button)
- Approval confirmation dialog (opens on Approve button)
- Admin notes field (only for pending requests)
- Read-only view for approved/rejected requests

**Dependencies**:
- `@/hooks/use-archive-requests` (useArchiveRequestById, useApproveArchiveRequest, useRejectArchiveRequest)
- `@/components/archive-requests/rejection-reason-dialog` (RejectDialog)
- Shadcn UI components (Card, Button, Textarea, Badge, Dialog)

---

### 2.9 Rejection Reason Dialog

**File**: `components/archive-requests/rejection-reason-dialog.tsx`
**Estimated Lines**: ~140
**Purpose**: Modal dialog for entering rejection reason

**Props**:
```typescript
interface RejectionReasonDialogProps {
  open: boolean
  onClose: () => void
  request: ArchiveRequestWithDetails
  onReject: (requestId: number, reason: string) => void
}
```

**UI Structure**:
```
┌─────────────────────────────────────────────────┐
│ ❌ Reject Archive Request                       │
│                                                  │
│ Entity: Acme Corporation (Vendor)                │
│ Requester: John Doe                              │
│                                                  │
│ Original Reason: "Vendor no longer..."           │
│                                                  │
│ ─────────────────────────────────────────────   │
│                                                  │
│ Rejection Reason *                               │
│ ┌───────────────────────────────────────────┐   │
│ │ [Textarea: 10-500 characters]              │   │
│ └───────────────────────────────────────────┘   │
│                             0/500 characters     │
│                                                  │
│ Requester will receive email notification.      │
│                                                  │
│        [Cancel]  [Reject Request ⚠️]            │
└─────────────────────────────────────────────────┘
```

**Features**:
- Character counter
- Reject button disabled until 10+ chars
- Form validation (Zod schema)
- Closes on success or cancel

**Dependencies**:
- `react-hook-form` + Zod validation
- Shadcn UI Dialog component

---

### 2.10 Archive History Timeline

**File**: `components/archive-requests/archive-history-timeline.tsx`
**Estimated Lines**: ~170
**Purpose**: Timeline view of archive request history for an entity

**Props**:
```typescript
interface ArchiveHistoryTimelineProps {
  entityType: ArchiveRequestEntityType
  entityId: number
}
```

**UI Structure**:
```
┌─────────────────────────────────────────────────┐
│ ▼ Archive History (3)                           │
│                                                  │
│ ●───────────────────────────────────────────────│
│ │ ✅ Request #45 Approved                       │
│ │ Requested by: John Doe                        │
│ │ Reviewed by: Jane Admin                       │
│ │ Date: Oct 15, 2025                            │
│ │ Reason: "Vendor no longer in business"        │
│ │                                               │
│ ●───────────────────────────────────────────────│
│ │ ❌ Request #32 Rejected                       │
│ │ Requested by: Bob Johnson                     │
│ │ Reviewed by: Jane Admin                       │
│ │ Date: Sep 20, 2025                            │
│ │ Reason: "Clean up unused vendors"             │
│ │ Rejection: "Vendor still has pending..."      │
└─────────────────────────────────────────────────┘
```

**Features**:
- Color-coded timeline dots (green=approved, red=rejected, grey=cancelled)
- Collapsible by default (expandable on click)
- Relative timestamps ("2 months ago")
- Empty state ("No archive history for this entity")
- Pagination for >10 requests

**Dependencies**:
- `@/hooks/use-archive-requests` (useEntityArchiveHistory)
- Shadcn UI components (Card, Badge)
- `lucide-react` icons

---

### 2.11 Pending Badge Component

**File**: `components/archive-requests/pending-badge.tsx`
**Estimated Lines**: ~70
**Purpose**: Reusable badge component for pending archive requests count

**Props**:
```typescript
interface PendingBadgeProps {
  count: number
  variant?: 'sidebar' | 'inline'
}
```

**Rendering**:
```typescript
// Sidebar variant (red circle with white text)
<span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
  {count}
</span>

// Inline variant (amber badge with text)
<Badge variant="warning">
  {count} pending
</Badge>
```

**Usage**:
```tsx
// In sidebar
<PendingBadge count={5} variant="sidebar" />

// In admin dashboard
<PendingBadge count={3} variant="inline" />
```

**Dependencies**:
- Shadcn UI Badge component

---

### 2.12 Archive Button (Smart Component)

**File**: `components/archive-requests/archive-button.tsx`
**Estimated Lines**: ~190
**Purpose**: Smart button component that determines correct action based on context

**Props**:
```typescript
interface ArchiveButtonProps {
  entityType: ArchiveRequestEntityType
  entityId: number
  entityName: string
  invoiceCount: number
  isActive: boolean
  userRole: 'standard_user' | 'admin' | 'super_admin'
  hasPendingRequest?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

**Logic**:
```typescript
// Determine button state
if (!isActive) {
  return <RestoreButton /> // Admin only
}

if (hasPendingRequest) {
  return <PendingBadgeButton /> // Disabled, shows "Request Pending"
}

if (invoiceCount === 0 && isAdmin) {
  return <DirectArchiveButton /> // Opens confirmation dialog
}

if (invoiceCount > 0) {
  return <RequestArchiveButton /> // Opens archive request form panel
}

return null; // Shouldn't happen
```

**Button Variants**:

1. **Direct Archive** (admin + 0 invoices)
   - Label: "Archive"
   - Variant: Destructive (red outline)
   - Icon: Archive
   - Action: Opens confirmation dialog → calls `archiveVendor(id)` directly

2. **Request Archive** (any user + >0 invoices)
   - Label: "Request Archive"
   - Variant: Default (blue)
   - Icon: Send
   - Action: Opens `ArchiveRequestFormPanel`

3. **Pending** (pending request exists)
   - Label: "Request Pending"
   - Variant: Secondary (grey)
   - Icon: Clock
   - Disabled: true
   - Shows "Cancel Request" button below

4. **Restore** (entity archived)
   - Label: "Restore"
   - Variant: Default (green)
   - Icon: RefreshCw
   - Action: Opens confirmation dialog → calls `restoreVendor(id)`

**Dependencies**:
- `@/hooks/use-panel` (openPanel)
- `@/hooks/use-vendors` (useArchiveVendor, useRestoreVendor)
- `@/hooks/use-archive-requests` (useCancelArchiveRequest)
- Shadcn UI Button, Dialog components

---

### 2.13 Email Template - Archive Request Created

**File**: `lib/email/templates/archive-request-created.ts`
**Estimated Lines**: ~140
**Purpose**: Email template for notifying admins of new archive request

**Function Signature**:
```typescript
export function archiveRequestCreatedTemplate(data: {
  requestId: number
  entityType: string
  entityName: string
  invoiceCount: number
  requesterName: string
  requesterEmail: string
  reason: string
  reviewUrl: string
}): { html: string; text: string }
```

**Template Structure**:
- **Subject**: `New Archive Request - ${entityType}: ${entityName}`
- **Header**: Grey background, "New Archive Request Awaiting Review"
- **Body**: Table with request details
- **CTA**: "Review Request" button (blue, links to admin panel)
- **Footer**: "Please log in to review and process this request"

**HTML Example**:
```html
<div style="background-color: #f8f9fa; padding: 24px;">
  <h1>New Archive Request</h1>
  <p>A new archive request requires your review.</p>
</div>

<div style="border: 1px solid #e9ecef; padding: 24px;">
  <table>
    <tr>
      <td>Request ID:</td>
      <td>#${requestId}</td>
    </tr>
    <tr>
      <td>Entity:</td>
      <td>${entityName} (${entityType})</td>
    </tr>
    <tr>
      <td>Linked Invoices:</td>
      <td>${invoiceCount}</td>
    </tr>
    <tr>
      <td>Requester:</td>
      <td>${requesterName} (${requesterEmail})</td>
    </tr>
    <tr>
      <td>Reason:</td>
      <td>${reason}</td>
    </tr>
  </table>
</div>

<a href="${reviewUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
  Review Request
</a>
```

**Pattern**: Follows `lib/email/service.ts` template structure

---

### 2.14 Email Template - Archive Request Approved

**File**: `lib/email/templates/archive-request-approved.ts`
**Estimated Lines**: ~130
**Purpose**: Email template for notifying requester of approval

**Function Signature**:
```typescript
export function archiveRequestApprovedTemplate(data: {
  requestId: number
  entityType: string
  entityName: string
  reviewerName: string
  adminNotes?: string
}): { html: string; text: string }
```

**Template Structure**:
- **Subject**: `Archive Request Approved - ${entityType}: ${entityName}`
- **Header**: Green background, "Archive Request Approved ✅"
- **Body**: Table with approval details
- **Admin Notes**: Optional section (only if provided)
- **Footer**: "The entity is now archived and hidden from dropdowns"

**Pattern**: Follows `sendApprovalNotification()` template in `lib/email/service.ts`

---

### 2.15 Email Template - Archive Request Rejected

**File**: `lib/email/templates/archive-request-rejected.ts`
**Estimated Lines**: ~150
**Purpose**: Email template for notifying requester of rejection

**Function Signature**:
```typescript
export function archiveRequestRejectedTemplate(data: {
  requestId: number
  entityType: string
  entityName: string
  reviewerName: string
  rejectionReason: string
}): { html: string; text: string }
```

**Template Structure**:
- **Subject**: `Archive Request Rejected - ${entityType}: ${entityName}`
- **Header**: Red background, "Archive Request Rejected ❌"
- **Body**: Table with rejection details
- **Rejection Reason**: Highlighted box with red border
- **Footer**: "You can create a new request if needed"

**Pattern**: Follows `sendRejectionNotification()` template in `lib/email/service.ts`

---

### 2.16 Admin Archive Requests Page

**File**: `app/(dashboard)/admin/archive-requests/page.tsx`
**Estimated Lines**: ~320
**Purpose**: Full-page admin view for reviewing archive requests

**Structure**:
```typescript
'use client';

export default function ArchiveRequestsPage() {
  const [filters, setFilters] = useState<ArchiveRequestFilters>({});
  const { data, isLoading } = useArchiveRequests(filters);
  const { openPanel } = usePanel();

  // ... component logic

  return (
    <div className="space-y-6">
      <PageHeader title="Archive Requests" />
      <FiltersCard filters={filters} onFilterChange={setFilters} />
      <ArchiveRequestList
        requests={data?.requests}
        onViewRequest={(req) => openPanel('archive-request-detail', { requestId: req.id })}
      />
    </div>
  );
}
```

**Features**:
- Server-side filters (entity type, status, date range)
- Pagination controls
- Quick actions (view, approve, reject)
- Real-time updates (React Query refetch on window focus)
- Empty states for no results

**Dependencies**:
- `@/hooks/use-archive-requests`
- `@/hooks/use-panel`
- `@/components/archive-requests/archive-request-list`
- `@/components/archive-requests/filters-card`

---

## 3. Files to Modify

### 3.1 Master Data Actions - Archive Functions

**File**: `app/actions/master-data.ts`
**Lines to Modify**: 354-409 (archiveVendor), 736-792 (archiveCategory)

**Current Behavior** (archiveVendor, lines 376-381):
```typescript
if (vendor._count.invoices > 0) {
  return {
    success: false,
    error: `Cannot archive vendor with ${vendor._count.invoices} invoice(s)`,
  };
}
```

**New Behavior**:
```typescript
if (vendor._count.invoices > 0) {
  return {
    success: false,
    error: `Cannot directly archive vendor with ${vendor._count.invoices} invoice(s). Please create an archive request for admin approval.`,
  };
}
```

**Analysis**:
- **Change Type**: MODIFY (error message only)
- **Breaking**: NO (same function signature, same error return type)
- **Risk**: LOW (only changes error message text)
- **Lines Changed**: ~6 lines (3 in archiveVendor, 3 in archiveCategory)

**Alternative Approach** (More Integrated):
Instead of just changing the error message, we could route to archive request creation:

```typescript
if (vendor._count.invoices > 0) {
  // Option A: Return error with suggestion (current approach)
  return {
    success: false,
    error: `Cannot directly archive vendor with ${vendor._count.invoices} invoice(s). Please create an archive request for admin approval.`,
  };

  // Option B: Auto-create archive request (not recommended - changes behavior too much)
  // const requestResult = await createArchiveRequest({ ... });
  // return requestResult;
}
```

**Recommendation**: Use Option A (error message change only) to minimize risk.

**Related Functions**:
- `restoreVendor()` (lines 409-462): NO CHANGES (restore permission = any admin, per architecture decision)
- `restoreCategory()` (lines 789-842): NO CHANGES

**Revalidation Paths**: No changes (already correct)

---

### 3.2 Vendor List Component - Archive Button Logic

**File**: `components/master-data/vendor-list.tsx`
**Lines to Modify**: 93-101 (archive button), 31-39 (handleArchive function)

**Current Code** (lines 93-101):
```typescript
<button
  onClick={() => handleArchive(vendor.id)}
  disabled={vendor.invoiceCount > 0}
  className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
  aria-label="Archive vendor"
  title={vendor.invoiceCount > 0 ? 'Cannot archive vendor with invoices' : 'Archive vendor'}
>
  <Archive className="h-4 w-4" />
</button>
```

**New Code**:
Replace entire button section with:
```typescript
<ArchiveButton
  entityType="vendor"
  entityId={vendor.id}
  entityName={vendor.name}
  invoiceCount={vendor.invoiceCount}
  isActive={vendor.is_active}
  userRole={session.user.role} // Need to pass session from parent
  size="sm"
/>
```

**Changes Required**:
1. Import `ArchiveButton` component
2. Remove `handleArchive` function (logic moves to ArchiveButton)
3. Pass user session to component (need to modify props or use context)

**Analysis**:
- **Change Type**: REPLACE (replace button with new component)
- **Breaking**: NO (UI change only, no API changes)
- **Risk**: LOW (isolated component change)
- **Lines Changed**: ~20 lines (remove old code, add new import + component)

**Alternative Approach** (Inline Logic):
Keep existing structure but add conditional logic:

```typescript
{vendor.invoiceCount > 0 ? (
  <button
    onClick={() => openArchiveRequestPanel(vendor)}
    className="..."
    aria-label="Request archive"
  >
    <Send className="h-4 w-4" />
  </button>
) : (
  <button
    onClick={() => handleArchive(vendor.id)}
    className="..."
    aria-label="Archive vendor"
  >
    <Archive className="h-4 w-4" />
  </button>
)}
```

**Recommendation**: Use `ArchiveButton` component for cleaner code and reusability.

---

### 3.3 Category List Component - Archive Button Logic

**File**: `components/master-data/category-list.tsx`
**Lines to Modify**: 93-101 (archive button), 31-39 (handleArchive function)

**Changes**: Same as vendor-list.tsx (replace button with `ArchiveButton` component)

**Lines Changed**: ~20 lines

---

### 3.4 Admin Dashboard - Add Archive Requests Tab

**File**: `app/(dashboard)/admin/page.tsx`
**Lines to Modify**: 130-164 (tabs section)

**Current Tabs** (lines 132-164):
```typescript
<nav className="-mb-px flex space-x-8">
  <button onClick={() => setActiveTab('dashboard')}>
    Dashboard
  </button>
  <button onClick={() => setActiveTab('requests')}>
    Master Data Requests
    {pendingCount > 0 && <span className="...">{pendingCount}</span>}
  </button>
</nav>
```

**New Code** (add third tab):
```typescript
<nav className="-mb-px flex space-x-8">
  <button onClick={() => setActiveTab('dashboard')}>
    Dashboard
  </button>
  <button onClick={() => setActiveTab('requests')}>
    Master Data Requests
    {pendingMasterDataCount > 0 && <span className="...">{pendingMasterDataCount}</span>}
  </button>
  <button onClick={() => setActiveTab('archive-requests')}>
    Archive Requests
    {pendingArchiveCount > 0 && <span className="...">{pendingArchiveCount}</span>}
  </button>
</nav>

{/* Add new tab content */}
{activeTab === 'archive-requests' && (
  <div className="space-y-4">
    <ArchiveRequestList
      filters={archiveFilters}
      onFilterChange={setArchiveFilters}
      onViewRequest={(req) => openPanel('archive-request-detail', { requestId: req.id })}
    />
  </div>
)}
```

**Changes Required**:
1. Add new state: `const [archiveFilters, setArchiveFilters] = useState<ArchiveRequestFilters>({})`
2. Add new pending count: `const [pendingArchiveCount, setPendingArchiveCount] = useState(0)`
3. Load pending archive count in `useEffect`
4. Add new tab button (lines 3-7 above)
5. Add new tab content section (lines 10-18 above)
6. Import `ArchiveRequestList` component

**Analysis**:
- **Change Type**: ADD (new tab, no changes to existing tabs)
- **Breaking**: NO (additive change only)
- **Risk**: LOW (isolated feature addition)
- **Lines Changed**: ~40 lines added

---

### 3.5 Dashboard Shell - Add Sidebar Badge

**File**: Need to locate actual sidebar component (not in layout.tsx)

**Expected Location**:
- `components/layout/dashboard-shell.tsx` OR
- `components/layout/sidebar.tsx`

**Changes Required**:
1. Add pending archive count query:
```typescript
const { data: pendingArchiveCount } = useQuery({
  queryKey: ['pending-archive-count'],
  queryFn: getPendingArchiveRequestsCount,
  refetchInterval: 30000, // 30 seconds
});
```

2. Add menu item with badge:
```typescript
<SidebarItem href="/admin/archive-requests">
  Archive Requests
  {pendingArchiveCount > 0 && (
    <PendingBadge count={pendingArchiveCount} variant="sidebar" />
  )}
</SidebarItem>
```

**Analysis**:
- **Change Type**: ADD (new menu item)
- **Breaking**: NO (additive change only)
- **Risk**: LOW (isolated feature addition)
- **Lines Changed**: ~15 lines added

**Note**: Need to verify admin-only visibility (RBAC check in sidebar rendering)

---

### 3.6 Email Service - Add Archive Request Methods

**File**: `lib/email/service.ts`
**Lines to Add**: After line 389 (after existing methods)

**New Methods**:

1. **sendArchiveRequestCreatedNotification** (~90 lines)
```typescript
async sendArchiveRequestCreatedNotification(
  data: ArchiveRequestCreatedTemplateData
): Promise<EmailResult> {
  const subject = `New Archive Request - ${data.entityType}: ${data.entityName}`;

  const { html, text } = archiveRequestCreatedTemplate(data);

  return this.sendWithRetry({
    to: this.adminEmails,
    subject,
    html,
    text,
    replyTo: data.requesterEmail,
  });
}
```

2. **sendArchiveRequestApprovedNotification** (~80 lines)
3. **sendArchiveRequestRejectedNotification** (~80 lines)

**Changes Required**:
1. Import new template functions
2. Add 3 new methods (total ~250 lines)
3. Update email service instance exports (no change needed)

**Analysis**:
- **Change Type**: ADD (new methods)
- **Breaking**: NO (additive change only, no existing method changes)
- **Risk**: LOW (follows existing pattern)
- **Lines Changed**: ~250 lines added

---

### 3.7 Email Types - Add Archive Request Template Data

**File**: `lib/email/types.ts`
**Lines to Add**: After line 82 (after existing template data types)

**New Types**:

```typescript
/**
 * Template data for archive request created notification
 */
export interface ArchiveRequestCreatedTemplateData {
  requestId: number
  entityType: string
  entityName: string
  invoiceCount: number
  requesterName: string
  requesterEmail: string
  reason: string
  reviewUrl: string
}

/**
 * Template data for archive request approval notification
 */
export interface ArchiveRequestApprovedTemplateData {
  requestId: number
  entityType: string
  entityName: string
  reviewerName: string
  adminNotes?: string
}

/**
 * Template data for archive request rejection notification
 */
export interface ArchiveRequestRejectedTemplateData {
  requestId: number
  entityType: string
  entityName: string
  reviewerName: string
  rejectionReason: string
}
```

**Analysis**:
- **Change Type**: ADD (new types)
- **Breaking**: NO (additive change only)
- **Risk**: NONE (type definitions only)
- **Lines Changed**: ~40 lines added

---

## 4. Contract Boundaries

### 4.1 Server Action Signatures (New Contracts)

**File**: `app/actions/archive-requests.ts`

| Function | Input | Output | RBAC | Breaking? |
|----------|-------|--------|------|-----------|
| `createArchiveRequest` | `{ entity_type, entity_id, reason }` | `ServerActionResult<ArchiveRequest>` | Any authenticated user | N/A (new) |
| `getArchiveRequests` | `{ status?, entity_type?, page, per_page }` | `ServerActionResult<{ requests[], pagination }>` | Admin only | N/A (new) |
| `getArchiveRequestById` | `number` (request ID) | `ServerActionResult<ArchiveRequestWithDetails>` | Requester or admin | N/A (new) |
| `cancelArchiveRequest` | `number` (request ID) | `ServerActionResult<void>` | Requester or admin | N/A (new) |
| `approveArchiveRequest` | `{ requestId, adminNotes? }` | `ServerActionResult<void>` | Admin only | N/A (new) |
| `rejectArchiveRequest` | `{ requestId, rejectionReason }` | `ServerActionResult<void>` | Admin only | N/A (new) |
| `getEntityArchiveHistory` | `{ entityType, entityId }` | `ServerActionResult<ArchiveRequestWithDetails[]>` | Any authenticated user | N/A (new) |
| `getPendingArchiveRequestsCount` | `void` | `ServerActionResult<number>` | Admin only | N/A (new) |

**Contract Stability**: All new contracts, no breaking changes to existing APIs.

---

### 4.2 Modified Server Action Contracts

**File**: `app/actions/master-data.ts`

| Function | Before | After | Breaking? | Migration Path |
|----------|--------|-------|-----------|----------------|
| `archiveVendor` | Error: "Cannot archive vendor with X invoice(s)" | Error: "Cannot directly archive... Please create archive request" | **NO** | Same function signature, same error return type. Only error message text changed. Clients already handle error case. |
| `archiveCategory` | Error: "Cannot archive category with X invoice(s)" | Error: "Cannot directly archive... Please create archive request" | **NO** | Same as above |

**Backward Compatibility**: ✅ MAINTAINED
- Same function signatures
- Same return types (`ServerActionResult<void>`)
- Same error handling pattern (clients already handle `success: false` case)
- Only change: Error message text (not a breaking change for clients)

**Consumer Impact**: NONE
- Existing error handling code will continue to work
- Error toast will show new message (user-visible change, but not a code break)

---

### 4.3 Component Prop Contracts

**Modified Components**:

1. **VendorList** (components/master-data/vendor-list.tsx)
   - **Before**: No props change, internal button logic
   - **After**: May need `userRole` prop or use auth context
   - **Breaking**: Potentially YES if parent doesn't pass role
   - **Mitigation**: Use `useAuth` hook internally instead of prop

2. **CategoryList** (components/master-data/category-list.tsx)
   - Same as VendorList

**New Component Props** (no breaking changes, all new):
- `ArchiveButton`: `{ entityType, entityId, entityName, invoiceCount, isActive, userRole, hasPendingRequest?, size? }`
- `ArchiveRequestFormPanel`: `{ entityType, entityId, entityName, invoiceCount, onClose }`
- `ArchiveRequestDetailPanel`: `{ requestId, onClose }`
- `ArchiveRequestList`: `{ filters, onFilterChange, onViewRequest }`
- `ArchiveHistoryTimeline`: `{ entityType, entityId }`

---

### 4.4 React Query Cache Keys

**New Cache Keys** (all new, no conflicts):
- `['archive-requests', filters]` - Archive request list
- `['archive-request', requestId]` - Single archive request
- `['archive-history', entityType, entityId]` - Entity archive history
- `['pending-archive-count']` - Pending count for badge

**Invalidation Dependencies**:
- Approve/Reject: Invalidates `archive-requests`, `pending-archive-count`, `vendors`, `categories`
- Create: Invalidates `archive-requests`, `pending-archive-count`
- Cancel: Invalidates `archive-requests`, `pending-archive-count`

**Conflict Risk**: NONE (all new cache keys)

---

### 4.5 Panel System Contracts

**New Panel Types** (all new, no conflicts):
- `archive-request-form` - Opens ArchiveRequestFormPanel
- `archive-request-detail` - Opens ArchiveRequestDetailPanel

**Panel Routing** (modify `components/panels/panel-provider.tsx`):
```typescript
// Add new routing case
if (type.startsWith('archive-')) {
  return (
    <ArchiveRequestPanelRenderer
      id={id}
      type={type}
      props={props}
      onClose={onClose}
    />
  );
}
```

**Breaking**: NO (additive routing only)

---

### 4.6 Email Service Contracts

**New Email Methods** (additive only):
- `sendArchiveRequestCreatedNotification(data)` - To admins
- `sendArchiveRequestApprovedNotification(requesterEmail, data)` - To requester
- `sendArchiveRequestRejectedNotification(requesterEmail, data)` - To requester

**Email Template Data Types** (additive only):
- `ArchiveRequestCreatedTemplateData`
- `ArchiveRequestApprovedTemplateData`
- `ArchiveRequestRejectedTemplateData`

**Breaking**: NO (all new methods and types)

---

## 5. Integration Points

### 5.1 Sprint 8: Master Data Management

**Modified Files**:
- `app/actions/master-data.ts` - Error message change in archive functions

**Integration Strategy**:
1. Keep existing `archiveVendor()` and `archiveCategory()` signatures
2. Only change error message text (no logic change)
3. Direct archive (0 invoices) continues to work exactly as before
4. Archive request workflow is separate (new server actions)

**Test Coverage Required**:
- Verify direct archive still works for 0 invoices (admin only)
- Verify new error message appears for >0 invoices
- Verify existing clients handle error case correctly

**Risk Mitigation**:
- Deploy archive request workflow first (all new code)
- Then deploy error message change (minimal risk)
- Rollback: Revert error message text if issues found

---

### 5.2 Sprint 5: Email Notifications

**Used Components**:
- `lib/email/service.ts` - EmailService class
- `lib/email/config.ts` - Email configuration
- `lib/email/types.ts` - Email type definitions

**New Email Methods** (3 total):
1. `sendArchiveRequestCreatedNotification()` - To admins when request created
2. `sendArchiveRequestApprovedNotification()` - To requester when approved
3. `sendArchiveRequestRejectedNotification()` - To requester when rejected

**Template Pattern** (follows existing Sprint 5 patterns):
- HTML + text email templates
- Inline CSS for styling
- Fire-and-forget async sending
- Retry logic with exponential backoff
- Preview mode for development

**Environment Variables** (existing, no changes needed):
- `ADMIN_EMAILS` - Comma-separated admin emails (already exists)
- `EMAIL_FROM` - Sender email address (already exists)
- `RESEND_API_KEY` - Resend API key (already exists)
- `EMAIL_ENABLED` - Enable/disable emails (already exists)

**Integration Points**:
- Call `emailService.sendArchiveRequestCreatedNotification()` from `createArchiveRequest()` server action
- Call `emailService.sendArchiveRequestApprovedNotification()` from `approveArchiveRequest()` server action
- Call `emailService.sendArchiveRequestRejectedNotification()` from `rejectArchiveRequest()` server action

**Risk**: LOW (follows proven pattern from Sprint 5)

---

### 5.3 Sprint 2: Panel System

**Used Components**:
- `components/panels/panel-provider.tsx` - Panel routing
- `components/panels/panel-container.tsx` - Panel rendering
- `hooks/use-panel.ts` - Panel state management

**New Panel Types**:
1. `archive-request-form` - Opens ArchiveRequestFormPanel (Level 2, 700px)
2. `archive-request-detail` - Opens ArchiveRequestDetailPanel (Level 2, 700px)

**Panel Renderer** (create new file):
```typescript
// components/archive-requests/archive-request-panel-renderer.tsx
export function ArchiveRequestPanelRenderer({ id, type, props, onClose }) {
  if (type === 'archive-request-form') {
    return <ArchiveRequestFormPanel {...props} onClose={onClose} />;
  }

  if (type === 'archive-request-detail') {
    return <ArchiveRequestDetailPanel {...props} onClose={onClose} />;
  }

  return null;
}
```

**Modify Panel Provider** (add routing):
```typescript
// components/panels/panel-provider.tsx
if (type.startsWith('archive-')) {
  return (
    <ArchiveRequestPanelRenderer
      id={id}
      type={type}
      props={props}
      onClose={onClose}
    />
  );
}
```

**Usage Example**:
```typescript
// In vendor-list.tsx
const { openPanel } = usePanel();

const handleRequestArchive = (vendor) => {
  openPanel('archive-request-form', {
    entityType: 'vendor',
    entityId: vendor.id,
    entityName: vendor.name,
    invoiceCount: vendor.invoiceCount,
  });
};
```

**Risk**: LOW (follows proven panel pattern)

---

### 5.4 Database: ArchiveRequest Table

**Schema**: `prisma/schema.prisma` (lines 277-300)

**Usage**:
- Read: `getArchiveRequests()`, `getArchiveRequestById()`, `getEntityArchiveHistory()`
- Write: `createArchiveRequest()`, `approveArchiveRequest()`, `rejectArchiveRequest()`, `cancelArchiveRequest()`

**Indexes Used**:
- `idx_archive_requests_status` - Filter by status (pending, approved, rejected)
- `idx_archive_requests_entity` - Lookup by entity type and ID
- `idx_archive_requests_requested_by` - Filter by requester
- `idx_archive_requests_pending` - Optimized for pending list (status + sort by date)

**Entity Relationships**:
- Dynamic joins based on `entity_type` field:
  - `vendor` → `db.vendor.findUnique()`
  - `category` → `db.category.findUnique()`
  - `invoice_profile` → `db.invoiceProfile.findUnique()`
  - `payment_type` → `db.paymentType.findUnique()`

**Migration**: NOT REQUIRED (schema already exists)

**Note**: `payment_type` not in schema enum, but SQLite stores as TEXT anyway (app-level validation via Zod)

---

## 6. Risk Assessment

### 6.1 HIGH RISK: Breaking Sprint 8 Direct Archive Functionality

**Description**:
Modifying `archiveVendor()` and `archiveCategory()` functions could break existing direct archive workflow for entities with 0 invoices.

**Likelihood**: MEDIUM
**Impact**: HIGH (breaks admin workflow)

**Affected Components**:
- `app/actions/master-data.ts` (lines 354-409, 736-792)
- `components/master-data/vendor-list.tsx` (archive button)
- `components/master-data/category-list.tsx` (archive button)

**Mitigation Strategy**:

1. **Minimal Change Approach**:
   - Only change error message text for >0 invoices case
   - Keep exact same logic for 0 invoices case (no changes)
   - Example:
     ```typescript
     // BEFORE
     if (vendor._count.invoices > 0) {
       return { success: false, error: `Cannot archive vendor with ${vendor._count.invoices} invoice(s)` };
     }

     // AFTER (only message changed)
     if (vendor._count.invoices > 0) {
       return { success: false, error: `Cannot directly archive vendor with ${vendor._count.invoices} invoice(s). Please create an archive request for admin approval.` };
     }

     // Direct archive logic (NO CHANGES)
     await db.vendor.update({ where: { id }, data: { is_active: false } });
     ```

2. **Test Coverage**:
   - Add integration test: Admin archives vendor with 0 invoices (should succeed)
   - Add integration test: Admin archives vendor with >0 invoices (should fail with new error message)
   - Add integration test: Existing archive button behavior (disabled for >0 invoices)

3. **Rollback Plan**:
   - If direct archive breaks, revert error message change
   - Archive request workflow is separate (no rollback needed)

4. **Deployment Sequence**:
   - Step 1: Deploy archive request workflow (all new code, no risk)
   - Step 2: Test archive request workflow thoroughly
   - Step 3: Deploy error message change (minimal change, low risk)
   - Step 4: Monitor for issues, rollback if needed

**Residual Risk**: LOW (after mitigation)

---

### 6.2 MEDIUM RISK: Race Conditions on Approval

**Description**:
Multiple admins could attempt to approve the same archive request simultaneously, potentially causing:
- Duplicate archival attempts
- Transaction conflicts
- Inconsistent state

**Likelihood**: MEDIUM (if multiple admins reviewing at same time)
**Impact**: MEDIUM (could result in errors, but no data loss)

**Affected Components**:
- `app/actions/admin/archive-approval.ts` (approveArchiveRequest function)

**Mitigation Strategy**:

1. **Database Transaction with Isolation**:
   ```typescript
   await db.$transaction(async (tx) => {
     // 1. Lock row (SELECT FOR UPDATE equivalent)
     const request = await tx.archiveRequest.findUnique({
       where: { id: requestId },
     });

     // 2. Check status (abort if not pending)
     if (request.status !== 'pending') {
       throw new Error('Request already processed');
     }

     // 3. Archive entity + update request atomically
     await tx.vendor.update({ ... });
     await tx.archiveRequest.update({ ... });
   });
   ```

2. **Optimistic Locking**:
   - Check status before and after transaction
   - Return error if status changed during transaction

3. **UI Feedback**:
   - Disable approve button immediately on click (prevent double-click)
   - Show loading spinner during approval
   - Invalidate cache on success/error to refresh list

4. **Error Handling**:
   ```typescript
   try {
     await approveArchiveRequest(requestId);
   } catch (error) {
     if (error.message.includes('already processed')) {
       toast.info('This request was already processed by another admin');
     } else {
       toast.error('Failed to approve request');
     }
   }
   ```

**Residual Risk**: LOW (after mitigation)

---

### 6.3 MEDIUM RISK: Email Notification Failures Blocking Workflow

**Description**:
If email sending fails (Resend API down, invalid admin emails, etc.), the workflow could:
- Block request creation (if email send is awaited)
- Leave state inconsistent (request created but no email sent)
- Create poor user experience (long wait times)

**Likelihood**: LOW (Resend has good uptime)
**Impact**: MEDIUM (degrades user experience, but workflow continues)

**Affected Components**:
- `app/actions/archive-requests.ts` (createArchiveRequest, approveArchiveRequest, rejectArchiveRequest)

**Mitigation Strategy**:

1. **Fire-and-Forget Pattern**:
   ```typescript
   // DO NOT await email send
   emailService.sendArchiveRequestCreatedNotification(data)
     .catch((error) => {
       console.error('Failed to send archive request email:', error);
       // Log to monitoring service (e.g., Sentry)
     });

   // Continue workflow immediately
   return { success: true, data: request };
   ```

2. **Email Service Defensive Initialization**:
   - Email service already handles missing API key gracefully
   - Returns `{ success: false, error: 'Email service not configured' }` if Resend not initialized
   - Does not throw exceptions

3. **Retry Logic**:
   - Email service already has built-in retry with exponential backoff (3 attempts)
   - Configured in `lib/email/config.ts`

4. **Monitoring**:
   - Log email failures to console (already implemented)
   - Add metrics tracking:
     - Email send success rate
     - Email send latency
     - Email failure reasons

5. **Graceful Degradation**:
   - If email service unavailable, workflow continues
   - Admin can still review requests via UI
   - Requester can check status in UI

**Residual Risk**: LOW (after mitigation)

---

### 6.4 LOW RISK: Performance Issues with N+1 Queries

**Description**:
Archive request list view could trigger N+1 queries when loading entity names and invoice counts for each request:
- Query 1: Load all archive requests
- Query 2-N: Load entity name for each request (1 query per request)
- Query N+1-2N: Load invoice count for each entity (1 query per request)

**Likelihood**: MEDIUM (if not optimized)
**Impact**: LOW (slow page load, but no functional issues)

**Affected Components**:
- `app/actions/archive-requests.ts` (getArchiveRequests function)

**Mitigation Strategy**:

1. **Batch Queries with Promise.all**:
   ```typescript
   // Load all requests first
   const requests = await db.archiveRequest.findMany({ where, include: { requester: true, reviewer: true } });

   // Group by entity type
   const vendorIds = requests.filter(r => r.entity_type === 'vendor').map(r => r.entity_id);
   const categoryIds = requests.filter(r => r.entity_type === 'category').map(r => r.entity_id);

   // Batch load entities (2 queries instead of N)
   const [vendors, categories] = await Promise.all([
     db.vendor.findMany({
       where: { id: { in: vendorIds } },
       include: { _count: { select: { invoices: true } } },
     }),
     db.category.findMany({
       where: { id: { in: categoryIds } },
       include: { _count: { select: { invoices: true } } },
     }),
   ]);

   // Map entity data to requests in memory
   const vendorMap = new Map(vendors.map(v => [v.id, v]));
   const categoryMap = new Map(categories.map(c => [c.id, c]));

   const requestsWithDetails = requests.map(request => {
     const entityData = request.entity_type === 'vendor'
       ? vendorMap.get(request.entity_id)
       : categoryMap.get(request.entity_id);

     return {
       ...request,
       entity_name: entityData?.name || 'Unknown',
       entity_invoice_count: entityData?._count?.invoices || 0,
     };
   });
   ```

2. **Database Indexes**:
   - Existing indexes already cover common queries:
     - `idx_archive_requests_status` - Filter by status
     - `idx_archive_requests_entity` - Lookup by entity
   - Prisma will use `vendor.id` and `category.id` primary key indexes for batch lookups

3. **Pagination**:
   - Limit results to 20 per page (already in schema)
   - Batch query optimization most effective for <100 requests

4. **Caching**:
   - React Query caches results for 30 seconds (staleTime)
   - Refetch only on mutation success or manual refresh

**Residual Risk**: VERY LOW (after optimization)

---

## 7. Touch Budget

### 7.1 New Code Breakdown

| Category | Files | Estimated Lines | Notes |
|----------|-------|-----------------|-------|
| **Server Actions** | 2 | 1,250 | archive-requests.ts (850), archive-approval.ts (400) |
| **Validation & Types** | 2 | 200 | validations (120), types (80) |
| **React Hooks** | 1 | 320 | use-archive-requests.ts |
| **UI Components** | 8 | 1,510 | Form panel (200), detail panel (240), list (280), history (170), rejection dialog (140), archive button (190), pending badge (70), filters card (120), panel renderer (100) |
| **Email Templates** | 3 | 420 | Created (140), approved (130), rejected (150) |
| **Admin Page** | 1 | 320 | archive-requests page |
| **TOTAL NEW** | **17** | **4,020** | |

### 7.2 Modified Code Breakdown

| File | Lines Modified | Type of Change | Risk |
|------|----------------|----------------|------|
| `app/actions/master-data.ts` | 6 | Error message text | Low |
| `components/master-data/vendor-list.tsx` | 25 | Replace button with component | Low |
| `components/master-data/category-list.tsx` | 25 | Replace button with component | Low |
| `app/(dashboard)/admin/page.tsx` | 45 | Add new tab | Low |
| `components/panels/panel-provider.tsx` | 15 | Add panel routing | Low |
| Sidebar component (TBD) | 20 | Add menu item with badge | Low |
| `lib/email/service.ts` | 250 | Add 3 new methods | Low |
| `lib/email/types.ts` | 40 | Add 3 new types | Low |
| **TOTAL MODIFIED** | **426** | | |

### 7.3 Total Touch Budget

| Category | Lines |
|----------|-------|
| New Code | 4,020 |
| Modified Code | 426 |
| **TOTAL TOUCH** | **4,446** |

### 7.4 Comparison to Estimate

| Metric | Estimate (11 SP) | Actual Analysis | Delta | Status |
|--------|------------------|-----------------|-------|--------|
| Story Points | 11 SP | 11 SP | 0 | ✅ On target |
| Total Lines | 2,000-2,500 | 4,446 | +1,946 | ⚠️ Over estimate |
| New Files | ~11 files | 17 files | +6 | ⚠️ Over estimate |
| Modified Files | ~7 files | 8 files | +1 | ✅ Close |

### 7.5 Analysis: Why Higher Line Count?

**Original Estimate**: 2,000-2,500 lines (11 SP)
**Actual Analysis**: 4,446 lines

**Factors Contributing to Higher Count**:

1. **Email Templates** (420 lines vs ~200 estimated):
   - Requirements specify HTML + text templates with inline CSS
   - Each template ~140 lines (not 60-80 lines)
   - Factor: 2x more detailed than estimated

2. **UI Components** (1,510 lines vs ~800 estimated):
   - Requirements specify detailed UI with validation, loading states, etc.
   - Archive button is "smart" component with complex logic (190 lines vs ~80 estimated)
   - Form and detail panels have extensive features (character counters, validation, etc.)
   - Factor: ~2x more detailed than estimated

3. **Server Actions** (1,250 lines vs ~900 estimated):
   - 8 server actions instead of 6
   - Added `getPendingArchiveRequestsCount()` for badge
   - Added `getEntityArchiveHistory()` for timeline
   - More extensive error handling and validation
   - Factor: 1.4x more comprehensive

4. **Additional Files**:
   - Panel renderer component (100 lines) - not in original estimate
   - Filters card component (120 lines) - not in original estimate
   - More granular component breakdown

**Conclusion**:
- **Scope unchanged** (all features from requirements)
- **Implementation more detailed** (production-ready vs MVP estimate)
- **Story points still accurate** (complexity captured correctly)
- **Line count higher due to**:
  - Detailed UI requirements
  - Comprehensive error handling
  - Production-ready patterns (retry logic, validation, etc.)

**Recommendation**:
- Proceed with 11 SP estimate (captures complexity correctly)
- Note that line count metrics can vary based on implementation detail
- Focus on functional completeness over line count targets

---

## 8. Implementation Sequence

### Phase 1: Foundation (No Dependencies)

**Goal**: Create all new files and types without modifying existing code

**Files to Create**:
1. `types/archive-request.ts` - Type definitions
2. `lib/validations/archive-request.ts` - Zod schemas
3. `lib/email/types.ts` - Add email template data types (modify)
4. `lib/email/templates/archive-request-created.ts` - Email template
5. `lib/email/templates/archive-request-approved.ts` - Email template
6. `lib/email/templates/archive-request-rejected.ts` - Email template

**Validation**:
- Run `npm run typecheck` (should pass)
- No functional changes yet

**Checkpoint**: All types and schemas defined, no runtime changes

---

### Phase 2: Server Actions (Core Logic)

**Goal**: Implement all server actions and email methods

**Files to Create**:
1. `app/actions/archive-requests.ts` - CRUD operations
2. `app/actions/admin/archive-approval.ts` - Approval/rejection logic
3. `lib/email/service.ts` - Add 3 new email methods (modify)

**Testing**:
- Unit tests for validation schemas
- Integration tests for server actions:
  - Create archive request
  - Get archive requests (with filters)
  - Approve/reject archive request
  - Cancel archive request
  - Get archive history

**Validation**:
- Run `npm run test`
- Test email sending in preview mode
- Verify database transactions work correctly

**Checkpoint**: All server logic working, no UI changes yet

---

### Phase 3: React Hooks (Data Layer)

**Goal**: Create React Query hooks for all server actions

**Files to Create**:
1. `hooks/use-archive-requests.ts` - All React Query hooks

**Testing**:
- Test cache invalidation logic
- Test optimistic updates
- Test error handling

**Validation**:
- Run `npm run typecheck`
- Hooks compile without errors

**Checkpoint**: Data layer complete, ready for UI components

---

### Phase 4: UI Components (Display Layer)

**Goal**: Create all UI components without integrating into existing pages

**Files to Create**:
1. `components/archive-requests/archive-request-form-panel.tsx`
2. `components/archive-requests/archive-request-detail-panel.tsx`
3. `components/archive-requests/archive-request-list.tsx`
4. `components/archive-requests/archive-history-timeline.tsx`
5. `components/archive-requests/rejection-reason-dialog.tsx`
6. `components/archive-requests/pending-badge.tsx`
7. `components/archive-requests/archive-button.tsx`
8. `components/archive-requests/filters-card.tsx`
9. `components/archive-requests/archive-request-panel-renderer.tsx`

**Testing**:
- Storybook stories for each component
- Test form validation (react-hook-form + Zod)
- Test loading/error states

**Validation**:
- Run `npm run build` (should pass)
- Components render correctly in isolation

**Checkpoint**: All UI components built, not yet integrated

---

### Phase 5: Admin Page (New Route)

**Goal**: Create standalone admin archive requests page

**Files to Create**:
1. `app/(dashboard)/admin/archive-requests/page.tsx`

**Testing**:
- Navigate to `/admin/archive-requests`
- Test filters (entity type, status, date range)
- Test pagination
- Test quick actions (view, approve, reject)

**Validation**:
- Page accessible only to admins
- All features working end-to-end

**Checkpoint**: Full archive request workflow functional (standalone page)

---

### Phase 6: Integration with Existing UI

**Goal**: Integrate archive request workflow into existing vendor/category lists and admin dashboard

**Files to Modify**:
1. `components/master-data/vendor-list.tsx` - Replace archive button
2. `components/master-data/category-list.tsx` - Replace archive button
3. `app/(dashboard)/admin/page.tsx` - Add archive requests tab
4. `components/panels/panel-provider.tsx` - Add panel routing
5. Sidebar component - Add menu item with badge (locate first)

**Testing**:
- Test archive button logic (0 invoices vs >0 invoices)
- Test pending badge updates
- Test tab navigation
- Test panel opening/closing

**Validation**:
- Run full regression test suite
- Verify Sprint 8 direct archive still works

**Checkpoint**: UI integration complete, all features working

---

### Phase 7: Master Data Action Changes (Final Step)

**Goal**: Change error messages in existing archive functions (breaking change isolated)

**Files to Modify**:
1. `app/actions/master-data.ts` - Change error messages (6 lines)

**Testing**:
- Test direct archive (0 invoices) - should still work
- Test archive attempt (>0 invoices) - should show new error message
- Test existing archive button behavior

**Validation**:
- Run integration tests
- Verify no regressions

**Checkpoint**: All changes deployed, Sprint 9 complete

---

### Rollback Strategy

**If issues found in Phase 7**:
1. Revert `app/actions/master-data.ts` error message changes
2. Archive request workflow continues to work (separate code)
3. Users see old error message temporarily

**If issues found in Phase 6**:
1. Revert UI integration changes (phases 1-5 unaffected)
2. Archive request workflow still accessible via standalone page

**If issues found in phases 1-5**:
1. Revert entire feature (all new code, no impact on existing features)

---

## 9. Summary & Recommendations

### Critical Success Factors

1. **Minimal Changes to Sprint 8 Code**:
   - Only change error message text (6 lines)
   - Keep direct archive logic untouched
   - Test thoroughly before deploying

2. **Transaction Safety**:
   - Use Prisma transactions for approval workflow
   - Re-validate invoice count inside transaction
   - Handle race conditions gracefully

3. **Email Reliability**:
   - Fire-and-forget pattern (don't block workflow)
   - Graceful degradation if email service unavailable
   - Monitor email send success rate

4. **Performance Optimization**:
   - Batch queries for archive request list
   - Use existing database indexes
   - Paginate results (20 per page)

### Pre-Implementation Checklist

- [ ] Verify ArchiveRequest table exists in database
- [ ] Confirm `ADMIN_EMAILS` environment variable is set
- [ ] Verify email service is configured (Resend API key)
- [ ] Locate sidebar component file (not in layout.tsx)
- [ ] Review Sprint 8 direct archive functionality (integration tests)
- [ ] Set up monitoring for email send failures
- [ ] Create Storybook environment for new components

### Post-Implementation Checklist

- [ ] Integration tests pass (direct archive still works)
- [ ] Email notifications sent correctly (test all 3 templates)
- [ ] Pending badge updates in real-time (sidebar + admin dashboard)
- [ ] Archive request workflow works end-to-end (create → approve/reject → archive)
- [ ] Race condition handling works (multiple admins approve simultaneously)
- [ ] Performance acceptable (<500ms for request list with 100 requests)
- [ ] Rollback plan tested (can revert error message change safely)

### Risks to Monitor

1. **Sprint 8 Integration** (HIGH → LOW after mitigation):
   - Watch for direct archive failures (0 invoices case)
   - Monitor error message changes (user feedback)

2. **Race Conditions** (MEDIUM → LOW after mitigation):
   - Watch for transaction conflicts
   - Monitor duplicate approval attempts

3. **Email Failures** (MEDIUM → LOW after mitigation):
   - Watch for email send errors
   - Monitor email service uptime

4. **Performance** (LOW → VERY LOW after optimization):
   - Watch for slow page loads (request list)
   - Monitor database query patterns (N+1 queries)

---

**Change Map Completed**: 2025-10-16
**Ready for Implementation**: ✅ YES
**Estimated Implementation Time**: 11 SP (~55-66 hours)
**Recommended Start**: After Sprint 8 stabilization

---

## Appendix: Quick Reference

### New Files Summary
```
app/
  actions/
    archive-requests.ts (850 lines)
    admin/
      archive-approval.ts (400 lines)
  (dashboard)/
    admin/
      archive-requests/
        page.tsx (320 lines)

components/
  archive-requests/
    archive-request-form-panel.tsx (200 lines)
    archive-request-detail-panel.tsx (240 lines)
    archive-request-list.tsx (280 lines)
    archive-history-timeline.tsx (170 lines)
    rejection-reason-dialog.tsx (140 lines)
    pending-badge.tsx (70 lines)
    archive-button.tsx (190 lines)
    filters-card.tsx (120 lines)
    archive-request-panel-renderer.tsx (100 lines)

hooks/
  use-archive-requests.ts (320 lines)

lib/
  validations/
    archive-request.ts (120 lines)
  email/
    templates/
      archive-request-created.ts (140 lines)
      archive-request-approved.ts (130 lines)
      archive-request-rejected.ts (150 lines)

types/
  archive-request.ts (80 lines)

TOTAL: 17 new files, 4,020 lines
```

### Modified Files Summary
```
app/actions/master-data.ts (6 lines changed)
components/master-data/vendor-list.tsx (25 lines changed)
components/master-data/category-list.tsx (25 lines changed)
app/(dashboard)/admin/page.tsx (45 lines added)
components/panels/panel-provider.tsx (15 lines added)
lib/email/service.ts (250 lines added)
lib/email/types.ts (40 lines added)
[Sidebar component TBD] (20 lines added)

TOTAL: 8 modified files, 426 lines changed
```

### Key Metrics
- **Total Touch**: 4,446 lines (4,020 new + 426 modified)
- **Story Points**: 11 SP
- **Estimated Time**: 55-66 hours (5-6 hours per SP)
- **Risk Level**: MEDIUM (requires careful Sprint 8 integration)
- **Breaking Changes**: NONE (error message text change only)
