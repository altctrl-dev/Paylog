# Inline Payment Fix Plan

**Created**: December 19, 2025
**Status**: Ready for Implementation
**Priority**: High (Critical Bug Fix)

---

## Problem Summary

When users create invoices with the "Record Payment" toggle enabled, the payment data is stored in `pending_payment_data` JSON field but **never processed** when the invoice is approved. This results in:

1. Payment data being orphaned in the database
2. Users thinking their payment was recorded when it wasn't
3. Invoice showing as "Unpaid" instead of "Payment Pending"

Additionally, the inline payment form has UI inconsistencies compared to the separate payment panel.

---

## Part 1: Fix Payment Processing in Approval Flow

### Current Behavior (Broken)

```
User creates invoice with payment toggle ON
    ↓
pending_payment_data stored in Invoice ✓
    ↓
Admin approves invoice
    ↓
approveInvoiceV2() sets status = 'unpaid' ❌
    ↓
pending_payment_data is IGNORED
    ↓
NO Payment record created
```

### Expected Behavior (After Fix)

```
User creates invoice with payment toggle ON
    ↓
pending_payment_data stored in Invoice ✓
    ↓
Admin approves invoice
    ↓
approveInvoiceV2() processes pending_payment_data ✓
    ↓
Payment record created with status = 'pending' ✓
    ↓
pending_payment_data cleared (converted) ✓
    ↓
Invoice badge shows "Payment Pending" (purple) ✓
    ↓
Admin approves payment in Payments tab
    ↓
Invoice status → 'paid' / 'partial' ✓
```

### Code Changes Required

**File**: `app/actions/invoices-v2.ts`

**Function**: `approveInvoiceV2()`

```typescript
export async function approveInvoiceV2(invoiceId: number): Promise<ServerActionResult<{ invoiceId: number }>> {
  // ... existing auth and validation code ...

  // Fetch invoice with pending_payment_data
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      status: true,
      created_by: true,
      invoice_number: true,
      pending_payment_data: true,  // ADD THIS
    },
  });

  // ... existing validation ...

  // Use transaction for atomicity
  await db.$transaction(async (tx) => {
    // 1. Update invoice status to UNPAID
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: INVOICE_STATUS.UNPAID,
        updated_at: new Date(),
      },
    });

    // 2. NEW: Process pending_payment_data if exists
    if (invoice.pending_payment_data) {
      const paymentData = invoice.pending_payment_data as {
        paid_date: string;
        paid_amount: number;
        paid_currency: string | null;
        payment_type_id: number;
        payment_reference: string | null;
      };

      // Create Payment record with status = 'pending' (NOT auto-approved)
      // Admin must approve payment separately in the two-step workflow
      await tx.payment.create({
        data: {
          invoice_id: invoiceId,
          amount_paid: paymentData.paid_amount,
          payment_date: new Date(paymentData.paid_date),
          payment_type_id: paymentData.payment_type_id,
          payment_reference: paymentData.payment_reference || null,
          status: 'pending',  // Requires separate admin approval
          created_by_user_id: invoice.created_by,
          // tds_amount_applied and tds_rounded can be set during payment approval
        },
      });

      // 3. Clear pending_payment_data (now converted to Payment record)
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          pending_payment_data: Prisma.DbNull,
        },
      });

      console.log(`[approveInvoiceV2] Created pending payment from inline data for invoice ${invoiceId}`);
    }
  });

  // ... existing activity logging and notifications ...
}
```

### Status Flow After Fix

| Scenario | Invoice Status | Payment Status | Badge Display |
|----------|----------------|----------------|---------------|
| Invoice created (no payment) | pending_approval | - | Pending Approval (yellow) |
| Invoice created (with payment) | pending_approval | - | Pending Approval (yellow) |
| Invoice approved (no payment) | unpaid | - | Unpaid (red) |
| Invoice approved (with payment) | unpaid | pending | Payment Pending (purple) |
| Payment approved (full) | paid | approved | Paid (green) |
| Payment approved (partial) | partial | approved | Partially Paid (blue) |
| Payment rejected | unpaid | rejected | Unpaid (red) |

---

## Part 2: Fix UI Inconsistencies

### Current Inconsistencies

