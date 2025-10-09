# PayLog API Documentation

## Overview

PayLog uses **Next.js Server Actions** for all data mutations (create, update, delete). This provides:
- End-to-end type safety
- Built-in CSRF protection
- Simpler codebase (no separate API layer)
- Progressive enhancement support

All Server Actions are located in `app/actions/`.

---

## Invoice Actions

**File**: `app/actions/invoices.ts`

### getInvoices

Fetch all invoices with optional filtering.

**Parameters**:
```typescript
interface GetInvoicesParams {
  status?: string;           // Filter by status
  isHidden?: boolean;        // Include/exclude hidden invoices
  userId?: number;           // Filter by creator (standard users see own only)
}
```

**Returns**:
```typescript
{
  data?: Invoice[];          // Array of invoices
  error?: string;            // Error message if failed
}
```

**Example**:
```typescript
'use client';

import { getInvoices } from '@/app/actions/invoices';

const result = await getInvoices({ status: 'pending_approval' });
if (result.error) {
  console.error(result.error);
} else {
  console.log(result.data); // Invoice[]
}
```

**RBAC**:
- **standard_user**: See own invoices only
- **admin/super_admin**: See all invoices

---

### getInvoiceById

Fetch a single invoice by ID.

**Parameters**:
```typescript
interface GetInvoiceByIdParams {
  id: number;
}
```

**Returns**:
```typescript
{
  data?: Invoice & {
    vendor: Vendor | null;
    category: Category | null;
    profile: InvoiceProfile | null;
    payments: Payment[];
  };
  error?: string;
}
```

**Example**:
```typescript
const result = await getInvoiceById({ id: 123 });
if (result.data) {
  console.log(result.data.invoice_number); // "INV-001"
  console.log(result.data.vendor?.name);   // "Acme Corp"
  console.log(result.data.payments);       // Payment[]
}
```

**RBAC**:
- Users can only view invoices they have permission to see
- Respects profile visibility rules

---

### createInvoice

Create a new invoice.

**Parameters**:
```typescript
interface CreateInvoiceData {
  invoice_number: string;    // Required, unique
  invoice_amount: number;    // Required, positive
  vendor_id: number;         // **REQUIRED** (changed in v0.2.2)
  invoice_date?: Date;       // Optional
  due_date?: Date;           // Optional
  period_start?: Date;       // **NEW** - Service period start
  period_end?: Date;         // **NEW** - Service period end
  tds_applicable?: boolean;  // **NEW** - TDS flag (default: false)
  sub_entity_id?: number;    // **NEW** - Division/department/branch
  notes?: string;            // **NEW** - Internal notes
  category_id?: number;      // Optional
  profile_id?: number;       // Optional
  status?: string;           // Default: "pending_approval"
}
```

**Returns**:
```typescript
{
  data?: Invoice;            // Created invoice
  error?: string;            // Validation or database error
}
```

**Example**:
```typescript
const result = await createInvoice({
  invoice_number: 'INV-001',
  invoice_amount: 1500.00,
  invoice_date: new Date('2025-10-01'),
  due_date: new Date('2025-10-31'),
  vendor_id: 1,
  category_id: 2,
  profile_id: 1,
});

if (result.error) {
  toast.error(result.error);
} else {
  toast.success('Invoice created!');
  router.push(`/invoices`);
}
```

**Validation**:
- `invoice_number`: Required, unique, max 50 chars
- `invoice_amount`: Required, positive number
- `vendor_id`: **REQUIRED** (changed in v0.2.2), must exist in vendors table
- `invoice_date`: Optional, valid date
- `due_date`: Optional, must be >= invoice_date
- `period_start`: Optional, valid date
- `period_end`: Optional, must be >= period_start
- `tds_applicable`: Optional, boolean (default: false)
- `sub_entity_id`: Optional, must exist in sub_entities table
- `notes`: Optional, string
- `category_id`: Optional, must exist in categories table
- `profile_id`: Optional, must exist in invoice_profiles table

**RBAC**:
- All authenticated users can create invoices
- `created_by` automatically set to current user

**Side Effects**:
- Sets `submission_count` to 1
- Sets `last_submission_at` to current timestamp
- Sets `created_at` and `updated_at`

---

