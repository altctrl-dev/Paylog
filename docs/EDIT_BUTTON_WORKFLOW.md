# Edit Button Workflow - Business Rules & Implementation

**Created**: November 24, 2025
**Status**: APPROVED by user

---

## 📋 Business Rules (Confirmed)

### **Standard Users**

1. ✅ **Can add new invoices** (always allowed)

2. ✅ **Cannot edit while in "pending_approval" status**
   - Once submitted → status becomes "pending_approval"
   - Edit button is disabled/hidden during pending review
   - Must wait for admin action

3. ✅ **Can edit after admin action**
   - After admin approves → user can edit (goes back to pending)
   - After admin rejects → user can edit (goes back to pending)
   - After admin puts on hold → user can edit (goes back to pending)

4. ✅ **Editing triggers re-approval**
   - Any edit by standard user → status changes to "pending_approval"
   - Admin must review again

5. ✅ **Ownership restriction**
   - Can only edit invoices they created
   - Cannot edit other users' invoices

### **Admins**

1. ✅ **Can edit any invoice** (no ownership restriction)

2. ✅ **Can edit in any status** (no status restriction)
   - Can edit during pending review
   - Can edit approved invoices
   - Can edit rejected invoices
   - Can edit on-hold invoices
   - Can edit paid invoices

3. ✅ **Admin edits don't trigger re-approval**
   - Status remains unchanged when admin edits
   - No workflow disruption

---

## 🔍 Current vs. Required Logic

### **Current Code** (invoice-detail-panel-v2.tsx line 103):
```typescript
const canEdit = isAdmin; // Admins can always edit
```
❌ **Problem**: Standard users can NEVER edit

### **Required Logic**:
```typescript
const isOwner = invoice.created_by_id === session?.user?.id;
const isStandardUser = session?.user?.role === 'standard_user';
const isPending = invoice.status === 'pending_approval';

const canEdit =
  isAdmin || // Admins can always edit
  (isOwner && isStandardUser && !isPending); // Standard users: own invoices, not pending
```

---

## 🎯 Implementation Plan

### **Phase 1: Add Edit Permission Logic** (30 mins)

**File**: `components/invoices/invoice-detail-panel-v2.tsx`

**Changes**:
```typescript
// Around line 43 (in component)
export function InvoiceDetailPanelV2({ config, onClose, invoiceId, userRole }: InvoiceDetailPanelV2Props) {
  const { data: invoice, isLoading, error } = useInvoiceV2(invoiceId);
  const { data: session } = useSession(); // Add this

  // ... existing code ...

  // Check permissions (replace line 96-103)
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isOwner = invoice?.created_by_id === session?.user?.id;
  const isStandardUser = session?.user?.role === 'standard_user';
  const isPendingApproval = invoice?.status === 'pending_approval';

  // Edit permission logic
  const canEdit =
    isAdmin || // Admins can always edit any invoice
    (isOwner && isStandardUser && !isPendingApproval); // Standard users: own invoices, not while pending

  const canApprove =
    invoice?.status === 'pending_approval' && isAdmin;
  const canPutOnHold =
    isAdmin &&
    invoice?.status !== INVOICE_STATUS.ON_HOLD &&
    invoice?.status !== INVOICE_STATUS.PAID;
}
```

**Estimated Time**: 30 minutes
**Files Modified**: 1 file, ~10 lines changed

---

### **Phase 2: Create V2 Edit Forms** (4-5 hours)

**Problem**: Edit button currently shows "coming soon" toast (line 65-74)

**Solution**: Create actual edit forms

#### **2.1: Create Edit Form Components**

**New Files**:
1. `components/invoices-v2/edit-recurring-invoice-form.tsx` (~250 lines)
2. `components/invoices-v2/edit-non-recurring-invoice-form.tsx` (~200 lines)

**Based on existing**:
- Copy from `recurring-invoice-form.tsx` and `non-recurring-invoice-form.tsx`
- Add pre-fill logic from invoice data
- Change submit action from "create" to "update"

#### **2.2: Create Update Server Actions**

**File**: `app/actions/invoices-v2.ts`

**New Actions**:
```typescript
export async function updateRecurringInvoice(
  invoiceId: number,
  data: UpdateRecurringInvoiceInput
): Promise<ActionResult<Invoice>> {
  // 1. Validate session
  // 2. Check ownership (standard users) or admin role
  // 3. If standard user edit → change status to 'pending_approval'
  // 4. If admin edit → keep status unchanged
  // 5. Update invoice
  // 6. Revalidate paths
  // 7. Return success/error
}

export async function updateNonRecurringInvoice(
  invoiceId: number,
  data: UpdateNonRecurringInvoiceInput
): Promise<ActionResult<Invoice>> {
  // Same logic as above
}
```

**Estimated Lines**: ~200 lines total

#### **2.3: Update handleEdit Logic**

**File**: `components/invoices/invoice-detail-panel-v2.tsx`

**Replace lines 65-74**:
```typescript
const handleEdit = () => {
  if (invoice.is_recurring) {
    openPanel(
      'edit-recurring-invoice',
      { invoiceId: invoice.id },
      { width: 700 }
    );
  } else {
    openPanel(
      'edit-non-recurring-invoice',
      { invoiceId: invoice.id },
      { width: 700 }
    );
  }
};
```