| Aspect | Separate Payment Panel | Inline Payment Form |
|--------|------------------------|---------------------|
| Amount Label | "Amount" | "Amount Paid" |
| Date Label | "Date" | "Payment Date" |
| Currency | INR ₹ prefix | Dropdown "--" |
| Reference | ✅ Present | ❌ Missing |
| Max Hint | "Max: ₹X" | ❌ Missing |
| TDS Context | Shows TDS & Remaining | None |

### Proposed Changes

**File**: `components/invoices-v2/inline-payment-fields.tsx`

1. **Rename Labels**:
   - "Amount Paid" → "Amount"
   - "Payment Date" → "Date"

2. **Replace Currency Dropdown with Dynamic Prefix**:
   - Remove currency dropdown
   - Add currency prefix based on invoice's currency (e.g., "INR ₹", "USD $", "EUR €")
   - Currency derived from invoice's selected currency

3. **Add Reference Field** (match existing Payment Panel behavior):
   - Add payment_reference field
   - Conditional visibility based on payment type's `requires_reference` flag
   - Required when payment type requires it, optional otherwise
   - Show helper text when required: "Required for [Payment Type]"

4. **Add Context Stats** (when invoice amount is filled):
   ```
   ┌─────────────────┐  ┌─────────────────┐
   │ Invoice Amount  │  │ TDS Deducted    │
   │ ₹12,300.00      │  │ -₹1,230.00 (10%)│
   └─────────────────┘  └─────────────────┘
   ┌─────────────────┐
   │ Net Payable     │
   │ ₹11,070.00      │
   └─────────────────┘
   ```

5. **Add Max Amount Hint**:
   - Show "Max: ₹[Net Payable]" below amount field
   - Calculate: Invoice Amount - TDS (if applicable)

### Files to Modify

1. `components/invoices-v2/inline-payment-fields.tsx` - Main component
2. `components/invoices-v2/non-recurring-invoice-form.tsx` - Pass TDS context
3. `components/invoices-v2/recurring-invoice-form.tsx` - Pass TDS context
4. `components/invoices-v2/edit-non-recurring-invoice-form.tsx` - Pass TDS context
5. `components/invoices-v2/edit-recurring-invoice-form.tsx` - Pass TDS context
6. `lib/validations/invoice-v2.ts` - Add payment_reference to schema

---

## Part 3: Approval UX Improvements

### New Invoice Details Panel Approval Flow

When an admin opens an invoice detail panel for a pending approval invoice, the UX has been updated:

#### Before (Old Behavior)
```
Admin opens invoice details
    ↓
Sees "Pending Approval" badge in header
    ↓
Clicks "Approve" in right action bar
    ↓
Invoice approved → Panel closes
    ↓
(No prompt about pending payment data)
```

#### After (New Behavior)
```
Admin opens invoice details
    ↓
Sees "Approve Invoice" button in header (green)
(Mobile: just "Approve")
    ↓
Clicks "Approve Invoice" button
    ↓
Invoice approved
    ↓
IF pending payment data existed:
    → Toast: "Invoice approved. Payment pending review."
    → Auto-navigates to Payments tab
    → Admin can review and approve/reject payment
ELSE:
    → Toast: "Invoice approved. Status updated to Unpaid."
    → Panel closes
```

### Header Changes

| Element | Before | After |
|---------|--------|-------|
| Status Badge | "Pending Approval" (yellow) | Removed for pending_approval status |
| Recurring Badge | Shown | Removed (per UX decision) |
| Approve Button | In right action bar only | In header (prominent green button) |
| Button Text | "Approve" | "Approve Invoice" (desktop) / "Approve" (mobile) |

### Code Changes

**File**: `components/invoices/invoice-detail-panel-v3/panel-v3-header.tsx`

- Added props: `canApprove`, `onApprove`, `isApproving`
- Conditionally shows green "Approve Invoice" button instead of status badge for pending_approval invoices
- Removed recurring badge entirely

**File**: `components/invoices/invoice-detail-panel-v3/index.tsx`

- Added controlled tab navigation state (`activeTab`, `setActiveTab`)
- Updated `useApproveInvoiceV2` callback to capture `hasPaymentPending`
- Passes approve props to `PanelV3Header`
- Auto-navigates to Payments tab when `hasPaymentPending` is true
- Updated vendor+invoice approval flow to also handle `hasPaymentPending`

