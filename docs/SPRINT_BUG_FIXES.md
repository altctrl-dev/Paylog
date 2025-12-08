# Sprint: Bug Fixes & Missing Features

> **Document Type**: Bug Tracking & Sprint Plan
> **Created**: 2025-12-06
> **Last Updated**: 2025-12-06
> **Sprint Focus**: Invoice V2, Payments, Notifications

---

## Executive Summary

This document tracks all known bugs and missing features discovered during the Ledger feature implementation and subsequent testing. Each issue is documented with root cause analysis, action items, and progress tracking.

---

## Bug Tracker Dashboard

| ID | Issue | Severity | Status | Assignee | ETA |
|----|-------|----------|--------|----------|-----|
| BUG-001 | TDS Round off missing in payment-record panel | Medium | 🟢 Resolved | Claude | 2025-12-06 |
| BUG-002 | TDS Round off missing in inline payment fields | Medium | 🟢 Resolved | Claude | 2025-12-06 |
| BUG-007 | TDS toggle should only show when TDS is decimal | Low | 🟢 Resolved | Claude | 2025-12-06 |
| BUG-003 | In-app notifications not working for V2 invoices | High | 🟢 Resolved | Claude | 2025-12-06 |
| BUG-004 | No "Record Payment" button in invoice-detail-panel-v2 | High | 🟢 Resolved | Claude | 2025-12-06 |
| BUG-005 | Payment form showing hardcoded payment methods | High | 🟢 Resolved | Claude | 2025-12-06 |
| BUG-008 | '+' button on recurring cards not functional | High | 🟢 Resolved | Claude | 2025-12-07 |

### Status Legend
- 🔴 **Open**: Not started
- 🟡 **In Progress**: Work in progress
- 🟢 **Resolved**: Fixed and tested
- ⚫ **Won't Fix**: Intentionally not fixing

---

## Detailed Bug Reports

---

### BUG-001: TDS Round off Missing in Payment-Record Panel

**Severity**: Medium
**Status**: 🟢 Resolved (2025-12-06)
**Component**: `components/payments/payment-form-panel.tsx`

#### Description
The TDS Round off checkbox exists in the payment form panel UI but is not displayed because the `payment-record` panel is never opened from the current V2 invoice detail panel.

#### Root Cause
The `payment-record` panel type is only triggered from archived panels (`components/_archived/invoices/invoice-detail-panel.tsx:105-115`). The new V2 detail panel (`invoice-detail-panel-v2.tsx`) does not have a "Record Payment" button.

#### Evidence
```
docs/SPRINT_LEDGER_FEATURE.md:287: "The payment-record panel is currently only triggered from archived panels."
```

#### Files Affected
- `components/invoices/invoice-detail-panel-v2.tsx` (needs Record Payment button)
- `components/payments/payment-form-panel.tsx` (already has TDS Round off UI)
- `components/invoices/invoice-panel-renderer.tsx` (already routes payment-record)

#### Action Items
- [x] Add "Record Payment" button to `invoice-detail-panel-v2.tsx` footer
- [x] Create `handleRecordPayment` function with TDS props
- [x] Pass `tdsApplicable` and `tdsPercentage` from invoice data
- [x] Test TDS Round off checkbox visibility

#### Resolution
Fixed by implementing BUG-004 - the "Record Payment" button now passes TDS props to the payment-record panel, which already has the TDS Round off UI.

#### Dependencies
- Depends on: BUG-004 (they are related - this is a sub-issue) ✅ RESOLVED

---

### BUG-002: TDS Round off Missing in Inline Payment Fields

**Severity**: Medium
**Status**: 🟢 Resolved (2025-12-06)
**Component**: `components/invoices-v2/inline-payment-fields.tsx`

#### Description
When adding a new invoice with inline payment (marking "Paid" toggle ON), there is no TDS Round off checkbox available in the inline payment section.

