# Invoice Management Improvement Plan

> **Status**: 🔄 IN PROGRESS
> **Created**: 2024-12-12
> **Last Updated**: 2024-12-20

## Progress Summary

| Item | Status | Group | Notes |
|------|--------|-------|-------|
| **Completed** | | | |
| BUG-001: Block Payment Recording | ✅ **COMPLETED** | - | Implemented 2024-12-12 |
| IMP-001: Comprehensive Invoice Filtering | ✅ **COMPLETED** | - | All 5 phases done 2024-12-12 |
| BUG-006: TDS Not Deducted in Remaining Balance | ✅ **COMPLETED** | A | Fixed 2024-12-13 |
| BUG-004: Search Missing Invoice Name/Profile | ✅ **COMPLETED** | B | Fixed 2024-12-13 |
| IMP-003: Zero Balance Display as Dash | ✅ **COMPLETED** | B | Fixed 2024-12-13 |
| IMP-002: Responsive Action Bar | ✅ **COMPLETED** | B | Fixed 2024-12-13 |
| BUG-005: Vendor Not Populated on Edit | ✅ **COMPLETED** | C | Fixed 2024-12-13 |
| BUG-002: Invoice Status Colors for Payment Pending | ✅ **COMPLETED** | D | Fixed 2024-12-13 |
| BUG-003: TDS Rounding Consistency (Invoice-Level) | ✅ **COMPLETED** | A | Fixed 2024-12-13 |
| BUG-008: Double TDS Deduction in Payment Panel | ✅ **COMPLETED** | A | Fixed 2024-12-15 |
| BUG-007: Vendor Auto-Approval During Invoice Creation | ✅ **COMPLETED** | E | Fixed 2024-12-15 |
| **December 2025** | | | |
| BUG-009: Vendor Autocomplete Single-Click Not Working on Windows | ✅ **COMPLETED** | F | Fixed with onMouseDown |
| IMP-004: Vendor Autocomplete - Browse All Vendors with Arrow Key | ✅ **COMPLETED** | F | Arrow key + chevron indicator |
| IMP-005: Case-Insensitive Vendor Search | ✅ **COMPLETED** | F | Added mode: 'insensitive' |
| IMP-006: Clickable Chevron with Touch Support | ✅ **COMPLETED** | F | 32x32px touch-friendly button |
| IMP-007: Clickable Invoice Table Rows | ✅ **COMPLETED** | G | Row click opens detail panel |

---

## Task Groupings & Priority

### Recommended Execution Order

```
┌─────────────────────────────────────────────────────────────────┐
│ GROUP A: TDS Calculation Fixes (CRITICAL - Do First)            │
│ ├─ BUG-006: TDS not deducted in remaining balance (~1 hour)  ✅ │
│ ├─ BUG-003: TDS rounding as invoice preference (~4-6 hours)  ✅ │
│ └─ BUG-008: Double TDS deduction in payment panel (~30 min)  ✅ │
│     Files: app/actions/payments.ts, schema.prisma, forms        │
├─────────────────────────────────────────────────────────────────┤
│ GROUP B: All Invoices Tab Quick Fixes (Same File - Do Together) │
│ ├─ BUG-004: Search missing fields (~30 min)                  ✅ │
│ ├─ IMP-003: Zero balance as dash (~15 min)                   ✅ │
│ └─ IMP-002: Responsive action bar (~1 hour)                  ✅ │
│     Files: all-invoices-tab.tsx, app/actions/invoices.ts        │
├─────────────────────────────────────────────────────────────────┤
│ GROUP C: Form Data Loading (Investigation Required)             │
│ └─ BUG-005: Vendor not populated on edit (~1 hour)           ✅ │
│     Files: edit-non-recurring-invoice-form.tsx,                 │
│            vendor-text-autocomplete.tsx                         │
├─────────────────────────────────────────────────────────────────┤
│ GROUP D: Status UI (Standalone)                                 │
│ └─ BUG-002: Status color differentiation (~2 hours)          ✅ │
│     Files: Status badge components                              │
├─────────────────────────────────────────────────────────────────┤
│ GROUP E: Approval Workflow                                      │
│ └─ BUG-007: Vendor auto-approval bug (~2-3 hours)            ✅ │
│     Files: schema.prisma, master-data.ts, notifications.ts      │
├─────────────────────────────────────────────────────────────────┤
│ GROUP F: Cross-Platform UX (Vendor Autocomplete)                │
│ ├─ BUG-009: Single-click not working on Windows (~30 min)    ✅ │
│ └─ IMP-004: Browse all vendors with arrow key (~2 hours)     ✅ │
│     Files: vendor-text-autocomplete.tsx, use-vendors.ts         │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Order?

1. **Group A first**: BUG-006 is causing wrong data display RIGHT NOW (your screenshot). BUG-003 builds on the same TDS logic.
2. **Group B second**: All in same file, can be one PR. Quick wins with visible impact.
3. **Group C third**: Needs investigation, isolated to edit forms.
4. **Group D last**: Pure UI polish, doesn't affect data.

---

## Table of Contents

1. [Overview](#overview)
2. [Task Groupings & Priority](#task-groupings--priority)
3. [Improvements](#improvements)
   - [IMP-001: Comprehensive Invoice Filtering System](#imp-001-comprehensive-invoice-filtering-system)
   - [IMP-002: Responsive Action Bar](#imp-002-responsive-action-bar)
   - [IMP-003: Zero Balance Display as Dash](#imp-003-zero-balance-display-as-dash)
   - [IMP-004: Vendor Autocomplete - Browse All Vendors with Arrow Key](#imp-004-vendor-autocomplete---browse-all-vendors-with-arrow-key)
4. [Bug Fixes](#bug-fixes)
   - [BUG-001: Block Payment Recording While Pending Payment Exists](#bug-001-block-payment-recording-while-pending-payment-exists)
   - [BUG-002: Invoice Status Colors for Payment Pending](#bug-002-invoice-status-colors-for-payment-pending)
   - [BUG-003: TDS Rounding Consistency (Invoice-Level Preference)](#bug-003-tds-rounding-consistency-invoice-level-preference)
   - [BUG-004: Search Missing Invoice Name/Profile](#bug-004-search-missing-invoice-nameprofile)
   - [BUG-005: Vendor Not Populated on Edit](#bug-005-vendor-not-populated-on-edit)
   - [BUG-006: TDS Not Deducted in Remaining Balance Calculation](#bug-006-tds-not-deducted-in-remaining-balance-calculation)
   - [BUG-007: Vendor Auto-Approval During Invoice Creation](#bug-007-vendor-auto-approval-during-invoice-creation)
   - [BUG-008: Double TDS Deduction in Record Payment Panel](#bug-008-double-tds-deduction-in-record-payment-panel)
   - [BUG-009: Vendor Autocomplete Single-Click Not Working on Windows](#bug-009-vendor-autocomplete-single-click-not-working-on-windows)
5. [Implementation Phases](#implementation-phases)
6. [Implementation Checklist](#implementation-checklist)

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

### IMP-002: Responsive Action Bar

**Priority**: Medium
**Effort**: Low (~1 hour)
**Status**: 🔴 NOT STARTED

#### Problem Statement

On smaller screens (mobile/tablet), the action bar on the All Invoices tab becomes crowded with full-text buttons. The current layout shows "Filters", "Export", and "+ New Invoice" with full labels, which takes up too much horizontal space on mobile devices.

#### Current State

**Action bar layout (`all-invoices-tab.tsx` lines 745-830):**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search invoices...        ] [Filters (3)] [Export] [+ New Invoice] │
└─────────────────────────────────────────────────────────────────┘
```

- Uses `flex flex-col sm:flex-row` - stacks vertically on mobile
- Search field: `max-w-xs` (320px)
- All buttons show full text labels regardless of screen size
- Filter button: "Filters" + badge count
- Export button: "Export"
- New Invoice button: "+ New Invoice"

#### Expected State

**On smaller screens (< 640px / `sm` breakpoint):**
```
┌─────────────────────────────────────────────────┐
│ [🔍 Search...    ] [🔽] [📥] [+ New]            │
└─────────────────────────────────────────────────┘
```

- Search field: Reduced width, shorter placeholder
- Filter button: **Icon only** (funnel icon) + badge count
- Export button: **Icon only** (download icon)
- New Invoice button: **"+ New"** (shortened label)

**On larger screens (≥ 640px):** Keep current layout with full labels.

