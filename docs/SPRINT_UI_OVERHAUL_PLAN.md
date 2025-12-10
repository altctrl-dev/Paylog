# Sprint UI Overhaul & Approval System Implementation Plan

> **Document Version:** 1.1
> **Created:** December 10, 2025
> **Last Updated:** December 10, 2025
> **Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Proposed Changes Overview](#3-proposed-changes-overview)
4. [Part A: Sidepanel Redesign](#4-part-a-sidepanel-redesign)
5. [Part B: Admin Approvals Page](#5-part-b-admin-approvals-page)
6. [Part C: User Permissions & Payment Workflow](#6-part-c-user-permissions--payment-workflow)
7. [Part D: Notification System Enhancements](#7-part-d-notification-system-enhancements)
8. [Technical Specifications](#8-technical-specifications)
9. [Database Schema Changes](#9-database-schema-changes)
10. [Implementation Phases](#10-implementation-phases)
11. [File Change Summary](#11-file-change-summary)
12. [Risk Assessment & Mitigations](#12-risk-assessment--mitigations)
13. [Acceptance Criteria](#13-acceptance-criteria)

---

## 1. Executive Summary

This document outlines a comprehensive plan to:

1. **Redesign the invoice detail sidepanel** with a tabbed layout, vertical icon action bar, and improved information hierarchy
2. **Replace the Admin Dashboard tab** with a new "Approvals" hub containing Invoice, Payment, Vendor, and Archive request tabs
3. **Implement role-based payment workflows** where standard users' payments require approval while admin payments are auto-approved
4. **Enhance the notification system** to support payment approval notifications

### Key Deliverables

- New sidepanel architecture with reusable components
- Vertical icon action bar with tooltips
- Tabbed content (Details, Payments, Attachments, Activity)
- Admin Approvals page with 4 sub-tabs and filters
- Payment approval workflow for standard users
- In-app notifications for all approval types

---

## 2. Current State Analysis

### 2.1 Current Admin Page Structure

**File:** `app/(dashboard)/admin/page.tsx`

```
Admin Console
├── Dashboard (AdminDashboard component)        ← TO BE REPLACED with Approvals
├── Master Data
│   ├── Requests (MasterDataRequests)           ← TO BE REMOVED (deprecated)
│   ├── Vendors (VendorManagement)
│   ├── Categories (CategoryManagement)
│   ├── Entities (EntityManagement)
│   ├── Payment Types (PaymentTypeManagement)
│   ├── Currencies (CurrencyManagement)
│   └── Profiles (InvoiceProfileManagement)
└── User Management (super_admin only)
```

### 2.2 Current Invoice Detail Panel

**File:** `components/invoices/invoice-detail-panel-v2.tsx` (635 lines)

**Issues Identified:**
- Single-column card stack layout
- All actions crammed into footer
- No payment history integration
- Key financial info scattered across cards
- No visual hierarchy for primary vs secondary actions
- 800px width underutilized

### 2.3 Current Payment System

**Files:**
- `app/actions/payments.ts`
- `types/payment.ts`
- `components/payments/payment-history-list.tsx`

**Payment Statuses:** `pending`, `approved`, `rejected`

**Current Workflow:**
- Admin payments: Auto-approved (`PAYMENT_STATUS.APPROVED`)
- Standard user payments: Set to `pending`, require admin approval
- Payment approval actions exist: `approvePayment()`, `rejectPayment()`

### 2.4 Current Notification System

**Files:**
- `types/notification.ts`
- `app/actions/notifications.ts`
- `components/notifications/notification-panel.tsx`

**Existing Notification Types:**
```typescript
INVOICE_PENDING_APPROVAL, INVOICE_APPROVED, INVOICE_REJECTED,
INVOICE_ON_HOLD, INVOICE_HOLD_RELEASED,
MASTER_DATA_REQUEST_PENDING, MASTER_DATA_REQUEST_APPROVED, MASTER_DATA_REQUEST_REJECTED,
ARCHIVE_REQUEST_PENDING, ARCHIVE_REQUEST_APPROVED, ARCHIVE_REQUEST_REJECTED
```

**Missing:** Payment approval notifications

---

## 3. Proposed Changes Overview

### Visual Overview: New Sidepanel Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ STICKY HEADER                                                            │
│                                                                          │
│ INV-2024-001 • Monthly AWS Subscription              [Recurring] [X]     │
│ Acme Corp                                                                │
├──────────────────────────────────────────────────────────┬───────────────┤
│ HERO STRIP                                               │               │
│                                                          │  ACTION BAR   │
│ [Pending Approval]          Due: Jan 15, 2025 (36 days)  │  (Vertical)   │
│                                                          │               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   [Edit]      │
│ │  Gross   │ │   TDS    │ │   Paid   │ │ Balance  │      │      ⎯        │
│ │₹125,000  │ │ ₹12,500  │ │ ₹84,375  │ │ ₹28,125  │      │   [Record]    │
│ │          │ │  (10%)   │ │  (75%)   │ │  (25%)   │      │      ⎯        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │   [Hold]      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░ 75%    │      ⎯        │
├──────────────────────────────────────────────────────────┤   [More]      │
│ TAB BAR                                                  │      ⎯        │
│                                                          │   ──────      │
│ [Details]  [Payments (3)]  [Attachments (2)]  [Activity] │   [Reject]    │
│ ─────────                                                │   [Approve]   │
├──────────────────────────────────────────────────────────┤               │
│ TAB CONTENT (scrollable)                                 │               │
│                                                          │               │
│ ... content based on selected tab ...                    │               │
│                                                          │               │
├──────────────────────────────────────────────────────────┴───────────────┤
│ STICKY FOOTER                                                            │
│                                                                          │
│ [Close]                                                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Part A: Sidepanel Redesign

### 4.1 Vertical Icon Action Bar

The action bar will be positioned on the **right side** of the sidepanel, containing **icon-only buttons** with **tooltip labels** on hover.

#### 4.1.1 Action Bar Specifications

| Property | Value |
|----------|-------|
| Width | 48px |
| Position | Right side, full height |
| Background | `bg-muted/30` with subtle left border |
| Icon Size | 20px (h-5 w-5) |
| Icon Color | `text-muted-foreground` (default), color on hover |
| Tooltip Delay | 500ms |
| Spacing | `gap-2` (8px) between icons |
| Separator | 1px horizontal line (`border-t border-border/50`) |

#### 4.1.2 Action Button Layout

All actions are displayed directly (no dropdown menu) since there's plenty of room:

```
┌─────────────────────────────────┐
│  CONTEXTUAL ACTIONS             │
│  ─────────────────              │
│        [Pencil]     Edit        │
│        [CreditCard] Record Pymt │
│        [Pause]      Put On Hold │
│        [Archive]    Archive     │
│        [Trash2]     Delete      │
│                                 │
│  ════════════════════           │  ← Separator
│                                 │
│  APPROVAL ACTIONS               │
│  ─────────────────              │
│        [X]          Reject      │
│        [Check]      Approve     │
└─────────────────────────────────┘
```

#### 4.1.3 Action Visibility Rules

| Action | Icon | Standard User | Admin | Super Admin | Condition | Hover Color |
|--------|------|---------------|-------|-------------|-----------|-------------|
| Edit | `Pencil` | ✓ (own invoices) | ✓ | ✓ | Not archived, not rejected | `text-foreground` |
| Record Payment | `CreditCard` | ✓ | ✓ | ✓ | Balance > 0, not pending/rejected/on_hold | `text-primary` |
| Put On Hold | `Pause` | ✗ | ✓ | ✓ | Not held/paid/rejected | `text-amber-500` |
| Archive | `Archive` | ✓ (creates request) | ✓ (instant) | ✓ (instant) | Not archived | `text-amber-500` |
| Delete | `Trash2` | ✗ | ✗ | ✓ | Always visible for super_admin | `text-destructive` |
| **Separator** | — | — | — | — | Shows when approval actions visible | — |
| Reject | `X` | ✗ | ✓ | ✓ | status=pending_approval | `text-destructive` |
| Approve | `Check` | ✗ | ✓ | ✓ | status=pending_approval | `text-green-500` |

**Archive Behavior by Role:**
- **Standard User**: Clicks Archive → Creates archive request → Notification sent to admins → Appears in Admin > Approvals > Archive Requests
- **Admin/Super Admin**: Clicks Archive → Instant archive (no approval needed)

**Button Style:** All action bar buttons use `variant="subtle"` for consistent styling.

#### 4.1.4 Component: `PanelActionBar`

```tsx
// components/panels/shared/panel-action-bar.tsx

interface ActionBarProps {
  actions: ActionItem[];
  approvalActions?: ActionItem[];
}

interface ActionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  submenu?: ActionItem[]; // For "More" dropdown
}
```

### 4.2 Tabbed Content Structure

#### 4.2.1 Tab Configuration

| Tab | Label | Badge | Content |
|-----|-------|-------|---------|
| Details | "Details" | None | Dates, Classification, Profile, Notes |
| Payments | "Payments" | Count of payments | Payment summary + history list with actions |
| Attachments | "Attachments" | Count of files | File list with view/download |
| Activity | "Activity" | None | Timeline of invoice events |

#### 4.2.2 Details Tab Layout (Two Columns on Desktop)

```
┌─────────────────────────────┬─────────────────────────────┐
│ LEFT COLUMN                 │ RIGHT COLUMN                │
├─────────────────────────────┼─────────────────────────────┤
│                             │                             │
│ DATES                       │ CLASSIFICATION              │
│ ─────                       │ ──────────────              │
│ Invoice Date  Dec 01, 2024  │ Vendor    Acme Corp [✓]     │
│ Received      Dec 02, 2024  │ Entity    Main Office       │
│ Due Date      Jan 15, 2025  │ Category  Cloud Services    │
│ Period        Dec 01 - 31   │ Currency  INR (₹)           │
│                             │                             │
│ RECURRING PROFILE           │ METADATA                    │
│ ─────────────────           │ ────────                    │
│ Profile   Monthly AWS       │ Created   John Doe          │
│ Frequency Monthly           │           Dec 01, 10:30 AM  │
│ Desc      AWS compute...    │ Updated   Dec 05, 2024      │
│                             │                             │
│ NOTES (full width span)                                   │
│ ─────                                                     │
│ Additional notes or description text here...              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### 4.2.3 Payments Tab Layout

```
┌───────────────────────────────────────────────────────────┐
│ PAYMENT SUMMARY                                           │
│ ─────────────────                                         │
│ Net Payable: ₹112,500  •  Paid: ₹84,375  •  Due: ₹28,125  │
│                                                           │
│ [Record Payment]  (visible if balance > 0)                │
│                                                           │
│ ──────────────────────────────────────────────────────    │
│                                                           │
│ PAYMENT HISTORY                                           │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Dec 15, 2024  •  ₹50,000.00  •  Bank Transfer       │   │
│ │ TXN: HDFC123456  •  [Approved] ✓                    │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Dec 20, 2024  •  ₹34,375.00  •  Cheque              │   │
│ │ CHQ: 456789  •  [Pending]                           │   │
│ │                         [Reject Pymt] [Approve Pymt]│   │
│ └─────────────────────────────────────────────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Payment Card States:**
1. **Approved** - Green checkmark, no actions
2. **Pending** - Amber outline badge, Reject/Approve buttons (admin only)
3. **Rejected** - Red badge with rejection reason

### 4.3 Reusable Sidepanel Components

Create these shared components for consistent styling across all sidepanels:

```
components/panels/shared/
├── panel-summary-header.tsx     # Title, subtitle, badges, amount chips
├── panel-stat-group.tsx         # 2-4 stat cards (Gross, TDS, Paid, Balance)
├── panel-action-bar.tsx         # Vertical icon action bar (right side)
├── panel-section.tsx            # Labeled content block
├── panel-tabs.tsx               # Tab bar + content wrapper
├── panel-attachment-list.tsx    # File list with view/download
├── panel-timeline.tsx           # Activity timeline (vertical)
├── panel-payment-card.tsx       # Payment item with status + actions
└── index.ts                     # Barrel export
```

### 4.4 Sidepanel Width

Keep `PANEL_WIDTH.LARGE = 800px` but utilize the space better with:
- Two-column grid on desktop (Details tab)
- Vertical action bar taking 48px on the right
- Content area: ~752px minus padding

---

## 5. Part B: Admin Approvals Page

### 5.1 Tab Restructure

**Before:**
```
Admin Console
├── Dashboard        ← REMOVE
├── Master Data
└── User Management
```

**After:**
```
Admin Console
├── Approvals        ← NEW (replaces Dashboard)
│   ├── Invoice Requests
│   ├── Payment Requests
│   ├── Vendor Requests
│   └── Archive Requests
├── Master Data      ← REMOVE "Requests" sub-tab
│   ├── Vendors
│   ├── Categories
│   ├── Entities
│   ├── Payment Types
│   ├── Currencies
│   └── Profiles
└── User Management
```

### 5.2 Approvals Tab Configuration

#### 5.2.1 Admin Tabs Update

**File:** `components/v3/admin/admin-tabs.tsx`

```typescript
export type AdminTab = 'approvals' | 'master-data' | 'users';

const TAB_CONFIG: TabConfig[] = [
  { id: 'approvals', label: 'Approvals' },  // Replaces 'dashboard'
  { id: 'master-data', label: 'Master Data' },
  { id: 'users', label: 'User Management', superAdminOnly: true },
];
```

#### 5.2.2 Approval Sub-Tabs with Pending Count Badges

**New File:** `components/v3/admin/approval-tabs.tsx`

Each approval sub-tab displays a badge showing the count of pending (active) requests. The badge is hidden when count is 0.

```typescript
export type ApprovalTab = 'invoices' | 'payments' | 'vendors' | 'archives';

const APPROVAL_TAB_CONFIG: TabConfig[] = [
  { id: 'invoices', label: 'Invoice Requests', icon: FileText },
  { id: 'payments', label: 'Payment Requests', icon: CreditCard },
  { id: 'vendors', label: 'Vendor Requests', icon: Building2 },
  { id: 'archives', label: 'Archive Requests', icon: Archive },
];
```

**Visual Layout:**

```
┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  ┌─────────────────┐
│ Invoice Requests (3)│  │ Payment Requests (5)│  │ Vendor Requests(1)│  │ Archive Requests│
└─────────────────────┘  └─────────────────────┘  └───────────────────┘  └─────────────────┘
                                                                          ↑
                                                                     No badge when
                                                                     count is 0
```

**Badge Styling:**
- **Active tab**: `bg-primary text-primary-foreground` (orange background)
- **Inactive tab**: `bg-muted text-muted-foreground` (gray background)
- **No badge** when count = 0

**Implementation:**

```tsx
// Hook to fetch pending counts
function usePendingApprovalCounts() {
  // Returns: { invoices: 3, payments: 5, vendors: 1, archives: 0 }
}

// Tab with badge component
function ApprovalTab({ tab, count, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-4 py-2 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm border border-border/50'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {tab.label}
      {count > 0 && (
        <span className={cn(
          'ml-2 inline-flex items-center justify-center',
          'min-w-[20px] h-5 px-1.5 rounded-full',
          'text-xs font-medium',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
```

### 5.3 Filter System

Each approval tab has these filter options:

| Filter Value | Label | Query |
|--------------|-------|-------|
| `active` | Active | `status = 'pending'` (default) |
| `approved` | Approved | `status = 'approved'` |
| `rejected` | Rejected | `status = 'rejected'` |
| `all` | All | No status filter |

### 5.4 Approvals Page Components

```
components/v3/admin/approvals/
├── approvals-page.tsx           # Main approvals container
├── approval-tabs.tsx            # Sub-tab navigation
├── invoice-requests-tab.tsx     # Invoice approval list
├── payment-requests-tab.tsx     # Payment approval list (NEW)
├── vendor-requests-tab.tsx      # Vendor approval list
├── archive-requests-tab.tsx     # Archive approval list
├── approval-filters.tsx         # Filter dropdown component
└── approval-table.tsx           # Reusable table with actions
```

### 5.5 Payment Requests Tab Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Payment Requests                                                         │
│                                                                          │
│ [Active ▾]  [Search...]                                                  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ Invoice       │ Payment Date │ Amount    │ Method      │ Requester │ Act │
├───────────────┼──────────────┼───────────┼─────────────┼───────────┼─────┤
│ INV-2024-001  │ Dec 20, 2024 │ ₹34,375   │ Cheque      │ Jane Doe  │ ✓ ✗ │
│ Monthly AWS   │              │           │ CHQ: 456789 │           │     │
├───────────────┼──────────────┼───────────┼─────────────┼───────────┼─────┤
│ INV-2024-015  │ Dec 18, 2024 │ ₹15,000   │ Bank Xfer   │ John Smith│ ✓ ✗ │
│ Office Rent   │              │           │ TXN: ABC123 │           │     │
└───────────────┴──────────────┴───────────┴─────────────┴───────────┴─────┘
```

---

## 6. Part C: User Permissions & Payment Workflow

### 6.1 User Role Definitions

| Role | Code | Invoice Actions | Payment Actions |
|------|------|-----------------|-----------------|
| Standard User | `standard_user` | Create (needs approval), Edit own | Record (needs approval) |
| Admin | `admin` | All actions, Auto-approve own | All actions, Auto-approve own |
| Super Admin | `super_admin` | All + Delete | All + Delete payment types |

### 6.2 Invoice Creation Workflow

```
Standard User Creates Invoice
            │
            ▼
   ┌────────────────┐
   │ Invoice Status │
   │ PENDING_APPROVAL│
   └────────────────┘
            │
            ▼
   Admin Receives Notification
            │
     ┌──────┴──────┐
     │             │
  Approve       Reject
     │             │
     ▼             ▼
  UNPAID       REJECTED
```

### 6.3 Payment Recording Workflow

#### 6.3.1 Payment During Invoice Creation (Inline Payment)

```
Standard User Creates Invoice + Payment
                │
                ▼
    ┌───────────────────────┐
    │ Invoice: PENDING_APPROVAL │
    │ Payment: PENDING          │
    └───────────────────────┘
                │
                ▼
    Both go through approval together
                │
         ┌──────┴──────┐
         │             │
      Approve       Reject
         │             │
    ┌────┴────┐   Invoice: REJECTED
    │         │   Payment: REJECTED
    ▼         ▼
Invoice    Payment
 UNPAID    APPROVED
   or
 PARTIAL
```

#### 6.3.2 Payment After Invoice Approval

```
Standard User Records Payment
        │
        ▼
┌───────────────────────────────┐
│ Invoice: UNPAID or PARTIAL    │
│ Payment: PENDING              │
│                               │
│ Invoice Status Badge:         │
│ [Payment Pending] (different  │
│  color to distinguish from    │
│  invoice pending approval)    │
└───────────────────────────────┘
        │
        ▼
Admin Receives Payment Notification
        │
   ┌────┴────┐
   │         │
Approve   Reject
   │         │
   ▼         ▼
Payment   Payment
APPROVED  REJECTED
   │
   ▼
Invoice status recalculated:
- PARTIAL if balance > 0
- PAID if balance = 0
```

### 6.4 Admin Auto-Approval

When an admin or super_admin creates/records:
- **Invoice:** Auto-set to `UNPAID` (skip `PENDING_APPROVAL`)
- **Payment:** Auto-set to `APPROVED`

**Existing Implementation:** Already in `app/actions/payments.ts`:

```typescript
// Line 353
const paymentStatus = currentUser.isAdmin
  ? PAYMENT_STATUS.APPROVED
  : PAYMENT_STATUS.PENDING;
```

### 6.5 Payment Pending Status Indicator

To distinguish between:
- Invoice pending approval (amber badge)
- Invoice with payment pending approval (different visual)

**Option A:** Add a computed field `has_pending_payment` to invoice queries
**Option B:** Use a secondary badge alongside status badge

**Recommendation:** Option B - Add a small secondary indicator

```tsx
// When invoice has pending payments
<div className="flex items-center gap-2">
  <StatusBadge status={invoice.status} />
  {hasPendingPayment && (
    <Badge variant="outline" className="text-purple-500 border-purple-500/50">
      Payment Pending
    </Badge>
  )}
</div>
```

---

## 7. Part D: Notification System Enhancements

### 7.1 New Notification Types

Add to `types/notification.ts`:

```typescript
export const NOTIFICATION_TYPE = {
  // ... existing types ...

  // Payment notifications (NEW)
  PAYMENT_PENDING_APPROVAL: 'payment_pending_approval',    // To admins
  PAYMENT_APPROVED: 'payment_approved',                    // To requester
  PAYMENT_REJECTED: 'payment_rejected',                    // To requester

  // Vendor notifications (NEW - if not existing)
  VENDOR_PENDING_APPROVAL: 'vendor_pending_approval',      // To admins
  VENDOR_APPROVED: 'vendor_approved',                      // To requester
  VENDOR_REJECTED: 'vendor_rejected',                      // To requester
} as const;
```

### 7.2 Notification Reference Types

Add to reference types:

```typescript
export const NOTIFICATION_REFERENCE_TYPE = {
  // ... existing types ...
  PAYMENT: 'payment',  // NEW
} as const;
```

### 7.3 New Notification Helper Functions

Add to `app/actions/notifications.ts`:

```typescript
/**
 * Notify admins about a new payment pending approval
 */
export async function notifyPaymentPendingApproval(
  paymentId: number,
  invoiceNumber: string,
  amount: number,
  requesterName: string
): Promise<void> {
  await notifyAdmins({
    type: NOTIFICATION_TYPE.PAYMENT_PENDING_APPROVAL,
    title: 'New Payment Pending Approval',
    message: `${requesterName} recorded a payment of ${formatCurrency(amount)} for invoice ${invoiceNumber}`,
    link: `/admin?tab=approvals&subtab=payments&highlight=${paymentId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.PAYMENT,
    referenceId: paymentId,
  });
}

/**
 * Notify user about payment approval
 */
export async function notifyPaymentApproved(
  userId: number,
  paymentId: number,
  invoiceNumber: string,
  amount: number
): Promise<void> {
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.PAYMENT_APPROVED,
    title: 'Payment Approved',
    message: `Your payment of ${formatCurrency(amount)} for invoice ${invoiceNumber} has been approved`,
    link: `/invoices?highlight=${invoiceNumber}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.PAYMENT,
    referenceId: paymentId,
  });
}

/**
 * Notify user about payment rejection
 */
export async function notifyPaymentRejected(
  userId: number,
  paymentId: number,
  invoiceNumber: string,
  amount: number,
  reason?: string
): Promise<void> {
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.PAYMENT_REJECTED,
    title: 'Payment Rejected',
    message: reason
      ? `Your payment of ${formatCurrency(amount)} for invoice ${invoiceNumber} was rejected: ${reason}`
      : `Your payment of ${formatCurrency(amount)} for invoice ${invoiceNumber} was rejected`,
    link: `/invoices?highlight=${invoiceNumber}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.PAYMENT,
    referenceId: paymentId,
  });
}
```

### 7.4 Update Notification Panel Config

Add to `components/notifications/notification-panel.tsx`:

```typescript
const notificationConfig: Record<NotificationType, {...}> = {
  // ... existing configs ...

  [NOTIFICATION_TYPE.PAYMENT_PENDING_APPROVAL]: {
    icon: CreditCard,
    colorClass: 'text-amber-500',
    label: 'Payment Approval',
  },
  [NOTIFICATION_TYPE.PAYMENT_APPROVED]: {
    icon: CreditCard,
    colorClass: 'text-green-500',
    label: 'Payment Approved',
  },
  [NOTIFICATION_TYPE.PAYMENT_REJECTED]: {
    icon: CreditCard,
    colorClass: 'text-red-500',
    label: 'Payment Rejected',
  },
};
```

---

## 8. Technical Specifications

### 8.1 Tooltip Implementation

Using existing `components/ui/tooltip.tsx`:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// In action bar button
<TooltipProvider delayDuration={500}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="p-2 rounded-md hover:bg-muted/50 transition-colors">
        <Pencil className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="left">
      <p>Edit Invoice</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 8.2 Tab Component Implementation

Using shadcn/ui Tabs pattern:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="details" className="w-full">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="payments">
      Payments {payments.length > 0 && `(${payments.length})`}
    </TabsTrigger>
    <TabsTrigger value="attachments">
      Attachments {attachments.length > 0 && `(${attachments.length})`}
    </TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="details">...</TabsContent>
  <TabsContent value="payments">...</TabsContent>
  <TabsContent value="attachments">...</TabsContent>
  <TabsContent value="activity">...</TabsContent>
</Tabs>
```

### 8.3 Action Bar Icon Styling

Using `Button` component with `variant="subtle"` and tooltips:

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Action bar button component with subtle variant
const ActionBarButton = ({
  icon: Icon,
  label,
  onClick,
  hoverColor = 'hover:text-foreground',
  visible = true,
  disabled = false,
}) => {
  if (!visible) return null;

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="subtle"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'h-9 w-9',
              'text-muted-foreground',
              hoverColor
            )}
          >
            <Icon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Usage in action bar
<div className="flex flex-col items-center gap-2 p-2 border-l border-border/50 bg-muted/20">
  {/* Contextual Actions */}
  <ActionBarButton
    icon={Pencil}
    label="Edit Invoice"
    onClick={handleEdit}
    visible={canEdit}
  />
  <ActionBarButton
    icon={CreditCard}
    label="Record Payment"
    onClick={handleRecordPayment}
    hoverColor="hover:text-primary"
    visible={canRecordPayment}
  />
  <ActionBarButton
    icon={Pause}
    label="Put On Hold"
    onClick={handleHold}
    hoverColor="hover:text-amber-500"
    visible={canPutOnHold}
  />
  <ActionBarButton
    icon={Archive}
    label="Archive Invoice"
    onClick={handleArchive}
    hoverColor="hover:text-amber-500"
    visible={canArchive}
  />
  <ActionBarButton
    icon={Trash2}
    label="Delete Invoice"
    onClick={handleDelete}
    hoverColor="hover:text-destructive"
    visible={canDelete}
  />

  {/* Separator - only show if approval actions visible */}
  {canApprove && (
    <div className="w-6 border-t border-border/50 my-1" />
  )}

  {/* Approval Actions */}
  <ActionBarButton
    icon={X}
    label="Reject Invoice"
    onClick={handleReject}
    hoverColor="hover:text-destructive"
    visible={canApprove}
  />
  <ActionBarButton
    icon={Check}
    label="Approve Invoice"
    onClick={handleApprove}
    hoverColor="hover:text-green-500"
    visible={canApprove}
  />
</div>
```

### 8.4 Stat Card Styling

Consistent with existing `LedgerSummaryCards` pattern:

```tsx
const StatCard = ({ label, value, subtext, variant = 'default' }) => {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-500',
    warning: 'text-amber-500',
    destructive: 'text-red-500',
    muted: 'text-muted-foreground',
  };

  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border/50">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className={cn('text-lg font-semibold mt-1', variantStyles[variant])}>
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-muted-foreground">{subtext}</span>
      )}
    </div>
  );
};
```

---

## 9. Database Schema Changes

### 9.1 Payment Model Updates

The current schema already supports payment approval workflow:

```prisma
model Payment {
  id                 Int          @id @default(autoincrement())
  invoice_id         Int
  payment_type_id    Int?
  amount_paid        Float
  payment_date       DateTime
  payment_reference  String?
  status             String       @default("pending")  // ✓ Already exists
  tds_amount_applied Float?
  tds_rounded        Boolean      @default(false)
  created_at         DateTime     @default(now())
  updated_at         DateTime     @updatedAt
  // ... relations
}
```

### 9.2 Recommended Additions

Add `created_by` to track who recorded the payment (for notifications):

```prisma
model Payment {
  // ... existing fields ...

  // NEW: Track payment creator for notifications
  created_by_user_id Int?
  approved_by_user_id Int?
  approved_at DateTime?
  rejection_reason String?

  // Relations
  created_by User? @relation("PaymentCreatedBy", fields: [created_by_user_id], references: [id])
  approved_by User? @relation("PaymentApprovedBy", fields: [approved_by_user_id], references: [id])
}
```

### 9.3 Migration Script

```sql
-- Add payment tracking fields
ALTER TABLE payments ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE payments ADD COLUMN approved_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE payments ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN rejection_reason TEXT;

-- Create indexes
CREATE INDEX idx_payments_created_by ON payments(created_by_user_id);
CREATE INDEX idx_payments_approved_by ON payments(approved_by_user_id);
```

---

## 10. Implementation Phases

### Phase 1: Shared Sidepanel Components (2-3 days)

1. Create `components/panels/shared/` directory
2. Implement reusable components:
   - `panel-summary-header.tsx`
   - `panel-stat-group.tsx`
   - `panel-action-bar.tsx`
   - `panel-section.tsx`
   - `panel-tabs.tsx`
   - `panel-attachment-list.tsx`
   - `panel-timeline.tsx`
   - `panel-payment-card.tsx`

### Phase 2: Invoice Detail Panel Redesign (2-3 days)

1. Create new `invoice-detail-panel-v3.tsx`
2. Implement hero strip with stat cards
3. Add vertical action bar
4. Implement tabbed content
5. Integrate payment history with actions

### Phase 3: Admin Approvals Page (2-3 days)

1. Update `admin-tabs.tsx` (replace Dashboard with Approvals)
2. Create `approval-tabs.tsx` sub-navigation
3. Implement `approvals-page.tsx` container
4. Create `invoice-requests-tab.tsx`
5. Create `payment-requests-tab.tsx` (NEW)
6. Create `vendor-requests-tab.tsx`
7. Create `archive-requests-tab.tsx`
8. Implement filter system

### Phase 4: Payment Workflow & Notifications (1-2 days)

1. Update `app/actions/payments.ts`:
   - Add `created_by_user_id` tracking
   - Add notification triggers
2. Update `types/notification.ts` with payment types
3. Add notification helper functions
4. Update notification panel config

### Phase 5: Testing & Polish (1-2 days)

1. Test all permission scenarios
2. Test notification delivery
3. Test payment approval flow
4. UI polish and responsiveness
5. Documentation updates

---

## 11. File Change Summary

### New Files

```
components/panels/shared/
├── panel-summary-header.tsx
├── panel-stat-group.tsx
├── panel-action-bar.tsx
├── panel-section.tsx
├── panel-tabs.tsx
├── panel-attachment-list.tsx
├── panel-timeline.tsx
├── panel-payment-card.tsx
└── index.ts

components/v3/admin/approvals/
├── approvals-page.tsx
├── approval-tabs.tsx
├── invoice-requests-tab.tsx
├── payment-requests-tab.tsx
├── vendor-requests-tab.tsx
├── archive-requests-tab.tsx
├── approval-filters.tsx
└── approval-table.tsx

components/invoices/
└── invoice-detail-panel-v3.tsx
```

### Modified Files

```
types/notification.ts                          # Add payment notification types
types/payment.ts                               # Add created_by fields
app/actions/notifications.ts                   # Add payment notification helpers
app/actions/payments.ts                        # Add notification triggers
components/notifications/notification-panel.tsx # Add payment notification config
components/v3/admin/admin-tabs.tsx             # Replace 'dashboard' with 'approvals'
components/v3/admin/admin-page.tsx             # Route to approvals
components/v3/admin/master-data-tabs.tsx       # Remove 'Requests' tab
app/(dashboard)/admin/page.tsx                 # Update URL params
components/invoices/invoice-panel-renderer.tsx # Add v3 panel routing
schema.prisma                                  # Add payment tracking fields
```

### Files to Keep (Not Delete)

```
components/admin/admin-dashboard.tsx           # Keep for reference/rollback
components/invoices/invoice-detail-panel-v2.tsx # Keep for reference/rollback
```

---

## 12. Risk Assessment & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing invoice panel | High | Medium | Keep v2 panel, add v3 as new option |
| Notification delivery failures | Medium | Low | Add error handling, retry logic |
| Database migration issues | High | Low | Test on staging first, backup before |
| Permission edge cases | Medium | Medium | Comprehensive test matrix |
| UI responsiveness on mobile | Medium | Medium | Test on multiple breakpoints |

---

## 13. Acceptance Criteria

### Sidepanel Redesign

- [ ] Vertical action bar displays icons with tooltips on hover (500ms delay)
- [ ] All action buttons use `variant="subtle"` styling
- [ ] Separator line divides contextual and approval actions
- [ ] Actions visibility respects role permissions (see Section 4.1.3)
- [ ] Standard user sees Archive button (creates request, not instant)
- [ ] Admin/Super Admin Archive is instant (no approval needed)
- [ ] Tabs switch content without page reload
- [ ] Details tab shows two-column layout on desktop
- [ ] Payments tab shows history with approve/reject actions for pending payments
- [ ] Stat cards show Gross, TDS, Paid, Balance
- [ ] Progress bar shows payment completion percentage

### Admin Approvals Page

- [ ] Dashboard tab replaced with Approvals tab
- [ ] Four sub-tabs: Invoice, Payment, Vendor, Archive
- [ ] Each sub-tab shows pending count badge (hidden when count = 0)
- [ ] Badge styling: orange on active tab, gray on inactive tabs
- [ ] Each tab has Active/Approved/Rejected/All filters
- [ ] Payment requests tab shows pending payments with actions
- [ ] Clicking approve/reject updates status and sends notification

### Payment Workflow

- [ ] Standard user payment → status = `pending`
- [ ] Admin payment → status = `approved`
- [ ] Pending payment triggers admin notification
- [ ] Approval triggers user notification
- [ ] Rejection triggers user notification with reason
- [ ] Invoice status updates after payment approval

### Notifications

- [ ] Payment pending notification appears for admins
- [ ] Payment approved notification appears for requester
- [ ] Payment rejected notification appears for requester
- [ ] Clicking notification navigates to relevant page

---

## Clarifications (Confirmed)

1. **Rejection Reasons:** All rejection actions (invoice, payment, vendor, archive) **require** a reason. This applies to all rejection workflows.

2. **Payment Pending Badge:** Use `text-purple-500 border-purple-500/50` to differentiate from amber (invoice pending approval).

3. **Activity Tab Content by Role:**

   | Role | Activity Tab Shows |
   |------|-------------------|
   | **Standard User** | Invoice events (created, approved, rejected, held, etc.) + Payment events (added, approved, rejected) |
   | **Admin** | All of Standard User + Approval/rejection actions + Master data changes |
   | **Super Admin** | All of Admin + User activities + User management actions |

4. **Archive Requests Location:**
   - **Move to:** Admin > Approvals > Archive Requests
   - **Remove:** Admin > Master Data > Requests tab (deprecated)
   - Archive requests will no longer go through MasterDataRequest system

---

*End of Document*