#### Root Cause
The `InlinePaymentFields` component was designed without TDS rounding functionality. It has fields for:
- Payment Date
- Amount Paid
- Currency
- Payment Type
- Reference Number

But NO TDS rounding toggle.

#### Files Affected
- `components/invoices-v2/inline-payment-fields.tsx` (added TDS rounding UI)
- `components/invoices-v2/recurring-invoice-form.tsx` (passes TDS props)
- `components/invoices-v2/non-recurring-invoice-form.tsx` (passes TDS props)
- `components/invoices-v2/edit-recurring-invoice-form.tsx` (passes TDS props)
- `components/invoices-v2/edit-non-recurring-invoice-form.tsx` (passes TDS props)
- `lib/validations/invoice-v2.ts` (added `tds_rounded` field to schemas)

#### Action Items
- [x] Add TDS props to `InlinePaymentFieldsProps` interface:
  - `tdsApplicable?: boolean`
  - `tdsPercentage?: number`
  - `invoiceAmount?: number`
  - `tdsRounded?: boolean`
  - `onTdsRoundedChange?: (rounded: boolean) => void`
- [x] Add TDS Round off toggle UI (matches payment-form-panel.tsx amber-themed design)
- [x] Update all 4 invoice forms to pass TDS props to InlinePaymentFields
- [x] Add `tds_rounded` field to all invoice form schemas
- [x] TypeScript compilation passes
- [x] Build passes

#### Resolution
Implemented TDS Round off toggle in inline payment fields:
- Added new props to `InlinePaymentFieldsProps` interface for TDS-related data
- Added `calculateTds` import from `@/lib/utils/tds` for TDS calculations
- Added `formatCurrency` helper function for INR formatting
- Added `tdsCalculation` useMemo for computing exact/rounded TDS amounts
- Added amber-themed TDS Rounding UI section (only shows when TDS rounding would make a difference)
- Updated all 4 invoice forms to pass TDS props
- Added `tds_rounded` field to all invoice validation schemas

#### Dependencies
- None

---

### BUG-003: In-App Notifications Not Working for V2 Invoices

**Severity**: High
**Status**: 🟢 Resolved (2025-12-06)
**Component**: `app/actions/invoices-v2.ts`

#### Description
When a standard user creates an invoice (pending approval), approves an invoice, or rejects an invoice using the V2 invoice system, no in-app notifications are sent to admins or the invoice creator.

#### Root Cause
The notification functions exist in `app/actions/notifications.ts` but are **NOT imported or called** in `app/actions/invoices-v2.ts`.

The legacy `app/actions/invoices.ts` correctly calls:
- `notifyInvoicePendingApproval` (line 725)
- `notifyInvoiceApproved` (line 1180)
- `notifyInvoiceRejected` (line 1282)
- `notifyInvoiceOnHold` (line 1065)

#### Evidence
```bash
# Grep for "notify" in invoices-v2.ts returns NO matches
grep -n "notify" app/actions/invoices-v2.ts
# (no output)
```

#### Files Affected
- `app/actions/invoices-v2.ts` (needs notification imports and calls)
- `app/actions/notifications.ts` (already has notification functions)

#### Action Items
- [x] Import notification functions into `invoices-v2.ts`:
  ```typescript
  import {
    notifyInvoicePendingApproval,
    notifyInvoiceApproved,
    notifyInvoiceRejected,
  } from '@/app/actions/notifications';
  ```
- [x] Call `notifyInvoicePendingApproval()` in `createRecurringInvoice()` for standard users
- [x] Call `notifyInvoicePendingApproval()` in `createNonRecurringInvoice()` for standard users
- [x] Call `notifyInvoiceApproved()` in `approveInvoiceV2()`
- [x] Call `notifyInvoiceRejected()` in `rejectInvoiceV2()`
- [ ] Test notification delivery for all flows