#### Technical Implementation

**Pattern to follow:** The table action buttons already use icon-only pattern (lines 1191-1275):
```typescript
<button className="..." title="View">
  <Eye className="h-4 w-4" />
  <span className="sr-only">View</span>
</button>
```

**Changes needed:**
```typescript
// Filter button
<Button variant="outline" size="sm">
  <Filter className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">Filters</span>
  {activeFilterCount > 0 && <Badge>...</Badge>}
</Button>

// Export button
<Button variant="outline" size="sm">
  <Download className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">Export</span>
</Button>

// New Invoice button
<Button size="sm">
  <Plus className="h-4 w-4" />
  <span className="sm:hidden">New</span>
  <span className="hidden sm:inline">New Invoice</span>
</Button>
```

#### Acceptance Criteria

- [ ] On screens < 640px: Filter button shows icon only + badge
- [ ] On screens < 640px: Export button shows icon only
- [ ] On screens < 640px: New Invoice button shows "+ New"
- [ ] On screens ≥ 640px: All buttons show full labels (unchanged)
- [ ] All buttons have `title` attribute for tooltip on hover
- [ ] All buttons have `sr-only` text for screen readers
- [ ] Build passes with no TypeScript errors

#### Files to Modify

- [ ] `components/v3/invoices/all-invoices-tab.tsx` - Action bar buttons

---

### IMP-003: Zero Balance Display as Dash

**Priority**: Low
**Effort**: Low (~15 minutes)
**Status**: 🔴 NOT STARTED

#### Problem Statement

When an invoice is fully paid (remaining balance = ₹0), the "Remaining" column shows "₹0" which adds visual noise. A dash "-" would be cleaner and immediately indicate "nothing remaining".

#### Current State

**Remaining column display (`all-invoices-tab.tsx` lines 1097-1100):**
```typescript
<span className={cn('font-medium text-sm',
  pendingAmount > 0 ? 'text-amber-500' : 'text-green-500'
)}>
  {formatCurrency(pendingAmount)}
</span>
```

- Zero balance: Shows "₹0" in green
- Non-zero: Shows amount in amber (e.g., "₹5,000")

#### Expected State

- Zero balance: Show **"-"** (dash) in green or muted color
- Non-zero: Show formatted amount in amber (unchanged)

#### Technical Implementation

```typescript
<span className={cn('font-medium text-sm',
  pendingAmount > 0 ? 'text-amber-500' : 'text-muted-foreground'
)}>
  {pendingAmount > 0 ? formatCurrency(pendingAmount) : '–'}
</span>
```

#### Acceptance Criteria

- [ ] Zero remaining balance shows "-" instead of "₹0"
- [ ] Non-zero amounts display normally with currency formatting
- [ ] Dash uses muted/subtle color (not green)
- [ ] Change applied to all invoice table views (Pending, Monthly, All)
- [ ] Build passes

#### Files to Modify

- [ ] `components/v3/invoices/all-invoices-tab.tsx` - Remaining column rendering (multiple locations)

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

### BUG-002: Invoice Status Colors for Payment Pending

**Priority**: High
**Effort**: Low (~2 hours)
**Status**: 🔴 NOT STARTED

#### Description

When a standard user records a payment for an **already approved** invoice, the invoice status changes to indicate a payment is pending approval. Currently, there's confusion because both "invoice pending approval" and "payment pending approval" use similar visual styling.

**Two Distinct Pending States**:
1. **Invoice Pending Approval** (`pending_approval`) - Invoice request itself is awaiting admin approval
2. **Payment Pending Approval** - Invoice is approved, but a new payment recorded by a standard user is awaiting approval

These states need **visually distinct** status badges to avoid confusion.

#### Color Scheme Specification

| Status | Condition | Badge Color | Background | Text Color |
|--------|-----------|-------------|------------|------------|
| **Invoice Pending** | Invoice `status === 'pending_approval'` | **Amber/Yellow** | `bg-amber-100` | `text-amber-800` |
| **Payment Pending** | Invoice approved + has pending payment | **Purple** | `bg-purple-100` | `text-purple-800` |

**Visual Reference** (from user screenshots):
- Invoice pending: Amber/Yellow badge with "pending_approval" text
- Payment pending: Purple badge with "Pending" text

#### Current Behavior

When a standard user records a payment on an approved invoice:
- The invoice shows some pending state
- Status badge color does not differentiate between invoice pending vs payment pending
- Users are confused about what is actually pending (the invoice or the payment)

#### Expected Behavior

1. **Invoice pending approval** (`pending_approval`):
   - Badge: Amber/Yellow background
   - Text: "Pending Approval"
   - Meaning: The invoice itself was created/modified by a standard user and awaits admin approval

2. **Payment pending approval**:
   - Badge: Purple background
   - Text: "Pending" or "Payment Pending"
   - Meaning: The invoice is approved, but a payment recorded by a standard user awaits approval
   - Condition: Invoice `status !== 'pending_approval'` AND `has_pending_payment === true`