### updateInvoice

Update an existing invoice.

**Parameters**:
```typescript
interface UpdateInvoiceData {
  id: number;                // Required, invoice ID
  invoice_number?: string;   // Optional, must be unique
  invoice_amount?: number;   // Optional, positive
  invoice_date?: Date;       // Optional
  due_date?: Date;           // Optional
  vendor_id?: number;        // Optional
  category_id?: number;      // Optional
  profile_id?: number;       // Optional
  status?: string;           // Optional
  hold_reason?: string;      // Optional (on hold workflow)
  rejection_reason?: string; // Optional (rejection workflow)
}
```

**Returns**:
```typescript
{
  data?: Invoice;            // Updated invoice
  error?: string;
}
```

**Example**:
```typescript
const result = await updateInvoice({
  id: 123,
  invoice_amount: 2000.00,
  status: 'approved',
});

if (result.error) {
  toast.error(result.error);
} else {
  toast.success('Invoice updated!');
  queryClient.invalidateQueries(['invoices']);
}
```

**Validation**:
- Same validation rules as `createInvoice`
- `id` must exist
- User must have permission to edit invoice

**RBAC**:
- **standard_user**: Can edit own pending invoices only
- **admin/super_admin**: Can edit any invoice

**Side Effects**:
- Updates `updated_at` timestamp
- If status changes from `rejected` to `pending_approval`:
  - Increments `submission_count`
  - Updates `last_submission_at`
  - Blocks if `submission_count >= 3`

---

### deleteInvoice

Delete an invoice (soft delete recommended).

**Parameters**:
```typescript
interface DeleteInvoiceParams {
  id: number;
}
```

**Returns**:
```typescript
{
  data?: { success: true };
  error?: string;
}
```

**Example**:
```typescript
const result = await deleteInvoice({ id: 123 });

if (result.error) {
  toast.error(result.error);
} else {
  toast.success('Invoice deleted!');
  queryClient.invalidateQueries(['invoices']);
}
```

**RBAC**:
- **standard_user**: Cannot delete invoices
- **admin**: Can delete own invoices
- **super_admin**: Can delete any invoice

**Side Effects**:
- Cascades to related `Payment` records (if implemented)
- Recommended: Soft delete by setting `is_hidden = true`

---

### placeInvoiceOnHold

Place an invoice on hold (admin only).

**Parameters**:
```typescript
interface PlaceOnHoldData {
  id: number;
  hold_reason: string;       // Required
}
```

**Returns**:
```typescript
{
  data?: Invoice;
  error?: string;
}
```

**Example**:
```typescript
const result = await placeInvoiceOnHold({
  id: 123,
  hold_reason: 'Awaiting vendor verification',
});

if (result.data) {
  toast.success('Invoice placed on hold');
}
```

**RBAC**: Admin or super_admin only

**Side Effects**:
- Sets `status = 'on_hold'`
- Sets `hold_reason`, `hold_by`, `hold_at`

---

### releaseInvoiceFromHold

Release an invoice from hold status (admin only).

**Parameters**:
```typescript
interface ReleaseFromHoldParams {
  id: number;
}
```

**Returns**:
```typescript
{
  data?: Invoice;
  error?: string;
}
```

**Example**:
```typescript
const result = await releaseInvoiceFromHold({ id: 123 });
```

**RBAC**: Admin or super_admin only

**Side Effects**:
- Sets `status = 'pending_approval'`
- Clears `hold_reason`, `hold_by`, `hold_at`

---

### rejectInvoice

Reject an invoice with reason.

**Parameters**:
```typescript
interface RejectInvoiceData {
  id: number;
  rejection_reason: string;  // Required
}
```

**Returns**:
```typescript
{
  data?: Invoice;
  error?: string;
}
```

**Example**:
```typescript
const result = await rejectInvoice({
  id: 123,
  rejection_reason: 'Missing vendor details',
});
```

**RBAC**: Admin or super_admin only

**Side Effects**:
- Sets `status = 'rejected'` (not a valid status in schema, should be custom or use hold)
- Sets `rejection_reason`, `rejected_by`, `rejected_at`
- Email notification sent to creator (Sprint 5)

---

### hideInvoice

Hide an invoice from default views (admin only).