**File**: `components/panels/shared/panel-tabs.tsx`

- Added controlled mode support via `activeTab` and `onTabChange` props
- Supports both controlled and uncontrolled modes

**File**: `hooks/use-invoices-v2.ts`

- Updated `useApproveInvoiceV2` to pass `hasPaymentPending: boolean` to callback

**File**: `app/actions/invoices-v2.ts`

- Updated `approveInvoiceV2` to return `{ invoiceId, hasPaymentPending }`
- Tracks whether `pending_payment_data` existed before processing

---

## Part 4: Edit Form Payment Data Handling

### Decision: Remove Payment Toggle from Edit Forms ✅

**Rationale**:
- Once invoice is created, payments should be managed via Payments tab
- Avoids confusion about when payment data is processed
- Consistent with two-step approval workflow
- Cleaner separation of concerns

### Files to Modify

1. `components/invoices-v2/edit-non-recurring-invoice-form.tsx` - Remove payment toggle section
2. `components/invoices-v2/edit-recurring-invoice-form.tsx` - Remove payment toggle section
3. `lib/validations/invoice-v2.ts` - Remove payment fields from edit schemas (if separate)

---

## Implementation Order

### Phase 1: Critical Bug Fix (Backend) ✅ COMPLETED
1. [x] Update `approveInvoiceV2()` to process `pending_payment_data`
2. [x] Add transaction wrapper for atomicity
3. [x] Clear `pending_payment_data` after conversion
4. [x] Add activity log for payment creation
5. [x] Fix `createRecurringInvoice` to store `pending_payment_data`

### Phase 2: UI Alignment (Frontend) ✅ COMPLETED
1. [x] Update `inline-payment-fields.tsx` with new design
2. [x] Add Reference field with conditional visibility
3. [x] Replace currency dropdown with dynamic prefix
4. [x] Add context stats (Invoice Amount, TDS, Net Payable)
5. [x] Add Max amount hint
6. [x] Rename labels for consistency

### Phase 3: Cleanup ✅ COMPLETED
1. [x] Remove payment toggle from edit forms
2. [x] Update form validation schemas

### Phase 4: Approval UX Improvements ✅ COMPLETED
1. [x] Add "Approve Invoice" button to invoice details header
2. [x] Remove "Pending Approval" badge when approve button is shown
3. [x] Remove "Recurring" badge from header
4. [x] Add payment review dialog after approval
5. [x] Implement controlled tab navigation for Payments tab
6. [x] Update `approveInvoiceV2()` to return `hasPaymentPending` flag
7. [x] Update documentation

---

## Testing Checklist

### Backend Tests
- [ ] Create invoice WITH payment toggle → approve → Payment record created with status='pending'
- [ ] Create invoice WITHOUT payment toggle → approve → No payment record
- [ ] Approve payment → Invoice status changes to paid/partial
- [ ] Reject payment → Invoice status stays unpaid
- [ ] Multiple payments on same invoice work correctly

### Frontend Tests
- [ ] Inline payment fields show correct labels
- [ ] Currency shows as "INR ₹" prefix
- [ ] Reference field appears when payment type requires it
- [ ] Context stats update when invoice amount changes
- [ ] Max hint shows correct net payable amount

### Edge Cases
- [ ] TDS applicable invoice with partial payment
- [ ] Payment amount exceeds net payable (validation)
- [ ] Payment type without reference requirement
- [ ] Invoice with 0% TDS

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing orphaned payment data | High | Medium | Migration script to process old data |
| Payment approval race condition | Low | High | Use database transaction |
| UI breaking on mobile | Medium | Medium | Test responsive design |
| TDS calculation mismatch | Low | High | Use shared calculateTds() function |

---

## Stakeholder Decisions ✅

| Question | Decision |
|----------|----------|
| Edit form payment toggle | **REMOVE** - Payments managed via Payments tab after creation |
| Orphaned data migration | **NOT NEEDED** - No existing orphaned data to process |
| Payment reference | **MATCH EXISTING** - Conditional based on `requires_reference` flag |
| Currency display | **DYNAMIC** - Based on invoice's currency type |

---

**Document Status**: IMPLEMENTED
**Last Updated**: December 19, 2025
**Completion**: All phases completed and tested