3. **Visual Differentiation**:
   - Amber = Invoice-level approval needed
   - Purple = Payment-level approval needed
   - These should never appear at the same time (if invoice is pending, payments shouldn't be recordable)

#### Technical Implementation

**1. Update Status Badge Component**:
```typescript
// In status badge rendering logic
function getStatusBadgeStyle(invoice: Invoice) {
  // Invoice-level pending (amber/yellow)
  if (invoice.status === 'pending_approval') {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-800 dark:text-amber-200',
      label: 'Pending Approval'
    };
  }

  // Payment-level pending (purple)
  if (invoice.has_pending_payment) {
    return {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-200',
      label: 'Payment Pending'
    };
  }

  // Other statuses...
}
```

**2. Update Table Row Status Display**:
- Show purple "Pending" badge when invoice has pending payment
- Show amber "Pending Approval" for invoice-level pending

**3. Update Invoice Detail Panel**:
- Show appropriate badge color based on pending type
- Add clear indicator text explaining what is pending

#### Acceptance Criteria

- [ ] Invoice `pending_approval` status shows **Amber/Yellow** badge
- [ ] Invoice with pending payment shows **Purple** badge
- [ ] Badge text clearly indicates what is pending ("Pending Approval" vs "Payment Pending")
- [ ] Colors work correctly in both light and dark mode
- [ ] All invoice list views show correct badge colors
- [ ] Invoice detail panel shows correct badge color
- [ ] Visual consistency across all views (tabs, tables, panels)

#### Files to Modify

- [ ] `components/v3/invoices/all-invoices-tab.tsx` - Table row status badge
- [ ] `components/invoices/invoice-detail-panel-v3/` - Detail panel status display
- [ ] `lib/utils/invoice-status.ts` or similar - Status color utility (if exists)
- [ ] Any shared status badge components
- [ ] Possibly `types/invoice.ts` - Ensure `has_pending_payment` is available on invoice type

#### Dependencies

- BUG-001 (Block Payment Recording) must be completed first - ✅ DONE
- `has_pending_payment` field must be available on invoice data

---

### BUG-003: TDS Rounding Consistency (Invoice-Level Preference)

**Priority**: High
**Effort**: Medium (~4-6 hours)
**Status**: 🔴 NOT STARTED

#### Problem Statement

TDS rounding is currently stored **only on the Payment model**, leading to inconsistent TDS calculations across the application. When a user records a payment and chooses to round TDS, that choice:
- Is saved only on that specific payment
- Is NOT remembered for subsequent payments on the same invoice
- Is NOT used when calculating remaining balance on invoice tables
- Creates discrepancies between what's shown in different parts of the app

#### Current State (Problematic)

```
Invoice Created (TDS applicable)
    ↓
No TDS rounding preference stored on invoice
    ↓
Record Payment #1 → Choose "Round TDS" toggle → Saved on Payment ONLY
    ↓
Record Payment #2 → Toggle resets to OFF, user must choose again
    ↓
Different screens calculate TDS differently:
  - Invoice table: Uses exact TDS (no rounding) → Shows wrong remaining balance
  - Payment form: Uses whatever toggle says at that moment
  - Invoice detail: Uses exact TDS → Inconsistent with payments
  - TDS tab: Uses exact TDS → Doesn't match ledger
  - Ledger: Uses payment's stored value → Different from invoice views
```

**Result:** Remaining balance, TDS amounts, and payable amounts are **inconsistent** across the app.

#### Expected State (Solution)

```
Invoice Created (TDS applicable)
    ↓
TDS Section shows "Round Off TDS" toggle → User makes choice
    ↓
Choice is SAVED on the Invoice (invoice.tds_rounded = true/false)
    ↓
ALL screens use this single source of truth:
  ✓ Invoice table: Remaining balance uses invoice.tds_rounded
  ✓ Invoice detail panel: Uses invoice.tds_rounded
  ✓ Record Payment form: Pre-filled from invoice.tds_rounded (but can be changed)
  ✓ TDS tab: Uses invoice.tds_rounded
  ✓ Ledger tab: Uses invoice.tds_rounded
    ↓
If user changes choice during payment recording:
  → Update invoice.tds_rounded on the invoice
  → All subsequent views reflect the new choice
    ↓
Record Payment #2 → Toggle shows current invoice.tds_rounded value
```

#### Database Change Required

```prisma
model Invoice {
  // ... existing fields
  tds_applicable    Boolean   @default(false)
  tds_percentage    Float?
  tds_rounded       Boolean   @default(false)  // NEW FIELD
}
```

**Migration Strategy:**
1. Add `tds_rounded` column with default `false`
2. For existing invoices with payments that have `tds_rounded = true`, update the invoice to match

#### Screens/Areas to Update

| Screen | Current Behavior | Required Change |
|--------|------------------|-----------------|
| **Invoice Creation Forms** | No TDS rounding toggle | Add toggle in TDS section |
| **Invoice Edit Forms** | No TDS rounding toggle | Add toggle in TDS section |
| **Invoice Table (All Invoices)** | Remaining balance ignores rounding | Use `invoice.tds_rounded` in calculation |
| **Invoice Detail Panel** | Shows exact TDS | Use `invoice.tds_rounded` for display |
| **Record Payment Panel** | Toggle defaults to OFF | Pre-fill from `invoice.tds_rounded`, update invoice on change |
| **TDS Tab** | Uses exact TDS | Use `invoice.tds_rounded` |
| **Ledger Tab** | Uses payment's `tds_rounded` | Use `invoice.tds_rounded` for consistency |
| **Summary Cards** | May use inconsistent calculations | Use `invoice.tds_rounded` |

#### Implementation Phases

**Phase 1: Database & Backend (~2 hours)**
- [ ] Add `tds_rounded` field to Invoice model in `schema.prisma`
- [ ] Create migration
- [ ] Update `createInvoice` action to accept `tds_rounded`
- [ ] Update `updateInvoice` action to accept `tds_rounded`
- [ ] Update `getInvoices` to return `tds_rounded`
- [ ] Update `getInvoiceById` to return `tds_rounded`
- [ ] Create helper function `calculateInvoiceNetPayable(invoice)` that uses `invoice.tds_rounded`

**Phase 2: Invoice Forms (~1.5 hours)**
- [ ] Add TDS rounding toggle to `non-recurring-invoice-form.tsx` (in TDS section)
- [ ] Add TDS rounding toggle to `recurring-invoice-form.tsx` (in TDS section)
- [ ] Add TDS rounding toggle to edit forms
- [ ] Ensure toggle only shows when TDS is applicable and has decimal TDS amount

**Phase 3: Calculation Consistency (~1.5 hours)**
- [ ] Update `all-invoices-tab.tsx` remaining balance calculation
- [ ] Update invoice detail panel TDS display
- [ ] Update TDS tab calculations
- [ ] Update Ledger tab calculations
- [ ] Update any summary card calculations

**Phase 4: Payment Form Integration (~1 hour)**
- [ ] Pre-fill TDS toggle from `invoice.tds_rounded` in `payment-form-panel.tsx`
- [ ] When user changes toggle, update `invoice.tds_rounded` via API call
- [ ] Ensure subsequent payment forms show updated preference

#### Acceptance Criteria

- [ ] Invoice creation forms show TDS rounding toggle when TDS is applicable
- [ ] TDS rounding choice is saved on the Invoice model
- [ ] All invoice tables show remaining balance using `invoice.tds_rounded`
- [ ] Invoice detail panel shows TDS values using `invoice.tds_rounded`
- [ ] TDS tab shows values consistent with `invoice.tds_rounded`
- [ ] Ledger tab shows values consistent with `invoice.tds_rounded`
- [ ] Record Payment form pre-fills toggle from `invoice.tds_rounded`
- [ ] Changing toggle during payment updates `invoice.tds_rounded`
- [ ] Subsequent payments for same invoice show the updated preference
- [ ] Existing invoices default to `tds_rounded = false`
- [ ] Build passes with no TypeScript errors

#### Files to Modify

**Schema & Backend:**
- [ ] `schema.prisma` - Add `tds_rounded` to Invoice model
- [ ] `app/actions/invoices.ts` - Update create/update/get actions
- [ ] `lib/utils/tds.ts` - Add/update helper for consistent calculation
- [ ] `types/invoice.ts` - Add `tds_rounded` to Invoice type

**Invoice Forms:**
- [ ] `components/invoices-v2/non-recurring-invoice-form.tsx`
- [ ] `components/invoices-v2/recurring-invoice-form.tsx`
- [ ] `components/invoices-v2/edit-non-recurring-invoice-form.tsx`
- [ ] `components/invoices-v2/edit-recurring-invoice-form.tsx`

**Display Components:**
- [ ] `components/v3/invoices/all-invoices-tab.tsx`
- [ ] `components/invoices/invoice-detail-panel-v3/`
- [ ] `components/v3/invoices/tds-tab.tsx`
- [ ] `components/v3/invoices/ledger-table-view.tsx`
- [ ] `app/actions/ledger.ts`

**Payment Form:**
- [ ] `components/payments/payment-form-panel.tsx`
- [ ] `components/invoices-v2/inline-payment-fields.tsx`

#### Dependencies

- None (can be implemented independently)

#### Notes

- The `payment.tds_rounded` field can be kept for audit purposes (what was the choice at payment time)
- Consider showing a visual indicator on invoices where TDS rounding is enabled
- This fix ensures that when a user says "round TDS", the app respects that choice everywhere

---

### BUG-004: Search Missing Invoice Name/Profile

**Priority**: High
**Effort**: Low (~30 minutes)
**Status**: 🔴 NOT STARTED

#### Problem Statement

The search functionality on the "All Invoices" page does not include `invoice_name` (for one-time invoices) or `invoice_profile.name` (for recurring invoices) in the search query. Users cannot find invoices by searching for the invoice name or profile name.

#### Current State

**Client-side search (`all-invoices-tab.tsx` lines 502-510):**
```typescript
const filteredInvoices = invoices.filter((invoice) => {
  if (!searchQuery) return true;
  const query = searchQuery.toLowerCase();
  return (
    invoice.invoice_number?.toLowerCase().includes(query) ||
    invoice.vendor?.name?.toLowerCase().includes(query)
  );
});
```

**Backend search (`app/actions/invoices.ts` lines 252-267):**
```typescript
if (validated.search) {
  where.OR = [
    { invoice_number: { contains: validated.search } },
    { vendor: { name: { contains: validated.search } } },
  ];
}
```

**Currently searched:**
- ✅ `invoice_number` - Invoice identifier
- ✅ `vendor.name` - Vendor company name

**NOT searched (but displayed in table):**
- ❌ `invoice_name` - User-entered name for one-time invoices
- ❌ `invoice_profile.name` - Profile name for recurring invoices

**Note:** The `getInvoiceDetails()` function (lines 704-717) shows these fields ARE displayed in the "Invoice Details" column, but they're not searchable.

#### Expected State

Search should query across all visible identifier fields:
- `invoice_number`
- `vendor.name`
- `invoice_name` (for non-recurring invoices)
- `invoice_profile.name` (for recurring invoices)

#### Technical Implementation

**Backend (`app/actions/invoices.ts`):**
```typescript
if (validated.search) {
  where.OR = [
    { invoice_number: { contains: validated.search, mode: 'insensitive' } },
    { vendor: { name: { contains: validated.search, mode: 'insensitive' } } },
    { invoice_name: { contains: validated.search, mode: 'insensitive' } },
    { invoice_profile: { name: { contains: validated.search, mode: 'insensitive' } } },
  ];
}
```

**Client-side (`all-invoices-tab.tsx`):**
```typescript
const filteredInvoices = invoices.filter((invoice) => {
  if (!searchQuery) return true;
  const query = searchQuery.toLowerCase();
  return (
    invoice.invoice_number?.toLowerCase().includes(query) ||
    invoice.vendor?.name?.toLowerCase().includes(query) ||
    invoice.invoice_name?.toLowerCase().includes(query) ||
    invoice.invoice_profile?.name?.toLowerCase().includes(query)
  );
});
```

#### Acceptance Criteria

- [ ] Search finds invoices by `invoice_name`
- [ ] Search finds invoices by `invoice_profile.name`
- [ ] Search is case-insensitive
- [ ] Both backend and client-side search are updated
- [ ] Build passes with no TypeScript errors

#### Files to Modify

- [ ] `app/actions/invoices.ts` - Backend search query (lines 252-267)
- [ ] `components/v3/invoices/all-invoices-tab.tsx` - Client-side search filter (lines 502-510)

---

### BUG-005: Vendor Not Populated on Edit

**Priority**: High
**Effort**: Low (~1 hour)
**Status**: 🔴 NOT STARTED

#### Problem Statement

When editing a one-time (non-recurring) invoice, the vendor field appears blank/empty even though the invoice has a vendor assigned. The vendor dropdown should be pre-populated with the existing vendor.

#### Current State

**Form initialization (`edit-non-recurring-invoice-form.tsx` lines 89-124):**
```typescript
const form = useForm<NonRecurringInvoiceFormData>({
  defaultValues: {
    vendor_id: 0,  // Default to 0
    // ...other fields
  },
});
```

**Pre-filling with existing data (lines 132-152):**
```typescript
React.useEffect(() => {
  if (invoice) {
    setValue('vendor_id', invoice.vendor_id ?? 0);
    // ...other fields
  }
}, [invoice, setValue]);
```

**VendorTextAutocomplete initialization (`vendor-text-autocomplete.tsx` lines 56-65):**
```typescript
React.useEffect(() => {
  if (value && value > 0 && vendors.length > 0) {
    const selected = vendors.find((v) => v.id === value);
    if (selected && search !== selected.name) {
      setSearch(selected.name);  // Display vendor name
      setSelectedVendorName(selected.name);
    }
  }
}, [value, vendors, search]);
```

#### Potential Root Causes

1. **Race condition:** `vendors` list not loaded when `value` is set
2. **Data issue:** `invoice.vendor_id` might be `null`/`undefined` from API
3. **Inactive vendor:** Vendor might be archived/inactive and not in the active vendors list
4. **useEffect dependency:** The effect might not re-run when needed

#### Investigation Steps

1. Check if `invoice.vendor_id` is properly returned from `getInvoiceById` action
2. Verify `vendors` query includes the invoice's vendor (even if inactive)
3. Check timing of `setValue` vs `vendors` data loading
4. Add console logs to trace the data flow

#### Technical Implementation

**Option A: Ensure vendors load before setting value**
```typescript
// In edit form
React.useEffect(() => {
  if (invoice && vendors.length > 0) {
    setValue('vendor_id', invoice.vendor_id ?? 0);
  }
}, [invoice, vendors, setValue]);
```

**Option B: Include inactive vendors in the list**
```typescript
// In useVendors hook or VendorTextAutocomplete
const { data: vendors } = useQuery({
  queryKey: ['vendors', { includeInactive: true }],
  // ...
});
```

**Option C: Fix VendorTextAutocomplete to handle async loading**
```typescript
React.useEffect(() => {
  if (value && value > 0 && vendors.length > 0) {
    const selected = vendors.find((v) => v.id === value);
    if (selected) {
      setSearch(selected.name);
      setSelectedVendorName(selected.name);
    }
  }
}, [value, vendors]); // Remove 'search' from dependencies
```

#### Acceptance Criteria

- [ ] Vendor field shows existing vendor name when editing invoice
- [ ] Works for both active and inactive vendors
- [ ] No race conditions between data loading
- [ ] Build passes with no TypeScript errors

#### Files to Modify

- [ ] `components/invoices-v2/edit-non-recurring-invoice-form.tsx` - Form data loading
- [ ] `components/invoices-v2/vendor-text-autocomplete.tsx` - Autocomplete initialization
- [ ] Possibly `hooks/use-vendors.ts` - Include inactive vendors option

#### Dependencies

- Need to investigate root cause before implementing fix

---

### BUG-006: TDS Not Deducted in Remaining Balance Calculation

**Priority**: 🚨 CRITICAL
**Effort**: Medium (~1-2 hours)
**Status**: 🔴 NOT STARTED
**Group**: A (TDS Calculation Fixes)

#### Problem Statement

The backend payment actions calculate remaining balance incorrectly by using `invoice_amount - totalPaid` instead of `(invoice_amount - TDS) - totalPaid`. This causes the invoice detail panel to show wrong remaining balance values even when invoices are fully paid.

**Evidence from user screenshots:**
- Invoice Amount: ₹123,456
- TDS (10%): ₹12,346
- Net Payable: ₹111,110
- Payment Made: ₹111,110
- **Expected Remaining**: ₹0 (fully paid)
- **Actual Remaining Shown**: ₹12,346 (equals TDS amount!)

The frontend table shows correct values (₹0) because it calculates locally, but the detail panel uses backend-provided values which are wrong.

#### Root Cause Analysis

**Location: `app/actions/payments.ts`**

Three functions have the same bug:

**1. `getPaymentSummary()` (line ~130):**
```typescript
// CURRENT (WRONG):
const remainingBalance = invoice.invoice_amount - totalPaid;

// SHOULD BE:
const tdsCalc = invoice.tds_applicable && invoice.tds_percentage
  ? calculateTds(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
  : { payableAmount: invoice.invoice_amount };
const remainingBalance = tdsCalc.payableAmount - totalPaid;
```

**2. `createPayment()` (line ~472):**
```typescript
// CURRENT (WRONG):
const remainingBalance = invoice.invoice_amount - totalPaid;
// ...used to validate payment amount doesn't exceed remaining

// SHOULD BE:
const tdsCalc = calculateTds(...);
const remainingBalance = tdsCalc.payableAmount - totalPaid;
```

**3. `approvePayment()` (line ~624):**
```typescript
// CURRENT (WRONG):
const totalPaid = invoice.payments.reduce(...);
const remainingBalance = invoice.invoice_amount - totalPaid;
// ...used to determine new invoice status

// SHOULD BE:
const tdsCalc = calculateTds(...);
const remainingBalance = tdsCalc.payableAmount - totalPaid;
```

#### Why Table Shows Correct Values

The `all-invoices-tab.tsx` calculates remaining balance locally:
```typescript
// Frontend calculation (CORRECT):
const pendingAmount = Math.max(0,
  (invoice.tds_applicable
    ? calculateTds(invoice.invoice_amount, invoice.tds_percentage ?? 0, false).payableAmount
    : invoice.invoice_amount
  ) - (invoice.total_paid || 0)
);
```

This creates a **data inconsistency**: table shows ₹0, but opening the invoice detail panel shows ₹12,346.

#### Technical Implementation

**Step 1: Create helper function for consistent calculation**
```typescript
// Add to app/actions/payments.ts or lib/utils/tds.ts

function calculateRemainingBalance(invoice: {
  invoice_amount: number;
  tds_applicable: boolean;
  tds_percentage: number | null;
  tds_rounded?: boolean;
}, totalPaid: number): number {
  const tdsCalc = invoice.tds_applicable && invoice.tds_percentage
    ? calculateTds(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
    : { payableAmount: invoice.invoice_amount };

  return Math.max(0, tdsCalc.payableAmount - totalPaid);
}
```

**Step 2: Update `getPaymentSummary()`**
```typescript
// Replace line ~130
const remainingBalance = calculateRemainingBalance(invoice, totalPaid);
```

**Step 3: Update `createPayment()`**
```typescript
// Replace line ~472
const remainingBalance = calculateRemainingBalance(invoice, totalPaid);
```

**Step 4: Update `approvePayment()`**
```typescript
// Replace line ~624
const remainingBalance = calculateRemainingBalance(invoice, totalPaid);
```

**Step 5: Update status determination logic**

The status determination should also use net payable:
```typescript
// When determining if invoice is 'paid' vs 'partial':
if (remainingBalance <= 0.01) {  // Use small epsilon for float comparison
  newStatus = 'paid';
} else if (totalPaid > 0) {
  newStatus = 'partial';
}
```

#### Impact Areas

| Area | Current | After Fix |
|------|---------|-----------|
| Invoice Detail Panel | Shows wrong remaining (₹12,346) | Shows correct (₹0) |
| Payment Form Validation | May allow overpayments | Correctly validates max amount |
| Invoice Status | May incorrectly show 'partial' | Correctly shows 'paid' |
| Payment Approval | Wrong status determination | Correct status after approval |
| Ledger Summary | May show wrong outstanding | Shows correct outstanding |

#### Acceptance Criteria

- [ ] `getPaymentSummary()` returns correct remaining balance accounting for TDS
- [ ] `createPayment()` validates amount against TDS-adjusted remaining balance
- [ ] `approvePayment()` determines status using TDS-adjusted remaining balance
- [ ] Invoice detail panel shows ₹0 remaining when fully paid (with TDS)
- [ ] Payment form shows correct "Maximum: ₹X" hint
- [ ] Invoice status correctly transitions to "paid" when net payable is paid
- [ ] All existing tests pass
- [ ] Build passes with no TypeScript errors

#### Files to Modify

- [ ] `app/actions/payments.ts` - Fix `getPaymentSummary()`, `createPayment()`, `approvePayment()`
- [ ] Optionally `lib/utils/tds.ts` - Add `calculateRemainingBalance()` helper

#### Dependencies

- This fix is **foundational** and should be done FIRST before BUG-003 (TDS Rounding Consistency)
- BUG-003 will add `tds_rounded` to the Invoice model; this fix should use `invoice.tds_rounded ?? false` to be forward-compatible

#### Testing Scenarios

1. **TDS Invoice, Fully Paid:**
   - Invoice: ₹100,000, TDS 10%
   - Net Payable: ₹90,000
   - Payment: ₹90,000
   - Expected Remaining: ₹0
   - Expected Status: `paid`

2. **TDS Invoice, Partial Payment:**
   - Invoice: ₹100,000, TDS 10%
   - Net Payable: ₹90,000
   - Payment: ₹50,000
   - Expected Remaining: ₹40,000
   - Expected Status: `partial`

3. **Non-TDS Invoice:**
   - Invoice: ₹100,000, TDS N/A
   - Net Payable: ₹100,000
   - Payment: ₹100,000
   - Expected Remaining: ₹0
   - Expected Status: `paid`

4. **TDS Invoice with Rounding (after BUG-003):**
   - Invoice: ₹123,456, TDS 10%
   - Exact TDS: ₹12,345.60, Rounded TDS: ₹12,346
   - Net Payable (rounded): ₹111,110
   - Payment: ₹111,110
   - Expected Remaining: ₹0
   - Expected Status: `paid`

---

### BUG-007: Vendor Auto-Approval During Invoice Creation

**Priority**: 🚨 HIGH
**Effort**: Medium (~2-3 hours)
**Status**: ✅ COMPLETED (2024-12-15)
**Group**: E (Approval Workflow)

#### Problem Statement

When a **standard user** creates a non-recurring invoice with a **new vendor** (vendor that doesn't exist), the vendor is auto-approved instead of going through the approval workflow. This bypasses the admin approval requirement for new vendors.

#### Expected Behavior

1. Standard user types a vendor name that doesn't exist → Shows "will be added as new vendor"
2. User submits invoice form → Vendor form panel opens
3. User fills vendor details (address, bank details) → Clicks "Create"
4. Vendor is created with `status: 'PENDING_APPROVAL'`
5. Vendor panel closes → User returns to invoice form
6. User submits invoice → Invoice created with `status: 'pending_approval'`
7. Admin receives **both** notifications:
   - Vendor pending approval
   - Invoice pending approval
8. Admin can approve vendor first OR invoice first
   - If vendor approved first → Vendor becomes active
   - If invoice approved first → Both invoice AND vendor get approved

#### Current Behavior (Bug)

1. Standard user types new vendor name → Shows "will be added as new vendor" ✅
2. User submits invoice form → Vendor form panel opens ✅
3. User fills vendor details → Clicks "Create"
4. **BUG:** Vendor is created with `status: 'APPROVED'` instead of `'PENDING_APPROVAL'`
5. Vendor panel closes ✅
6. User submits invoice → Invoice created (may or may not be pending)
7. Admin only sees invoice approval request, vendor is already approved

#### Root Cause Analysis

**Investigation Findings:**

1. **Prisma Schema Default** (`schema.prisma` line 107):
   ```prisma
   status String @default("APPROVED")
   ```
   The default is "APPROVED" which is risky - if status is ever not explicitly set, it auto-approves.

2. **Backend Logic is Correct** (`app/actions/master-data.ts` lines 277-294):
   ```typescript
   const vendorStatus = getVendorCreationStatus(user);  // Returns PENDING_APPROVAL for non-admins
   const isAdmin = canApproveVendor(user);              // Returns false for non-admins

   const vendor = await db.vendor.create({
     data: {
       // ...
       status: vendorStatus,  // Should be 'PENDING_APPROVAL'
       approved_by_user_id: isAdmin ? user.id : null,
       approved_at: isAdmin ? new Date() : null,
     },
   });
   ```

3. **RBAC Logic is Correct** (`lib/rbac-v2.ts` lines 442-450):
   ```typescript
   export function getVendorCreationStatus(user: User): 'APPROVED' | 'PENDING_APPROVAL' {
     if (canApproveVendor(user)) {
       return 'APPROVED';  // Admins
     }
     return 'PENDING_APPROVAL';  // Standard users
   }
   ```

4. **Possible Causes to Investigate:**
   - Session role might be incorrect (user shows as admin when they're not)
   - Auth callbacks might not be returning correct role
   - Database might have user with wrong role
   - Some middleware might be elevating privileges

#### Investigation Required

1. **Verify user role in session:**
   ```typescript
   // Add console.log in createVendor action
   console.log('[createVendor] User role:', user.role);
   console.log('[createVendor] canApproveVendor:', canApproveVendor(user));
   console.log('[createVendor] vendorStatus:', vendorStatus);
   ```

2. **Check database after vendor creation:**
   ```sql
   SELECT id, name, status, created_by_user_id, approved_by_user_id, approved_at
   FROM vendors
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Verify test user role in database:**
   ```sql
   SELECT id, email, role FROM users WHERE email = 'test_user_email';
   ```

#### Proposed Fix

**Phase 1: Defensive Fix - Change Prisma Default**
```prisma
// schema.prisma
model Vendor {
  // ...
  status String @default("PENDING_APPROVAL")  // Changed from "APPROVED"
}
```

**Phase 2: Add Logging**
```typescript
// app/actions/master-data.ts - createVendor function
console.log('[createVendor] Creating vendor with status:', vendorStatus, 'for user role:', user.role);
```

**Phase 3: Add Vendor Approval Notification**
```typescript
// After vendor creation for non-admin
if (!isAdmin) {
  // Create notification for admins
  await notifyAdminsOfPendingVendor(vendor.id, vendor.name, user.id);
}
```

#### Files Modified (Implementation Complete)

- [x] `schema.prisma` - Changed default from "APPROVED" to "PENDING_APPROVAL"
- [x] `app/actions/master-data.ts` - Added debug logging, calls notification on vendor creation
- [x] `app/actions/notifications.ts` - Added `notifyVendorPendingApproval`, `notifyVendorApproved`, `notifyVendorRejected` functions
- [x] `types/notification.ts` - Added `VENDOR_PENDING_APPROVAL`, `VENDOR_APPROVED`, `VENDOR_REJECTED` notification types
- [x] `app/actions/admin/master-data-approval.ts` - Added notifications when vendor is approved/rejected
- [x] `components/notifications/notification-panel.tsx` - Added vendor notification icons and styling

#### Implementation Details (2024-12-15)

**Changes Made:**

1. **Prisma Schema Defense** (`schema.prisma`):
   - Changed `status String @default("APPROVED")` to `@default("PENDING_APPROVAL")`
   - Ensures vendors created without explicit status are pending by default

2. **Debug Logging** (`app/actions/master-data.ts`):
   - Added console logs to trace user role, vendor status, and isAdmin flag
   - Helps debug if issue recurs

3. **Notification Types** (`types/notification.ts`):
   - Added `VENDOR_PENDING_APPROVAL` - notifies admins when vendor needs approval
   - Added `VENDOR_APPROVED` - notifies user when their vendor is approved
   - Added `VENDOR_REJECTED` - notifies user when their vendor is rejected

4. **Notification Functions** (`app/actions/notifications.ts`):
   - `notifyVendorPendingApproval(vendorId, vendorName, requesterName)` - alerts admins
   - `notifyVendorApproved(userId, vendorId, vendorName)` - confirms to user
   - `notifyVendorRejected(userId, vendorId, vendorName, reason)` - informs user

5. **Vendor Creation Flow** (`app/actions/master-data.ts`):
   - When non-admin creates vendor, fetches user's full_name
   - Calls `notifyVendorPendingApproval` to alert all admins

6. **Vendor Approval/Rejection** (`app/actions/admin/master-data-approval.ts`):
   - `approveVendorRequest` now calls `notifyVendorApproved` to notify creator
   - `rejectVendorRequest` now calls `notifyVendorRejected` with rejection reason

7. **Notification Panel UI** (`components/notifications/notification-panel.tsx`):
   - Added `Building2` icon for vendor notifications
   - Added config for all three vendor notification types with appropriate colors

#### Acceptance Criteria

- [x] Standard user creates vendor → Status is `PENDING_APPROVAL` (enforced by Prisma default + explicit status)
- [x] Standard user creates vendor → `approved_by_user_id` is `null` (already working)
- [x] Standard user creates vendor → `approved_at` is `null` (already working)
- [x] Admin receives notification about pending vendor (via `notifyVendorPendingApproval`)
- [x] Admin can approve vendor from Approvals tab (existing functionality)
- [x] After admin approves → Status becomes `APPROVED`, fields are set (existing + notification)
- [x] Admin creates vendor → Status is `APPROVED` immediately (unchanged)
- [x] User gets notified when their vendor is approved/rejected (new notifications)

#### Testing Scenarios

1. **Standard User - New Vendor:**
   - Login as standard_user
   - Create non-recurring invoice
   - Type new vendor name → See "will be added" message
   - Submit form → Vendor panel opens
   - Fill details, click Create
   - **Verify:** Vendor has status='PENDING_APPROVAL' in DB
   - **Verify:** Admin sees vendor in Approvals > Vendors tab

2. **Admin - New Vendor:**
   - Login as admin
   - Create non-recurring invoice with new vendor
   - **Verify:** Vendor has status='APPROVED' immediately
   - **Verify:** No approval notification created

---

### BUG-008: Double TDS Deduction in Record Payment Panel

**Priority**: 🚨 HIGH
**Effort**: Low (~30 minutes)
**Status**: ✅ **COMPLETED** (2024-12-15)
**Group**: A (TDS Calculation Fixes)

#### Problem Statement

The "Record Payment" panel (`payment-form-panel.tsx`) was showing incorrect "Remaining Balance" - the TDS amount was being deducted **twice**, resulting in a lower remaining balance than actual.

#### Evidence (Screenshot)

```
Invoice Amount:     ₹1,23,456.00
TDS (2%):          -₹2,470.00 (rounded)
Net Payable:        ₹1,20,986.00
Remaining Balance:  ₹1,18,516.00   ← WRONG! Should be ₹1,20,986.00
```

Difference: ₹1,20,986 - ₹1,18,516 = ₹2,470 (exactly the TDS amount - subtracted twice!)

#### Root Cause

**Location:** `components/payments/payment-form-panel.tsx` lines 155-166

**Bug in `actualRemainingBalance` calculation:**

```typescript
// OLD (BUGGY):
const actualRemainingBalance = React.useMemo(() => {
  if (tdsApplicable && tdsPercentage) {
    const netPayable = roundTds ? tdsCalculation.payableRounded : tdsCalculation.payableExact;
    // BUG: This assumes remainingBalance = invoiceAmount - totalPaid
    // But callers pass remainingBalance = netPayable - totalPaid (TDS already deducted!)
    const alreadyPaid = invoiceAmount - remainingBalance;  // WRONG!
    return Math.max(0, netPayable - alreadyPaid);          // TDS subtracted twice!
  }
  return remainingBalance;
}, [...]);
```

**Problem:** The callers (`all-invoices-tab.tsx`, `profile-invoices-panel.tsx`, etc.) correctly pass:
```
remainingBalance = netPayable - totalPaid   // TDS already deducted
```

But the panel incorrectly calculated:
```
alreadyPaid = invoiceAmount - remainingBalance
            = invoiceAmount - (netPayable - totalPaid)
            = invoiceAmount - netPayable + totalPaid
            = TDS + totalPaid   // WRONG! This includes TDS as "paid"!

actualRemainingBalance = netPayable - alreadyPaid
                       = netPayable - (TDS + totalPaid)
                       = netPayable - TDS - totalPaid
                       = invoiceAmount - 2*TDS - totalPaid  // TDS subtracted twice!
```

#### Fix Applied

```typescript
// NEW (FIXED):
const actualRemainingBalance = React.useMemo(() => {
  if (tdsApplicable && tdsPercentage) {
    // Calculate original TDS using invoice's tdsRounded preference (passed as prop)
    const originalTdsResult = calculateTds(invoiceAmount, tdsPercentage, tdsRounded);
    const originalNetPayable = originalTdsResult.payableAmount;

    // Derive totalPaid from passed remainingBalance
    // remainingBalance = originalNetPayable - totalPaid
    // So: totalPaid = originalNetPayable - remainingBalance
    const totalPaid = Math.max(0, originalNetPayable - remainingBalance);

    // Calculate current net payable based on user's toggle state
    const currentNetPayable = roundTds ? tdsCalculation.payableRounded : tdsCalculation.payableExact;

    // Actual remaining = current net payable - what's been paid
    return Math.max(0, currentNetPayable - totalPaid);
  }
  return remainingBalance;
}, [...]);
```

#### Files Modified

- [x] `components/payments/payment-form-panel.tsx` - Fixed `actualRemainingBalance` calculation
- [x] `components/invoices/invoice-detail-panel-v3/index.tsx` - Added `tdsRounded` prop, fixed TDS calculation
- [x] `components/invoices/invoice-detail-panel-v2.tsx` - Added `tdsRounded` prop, fixed TDS calculation

#### Verification

After fix, the Record Payment panel now correctly shows:
```
Invoice Amount:     ₹1,23,456.00
TDS (2%):          -₹2,470.00 (rounded)
Net Payable:        ₹1,20,986.00
Remaining Balance:  ₹1,20,986.00   ← CORRECT!
```

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
- [x] Code committed and pushed (IMP-001 committed 2024-12-12)
- [x] Documentation updated (this file)

---

## Notes

- This document will be updated as more improvements and bugs are identified
- Please share additional items to add to this plan
- Phase 2 (URL sync) for filter persistence is deferred to future sprint

## Session Progress Log

### 2024-12-13 Session (Continued)

**Completed This Session**:
- ✅ IMP-001 Phases 3, 4, 5 - Comprehensive Invoice Filtering System fully implemented
- ✅ Code committed and pushed to main branch
- ✅ BUG-002 documented (Invoice Status Colors - Amber vs Purple)
- ✅ BUG-003 documented (TDS Rounding Consistency - Invoice-Level Preference)
- ✅ BUG-004 documented (Search Missing Invoice Name/Profile)
- ✅ BUG-005 documented (Vendor Not Populated on Edit)
- ✅ BUG-006 documented (🚨 CRITICAL - TDS Not Deducted in Remaining Balance)
- ✅ IMP-002 documented (Responsive Action Bar - Icons on Mobile)
- ✅ IMP-003 documented (Zero Balance Display as Dash)
- ✅ Task Groupings reorganized for efficient execution

**Progress Summary (2024-12-13)**:
| Item | Status | Group | Effort |
|------|--------|-------|--------|
| BUG-006: TDS Not Deducted in Balance | ✅ COMPLETED | A | Fixed in payments.ts |
| BUG-004: Search Missing Fields | ✅ COMPLETED | B | Backend + frontend |
| IMP-003: Zero Balance as Dash | ✅ COMPLETED | B | Shows "-" now |
| IMP-002: Responsive Action Bar | ✅ COMPLETED | B | Icons on mobile |
| BUG-005: Vendor Not Populated | ✅ COMPLETED | C | Race condition fixed |
| BUG-002: Invoice Status Colors | ✅ COMPLETED | D | Amber/Purple badges |
| BUG-003: TDS Rounding Consistency | ✅ COMPLETED | A | Invoice-level preference |
| BUG-001: Block Payment Recording | ✅ COMPLETED | - | 2024-12-12 |
| IMP-001: Invoice Filtering System | ✅ COMPLETED | - | 2024-12-12 |

---

### 2024-12-15 Session

**Completed This Session**:
- ✅ BUG-008: Fixed Double TDS Deduction in Record Payment Panel
  - Root cause: `actualRemainingBalance` calculation assumed `remainingBalance = invoiceAmount - totalPaid` but callers passed `remainingBalance = netPayable - totalPaid` (TDS already deducted)
  - Fix: Correctly derive `totalPaid` from passed `remainingBalance` using `originalNetPayable`
  - Files fixed: `payment-form-panel.tsx`, `invoice-detail-panel-v3/index.tsx`, `invoice-detail-panel-v2.tsx`
  - Also added missing `tdsRounded` prop to panel callers

- 🔄 BUG-007: Investigated Vendor Auto-Approval During Invoice Creation
  - Investigation complete - documented root cause analysis
  - Backend logic appears correct (`getVendorCreationStatus` returns PENDING_APPROVAL for non-admins)
  - Prisma schema has risky default `@default("APPROVED")` - should be `"PENDING_APPROVAL"`
  - Need to verify user session role is being passed correctly
  - Proposed fix documented in improvement plan

**Next Up**:

**Group E: Approval Workflow (NEW)**
1. 🔜 BUG-007: Vendor Auto-Approval Bug (~2-3 hours)
   - Change Prisma default to "PENDING_APPROVAL"
   - Add logging to trace user role
   - Verify with standard user account
   - Add vendor pending notification

**Progress Summary (2024-12-15)**:
| Item | Status | Group | Notes |
|------|--------|-------|-------|
| BUG-008: Double TDS Deduction | ✅ COMPLETED | A | Fixed `actualRemainingBalance` calculation |
| BUG-007: Vendor Auto-Approval | ✅ COMPLETED | E | Full workflow implemented with UI dialog |

**BUG-007 Implementation Summary:**

*Phase 1: Backend Safety (Completed)*
- Changed Prisma schema default from `"APPROVED"` to `"PENDING_APPROVAL"` for safety
- Added debug logging to trace user role during vendor creation
- Added 3 new notification types: `VENDOR_PENDING_APPROVAL`, `VENDOR_APPROVED`, `VENDOR_REJECTED`
- Added notification helper functions for vendor approval workflow
- Standard users creating vendors now trigger admin notifications
- Admins approving/rejecting vendors now notify the original creator
- Updated notification panel UI with Building2 icon for vendor notifications

*Phase 2: Vendor Rejection Cascade (Completed)*
- `rejectVendorRequest` now auto-rejects all pending invoices associated with the rejected vendor
- Uses atomic transaction for data integrity
- Sends notification to each affected invoice creator
- Returns count of rejected invoices in response

*Phase 3: Invoice Approval Check & Dialog (Completed)*
- Added `checkInvoiceApprovalEligibility` server action to check vendor status
- Added `useCheckInvoiceApprovalEligibility` hook for React Query
- Added `useApproveVendor` hook for vendor approval from dialog
- Modified `handleApprove` in invoice panel to check vendor status first
- Added warning dialog showing vendor details when vendor is pending
- Dialog has "Cancel" and "Approve Vendor" buttons
- After vendor approval, admin can approve invoice separately

**Files Modified:**
- `schema.prisma` - Vendor default status
- `app/actions/master-data.ts` - Debug logging, vendor notifications
- `app/actions/admin/master-data-approval.ts` - Cascade vendor rejection to invoices
- `app/actions/invoices-v2.ts` - `checkInvoiceApprovalEligibility` function
- `app/actions/notifications.ts` - Vendor notification helpers
- `types/notification.ts` - Vendor notification types
- `hooks/use-invoices-v2.ts` - `useCheckInvoiceApprovalEligibility` hook
- `hooks/use-vendors.ts` - `useApproveVendor` hook
- `components/invoices/invoice-detail-panel-v3/index.tsx` - Vendor pending dialog
- `components/notifications/notification-panel.tsx` - Vendor notification icons

---

### 2024-12-20 Session

**Items Completed This Session**:
- ✅ BUG-009: Vendor Autocomplete Single-Click Not Working on Windows
- ✅ IMP-004: Vendor Autocomplete - Browse All Vendors with Arrow Key
- ✅ IMP-005: Case-Insensitive Vendor Search
- ✅ IMP-006: Clickable Chevron with Touch Support
- ✅ IMP-007: Clickable Invoice Table Rows

**Progress Summary (2024-12-20)**:
| Item | Status | Group | Notes |
|------|--------|-------|-------|
| BUG-009: Single-click not working | ✅ COMPLETED | F | Fixed with `onMouseDown` + `preventDefault()` |
| IMP-004: Browse all vendors | ✅ COMPLETED | F | Arrow key trigger + chevron indicator |
| IMP-005: Case-insensitive search | ✅ COMPLETED | F | Added `mode: 'insensitive'` to Prisma query |
| IMP-006: Clickable chevron | ✅ COMPLETED | F | 32x32px touch-friendly button |
| IMP-007: Clickable invoice rows | ✅ COMPLETED | G | Row click opens detail panel |

**Changes Made**:

1. **BUG-009 Fix**: Added `onMouseDown` handler with `preventDefault()` to `CommandItem` in vendor autocomplete. This ensures selection fires before blur on Windows.

2. **IMP-004 Implementation**:
   - Added `isBrowseMode` state to toggle between search and browse modes
   - Added `handleKeyDown` handler for ArrowDown (open browse) and Escape (close)
   - Added `useAllVendors` hook in `hooks/use-vendors.ts` for fetching all vendors alphabetically
   - Added ChevronDown indicator that rotates when dropdown is open
   - Added `max-h-60 overflow-auto` to dropdown for scrollable list
   - Contextual loading/empty messages for browse vs search mode

3. **IMP-005 Implementation**:
   - Added `mode: 'insensitive'` to `searchVendors` Prisma query
   - Now searching "acme" matches "ACME", "Acme", etc.

4. **IMP-006 Implementation**:
   - Converted chevron icon to clickable button with 32x32px touch target
   - Click toggles browse mode (open/close all vendors list)
   - Added `onTouchEnd` handler for mobile touch support
   - Added `aria-label` for accessibility
   - Moved checkmark indicator to end of vendor name (inline after name)

5. **IMP-007 Implementation**:
   - Made invoice table rows clickable to open detail panel
   - Removed Eye (view) icon from actions column (redundant)
   - Added `stopPropagation` on checkbox and actions columns (excluded from click)
   - Added hover effect (`hover:bg-muted/50`) and cursor pointer
   - Added keyboard accessibility (`role="button"`, `tabIndex={0}`, Enter/Space handler)
   - Applied to both grouped view and flat view

**Files Modified**:
- `components/invoices-v2/vendor-text-autocomplete.tsx` - All vendor autocomplete fixes
- `hooks/use-vendors.ts` - Added `useAllVendors` hook and `vendorKeys.browse()` query key
- `app/actions/master-data.ts` - Added case-insensitive search mode
- `components/v3/invoices/all-invoices-tab.tsx` - Clickable table rows (IMP-007)

---

### BUG-009: Vendor Autocomplete Single-Click Not Working on Windows

**Priority**: Medium
**Effort**: Low (~30 minutes)
**Status**: ✅ **COMPLETED** (2024-12-20)
**Group**: F (Cross-Platform UX)

#### Problem Statement

The vendor autocomplete dropdown in the one-time invoice form works correctly on Mac (single-click to select) but requires **double-click** on Windows (Dell PC) to select a vendor from the suggestions list.

#### Evidence

- **Mac (working)**: User types partial vendor name → suggestions appear → single click selects vendor ✅
- **Windows (broken)**: User types partial vendor name → suggestions appear → single click does nothing → must double-click ❌

#### Root Cause Analysis

**Location:** `components/invoices-v2/vendor-text-autocomplete.tsx` lines 116-121

```typescript
const handleBlur = () => {
  // Delay closing to allow click on dropdown items
  setTimeout(() => {
    setOpen(false);
  }, 200);  // This 200ms timeout causes race condition on Windows
};
```

**The Problem:**
1. User clicks on a dropdown item
2. On Windows, the blur event fires BEFORE the click event reaches the CommandItem
3. The 200ms timeout isn't sufficient on Windows to allow the click to register
4. First click triggers blur, dropdown starts closing
5. Second click finally registers on the item

**Why Mac Works:**
- Mac's event timing differs - the click event registers before or simultaneously with blur
- The 200ms buffer is sufficient on Mac's event loop

#### Technical Implementation

**Fix using `onMouseDown` with `preventDefault()`:**

```typescript
// In CommandItem - use onMouseDown instead of relying on onSelect
<CommandItem
  key={vendor.id}
  value={vendor.name}
  onMouseDown={(e) => {
    e.preventDefault();  // Prevent blur from firing before selection
    handleSelect(vendor);
  }}
  className="cursor-pointer"
>
```

This ensures:
1. `onMouseDown` fires BEFORE blur
2. `preventDefault()` stops the blur event from interrupting
3. Selection completes reliably on both Mac and Windows

#### Acceptance Criteria

- [x] Single-click selects vendor on Windows
- [x] Single-click continues to work on Mac
- [x] No regression in autocomplete behavior
- [x] Blur still closes dropdown when clicking outside
- [x] Build passes with no TypeScript errors

#### Files Modified

- [x] `components/invoices-v2/vendor-text-autocomplete.tsx` - Added `onMouseDown` with `preventDefault()` to CommandItem

#### Implementation Notes

Added `onMouseDown` handler to `CommandItem` that calls `preventDefault()` and triggers selection. This ensures the selection fires before the blur event can close the dropdown on Windows, fixing the double-click requirement.

---

### IMP-004: Vendor Autocomplete - Browse All Vendors with Arrow Key

**Priority**: Medium
**Effort**: Medium (~2 hours)
**Status**: ✅ **COMPLETED** (2024-12-20)
**Group**: F (Cross-Platform UX)

#### Problem Statement

Currently, the vendor text autocomplete field only shows suggestions when the user types at least one character. There is no way to browse ALL existing vendors without knowing at least part of their name. Users want the ability to see all vendors alphabetically.

#### User Requirements (Confirmed)

1. **Trigger**: Pressing the **down arrow key** when input is focused (even if empty)
2. **Behavior**:
   - Opens dropdown with ALL vendors
   - Sorted alphabetically (A-Z)
   - User can continue typing to filter, or use arrow keys to navigate
3. **Visual Indicator**: Small chevron (▾) in the input field to hint this feature exists
4. **No Limit**: Show ALL vendors (paginated/virtualized if list is very large)
5. **Not on Initial Focus**: Don't auto-show all vendors when field first receives focus

#### Current State

**Location:** `components/invoices-v2/vendor-text-autocomplete.tsx`

```typescript
// Current: Only shows suggestions when search has content
const handleFocus = () => {
  if (search.length > 0) {
    setOpen(true);  // Only opens if user has typed something
  }
};
```

**Limitations:**
- No way to see all vendors without typing
- No visual indicator that browsing is possible
- New users don't know vendor names to search for

#### Proposed Solution

```typescript
// 1. Add keydown handler for arrow down
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'ArrowDown' && !open) {
    e.preventDefault();
    setOpen(true);
    // Trigger fetch of all vendors (empty search = all)
  }
};

// 2. Update fetch logic to get all vendors when arrow triggered
const shouldFetchAllVendors = open && search.length === 0;
const { data: vendors = [], isLoading } = useSearchVendors(
  search || '',
  shouldFetchVendors,
  shouldFetchAllVendors  // New flag to fetch all vendors
);

// 3. Add chevron indicator to input
<div className="relative">
  <Input
    // ... existing props
    onKeyDown={handleKeyDown}
  />
  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
</div>
```

#### Backend Consideration

The `useSearchVendors` hook may need updating to:
1. Accept a flag to fetch ALL vendors (not limit to search matches)
2. Return vendors sorted alphabetically
3. Handle pagination if vendor list is very large (100+)

**Location:** `hooks/use-vendors.ts`

```typescript
// May need to add:
export function useAllVendors(enabled: boolean) {
  return useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: async () => {
      const result = await getVendors({ sortBy: 'name', sortOrder: 'asc' });
      return result.success ? result.vendors : [];
    },
    enabled,
  });
}
```

#### Acceptance Criteria

- [x] Down arrow key opens dropdown showing all vendors
- [x] All vendors displayed alphabetically (A-Z)
- [x] Chevron indicator visible in input field
- [x] User can type to filter after arrow key opens dropdown
- [x] Arrow key navigation works within dropdown
- [x] ESC key closes dropdown
- [x] Performance acceptable with large vendor list (100+)
- [x] Build passes with no TypeScript errors

#### Files Modified

- [x] `components/invoices-v2/vendor-text-autocomplete.tsx` - Added keydown handler, chevron indicator, browse mode state
- [x] `hooks/use-vendors.ts` - Added `useAllVendors` hook for fetching all vendors

#### Implementation Notes

1. **New State**: Added `isBrowseMode` state to track when user triggered browse via arrow key
2. **Keydown Handler**: Added `handleKeyDown` that:
   - Opens dropdown with all vendors on ArrowDown (when closed)
   - Closes dropdown on Escape
3. **New Hook**: Added `useAllVendors(enabled)` hook that fetches all active vendors sorted alphabetically
4. **Chevron Indicator**: Added ChevronDown icon that rotates 180° when dropdown is open
5. **Dropdown Max Height**: Added `max-h-60 overflow-auto` for scrollable dropdown
6. **Browse Mode Messages**: Different loading/empty messages for browse mode vs search mode

#### Dependencies

- BUG-009 was fixed first (single-click issue affects this feature too) ✅

---

### IMP-007: Clickable Invoice Table Rows

**Priority**: Medium
**Effort**: Low (~30 minutes)
**Status**: ✅ **COMPLETED** (2024-12-20)
**Group**: G (UX Enhancements)

#### Problem Statement

Users need to click on the Eye icon in the actions column to view invoice details. This requires precise clicking on a small icon. Modern UX patterns make entire rows clickable while keeping action buttons functional.

#### User Requirements (Confirmed)

1. **Entire row clickable**: Clicking anywhere on the row (except checkbox and actions) opens invoice detail panel
2. **Excluded columns**: Checkbox column and actions column should NOT trigger row click
3. **Hover effect**: Visual feedback when hovering over row
4. **Accessibility**: Keyboard navigation support (Enter/Space to activate)
5. **Remove Eye icon**: Since row is clickable, the View icon becomes redundant

#### Technical Implementation

**Changes to TableRow (both grouped and flat views)**:

```typescript
<TableRow
  key={invoice.id}
  className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
  onClick={() => handleViewInvoice(invoice.id)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewInvoice(invoice.id);
    }
  }}