#### Resolution
Added imports for notification functions and calls in all V2 invoice server actions:
- `createRecurringInvoice()` - notifies admins when standard user creates invoice
- `createNonRecurringInvoice()` - notifies admins when standard user creates invoice
- `approveInvoiceV2()` - notifies invoice creator on approval
- `rejectInvoiceV2()` - notifies invoice creator on rejection with reason

#### Dependencies
- Notification system must be working (already committed) ✅

---

### BUG-004: No "Record Payment" Button in Invoice Detail Panel V2

**Severity**: High
**Status**: 🟢 Resolved (2025-12-06)
**Component**: `components/invoices/invoice-detail-panel-v2.tsx`

#### Description
The V2 invoice detail panel does not have a "Record Payment" button, preventing users from recording payments against existing invoices that weren't paid inline during creation.

#### Root Cause
The `invoice-detail-panel-v2.tsx` was designed as a read-only detail view. It has:
- Edit button
- Put On Hold button
- Archive button
- Delete button
- Approve/Reject buttons (for pending_approval)

But NO "Record Payment" button.

#### Evidence
```typescript
// invoice-detail-panel-v2.tsx footer section (lines 171-258)
// Contains: Edit, Put On Hold, Archive, Delete, Reject, Approve, Close
// Missing: Record Payment
```

The archived panel HAD this functionality:
```typescript
// components/_archived/invoices/invoice-detail-panel.tsx:105-115
openPanel(
  'payment-record',
  {
    invoiceId,
    invoiceNumber: invoice.invoice_number,
    invoiceAmount: invoice.invoice_amount,
    remainingBalance,
  },
  { width: PANEL_WIDTH.MEDIUM }
);
```

#### Files Affected
- `components/invoices/invoice-detail-panel-v2.tsx` (needs Record Payment button)

#### Action Items
- [x] Add state/hook to track payment summary (remaining balance calculation)
- [x] Add "Record Payment" button to footer (visible when invoice not fully paid)
- [x] Create `handleRecordPayment` callback with TDS props
- [x] Add permission check (canRecordPayment)
- [ ] Test payment recording flow with TDS rounding

#### Resolution
Implemented the following in `invoice-detail-panel-v2.tsx`:
- Added `usePaymentSummary` hook import and usage
- Added `handleRecordPayment` function that:
  - Calculates remaining balance from payment summary or invoice amount
  - Passes `tdsApplicable` and `tdsPercentage` to payment-record panel
- Added permission checks: `canRecordPayment` (admin only, not pending/paid/rejected) and `hasRemainingBalance`
- Added "Record Payment" button with CreditCard icon (green color)

#### Dependencies
- BUG-001 depends on this fix ✅ RESOLVED

---

### BUG-005: Payment Form Showing Hardcoded Payment Methods

**Severity**: High
**Status**: 🟢 Resolved (2025-12-06)
**Component**: `components/payments/payment-form-panel.tsx`, `types/payment.ts`

#### Description
When recording a payment via the "Record Payment" button, the payment method dropdown displays hardcoded mock values (Cash, Check, Wire Transfer, Card, UPI, Other) instead of the actual master data payment types (Bank Transfer, Cash/UPI, Credit Card).

#### Root Cause
Multiple issues:
1. The `payment-form-panel.tsx` was using `PAYMENT_METHOD_CONFIG` constant for the dropdown instead of fetching from master data
2. The `PaymentFormData` interface in `types/payment.ts` used `PaymentMethod` enum type instead of `string`
3. The `usePaymentTypes` hook import was from `use-payment-types.ts` (which returns `{ paymentTypes: [...] }`) instead of `use-invoices-v2.ts` (which returns array directly and works correctly)
4. Currency was hardcoded as USD instead of INR

#### Evidence
```typescript
// types/payment.ts - Old code (line 160)
payment_method: PaymentMethod;  // Restricted to enum values

// payment-form-panel.tsx - Was iterating over hardcoded config
{Object.entries(PAYMENT_METHOD_CONFIG).map(([value, { label }]) => (
  <option key={value} value={value}>{label}</option>
))}

// formatCurrency - Was hardcoded to USD
currency: 'USD'  // Should be 'INR'
```