**Parameters**:
```typescript
interface HideInvoiceData {
  id: number;
  hidden_reason: string;     // Required
}
```

**Returns**:
```typescript
{
  data?: Invoice;
  error?: string;
}
```

**Example**:
```typescript
const result = await hideInvoice({
  id: 123,
  hidden_reason: 'Duplicate entry',
});
```

**RBAC**: Admin or super_admin only

**Side Effects**:
- Sets `is_hidden = true`
- Sets `hidden_reason`, `hidden_by`, `hidden_at`

---

### unhideInvoice

Unhide a previously hidden invoice.

**Parameters**:
```typescript
interface UnhideInvoiceParams {
  id: number;
}
```

**Returns**:
```typescript
{
  data?: Invoice;
  error?: string;
}
```

**Example**:
```typescript
const result = await unhideInvoice({ id: 123 });
```

**RBAC**: Admin or super_admin only

**Side Effects**:
- Sets `is_hidden = false`
- Clears `hidden_reason`, `hidden_by`, `hidden_at`

---

## Error Handling

All Server Actions follow this pattern:

```typescript
{
  data?: T;      // Success: data returned
  error?: string; // Failure: error message
}
```

**Never throws exceptions**. Always returns an object.

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Unauthorized` | User not logged in | Redirect to login |
| `Forbidden` | Insufficient permissions | Show error message |
| `Validation failed` | Invalid input data | Display validation errors |
| `Not found` | Resource doesn't exist | Show 404 or error state |
| `Database error` | Prisma operation failed | Retry or contact support |

### Client-Side Error Handling

```typescript
'use client';

import { toast } from '@/hooks/use-toast';

async function handleSubmit(data: FormData) {
  const result = await createInvoice(data);

  if (result.error) {
    toast({
      title: 'Error',
      description: result.error,
      variant: 'destructive',
    });
    return;
  }

  toast({
    title: 'Success',
    description: 'Invoice created successfully!',
  });

  // Continue with success flow
  queryClient.invalidateQueries(['invoices']);
  closePanel();
}
```

---

## React Query Integration

### Fetching Data

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/app/actions/invoices';

function InvoiceList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const result = await getInvoices();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState message={error.message} />;

  return <InvoiceTable invoices={data} />;
}
```

### Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvoice } from '@/app/actions/invoices';

function CreateInvoiceForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Invoice created!');
        queryClient.invalidateQueries(['invoices']);
        closePanel();
      }
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Invoice'}
      </Button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateInvoice,
  onMutate: async (updatedInvoice) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['invoices'] });

    // Snapshot current value
    const previousInvoices = queryClient.getQueryData(['invoices']);

    // Optimistically update cache
    queryClient.setQueryData(['invoices'], (old: Invoice[]) =>
      old.map((inv) =>
        inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv
      )
    );

    return { previousInvoices };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['invoices'], context?.previousInvoices);
    toast.error('Failed to update invoice');
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
});
```

---

## Invoice Schema

### Invoice Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | Int | Auto | Primary key |
| `invoice_number` | String | Yes | Unique invoice identifier |
| `vendor_id` | Int | **Yes** | **CHANGED v0.2.2**: Foreign key to Vendor (now required) |
| `invoice_amount` | Float | Yes | Total invoice amount |
| `invoice_date` | DateTime | No | Date invoice was issued |
| `due_date` | DateTime | No | Payment due date |
| **`period_start`** | DateTime | No | **NEW v0.2.2**: Service period start date |
| **`period_end`** | DateTime | No | **NEW v0.2.2**: Service period end date |
| **`tds_applicable`** | Boolean | No | **NEW v0.2.2**: TDS (Tax Deducted at Source) flag |
| **`sub_entity_id`** | Int | No | **NEW v0.2.2**: Foreign key to SubEntity |
| **`notes`** | String | No | **NEW v0.2.2**: Internal notes/descriptions |
| `category_id` | Int | No | Foreign key to Category |
| `profile_id` | Int | No | Foreign key to InvoiceProfile |
| `status` | String | Yes | Invoice status (default: "pending_approval") |
| `hold_reason` | String | No | Reason for hold (admin workflow) |
| `hold_by` | Int | No | User who placed on hold |
| `hold_at` | DateTime | No | Timestamp of hold |
| `submission_count` | Int | Yes | Resubmission counter (default: 1) |
| `last_submission_at` | DateTime | Yes | Last submission timestamp |
| `rejection_reason` | String | No | Reason for rejection |
| `rejected_by` | Int | No | User who rejected |
| `rejected_at` | DateTime | No | Timestamp of rejection |
| `is_hidden` | Boolean | Yes | Hidden flag (default: false) |
| `hidden_by` | Int | No | User who hid invoice |
| `hidden_at` | DateTime | No | Timestamp of hiding |
| `hidden_reason` | String | No | Reason for hiding |
| `created_by` | Int | Yes | Foreign key to User (creator) |
| `created_at` | DateTime | Auto | Record creation timestamp |
| `updated_at` | DateTime | Auto | Last update timestamp |

### SubEntity Endpoints

SubEntity data is included in `getInvoiceFormOptions()` response:

```typescript
// Response format
{
  "success": true,
  "data": {
    "vendors": [...],
    "categories": [...],
    "profiles": [...],
    "subEntities": [  // NEW in v0.2.2
      { "id": 1, "name": "Head Office", "description": "Main office location" },
      { "id": 2, "name": "Branch A", "description": "Branch location A" },
      { "id": 3, "name": "Branch B", "description": "Branch location B" }
    ]
  }
}
```

---

## Type Definitions

### Invoice

```typescript
interface Invoice {
  id: number;
  invoice_number: string;
  vendor_id: number;          // CHANGED: No longer nullable
  category_id: number | null;
  profile_id: number | null;
  invoice_amount: number;
  invoice_date: Date | null;
  due_date: Date | null;
  period_start: Date | null;  // NEW
  period_end: Date | null;    // NEW
  tds_applicable: boolean;    // NEW
  sub_entity_id: number | null; // NEW
  notes: string | null;       // NEW
  status: string;
  hold_reason: string | null;
  hold_by: number | null;
  hold_at: Date | null;
  submission_count: number;
  last_submission_at: Date;
  rejection_reason: string | null;
  rejected_by: number | null;
  rejected_at: Date | null;
  is_hidden: boolean;
  hidden_by: number | null;
  hidden_at: Date | null;
  hidden_reason: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}
```

### SubEntity

```typescript
interface SubEntity {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Payment

```typescript
interface Payment {
  id: number;
  invoice_id: number;
  amount_paid: number;
  payment_date: Date;
  payment_method: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}
```

### Vendor

```typescript
interface Vendor {
  id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Category

```typescript
interface Category {
  id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### InvoiceProfile

```typescript
interface InvoiceProfile {
  id: number;
  name: string;
  description: string | null;
  visible_to_all: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## Validation Schemas (Zod)

**File**: `lib/validations/invoice.ts`

### createInvoiceSchema

```typescript
import { z } from 'zod';

export const createInvoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number required').max(50),
  invoice_amount: z.number().positive('Amount must be positive'),
  invoice_date: z.date().optional().nullable(),
  due_date: z.date().optional().nullable(),
  vendor_id: z.number().int().positive().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  profile_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['pending_approval', 'on_hold', 'unpaid', 'partial', 'paid', 'overdue']).optional(),
}).refine((data) => {
  // Ensure due_date >= invoice_date
  if (data.invoice_date && data.due_date) {
    return data.due_date >= data.invoice_date;
  }
  return true;
}, {
  message: 'Due date must be after invoice date',
  path: ['due_date'],
});
```

### updateInvoiceSchema

```typescript
export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.number().int().positive(),
});
```

---

## Authentication

All Server Actions check authentication automatically:

```typescript
'use server';

import { auth } from '@/lib/auth';