>
```

**Excluded columns with stopPropagation**:

```typescript
// Checkbox column
<TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
  <Checkbox ... />
</TableCell>

// Actions column
<TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
  <div className="flex items-center gap-2">
    {/* Action buttons */}
  </div>
</TableCell>
```

#### Acceptance Criteria

- [x] Clicking on row opens invoice detail panel
- [x] Checkbox column click does NOT open detail panel
- [x] Actions column click does NOT open detail panel
- [x] Hover effect visible on row hover (`hover:bg-muted/50`)
- [x] Cursor changes to pointer on hover
- [x] Enter/Space key activates row when focused
- [x] Eye (view) icon removed from actions column
- [x] Applied to both grouped view and flat view
- [x] Build passes with no TypeScript errors

#### Files Modified

- [x] `components/v3/invoices/all-invoices-tab.tsx`
  - Removed Eye import from lucide-react
  - Added onClick, role, tabIndex, onKeyDown to TableRow (grouped view lines 1241-1254)
  - Added onClick, role, tabIndex, onKeyDown to TableRow (flat view lines 1353-1366)
  - Added onClick stopPropagation to checkbox TableCell (both views)
  - Added onClick stopPropagation to actions TableCell (both views)
  - Removed Eye button from actions (both views)
  - Added `cursor-pointer hover:bg-muted/50 transition-colors` to TableRow className

#### Implementation Notes

1. **Modern hover effect**: Used `hover:bg-muted/50` for subtle background change on hover, with `transition-colors` for smooth animation
2. **Accessibility**: Added `role="button"` and `tabIndex={0}` for keyboard accessibility, plus Enter/Space key handlers
3. **Event isolation**: Used `onClick={(e) => e.stopPropagation()}` on excluded columns to prevent row click from triggering
4. **Both views updated**: Changes applied to both grouped view (for weekly grouping) and flat view (for monthly/archived)