#### Files Affected
- `components/payments/payment-form-panel.tsx` (updated hook import + currency)
- `types/payment.ts` (updated `PaymentFormData.payment_method` to `string`)
- `lib/validations/payment.ts` (already updated to use `z.string()`)

#### Action Items
- [x] Add `usePaymentTypes` hook to payment-form-panel.tsx
- [x] Update dropdown to iterate over fetched payment types
- [x] Update `PaymentFormData` interface to use `string` for payment_method
- [x] Change hook import from `use-payment-types` to `use-invoices-v2`
- [x] Fix currency from USD to INR in `formatCurrency` function
- [x] Verify TypeScript compilation passes
- [x] Verify build passes

#### Resolution
**Phase 1** (Initial fix):
- Added `usePaymentTypes` hook import from `use-payment-types.ts`
- Updated Select dropdown to show payment types from master data
- Changed `PaymentFormData.payment_method` type from `PaymentMethod` enum to `string`
- Added loading state and empty state handling for payment types dropdown

**Phase 2** (Additional fixes after user testing):
- Changed hook import from `@/hooks/use-payment-types` to `@/hooks/use-invoices-v2` (simpler return structure, same hook used by invoice forms)
- Changed `formatCurrency` locale from `en-US` to `en-IN` and currency from `USD` to `INR`
- Simplified hook usage since the new hook returns array directly

#### Dependencies
- Master data payment types must exist (already seeded)

---

### BUG-007: TDS Toggle Should Only Show When TDS is Decimal

**Severity**: Low (UX improvement)
**Status**: 🟢 Resolved (2025-12-06)
**Component**: Multiple TDS-related components

#### Description
The TDS Round off toggle should only appear when the calculated TDS amount results in a decimal value. When TDS is already a whole number (e.g., ₹10,000 × 2% = ₹200), there's no need for rounding, so the toggle should be hidden.

#### User Request
"TDS round off toggle should only appear if the TDS amount is a decimal. Do it while recording a payment while creating a new recurring invoice, non recurring invoice, while editing an invoice and recording a payment from there, and viewing an unpaid invoice and clicking on record payment and wherever applicable."

#### Current Behavior
- TDS section shows with "TDS Summary" message when TDS is whole number
- TDS section shows with toggle when TDS is decimal

#### Expected Behavior
- TDS section completely hidden when TDS is whole number
- TDS section with toggle only shows when TDS is decimal (rounding matters)

#### Files Affected
- `components/invoices-v2/inline-payment-fields.tsx` - Inline payment in create/edit forms
- `components/payments/payment-form-panel.tsx` - Record Payment panel from invoice detail

#### Scenarios to Cover
1. **Create Recurring Invoice** → Mark as Paid → Inline payment fields
2. **Create Non-Recurring Invoice** → Mark as Paid → Inline payment fields
3. **Edit Recurring Invoice** → Mark as Paid → Inline payment fields
4. **Edit Non-Recurring Invoice** → Mark as Paid → Inline payment fields
5. **View Unpaid Invoice** → Click "Record Payment" → Payment form panel

#### Action Items
- [x] Update `inline-payment-fields.tsx` - Only show TDS section when `exactTds !== roundedTds`
- [x] Update `payment-form-panel.tsx` - Only show TDS section when `exactTds !== roundedTds`
- [x] Remove "TDS Summary" fallback UI (no longer needed)
- [x] TypeScript compilation passes
- [x] Build passes

#### Resolution
Simplified the TDS toggle visibility logic in both components:

**`inline-payment-fields.tsx`**:
- Changed `showTdsSection` back to `showTdsRounding` with full condition:
  ```typescript
  const showTdsRounding =
    tdsApplicable &&
    tdsPercentage > 0 &&
    invoiceAmount > 0 &&
    tdsCalculation.exactTds !== tdsCalculation.roundedTds;
  ```