export async function someAction() {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  // Proceed with authenticated logic
}
```

**Session Object**:
```typescript
{
  user: {
    id: number;
    email: string;
    full_name: string;
    role: 'standard_user' | 'admin' | 'super_admin';
  }
}
```

---

## Master Data Request Actions (Sprint 5)

### Overview

Master Data Request actions enable users to request new master data entities (vendors, categories, invoice profiles, payment types) for admin approval.

**Files**:
- User Actions: `app/actions/master-data-requests.ts`
- Admin Actions: `app/actions/admin/master-data-approval.ts`
- Duplicate Detection: `app/api/master-data/check-duplicates/route.ts`

---

### User Actions

#### createRequest

Create a new master data request.

**Parameters**:
```typescript
interface CreateRequestParams {
  entityType: 'vendor' | 'category' | 'invoice_profile' | 'payment_type';
  requestData: Record<string, any>;  // Entity-specific data
  userId: number;
  status?: 'draft' | 'pending_approval';  // Default: 'draft'
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest;
  error?: string;
}
```

**Example**:
```typescript
const result = await createRequest({
  entityType: 'vendor',
  requestData: {
    name: 'Acme Corp',
    tin_number: '12-3456789',
    contact_email: 'billing@acme.com',
    contact_phone: '555-1234'
  },
  userId: session.user.id,
  status: 'pending_approval'
});

if (result.error) {
  toast.error(result.error);
} else {
  toast.success('Vendor request submitted!');
}
```

---

#### getUserRequests

Fetch all requests created by a user.

**Parameters**:
```typescript
interface GetUserRequestsParams {
  userId: number;
  filters?: {
    entityType?: string;
    status?: string;
  };
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest[];
  error?: string;
}
```

**Example**:
```typescript
const result = await getUserRequests({
  userId: session.user.id,
  filters: {
    status: 'pending_approval'
  }
});

// result.data = [{ id: 1, entity_type: 'vendor', status: 'pending_approval', ... }]
```

---

#### getRequestById

Fetch a single request by ID.

**Parameters**:
```typescript
interface GetRequestByIdParams {
  requestId: number;
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest & {
    requested_user: User;
    approved_user?: User;
    previous_attempt?: MasterDataRequest;
  };
  error?: string;
}
```

**Example**:
```typescript
const result = await getRequestById({ requestId: 123 });

if (result.data) {
  console.log(result.data.entity_data);  // JSON string
  console.log(result.data.requested_user.full_name);
}
```

---

#### updateRequest

Update a draft request (only allowed for drafts).

**Parameters**:
```typescript
interface UpdateRequestParams {
  requestId: number;
  requestData: Record<string, any>;
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest;
  error?: string;
}
```

**Example**:
```typescript
const result = await updateRequest({
  requestId: 123,
  requestData: {
    name: 'Acme Corporation',  // Updated name
    tin_number: '12-3456789'
  }
});
```

**Validation**: Only draft requests can be updated.

---

#### submitRequest

Change a draft request to pending approval.

**Parameters**:
```typescript
interface SubmitRequestParams {
  requestId: number;
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest;
  error?: string;
}
```

**Example**:
```typescript
const result = await submitRequest({ requestId: 123 });

if (result.data) {
  toast.success('Request submitted for admin review');
}
```

**Side Effects**:
- Status changes from 'draft' to 'pending_approval'
- Admin team receives notification
- User can no longer edit or delete request

---

#### deleteRequest

Delete a draft request (only allowed for drafts).

**Parameters**:
```typescript
interface DeleteRequestParams {
  requestId: number;
}
```

**Returns**:
```typescript
{
  data?: { success: true };
  error?: string;
}
```

**Example**:
```typescript
const result = await deleteRequest({ requestId: 123 });

if (result.data) {
  toast.success('Draft request deleted');
}
```

**Validation**: Only draft requests can be deleted.

---

#### resubmitRequest

Resubmit a rejected request with changes (max 3 attempts).

**Parameters**:
```typescript
interface ResubmitRequestParams {
  requestId: number;          // Original rejected request
  updatedData: Record<string, any>;  // New request data
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest;  // New request linked to original
  error?: string;
}
```

**Example**:
```typescript
const result = await resubmitRequest({
  requestId: 123,  // Rejected request
  updatedData: {
    name: 'Acme Corp',  // Fixed based on rejection reason
    tin_number: '12-3456789',
    contact_email: 'billing@acmecorp.com'  // Corrected email
  }
});