#### **2.4: Register Edit Panels**

**File**: `components/panels/panel-provider.tsx`

**Add panel registrations**:
```typescript
case 'edit-recurring-invoice':
  return (
    <EditRecurringInvoiceForm
      invoiceId={panel.data.invoiceId}
      onSuccess={() => closePanel(panel.id)}
    />
  );

case 'edit-non-recurring-invoice':
  return (
    <EditNonRecurringInvoiceForm
      invoiceId={panel.data.invoiceId}
      onSuccess={() => closePanel(panel.id)}
    />
  );
```

**Estimated Time**: 4-5 hours
**Files Created**: 2 components
**Files Modified**: 3 files
**Total Lines**: ~650 lines

---

### **Phase 3: Add React Query Hooks** (30 mins)

**File**: `hooks/use-invoices-v2.ts`

**New Hooks**:
```typescript
export function useUpdateRecurringInvoiceV2(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      data,
    }: {
      invoiceId: number;
      data: UpdateRecurringInvoiceInput;
    }) => {
      const result = await updateRecurringInvoice(invoiceId, data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-v2'] });
      onSuccess?.();
    },
  });
}

export function useUpdateNonRecurringInvoiceV2(onSuccess?: () => void) {
  // Similar to above
}
```

**Estimated Time**: 30 minutes
**Files Modified**: 1 file, ~60 lines added

---

### **Phase 4: Status Change Logic** (30 mins)

**File**: `app/actions/invoices-v2.ts`

**In update actions, add**:
```typescript
// Inside updateRecurringInvoice / updateNonRecurringInvoice

// Determine if status should change
const session = await getServerSession(authOptions);
const isStandardUser = session?.user?.role === 'standard_user';
const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';

let newStatus = existingInvoice.status; // Default: keep status

if (isStandardUser) {
  // Standard user edit → always goes to pending_approval
  newStatus = 'pending_approval';
}
// If admin edit → status unchanged (keep newStatus = existingInvoice.status)

// Update invoice with new status
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    ...data,
    status: newStatus,
    updated_at: new Date(),
  },
});
```

**Estimated Time**: 30 minutes
**Files Modified**: 1 file, ~20 lines added

---

### **Phase 5: Testing** (1 hour)

**Test Cases**:

1. **Standard User - Own Invoice**:
   - ✅ Can create new invoice
   - ✅ After submit → status = "pending_approval"
   - ❌ Edit button disabled during pending
   - ✅ After admin approval → Edit button enabled
   - ✅ Click Edit → form opens with pre-filled data
   - ✅ Save → status changes back to "pending_approval"
   - ✅ Admin receives new approval request

2. **Standard User - Other's Invoice**:
   - ❌ Edit button hidden (not owner)
   - ✅ Can only view

3. **Admin - Any Invoice**:
   - ✅ Edit button always visible
   - ✅ Can edit in any status (pending, approved, paid)
   - ✅ Status unchanged after admin edit

4. **Edge Cases**:
   - Concurrent edits (admin and user editing same invoice)
   - Edit during status transition
   - Edit with validation errors

**Estimated Time**: 1 hour

---

## 📊 Implementation Summary

| Phase | Task | Time | Files | LOC |
|-------|------|------|-------|-----|
| Phase 1 | Edit permission logic | 30min | 1 | ~10 |
| Phase 2 | V2 edit forms + actions | 4-5h | 5 | ~650 |
| Phase 3 | React Query hooks | 30min | 1 | ~60 |
| Phase 4 | Status change logic | 30min | 1 | ~20 |
| Phase 5 | Testing | 1h | - | - |
| **TOTAL** | **Complete Edit Feature** | **6-8h** | **8** | **~740** |

---

## 🎯 Acceptance Criteria

### **Standard Users**:
- [x] Can create new invoices
- [x] Cannot edit while in "pending_approval" status
- [x] Edit button shows "disabled" with tooltip: "Cannot edit while pending approval"
- [x] Can edit after admin approves/rejects/holds
- [x] Editing changes status back to "pending_approval"
- [x] Can only edit own invoices (not others')
- [x] Edit form pre-fills with current invoice data
- [x] Save successful → panel closes, list refreshes

### **Admins**:
- [x] Can edit any invoice (no ownership check)
- [x] Can edit in any status (no status check)
- [x] Edit button always enabled
- [x] Editing does NOT change status
- [x] Edit form pre-fills with current invoice data
- [x] Save successful → panel closes, list refreshes

### **UI/UX**:
- [x] Edit button icon: Pencil
- [x] Edit button disabled state has tooltip explaining why
- [x] Form shows validation errors clearly
- [x] Toast notifications for success/error
- [x] Optimistic updates (UI updates before server confirms)

---

## 🚀 Ready to Implement

**Estimated Total Time**: 6-8 hours
**Complexity**: Medium (existing forms to copy, new server actions)
**Risk**: Low (isolated to edit feature, existing create forms work)

**Next Step**: Start Phase 1 (permission logic) - 30 minutes

---

**Shall we proceed with implementation?** 🎯