- Removed the "TDS Summary" fallback UI for whole numbers
- TDS toggle only appears when rounding would make a difference

**`payment-form-panel.tsx`**:
- Simplified condition to single check:
  ```typescript
  {tdsApplicable && tdsPercentage > 0 && tdsCalculation.exactTds !== tdsCalculation.roundedTds && (...)}
  ```
- Removed the "TDS Summary" fallback UI for whole numbers
- TDS toggle only appears when rounding would make a difference

**Scenarios Covered**:
1. ✅ Create Recurring Invoice → Mark as Paid → TDS toggle only if TDS is decimal
2. ✅ Create Non-Recurring Invoice → Mark as Paid → TDS toggle only if TDS is decimal
3. ✅ Edit Recurring Invoice → Mark as Paid → TDS toggle only if TDS is decimal
4. ✅ Edit Non-Recurring Invoice → Mark as Paid → TDS toggle only if TDS is decimal
5. ✅ View Unpaid Invoice → Record Payment → TDS toggle only if TDS is decimal

---

### BUG-008: '+' Button on Recurring Cards Not Functional

**Severity**: High
**Status**: 🟢 Resolved (2025-12-07)
**Component**: `components/v3/invoices/invoices-page.tsx`, `components/v3/invoices/recurring-card.tsx`

#### Description
The '+' button on recurring invoice cards in the Recurring tab has two actions ("Record Payment" and "Add New Invoice") that were not working properly:
1. "Record Payment" opened an unhelpful panel that didn't match the payment recording UX
2. "Add New Invoice" didn't pre-select the invoice profile
3. The 3-dot menu had "Edit" and "Delete" options that shouldn't be there
4. "View Details" didn't show profile description and pending invoice details

#### User Request
"'+' button on the cards on the recurring tab has two actions, record a payment and add an invoice. Clicking on them currently doesn't do anything. Both actions should understand which card and which invoice profile it is and let the users add a payment or invoice with as much prefilled data. Clicking on the 3 dots on the cards has currently 3 options - keep the 'View Details' and drop the other 2 - 'Edit' and 'Delete'. The 'View Details' can show the brief description of the selected invoice profile and details of pending amount if there's any and the invoice details associated with those."

#### Root Cause
1. The "Record Payment" action was opening a basic profile info panel that didn't show outstanding invoices or provide payment functionality
2. The invoice form wasn't receiving the profile ID to pre-select
3. The recurring card component had Edit and Delete menu items that shouldn't exist for this view

#### Files Affected
- `components/v3/invoices/recurring-card.tsx` - Removed Edit/Delete from 3-dot menu
- `components/invoices-v2/recurring-invoice-form-panel.tsx` - Added `defaultProfileId` prop
- `components/invoices-v2/recurring-invoice-form.tsx` - Pre-select profile when `defaultProfileId` provided
- `components/invoices/invoice-panel-renderer.tsx` - Pass `profileId` to recurring invoice form
- `components/master-data/profile-invoices-panel.tsx` - NEW: View Details panel showing profile + pending invoices
- `components/master-data/profile-payment-panel.tsx` - NEW: Record Payment panel matching payment-record UX
- `components/master-data/profile-panel-renderer.tsx` - Added routing for new panel types
- `components/v3/invoices/invoices-page.tsx` - Updated handlers to open correct panels

#### Action Items
- [x] Remove "Edit" and "Delete" from recurring card 3-dot menu
- [x] Add `defaultProfileId` prop to `RecurringInvoiceFormPanel`
- [x] Update `RecurringInvoiceForm` to pre-select profile when ID provided
- [x] Update `invoice-panel-renderer` to pass `profileId` to form
- [x] Create `ProfileInvoicesPanel` for View Details (profile info + pending invoices list)
- [x] Create `ProfilePaymentPanel` for Record Payment (matching payment-record UX):
  - Payment Summary card showing profile name, vendor, total pending amount
  - Outstanding Invoices list with:
    - Invoice number + status badge
    - Due date + overdue indicator
    - Invoice amount breakdown (total, paid, remaining)
    - "Pay" button to open payment-record panel
  - Matches design of payment-form-panel.tsx