if (result.error === 'Maximum resubmission attempts reached') {
  toast.error('You have reached the maximum resubmission limit (3 attempts)');
} else if (result.data) {
  toast.success('Request resubmitted for review');
}
```

**Side Effects**:
- Creates new request with `previous_attempt_id` pointing to original
- Increments `resubmission_count`
- Admin sees resubmission history
- Original request remains in database for audit trail

**Validation**:
- Original request must have `status = 'rejected'`
- `resubmission_count` must be < 3
- User must be the original requester

---

### Admin Actions

#### getAdminRequests

Fetch all master data requests pending admin review.

**Parameters**:
```typescript
interface GetAdminRequestsParams {
  filters?: {
    entityType?: string;
    requestedBy?: number;
    status?: 'pending_approval' | 'approved' | 'rejected';
  };
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest[];
  error?: string;
}
```

**Example**:
```typescript
const result = await getAdminRequests({
  filters: {
    entityType: 'vendor',
    status: 'pending_approval'
  }
});

// result.data = [{ id: 1, entity_type: 'vendor', requested_user: {...}, ... }]
```

**RBAC**: Admin or super_admin only

---

#### approveRequest

Approve a master data request and create the entity.

**Parameters**:
```typescript
interface ApproveRequestParams {
  requestId: number;
  adminEdits?: Record<string, any>;  // Optional edits before approval
}
```

**Returns**:
```typescript
{
  data?: {
    request: MasterDataRequest;
    entity: Vendor | Category | InvoiceProfile | PaymentType;
  };
  error?: string;
}
```

**Example**:
```typescript
const result = await approveRequest({
  requestId: 123,
  adminEdits: {
    name: 'Acme Corp',  // Fixed capitalization
    tin_number: '12-3456789'  // Added hyphen
  }
});

if (result.data) {
  const { request, entity } = result.data;
  toast.success(`Vendor "${entity.name}" created!`);
}
```

**Side Effects**:
- Creates new entity in appropriate table (vendors, categories, etc.)
- Sets request `status = 'approved'`
- Sets `approved_by` to current admin
- Stores admin edits as JSON diff in `admin_edits` column
- Sends email + toast notification to requester
- Entity immediately available in dropdowns

**Validation**:
- Request must have `status = 'pending_approval'`
- Admin edits must pass entity validation
- Entity name must be unique (after edits)

---

#### rejectRequest

Reject a master data request with reason.

**Parameters**:
```typescript
interface RejectRequestParams {
  requestId: number;
  reason: string;  // Required, max 500 characters
}
```

**Returns**:
```typescript
{
  data?: MasterDataRequest;
  error?: string;
}
```

**Example**:
```typescript
const result = await rejectRequest({
  requestId: 123,
  reason: 'TIN number format is incorrect. Please use XX-XXXXXXX format.'
});

if (result.data) {
  toast.success('Request rejected. User will be notified.');
}
```

**Side Effects**:
- Sets request `status = 'rejected'`
- Sets `rejected_by` to current admin
- Stores `rejection_reason`
- Sends email + toast notification to requester
- User can resubmit (if `resubmission_count` < 3)

**Validation**:
- Request must have `status = 'pending_approval'`
- Reason must be provided and non-empty

---

#### bulkApprove

Approve multiple requests at once.

**Parameters**:
```typescript
interface BulkApproveParams {
  requestIds: number[];
}
```

**Returns**:
```typescript
{
  data?: {
    success: number[];     // Successfully approved request IDs
    failed: {              // Failed approvals
      requestId: number;
      reason: string;
    }[];
  };
  error?: string;
}
```

**Example**:
```typescript
const result = await bulkApprove({
  requestIds: [123, 124, 125]
});

