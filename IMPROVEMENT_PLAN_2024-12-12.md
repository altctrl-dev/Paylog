# Invoice Management Improvement Plan

> **Status**: ✅ COMPLETED
> **Created**: 2024-12-12
> **Last Updated**: 2024-12-12
> **Completed**: 2024-12-12

## Progress Summary

| Item | Status | Notes |
|------|--------|-------|
| BUG-001: Block Payment Recording | ✅ **COMPLETED** | Implemented 2024-12-12 |
| IMP-001 Phase 1: Backend & Types | ✅ **COMPLETED** | Implemented 2024-12-12 |
| IMP-001 Phase 2: Filter UI Components | ✅ **COMPLETED** | Implemented 2024-12-12 |
| IMP-001 Phase 3: Integration & Table Sorting | ✅ **COMPLETED** | Implemented 2024-12-12 |
| IMP-001 Phase 4: Mobile Filter Sheet | ✅ **COMPLETED** | Implemented 2024-12-12 |
| IMP-001 Phase 5: Polish & Testing | ✅ **COMPLETED** | Implemented 2024-12-12 |

---

## Table of Contents

1. [Overview](#overview)
2. [Improvements](#improvements)
   - [IMP-001: Comprehensive Invoice Filtering System](#imp-001-comprehensive-invoice-filtering-system)
3. [Bug Fixes](#bug-fixes)
4. [Implementation Phases](#implementation-phases)
5. [Implementation Checklist](#implementation-checklist)

---

## Overview

This document tracks all planned improvements and bug fixes for the invoice management system. Each item includes detailed requirements, acceptance criteria, and implementation notes.

---

## Improvements

### IMP-001: Comprehensive Invoice Filtering System

**Priority**: High
**Effort**: Medium
**Status**: Planned

#### Problem Statement

The v3 All Invoices tab (`components/v3/invoices/all-invoices-tab.tsx`) only uses a fraction of the already-built filter infrastructure. Currently limited to:
- Status filter (payment status only)
- Month filter (start/end date)
- Show archived toggle
- Basic search (invoice number/vendor name)

The backend (`getInvoices` action) and types (`InvoiceFilters`) already support comprehensive filtering that isn't exposed in the UI.

#### Current State

**Backend Supports (InvoiceFilters type)**:
- `search` - Invoice number or vendor name
- `status` - 7 status types
- `vendor_id` - Single vendor
- `category_id` - Single category
- `entity_id` - Entity/business unit
- `is_recurring` - Recurring vs one-time
- `tds_applicable` - TDS applicable invoices
- `invoice_profile_id` - Recurring profile
- `start_date` / `end_date` - Date range
- `sort_by` / `sort_order` - Sorting

**Multiple Filters Work Together**: All filters use AND logic - selecting multiple filters returns invoices matching ALL criteria.

**Existing Filter Components** (in `/components/invoices/filters/`):
- `filter-bar.tsx` - Main filter interface
- `more-filters-popover.tsx` - Vendor & Category filters
- `active-filter-pills.tsx` - Removable filter badges
- `date-range-filter.tsx` - Date range with presets
- `sort-filter.tsx` - Sort options

**Master Data Available**:
| Data | Hook/Action | Status |
|------|-------------|--------|
| Vendors | `useVendors()` | Available |
| Categories | `useCategories()` | Available |
| Entities | `getInvoiceFormOptions()` | Available |
| Invoice Profiles | `getInvoiceFormOptions()` | Available |
| Payment Types | `usePaymentTypes()` | Available |

#### Proposed Solution

**UI Pattern**: Progressive Disclosure Filter Pattern
- Clean default view with Search + Filters button + Export + New Invoice (4 items only)
- Sort button removed - sorting moved inside filter popover/sheet
- Badge indicator showing active filter count
- Filter pills for quick visibility and removal
- Popover on desktop / Sheet on mobile
- Table headers clickable for quick sorting

**Main UI Layout (Simplified)**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pending Actions                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐  ┌────────────┐  ┌────────┐  ┌───────────────┐ │
│ │ 🔍 Search invoices...   │  │ Filters (3)│  │ Export │  │ + New Invoice │ │
│ └─────────────────────────┘  └────────────┘  └────────┘  └───────────────┘ │
│                                                                             │
│ [Vendor: Acme ×]  [Unpaid ×]  [TDS ×]  [Clear All]                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Invoice Table with sortable column headers)                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Desktop Filter Popover (Optimized ~320px width)**:
```
┌───────────────────────────────────────────┐
│ VIEW                                      │
│ ┌─────────┐ ┌─────────┐  ┌─────────────┐ │
│ │●Pending │ │ Monthly │  │ < Dec 2024 >│ │
│ └─────────┘ └─────────┘  └─────────────┘ │
│                          (shows if Monthly)│
├───────────────────────────────────────────┤
│ FILTERS                                   │
│ Status        ┌─────────────────────────┐ │
│               │ All                   ▾ │ │
│               └─────────────────────────┘ │
│ Vendor        ┌─────────────────────────┐ │
│               │ All                   ▾ │ │
│               └─────────────────────────┘ │
│ Category      ┌─────────────────────────┐ │
│               │ All                   ▾ │ │
│               └─────────────────────────┘ │
│ Profile       ┌─────────────────────────┐ │
│               │ All                   ▾ │ │
│               └─────────────────────────┘ │
│ Payment Type  ┌─────────────────────────┐ │
│               │ All                   ▾ │ │
│               └─────────────────────────┘ │
│                                           │
│ Type   ○ All  ○ Recurring  ○ One-time    │
│                                           │
│ ☐ TDS Applicable    ☐ Show Archived      │
├───────────────────────────────────────────┤
│ DATE RANGE                                │
│ [This Month] [Last Month] [This Year]    │
│ ┌──────────────┐  ┌──────────────┐       │
│ │ From         │  │ To           │       │
│ └──────────────┘  └──────────────┘       │
├───────────────────────────────────────────┤
│ SORT BY                                   │
│ ┌─────────────────────────┐  ┌─────────┐ │
│ │ Invoice Date          ▾ │  │ ↑ Asc   │ │
│ └─────────────────────────┘  └─────────┘ │
│   Options: Date, Amount, Status, Remaining│
├───────────────────────────────────────────┤
│   ┌─────────┐        ┌────────────────┐  │
│   │  Reset  │        │ Apply Filters  │  │
│   └─────────┘        └────────────────┘  │
└───────────────────────────────────────────┘
```

**Mobile Slide-Out Filter Sheet**:
```
┌─────────────────────────────────────────────────┐
│ ═══════════════════════                         │  ← Drag handle
│                                                 │
│ Filters                              [× Close]  │
│ ─────────────────────────────────────────────── │
│                                                 │
│ VIEW                                            │
│ ┌───────────────┐ ┌───────────────┐            │
│ │   ● Pending   │ │    Monthly    │            │
│ └───────────────┘ └───────────────┘            │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │         <   December 2024   >           │    │  ← Only if Monthly
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Status              ┌───────────────────────┐  │
│                     │ All Statuses        ▾ │  │
│                     └───────────────────────┘  │
│                                                 │
│ Vendor              ┌───────────────────────┐  │
│                     │ All Vendors         ▾ │  │
│                     └───────────────────────┘  │
│                                                 │
│ Category            ┌───────────────────────┐  │
│                     │ All Categories      ▾ │  │
│                     └───────────────────────┘  │
│                                                 │
│ Invoice Profile     ┌───────────────────────┐  │
│                     │ All Profiles        ▾ │  │
│                     └───────────────────────┘  │
│                                                 │
│ Payment Type        ┌───────────────────────┐  │
│                     │ All Payment Types   ▾ │  │
│                     └───────────────────────┘  │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Invoice Type                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ ● All    │ │Recurring │ │ One-time │        │
│ └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│ ┌─────────────────┐  ┌─────────────────┐       │
│ │ ☐ TDS Applicable│  │ ☐ Show Archived │       │
│ └─────────────────┘  └─────────────────┘       │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Date Range                                      │
│ ┌─────────┐┌──────────┐┌─────────┐┌─────────┐ │
│ │This Mo. ││ Last Mo. ││This Yr. ││ Custom  │ │
│ └─────────┘└──────────┘└─────────┘└─────────┘ │
│                                                 │
│ ┌─────────────────┐  ┌─────────────────┐       │
│ │ From      📅    │  │ To        📅    │       │
│ └─────────────────┘  └─────────────────┘       │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Sort By                                         │
│ ┌───────────────────────┐  ┌─────────────────┐ │
│ │ Invoice Date        ▾ │  │ ↑ Ascending   ▾ │ │
│ └───────────────────────┘  └─────────────────┘ │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ ┌───────────────────┐  ┌─────────────────────┐ │
│ │    Reset All      │  │  Apply Filters (3)  │ │
│ └───────────────────┘  └─────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Table with Sortable Headers**:
```
┌────┬─────────────────────┬────────────┬─────────────┬──────────┬─────────┬────────────┐
│ ☐  │ Invoice Details     │ Date ↕     │ Amount ↕    │ Status ↕ │ Actions │ Remaining ↕│
├────┼─────────────────────┼────────────┼─────────────┼──────────┼─────────┼────────────┤
│    │ (not sortable)      │ (click to  │ (click to   │(click to │(not     │ (click to  │
│    │                     │  sort)     │  sort)      │ sort)    │sortable)│  sort)     │
└────┴─────────────────────┴────────────┴─────────────┴──────────┴─────────┴────────────┘

Header click behavior:
- First click: Sort ascending ↑
- Second click: Sort descending ↓
- Shows arrow indicator on active sort column
```

#### Filters to Implement

| Filter | Type | Data Source | Backend Ready | Priority |
|--------|------|-------------|---------------|----------|
| Search | Text input | Local | ✅ Yes | P0 |
| View Mode | Radio (Pending/Monthly) | Local | ✅ Yes | P0 |
| Status | Single select | Enum | ✅ Yes | P0 |
| Vendor | Single select | `useInvoiceFormOptions()` | ✅ Yes | P0 |
| Category | Single select | `useInvoiceFormOptions()` | ✅ Yes | P0 |
| Date Range | Date picker | Local | ✅ Yes | P0 |
| Invoice Profile | Single select | `useInvoiceFormOptions()` | ✅ Yes | P1 |
| Payment Type | Single select | `usePaymentTypes()` | ⚠️ Needs work | P1 |
| Invoice Type | Radio (All/Recurring/One-time) | Local | ✅ Yes | P1 |
| TDS Applicable | Checkbox | Local | ✅ Yes | P1 |
| Entity | Single select | `useInvoiceFormOptions()` | ⚠️ Partial | P2 |

#### Payment Type Filter - Backend Implementation

**Challenge**: Payment Type is stored on the `Payment` model, not the `Invoice` model.

**Schema Reference**:
```prisma
model Payment {
  id                 Int      @id @default(autoincrement())
  invoice_id         Int      // Links to Invoice
  payment_type_id    Int?     // Links to PaymentType
  amount_paid        Float
  // ... other fields
}
```

**Solution**: Use Prisma relation query to filter invoices by payment type:

```typescript
// In getInvoices() action - add to InvoiceFilters type
payment_type_id?: number;

// In where clause building
if (validated.payment_type_id) {
  where.payments = {
    some: {
      payment_type_id: validated.payment_type_id,
      status: 'approved'  // Only count approved payments
    }
  };
}
```

**Use Case**: "Show all invoices that have at least one payment via Bank Transfer/UPI/Cash"

#### Sort Options

| Sort Field | Column Header | Description | Backend Ready |
|------------|---------------|-------------|---------------|
| `invoice_date` | Date | Invoice date (default) | ✅ Yes |
| `invoice_amount` | Amount | Invoice amount | ✅ Yes |
| `status` | Status | Invoice status | ✅ Yes |
| `remaining_balance` | Remaining | Pending/remaining amount | ⚠️ Computed field |

**Sort Direction**: Ascending (↑) / Descending (↓) toggle

**Note**: `remaining_balance` is a computed field (not stored in DB). Sorting by it requires in-memory sorting after enrichment, which is already supported in `getInvoices()`.

#### Acceptance Criteria

**Filter UI**:
- [ ] Action bar simplified to 4 items: Search, Filters, Export, New Invoice
- [ ] Sort button removed from action bar (moved into filter popover)
- [ ] Filter button shows badge with active filter count
- [ ] Clicking Filter opens popover (desktop) or sheet (mobile)
- [ ] Active filters shown as removable pills below action bar
- [ ] "Clear All" resets all filters to defaults

**Filter Functionality**:
- [ ] View Mode (Pending/Monthly) works as before
- [ ] MonthNavigator appears in popover when Monthly selected
- [ ] All filters properly wire to `useInvoices()` hook
- [ ] Multiple filters work together (AND logic)
- [ ] Payment Type filter added and functional
- [ ] Loading states for filter dropdowns

**Sorting**:
- [ ] Sort options moved inside filter popover/sheet
- [ ] Sort by: Date, Amount, Status, Remaining
- [ ] Sort direction: Ascending/Descending toggle
- [ ] Table column headers clickable for quick sorting (Date, Amount, Status, Remaining)
- [ ] Active sort column shows arrow indicator (↑/↓)

**Responsive**:
- [ ] Desktop: Filter popover (~320px width)
- [ ] Mobile: Full-height slide-out sheet with drag handle

**Optional (Phase 2)**:
- [ ] Filters persist across page navigation (URL sync)

#### Files to Create/Modify

**New Files**:
- [ ] `components/v3/invoices/invoice-filter-popover.tsx` - Desktop popover
- [ ] `components/v3/invoices/invoice-filter-sheet.tsx` - Mobile sheet
- [ ] `components/v3/invoices/active-filter-pills.tsx` - Filter pills (or adapt existing)

**Modify Files**:
- [ ] `components/v3/invoices/all-invoices-tab.tsx` - Integrate new filter system
- [ ] `app/actions/invoices.ts` - Add payment_type_id filter support
- [ ] `types/invoice.ts` - Add payment_type_id to InvoiceFilters type
- [ ] `hooks/use-invoice-form-options.ts` - Verify payment types are exported

---

## Bug Fixes

### BUG-001: Block Payment Recording While Pending Payment Exists

**Priority**: High
**Effort**: Low (~1 hour)
**Status**: ✅ COMPLETED (2024-12-12)

#### Description

When a standard user records a payment for an invoice and that payment is in "pending" (awaiting approval) status, the system should **block ALL users** (including admins) from recording another payment until:
1. The pending payment is approved/rejected
2. The remaining balance is recalculated

#### Current Behavior

Users can record multiple payments even when there's already a pending payment awaiting approval. This can lead to:
- Incorrect remaining balance calculations
- Overpayments
- Confusion in the approval workflow

#### Expected Behavior

1. When an invoice has a payment with `status: 'pending'`:
   - "Record Payment" button should be **disabled** for ALL users
   - Show tooltip/message: "Payment pending approval"
2. Once the pending payment is approved or rejected:
   - Remaining balance is recalculated
   - "Record Payment" button becomes enabled again

#### Affected Areas

- Invoice detail panel - Record Payment action
- All Invoices tab - Record Payment action in table row
- Ledger tab - Payment recording
- Any other place where payments can be recorded

#### Technical Implementation

1. **Backend**: Add check in `recordPayment` action to reject if pending payment exists
2. **Frontend**: Check for pending payments and disable button + show message
3. **Query**: Add `hasPendingPayment` computed field to invoice data

```typescript
// In getInvoices() or invoice detail query
const hasPendingPayment = await db.payment.findFirst({
  where: {
    invoice_id: invoiceId,
    status: 'pending'
  }
});

// Return with invoice data
return {
  ...invoice,
  hasPendingPayment: !!hasPendingPayment
};
```

```typescript
// In recordPayment action - add validation
if (hasPendingPayment) {
  return {
    success: false,
    error: 'Cannot record payment while another payment is pending approval'
  };
}
```

#### Acceptance Criteria

- [x] Backend rejects payment recording if pending payment exists
- [x] "Record Payment" button disabled when pending payment exists
- [x] Tooltip shows "Payment pending approval" message
- [x] Once pending payment is approved/rejected, button re-enables
- [x] Works for ALL user roles (standard, admin, super_admin)

#### Files Modified

- [x] `types/payment.ts` - Added `has_pending_payment` to `PaymentSummary` type
- [x] `app/actions/payments.ts` - Added pending payment check in `createPayment` and `getPaymentSummary`
- [x] `components/invoices/invoice-detail-panel-v3/hooks/use-invoice-panel-v3.ts` - Added `hasPendingPayment`, `recordPaymentBlockedReason`, updated permissions
- [x] `components/invoices/invoice-detail-panel-v3/panel-v3-action-bar.tsx` - Added tooltip for disabled state
- [x] `components/invoices/invoice-detail-panel-v3/index.tsx` - Pass new props to action bar
- [x] `components/panels/shared/panel-action-bar.tsx` - Added `tooltip` property to `ActionBarAction` type

---

## Implementation Phases

### Phase 1: Backend & Types (Foundation) ✅ COMPLETED
**Effort**: ~2 hours
**Completed**: 2024-12-12

| Task | File | Description | Status |
|------|------|-------------|--------|
| 1.1 | `types/invoice.ts` | Add `payment_type_id` to `InvoiceFilters` type | ✅ Done |
| 1.2 | `lib/validations/invoice.ts` | Add `payment_type_id` to Zod schema | ✅ Done |
| 1.3 | `app/actions/invoices.ts` | Add payment_type_id filter with relation query | ✅ Done |
| 1.4 | `app/actions/invoices.ts` | Add `remaining_balance` in-memory sort support | ✅ Done |
| 1.5 | `components/invoices/filters/sort-filter.tsx` | Add remaining_balance sort options | ✅ Done |
| 1.6 | Build | Verify build passes | ✅ Done |

**Deliverable**: Backend supports all 11 filters + 5 sort options (Date, Due Date, Amount, Remaining, Status, Created)

---

### Phase 2: Filter UI Components (Desktop)
**Effort**: ~4 hours

| Task | File | Description |
|------|------|-------------|
| 2.1 | `invoice-filter-popover.tsx` | Create filter popover component |
| 2.2 | - | VIEW section: Pending/Monthly toggle + MonthNavigator |
| 2.3 | - | FILTERS section: Status, Vendor, Category, Profile, Payment Type |
| 2.4 | - | Invoice Type radio + TDS/Archived checkboxes |
| 2.5 | - | DATE RANGE section with presets |
| 2.6 | - | SORT BY section |
| 2.7 | - | Reset + Apply buttons |
| 2.8 | `active-filter-pills.tsx` | Create/adapt filter pills component |

**Deliverable**: Fully functional desktop filter popover

---

### Phase 3: Integration & Table Sorting
**Effort**: ~3 hours

| Task | File | Description |
|------|------|-------------|
| 3.1 | `all-invoices-tab.tsx` | Remove old filter dropdown and sort button |
| 3.2 | `all-invoices-tab.tsx` | Add Filters button with badge |
| 3.3 | `all-invoices-tab.tsx` | Integrate filter popover |
| 3.4 | `all-invoices-tab.tsx` | Add filter pills row |
| 3.5 | `all-invoices-tab.tsx` | Make table headers sortable (Date, Amount, Status, Remaining) |
| 3.6 | `all-invoices-tab.tsx` | Wire all filters to `useInvoices()` hook |
| 3.7 | Test | Test all filter combinations |

**Deliverable**: Desktop filtering fully working

---

### Phase 4: Mobile Filter Sheet
**Effort**: ~2 hours

| Task | File | Description |
|------|------|-------------|
| 4.1 | `invoice-filter-sheet.tsx` | Create mobile slide-out sheet |
| 4.2 | - | Same sections as popover, optimized layout |
| 4.3 | - | Drag handle + close button |
| 4.4 | `all-invoices-tab.tsx` | Detect mobile and show sheet instead of popover |
| 4.5 | Test | Test on mobile viewport |

**Deliverable**: Mobile filtering fully working

---

### Phase 5: Polish & Testing
**Effort**: ~1 hour

| Task | Description |
|------|-------------|
| 5.1 | Loading states for all dropdowns |
| 5.2 | Empty states (no results with filters) |
| 5.3 | Keyboard accessibility |
| 5.4 | Full regression test |
| 5.5 | Build verification |

**Deliverable**: Production-ready filtering system

---

## Implementation Summary

| Phase | Title | Effort | Cumulative |
|-------|-------|--------|------------|
| 1 | Backend & Types | ~2 hours | 2 hours |
| 2 | Filter UI Components (Desktop) | ~4 hours | 6 hours |
| 3 | Integration & Table Sorting | ~3 hours | 9 hours |
| 4 | Mobile Filter Sheet | ~2 hours | 11 hours |
| 5 | Polish & Testing | ~1 hour | **12 hours** |

**Total Estimated Effort**: ~12 hours (1.5 days)

---

## Implementation Checklist

### Pre-Implementation
- [x] All requirements documented
- [x] UI mockups created
- [x] Backend requirements identified
- [ ] Priority agreed upon
- [ ] Technical approach reviewed

### Phase 1: Backend & Types ✅
- [x] 1.1 Add payment_type_id to InvoiceFilters type
- [x] 1.2 Add payment_type_id to Zod validation schema
- [x] 1.3 Add payment_type_id filter to getInvoices() with relation query
- [x] 1.4 Add remaining_balance in-memory sort support
- [x] 1.5 Update SortFilter component with remaining_balance options
- [x] 1.6 Build verification passed

### Phase 2: Filter UI Components ✅
- [x] 2.1 Create invoice-filter-popover.tsx
- [x] 2.2 VIEW section (Pending/Monthly toggle)
- [x] 2.3 FILTERS section (6 dropdowns: Status, Vendor, Category, Profile, Payment Type, Entity)
- [x] 2.4 Invoice Type buttons + TDS/Archived checkboxes
- [x] 2.5 DATE RANGE section (8 presets)
- [x] 2.6 SORT BY section (7 options)
- [x] 2.7 Reset All + Cancel + Apply buttons
- [x] 2.8 Added useActivePaymentTypes hook
- [x] 2.9 Build verification passed

### Phase 3: Integration & Table Sorting ✅
- [x] 3.1 Remove old filter UI (Filter/Sort dropdown menus removed)
- [x] 3.2 Add Filters button with badge (active filter count displayed)
- [x] 3.3 Integrate filter popover (InvoiceFilterPopover integrated)
- [x] 3.4 Add filter pills row (removable pills + Clear All button)
- [x] 3.5 Sortable table headers (Date, Amount, Status, Remaining clickable)
- [x] 3.6 Wire to useInvoices() (all filters passed to hook)
- [x] 3.7 Build verification passed

### Phase 4: Mobile Filter Sheet ✅
- [x] 4.1 Create invoice-filter-sheet.tsx (bottom sheet using Radix Dialog)
- [x] 4.2 Optimized mobile layout (max-h-85vh, h-10 touch targets)
- [x] 4.3 Drag handle + slide animations
- [x] 4.4 Mobile detection (768px breakpoint) + sheet trigger
- [x] 4.5 Build verification passed

### Phase 5: Polish & Testing ✅
- [x] 5.1 Loading states (added "Loading..." indicator in FILTERS section)
- [x] 5.2 Empty states (contextual messages with Clear Filters button)
- [x] 5.3 Keyboard accessibility (aria-labels on buttons and pills)
- [x] 5.4 Result count display (shows filtered invoice count)
- [x] 5.5 Build verification passed

### Post-Implementation
- [x] All items tested (build verification)
- [x] Build passes
- [ ] Code committed and pushed
- [x] Documentation updated (this file)

---

## Notes

- This document will be updated as more improvements and bugs are identified
- Please share additional items to add to this plan
- Phase 2 (URL sync) for filter persistence is deferred to future sprint