- [x] Update `invoices-page.tsx` to open `profile-payment` for Record Payment action
- [x] TypeScript compilation passes
- [x] Build passes

#### Resolution

**Phase 1: Card Actions** (previously completed)
- Removed Edit and Delete from recurring-card.tsx 3-dot menu
- Added profile pre-selection for "Add New Invoice" action

**Phase 2: Record Payment Panel** (2025-12-07)
- Created `ProfilePaymentPanel` component (`components/master-data/profile-payment-panel.tsx`)
- Design matches the payment-record panel UX with:
  - **Payment Summary** card showing:
    - Profile name
    - Vendor name
    - Total Pending Amount (highlighted in red)
  - **Outstanding Invoices** section:
    - Count of invoices + overdue badge
    - Each invoice card shows:
      - Invoice number with status badge (Unpaid/Partially Paid)
      - Due date or "X days overdue" indicator
      - Amount breakdown (Invoice Amount → Paid → Remaining)
      - "Pay" button to open payment-record panel
      - "View" link to open invoice detail
  - Help text explaining partial payments are supported
- Added `profile-payment` panel type to `ProfilePanelRenderer`
- Updated `handleRecordPayment` in `invoices-page.tsx` to open `profile-payment` panel

**UX Flow**:
1. User clicks '+' → "Record Payment" on recurring card
2. Opens `profile-payment` panel showing total pending and all outstanding invoices
3. User clicks "Pay" on specific invoice
4. Opens `payment-record` panel (existing) with invoice pre-filled
5. After payment, returns to `profile-payment` panel (data refreshes via React Query)

#### Dependencies
- None (uses existing payment-record panel)

---

## Implementation Plan

### Phase 1: Critical Fixes (High Severity)

**Goal**: Restore core functionality for V2 invoices

| Task | Bug | Effort | Files |
|------|-----|--------|-------|
| Add notifications to invoices-v2.ts | BUG-003 | Low | 1 file |
| Add Record Payment button | BUG-004 | Medium | 1 file |

**Estimated Effort**: ~2-3 hours

### Phase 2: TDS Enhancements (Medium Severity)

**Goal**: Complete TDS rounding feature across all payment flows

| Task | Bug | Effort | Files |
|------|-----|--------|-------|
| TDS rounding in payment-record (via BUG-004) | BUG-001 | Low | Already done |
| TDS rounding in inline payment fields | BUG-002 | Medium | 5 files |

**Estimated Effort**: ~2-3 hours

### Phase 3: Testing & Verification

| Test Scenario | Related Bugs |
|---------------|--------------|
| Standard user creates invoice → Admin gets notification | BUG-003 |
| Admin approves invoice → Creator gets notification | BUG-003 |
| Admin rejects invoice → Creator gets notification | BUG-003 |
| Record payment from detail panel with TDS | BUG-001, BUG-004 |
| Inline payment with TDS rounding | BUG-002 |

---

## File Reference Index

### Files to Modify

| File | Bugs | Changes |
|------|------|---------|
| `app/actions/invoices-v2.ts` | BUG-003 | Add notification imports and calls |
| `components/invoices/invoice-detail-panel-v2.tsx` | BUG-001, BUG-004 | Add Record Payment button |
| `components/invoices-v2/inline-payment-fields.tsx` | BUG-002 | Add TDS rounding UI |
| `components/invoices-v2/recurring-invoice-form.tsx` | BUG-002 | Pass TDS props |
| `components/invoices-v2/non-recurring-invoice-form.tsx` | BUG-002 | Pass TDS props |
| `components/invoices-v2/edit-recurring-invoice-form.tsx` | BUG-002 | Pass TDS props |
| `components/invoices-v2/edit-non-recurring-invoice-form.tsx` | BUG-002 | Pass TDS props |