if (result.data) {
  const { success, failed } = result.data;
  toast.success(`Approved ${success.length} requests`);
  if (failed.length > 0) {
    toast.error(`Failed to approve ${failed.length} requests`);
  }
}
```

**Side Effects**: Same as `approveRequest` for each request

**Validation**: Each request validated individually

---

#### bulkReject

Reject multiple requests with a single reason.

**Parameters**:
```typescript
interface BulkRejectParams {
  requestIds: number[];
  reason: string;  // Applied to all rejections
}
```

**Returns**:
```typescript
{
  data?: {
    success: number[];
    failed: {
      requestId: number;
      reason: string;
    }[];
  };
  error?: string;
}
```

**Example**:
```typescript
const result = await bulkReject({
  requestIds: [123, 124, 125],
  reason: 'Insufficient information provided. Please include contact details.'
});
```

**Side Effects**: Same as `rejectRequest` for each request

---

### Duplicate Detection API

#### POST /api/master-data/check-duplicates

Check for potential duplicate entities using fuzzy matching.

**Request Body**:
```typescript
{
  entityType: 'vendor' | 'category' | 'invoice_profile' | 'payment_type';
  data: {
    name: string;  // Primary field for duplicate detection
  };
}
```

**Response**:
```typescript
{
  hasDuplicates: boolean;
  matches: Array<{
    id: number;
    name: string;
    similarity: number;  // 0.0 to 1.0
    [otherFields]: any;
  }>;
}
```

**Example**:
```typescript
const response = await fetch('/api/master-data/check-duplicates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityType: 'vendor',
    data: { name: 'ACME Corporation' }
  })
});

const result = await response.json();

if (result.hasDuplicates) {
  console.log('Potential duplicates:', result.matches);
  // [{ id: 5, name: 'Acme Corp', similarity: 0.87 }]
}
```

**Similarity Thresholds**:
- Vendors: 85% (0.85)
- Categories: 90% (0.90)
- Invoice Profiles: 85% (0.85)
- Payment Types: 90% (0.90)

**Algorithm**: Levenshtein distance with normalization (case-insensitive, trimmed)

**Performance**: Compares against last 100 entities only for speed

---

## Future API Endpoints (Sprint 3+)

### Payments
- `getPayments({ invoiceId })`
- `createPayment({ invoiceId, amount_paid, payment_date })`
- `updatePayment({ id, status })`
- `deletePayment({ id })`

### Vendors
- `getVendors()`
- `createVendor({ name })`
- `updateVendor({ id, name })`
- `archiveVendor({ id })` (archive request)

### Categories
- `getCategories()`
- `createCategory({ name })`
- `updateCategory({ id, name })`
- `archiveCategory({ id })` (archive request)

### Users
- `getUsers()`
- `createUser({ email, full_name, role })`
- `updateUser({ id, full_name, role })`
- `deactivateUser({ id })`
- `resetPassword({ userId })`

### Archive Requests
- `getArchiveRequests()`
- `createArchiveRequest({ entity_type, entity_id, reason })`
- `approveArchiveRequest({ id })`
- `rejectArchiveRequest({ id, rejection_reason })`

---

## Testing

### Manual Testing with Browser Console

```javascript
// Open browser console on any authenticated page
const result = await fetch('/api/actions/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'create', data: {...} }),
});

const json = await result.json();
console.log(json);
```

### Automated Testing (Sprint 12)

```typescript
import { createInvoice } from '@/app/actions/invoices';
import { prismaMock } from '@/test/prisma-mock';

describe('createInvoice', () => {
  it('creates invoice successfully', async () => {
    const mockInvoice = {
      id: 1,
      invoice_number: 'INV-001',
      invoice_amount: 1500.00,
      // ... other fields
    };

    prismaMock.invoice.create.mockResolvedValue(mockInvoice);

    const result = await createInvoice({
      invoice_number: 'INV-001',
      invoice_amount: 1500.00,
    });

    expect(result.data).toEqual(mockInvoice);
    expect(result.error).toBeUndefined();
  });

  it('returns error for invalid data', async () => {
    const result = await createInvoice({
      invoice_number: '',
      invoice_amount: -100, // Invalid
    });

    expect(result.error).toBe('Validation failed');
    expect(result.data).toBeUndefined();
  });
});
```

---

## Rate Limiting (Future Enhancement)

Consider implementing rate limiting for production:

```typescript
import { ratelimit } from '@/lib/ratelimit';

export async function createInvoice(data: unknown) {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  // Rate limit: 10 requests per minute per user
  const { success } = await ratelimit.limit(session.user.id);
  if (!success) {
    return { error: 'Rate limit exceeded. Try again later.' };
  }

  // Proceed with logic...
}
```

---

## Conclusion

PayLog's Server Actions provide a type-safe, secure, and developer-friendly API for all data operations. The pattern of returning `{ data?, error? }` ensures consistent error handling across the application.

**Current Status**: Invoice CRUD complete (Sprint 2)
**Next API**: Payment actions (Sprint 3)