### Files Already Working (No Changes Needed)

| File | Status |
|------|--------|
| `components/payments/payment-form-panel.tsx` | Has TDS Round off UI |
| `components/invoices/invoice-panel-renderer.tsx` | Routes payment-record correctly |
| `app/actions/notifications.ts` | All notification functions exist |
| `app/actions/ledger.ts` | Excludes pending_approval correctly |

---

## Progress Log

### 2025-12-06

- **Investigation Complete**: Identified root causes for all 4 bugs
- **Document Created**: This sprint plan created
- **Phase 1 Started**: User approved Phase 1 (critical fixes)
- **BUG-003 Fixed**: Added notification imports and calls to `invoices-v2.ts`
  - Import: `notifyInvoicePendingApproval`, `notifyInvoiceApproved`, `notifyInvoiceRejected`
  - Updated `getCurrentUser()` to include `name` field
  - Added notification calls to `createRecurringInvoice()`, `createNonRecurringInvoice()`, `approveInvoiceV2()`, `rejectInvoiceV2()`
- **BUG-004 Fixed**: Added "Record Payment" button to `invoice-detail-panel-v2.tsx`
  - Added `usePaymentSummary` hook
  - Added `handleRecordPayment()` function with TDS props
  - Added permission checks (`canRecordPayment`, `hasRemainingBalance`)
  - Added button with CreditCard icon
- **BUG-001 Fixed**: Resolved as part of BUG-004 (TDS props now passed to payment-record panel)
- **TypeScript/Lint**: Passed with no new errors
- **BUG-005 Reported**: User discovered payment form showing hardcoded payment methods
- **BUG-005 Fixed (Phase 1)**: Updated payment-form-panel.tsx to use `usePaymentTypes` hook
  - Added `usePaymentTypes` hook import and usage
  - Updated dropdown to fetch and display master data payment types
  - Changed `PaymentFormData.payment_method` type from enum to `string`
  - TypeScript compilation and build both pass
- **BUG-005 Additional Issues**: User reported payment methods still showing "No payment types available" and currency showing USD
- **BUG-005 Fixed (Phase 2)**: Fixed remaining issues
  - Changed import from `use-payment-types.ts` to `use-invoices-v2.ts` (uses same hook pattern as invoice forms)
  - Changed currency from USD to INR in `formatCurrency` function
  - Changed locale from `en-US` to `en-IN`
  - TypeScript compilation and build both pass
- **BUG-002 Fixed**: Added TDS Round off toggle to inline payment fields
  - Added TDS props to `InlinePaymentFieldsProps` interface
  - Added `calculateTds` import and TDS calculation logic
  - Added amber-themed TDS Rounding UI section
  - Updated all 4 invoice forms (recurring, non-recurring, edit-recurring, edit-non-recurring)
  - Added `tds_rounded` field to all invoice validation schemas
  - TypeScript compilation and build both pass
- **BUG-002 Regression Fix**: Added missing `tds_rounded` to form defaultValues
  - The field was in the schema but NOT in the form's defaultValues
  - Added `tds_rounded: false` to defaultValues in all 4 invoice forms
  - Added setValue('tds_rounded', false) in edit forms' useEffect
  - TypeScript compilation and build both pass
- **BUG-002 Final Fix**: Fixed TDS section visibility in create forms
  - **Root Cause**: The TDS section only showed when `exactTds !== roundedTds` (i.e., when rounding makes a difference)
  - If user entered a round invoice amount (e.g., 10000 with 2% TDS = 200), no decimal, so no toggle needed
  - **Solution**: Always show TDS section when TDS is applicable, but:
    - Show toggle + exact/rounded breakdown when rounding makes a difference
    - Show "TDS Summary" with info message when TDS is already a whole number
  - Updated both `inline-payment-fields.tsx` and `payment-form-panel.tsx` for consistency
  - TypeScript compilation and build both pass
- **BUG-007 Created & Resolved**: User requested TDS toggle only appear when TDS is decimal
  - Simplified logic: TDS toggle ONLY shows when `exactTds !== roundedTds`
  - Removed "TDS Summary" fallback UI (not needed when TDS is whole number)
  - Updated `inline-payment-fields.tsx` and `payment-form-panel.tsx`
  - Covers all 5 scenarios: create/edit recurring, create/edit non-recurring, record payment
  - TypeScript compilation and build both pass

### 2025-12-07

- **BUG-008 Reported**: '+' button on recurring cards not functional
  - "Record Payment" opened wrong panel
  - "Add New Invoice" didn't pre-fill profile
  - 3-dot menu had Edit/Delete that shouldn't be there
- **BUG-008 Fixed (Phase 1)**: Card action handlers (completed earlier in session)
  - Removed Edit/Delete from 3-dot menu
  - Added defaultProfileId to recurring invoice form
  - Profile now pre-selected when clicking "Add New Invoice"
- **BUG-008 Fixed (Phase 2)**: Created ProfilePaymentPanel for "Record Payment"
  - Created `profile-payment-panel.tsx` matching payment-record UX
  - Shows Payment Summary with total pending amount
  - Lists all outstanding invoices with breakdown (amount, paid, remaining)
  - Each invoice has "Pay" button to open payment-record panel
  - Integrated with ProfilePanelRenderer
  - Updated invoices-page.tsx to use `profile-payment` panel
  - TypeScript compilation and build both pass

---

## Notes

### TDS Round off Logic Reference

The TDS rounding toggle allows users to round TDS to the nearest integer (ceiling). This is implemented in `payment-form-panel.tsx`:

```typescript
// Calculate TDS amounts (exact and rounded)
const tdsCalculation = React.useMemo(() => {
  if (!tdsApplicable || !tdsPercentage) {
    return { exactTds: 0, roundedTds: 0, activeTds: 0, payableExact: invoiceAmount, payableRounded: invoiceAmount };
  }

  const exactResult = calculateTds(invoiceAmount, tdsPercentage, false);
  const roundedResult = calculateTds(invoiceAmount, tdsPercentage, true);

  return {
    exactTds: exactResult.tdsAmount,
    roundedTds: roundedResult.tdsAmount,
    activeTds: roundTds ? roundedResult.tdsAmount : exactResult.tdsAmount,
    payableExact: exactResult.payableAmount,
    payableRounded: roundedResult.payableAmount,
  };
}, [invoiceAmount, tdsApplicable, tdsPercentage, roundTds]);
```

### Notification Functions Reference

Available in `app/actions/notifications.ts`:

- `notifyInvoicePendingApproval(invoiceId, invoiceNumber, requesterName)` - Notifies all admins
- `notifyInvoiceApproved(userId, invoiceId, invoiceNumber)` - Notifies invoice creator
- `notifyInvoiceRejected(userId, invoiceId, invoiceNumber, reason?)` - Notifies invoice creator
- `notifyInvoiceOnHold(userId, invoiceId, invoiceNumber, reason?)` - Notifies invoice creator

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-06 | 1.0 | Initial document created with 4 bugs identified |
| 2025-12-06 | 1.1 | Added BUG-005 (hardcoded payment methods), resolved same day |
| 2025-12-06 | 1.2 | BUG-002 resolved - TDS Round off in inline payment fields |
| 2025-12-06 | 1.3 | BUG-002 final fix - TDS section now always shows when TDS is applicable |
| 2025-12-06 | 1.4 | BUG-007 - TDS toggle only shows when TDS amount is decimal (per user request) |
| 2025-12-07 | 1.5 | BUG-008 - '+' button on recurring cards now fully functional (Profile Payment Panel) |

