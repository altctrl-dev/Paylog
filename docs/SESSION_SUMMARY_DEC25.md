# Session Summary - December 2025 (COMPLETE)

**Last Updated**: December 18, 2025
**Sprint**: Sprint 14+ (COMPLETE)
**Status**: ALL SPRINT ITEMS COMPLETE - Ready for v1.0.0

---

## About PayLog

**PayLog** is a comprehensive expense and invoice management system designed for businesses to efficiently track, manage, and process their financial documents.

### Core Purpose:
- Track recurring invoices (rent, subscriptions, retainers) and one-time expenses
- Manage vendor relationships with approval workflows
- Calculate and track TDS (Tax Deducted at Source) for Indian businesses
- Provide clear audit trails through ledger views and activity logs
- Coordinate invoice approvals between team members

### Key Business Concepts:

| Term | Meaning |
|------|---------|
| **Invoice Profile** | Template for recurring invoices (vendor + frequency + TDS settings) |
| **Recurring Invoice** | Monthly/periodic invoice linked to a profile |
| **Non-Recurring Invoice** | One-time expense with custom name |
| **TDS** | Tax deducted before paying vendor (Indian tax requirement) |
| **Ledger** | Transaction history per profile with running balance |

### User Roles:
- **Super Admin**: Full access including permanent deletion
- **Admin**: Approve invoices, manage vendors, master data
- **Standard User**: Create invoices, record payments, view own requests

---

## Tech Stack & Architecture

### Core Technologies:
| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Next.js (App Router) | 14.2.35 |
| **Language** | TypeScript | ^5 |
| **UI Library** | React | 18.3.1 |
| **UI Components** | shadcn/ui + Radix | Latest |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Database** | PostgreSQL | Railway |
| **ORM** | Prisma | 5.20.0 |
| **Auth** | NextAuth.js | 5.0.0-beta.30 |
| **Server State** | React Query | 5.56.2 |
| **Client State** | Zustand | 4.5.5 |
| **Forms** | React Hook Form + Zod | 7.64.0 / 3.23.8 |
| **Animations** | Framer Motion | 11.9.0 |
| **File Storage** | SharePoint/OneDrive | MS Graph API |
| **Email** | Resend | 4.8.0 |

### Architecture Patterns:
- **Server Actions**: All mutations via Next.js 14 server actions (not API routes)
- **Side Panels**: Slide-in panels for details/forms using Zustand store
- **React Query**: Handles caching, refetching, optimistic updates
- **Zod Schemas**: Shared between client forms and server validation
- **RBAC**: Role-based access control at component and action level

### Key Architectural Decisions:
1. **No API Routes for CRUD**: Server Actions handle all data mutations
2. **Panel-First UX**: Details open in side panels, not full pages
3. **URL State for Filters**: Filter state persisted in URL params
4. **Optimistic Updates**: React Query for instant UI feedback
5. **Shared Validation**: Zod schemas used client and server

---

## Executive Summary

Since November 25, 2025, significant development has occurred transforming PayLog from a basic invoice management system into a comprehensive, production-ready application. Over 80+ commits have been made implementing major features including:

- V3 Sidepanel Standardization
- Comprehensive Invoice Filtering System
- Invoice Tabs (Recurring, All, TDS, Ledger)
- BUG-007 Vendor Approval Workflow
- SharePoint/OneDrive Storage Integration
- Notification System
- Archive and Permanent Delete functionality
- Modern Theme UI Overhaul

---

## Major Features Implemented

### 1. V3 Invoice Tabs System (Sprint 14 Item #10 - COMPLETED)

**Location**: [components/v3/invoices/](components/v3/invoices/)

The invoice management page now features a complete tabbed navigation system:

| Tab | Description | File |
|-----|-------------|------|
| **All Invoices** | Full invoice table with comprehensive filtering | [all-invoices-tab.tsx](components/v3/invoices/all-invoices-tab.tsx) |
| **Ledger** | Transaction history per invoice profile | [ledger-tab.tsx](components/v3/invoices/ledger-tab.tsx) |
| **TDS** | TDS-applicable invoices with calculations | [tds-tab.tsx](components/v3/invoices/tds-tab.tsx) |
| **Recurring** | Recurring invoice profile cards | [invoices-page.tsx](components/v3/invoices/invoices-page.tsx) |

**Tab Navigation Component**: [invoice-tabs.tsx](components/v3/invoices/invoice-tabs.tsx)
- Desktop: Horizontal tab bar
- Mobile: Dropdown selector
- URL-based state (`?tab=all`, `?tab=recurring`, `?tab=tds`, `?tab=ledger`)

### 2. Comprehensive Invoice Filtering System

**Files**:
- [invoice-filter-popover.tsx](components/v3/invoices/invoice-filter-popover.tsx)
- [invoice-filter-sheet.tsx](components/v3/invoices/invoice-filter-sheet.tsx)
- [filter-bar.tsx](components/invoices/filters/filter-bar.tsx)

**Filter Options**:
- Status (All Statuses, Pending Actions, specific statuses)
- Vendor
- Category
- Invoice Profile
- Payment Type
- Entity
- Invoice Type (Recurring/One-time)
- TDS Applicable
- Archived
- Date Range
- Sort By (Date, Amount, Status, Remaining Balance)

**View Modes**:
- **Pending View**: Shows all non-paid invoices grouped by month
- **Monthly View**: Shows invoices for selected month with navigation
- **Archived View**: Shows archived invoices only

### 3. BUG-007: Vendor Approval Workflow

**Problem**: Invoices could be approved with vendors that were still pending approval, causing data integrity issues.

**Solution**: Two-step approval dialog when invoice has pending vendor.

**Implementation** (in [all-invoices-tab.tsx](components/v3/invoices/all-invoices-tab.tsx:836-966)):
```typescript
// Step 1: Check vendor status before invoice approval
const eligibility = await checkInvoiceApprovalEligibility(id);

if (eligibility.data?.vendorPending && eligibility.data.vendor) {
  // Show two-step dialog
  setVendorPendingData({ invoiceId: id, vendor: eligibility.data.vendor });
  setIsVendorPendingDialogOpen(true);
  return;
}

// Step 2: Dialog shows vendor details, then confirmation
// Options: "Edit Invoice", "Continue" → "Back", "Approve Both"
```

**Dialog Flow**:
1. **Step 1 - Details**: Shows vendor info (name, address, bank details, GST)
2. **Step 2 - Confirm**: Shows numbered steps (Approve Vendor → Approve Invoice)

### 4. V3 Sidepanel Standardization

**Files**:
- [components/invoices/invoice-detail-panel-v3/](components/invoices/invoice-detail-panel-v3/)
- [components/panels/](components/panels/)

**Architecture**:
- Modular sub-components: PanelV3Header, PanelV3Hero, PanelV3ActionBar
- Tabs: Details, Payments, Attachments, Activity
- Permission-based action bar
- Consistent panel widths: `PANEL_WIDTH.LARGE` (800px), `PANEL_WIDTH.MEDIUM` (600px)

### 5. Reusable Dialog Components

**File**: [components/ui/confirmation-dialog.tsx](components/ui/confirmation-dialog.tsx)

**Components**:
- `ConfirmationDialog` - Generic confirmation with variants (default, warning, destructive)
- `InputDialog` - Confirmation with text input (for reasons)
- `ConfirmationContentCard` - Styled content container
- `ConfirmationContentRow` - Label/value row
- `ConfirmationStepItem` - Numbered step indicator
- `useConfirmationDialog` - State management hook

**Usage Pattern**:
```typescript
<ConfirmationDialog
  open={isOpen}
  title="Approve Invoice"
  description="Are you sure?"
  variant="default"
  confirmLabel="Approve"
  onConfirm={handleConfirm}
  isLoading={isApproving}
>
  <ConfirmationContentRow label="Invoice" value={invoiceNumber} />
</ConfirmationDialog>
```

### 6. SharePoint/OneDrive Storage Integration

**Files**:
- Storage provider implementation
- File organization by invoice type and profile
- Automatic folder routing

**Features**:
- Upload invoice attachments to SharePoint
- View/download attachments from panel
- Deleted files moved to "Deleted" folder

### 7. Ledger Tab

**Files**:
- [ledger-tab.tsx](components/v3/invoices/ledger-tab.tsx)
- [ledger-summary-cards.tsx](components/v3/invoices/ledger-summary-cards.tsx)
- [ledger-table-view.tsx](components/v3/invoices/ledger-table-view.tsx)
- [hooks/use-ledger.ts](hooks/use-ledger.ts)
- [types/ledger.ts](types/ledger.ts)

**Features**:
- Profile dropdown selector
- Summary cards (Total Invoiced, TDS, Paid, Outstanding)
- Table view with running balance
- Timeline view (placeholder for future)

### 8. Archive & Permanent Delete

**Implementation**:
- Archive creates request for approval (non-admin) or archives directly (admin)
- Permanent delete requires reason input (super_admin only)
- Both use InputDialog for reason collection
- Files moved to "Deleted" folder on permanent delete

### 9. Notification System

**Features**:
- Vendor approval notifications
- Master data integration
- Navbar notification bell
- Real-time updates

### 10. TDS Tab Improvements

**Features**:
- Month navigation
- Search, filter (All/High/Low TDS), sort
- Excel export with totals
- Checkbox selection
- Footer with centered TDS total
- Uses `tds_rounded` preference for calculations (BUG-003 fix)

### 11. UI Theme Overhaul

**Changes**:
- Modern theme with polished UI components
- Button variants: primary (glow effect), outline, ghost, subtle
- Light mode: pure white background
- Dark mode: proper contrast
- Tab pills with reduced padding
- Consistent spacing and styling

---

## Bug Fixes (December 2025)

| Bug | Description | Fix | Commit |
|-----|-------------|-----|--------|
| BUG-007 | Vendor pending approval workflow | Two-step dialog | `71bc53a` |
| BUG-003 | TDS round-off calculation | Use `tds_rounded` preference | `c2b6536` |
| - | Payment status display | Fixed display logic | `6996664` |
| - | Due date handling | Fixed null handling | `6996664` |
| - | Month group sorting | Sort based on date order | `7b3bc04` |
| - | Remaining balance | Calculate after TDS deduction | `5445e5c` |
| - | Pending approval stats | Exclude from recurring card stats | `5fe6b5f` |
| - | Ledger view | Exclude pending_approval invoices | `1dccfcd` |
| - | Inline payments | Enforce approval workflow | `8f07afd` |
| - | Profile_id mismatch | Fixed field name | `0ff1a69` |

---

## Database Schema (16 Models - Complete)

### All Models:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts | email, full_name, role (super_admin/admin/standard_user), is_active |
| **InvoiceProfile** | Recurring invoice templates | name, vendor_id, tds_applicable, billing_frequency |
| **Invoice** | Invoice records | invoice_number, amount, status, is_recurring, tds_rounded, pending_payment_data |
| **Vendor** | Vendor/supplier info | name, status (PENDING_APPROVAL/APPROVED/REJECTED), bank_details |
| **Category** | Invoice categories | name, description |
| **PaymentType** | Payment methods | name, requires_reference |
| **Payment** | Payment records | invoice_id, amount_paid, payment_date, tds_amount_applied |
| **Currency** | Currency definitions | code (3-char), name, symbol |
| **Entity** | Business entities | name, address, country |
| **MasterDataRequest** | Approval workflow | entity_type, status, request_data |
| **InvoiceAttachment** | File attachments | file_name, storage_path, mime_type |
| **InvoiceComment** | Invoice comments | content, user_id |
| **ActivityLog** | Audit trail | action, old_data, new_data |
| **UserAuditLog** | User change audit | event_type, target_user_id |
| **Notification** | User notifications | type, title, message, is_read |
| **UserProfileVisibility** | Profile access control | user_id, profile_id |

### Key Schema Fields (December Changes):
- `invoice_name` - For non-recurring invoices (custom naming)
- `tds_rounded` - Boolean for TDS ceiling calculation (BUG-003 fix)
- `pending_payment_data` - JSON field storing payment during creation
- `is_archived` - Soft delete for invoices
- `Vendor.status` - Default changed to `PENDING_APPROVAL` (BUG-007 fix)

### Database Indexes:
- `idx_invoices_status` - Quick status filtering
- `idx_invoices_archived` - Archive queries
- `idx_invoices_recurring` - Recurring invoice queries
- `idx_vendors_status` - Vendor approval queries
- `idx_notifications_user_unread` - Unread notification counts

### Removed (Legacy):
- Legacy Invoice and Payment fields (refactor: `146f9e0`)

---

## Quality & Security

### Security Fixes:
- Next.js upgraded to 14.2.35 (security vulnerabilities)
- eslint-config-next upgraded to 14.2.35
- Removed vulnerable @next/swc packages from lockfile
- Removed stale package-lock.json causing CVE false positive

### Quality Gates:
All commits pass:
- `pnpm lint` (0 errors)
- `pnpm typecheck` (0 errors)
- `pnpm build` (successful)

---

## Git Commit History (December 2025)

```
ca54001 fix: remove stale package-lock.json causing CVE false positive
0979383 fix: remove vulnerable @next/swc packages from lockfile
9dc1048 chore(deps): upgrade eslint-config-next to 14.2.35
0c059d2 chore(deps): upgrade next.js to 14.2.35 for security fixes
e78092f feat(ui): add reusable ConfirmationDialog and InputDialog components
34385d6 feat(invoices): store and process pending payment data on approval
6996664 fix(invoices-v2): fix payment status display and due_date handling
de66e32 fix(ui): add close button to vendor approval dialog
d62eaa8 feat(notifications): add vendor approval notifications (BUG-007)
7b3bc04 fix(invoices): sort month groups based on date sort order
249f23a feat(invoices): add Pending Actions status filter and reorder tabs
71bc53a fix(vendor-approval): implement BUG-007 vendor approval workflow
c2b6536 fix(invoices): complete TDS round-off and payment status bug fixes
b58eb6f feat(invoices): implement comprehensive invoice filtering system
d2105b0 feat(invoices): add pending view mode with month grouping and filter menu
84ccc38 feat(panels): implement V3 sidepanel standardization
... (80+ total commits in December)
```

---

## Application Pages & Tab Structure

### Main Dashboard Routes:

| Route | Page | Component | Description |
|-------|------|-----------|-------------|
| `/dashboard` | Dashboard | `app/(dashboard)/dashboard/page.tsx` | Main dashboard with statistics |
| `/invoices` | Invoices | `components/v3/invoices/invoices-page.tsx` | Invoice management (4 tabs) |
| `/admin` | Admin Console | `components/v3/admin/admin-page.tsx` | Admin features (3 tabs) |
| `/settings` | Settings | `components/v3/settings/settings-page.tsx` | User settings (3 tabs) |

### Invoices Page Tabs:
| Tab | Component | URL State | Description |
|-----|-----------|-----------|-------------|
| **All Invoices** | `all-invoices-tab.tsx` | `?tab=all` | Full invoice table with filtering |
| **Ledger** | `ledger-tab.tsx` | `?tab=ledger` | Per-profile transaction history |
| **TDS** | `tds-tab.tsx` | `?tab=tds` | TDS-applicable invoices |
| **Recurring** | (in page) | `?tab=recurring` | Profile cards with stats |

### Admin Page Tabs:
| Tab | Access | Description |
|-----|--------|-------------|
| **Approvals** | admin+ | Pending invoices, vendors, archive requests |
| **Master Data** | admin+ | Vendors, Categories, Entities, Payment Types, Currencies, Profiles |
| **Users** | super_admin | User management |

### Settings Page Tabs:
| Tab | Description |
|-----|-------------|
| **Profile** | Display name, picture, initials |
| **Security** | Password change |
| **Activities** | Activity history |

---

## File Architecture (Key Files)

### Invoice System (V3):
```
components/v3/invoices/
├── invoices-page.tsx       # Main page with tabs (534 lines)
├── invoice-tabs.tsx        # Tab navigation (291 lines)
├── all-invoices-tab.tsx    # All Invoices table (1849 lines - LARGEST)
├── tds-tab.tsx            # TDS tab (453 lines)
├── ledger-tab.tsx         # Ledger tab (261 lines)
├── ledger-summary-cards.tsx
├── ledger-table-view.tsx
├── recurring-card.tsx     # Recurring profile cards
├── month-navigator.tsx    # Month navigation
├── invoice-filter-popover.tsx
└── invoice-filter-sheet.tsx
```

### Admin System (V3):
```
components/v3/admin/
├── admin-page.tsx         # Main page (165 lines)
├── admin-tabs.tsx         # Tab navigation
└── ... (sub-components)

components/master-data/
├── vendor-list.tsx
├── category-list.tsx
├── payment-type-list.tsx  # Placeholder (22 lines - Sprint 14 Item #6)
├── invoice-profile-management.tsx
└── ... (other lists)
```

### Settings System (V3):
```
components/v3/settings/
├── settings-page.tsx      # Main page (76 lines)
└── ... (tab components)
```

### Panel System:
```
components/invoices/invoice-detail-panel-v3/
├── index.tsx              # Main panel (with BUG-007 fix)
├── panel-header.tsx
├── panel-hero.tsx
├── panel-action-bar.tsx
└── panel-tabs/
    ├── details-tab.tsx
    ├── payments-tab.tsx
    ├── attachments-tab.tsx
    └── activity-tab.tsx
```

### UI Components:
```
components/ui/
├── confirmation-dialog.tsx  # Reusable dialog system (605 lines)
├── button.tsx              # With subtle variant
├── checkbox.tsx
└── ... (other shadcn components)
```

---

## Sprint 14 Status Update - ALL COMPLETE

### All Items Complete (13/13):
- [x] Item #1: Approval Buttons
- [x] Item #2: User Panel Fix
- [x] Item #3: Currency Display
- [x] Item #4: Amount Field UX - AmountInput component
- [x] Item #5: Panel Styling - V3 standardization
- [x] Item #6: Payment Types CRUD - Full CRUD with hooks
- [x] Item #7: Billing Frequency - Dual input (value + unit)
- [x] Item #8: Activities Tab - Standalone with filtering
- [x] Item #9: Settings Restructure - 3 tabs
- [x] Item #10: Invoice Tabs (Recurring/All/TDS)
- [x] Item #11: Edit Button (Admin)
- [x] Item #12: Edit Button (Users)
- [x] Item #13: Invoice Creation Toggle - Panel preference

---

## Development Commands

```bash
# Start development server
pnpm dev

# Quality gates (run before EVERY commit)
pnpm lint
pnpm typecheck
pnpm build

# Database
pnpm prisma studio

# Git workflow
git add .
git commit -m "type: message"
git push  # Auto-deploys to Railway
```

---

## Key Technical Patterns

### 1. TDS Calculation:
```typescript
import { calculateTds } from '@/lib/utils/tds';

// Use invoice's tds_rounded preference
const { tdsAmount, payableAmount } = calculateTds(
  invoiceAmount,
  tdsPercentage,
  invoice.tds_rounded ?? false
);
```

### 2. Permission Logic:
```typescript
const isPendingApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
const canRecordPayment = !isPendingApproval &&
  invoice.status !== INVOICE_STATUS.PAID &&
  invoice.status !== INVOICE_STATUS.REJECTED;
const canApproveReject = isAdmin && isPendingApproval;
```

### 3. Panel Opening:
```typescript
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';

const { openPanel } = usePanel();
openPanel('invoice-v3-detail', { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
```

### 4. Form Pre-filling:
```typescript
// Don't use defaultValues - use useEffect + setValue
useEffect(() => {
  if (data) {
    setValue('invoice_profile_id', data.invoice_profile_id);
    setValue('amount', data.invoice_amount);
  }
}, [data, setValue]);
```

---

## User Preferences (Important!)

1. **Additive Approach**: "Always take an additive approach. Don't delete anything that you don't understand."
2. **Quality Gates**: Lint, TypeCheck, Build must pass before EVERY commit
3. **Fix All Errors**: "We are all on the same team. Fix all pre-existing and existing errors."
4. **Document Everything**: Comprehensive documentation for future sessions

---

## December 18, 2025 Session - Final Sprint Completion

### New Implementations:

#### 1. AmountInput Component (Item #4)
**File**: `components/invoices-v2/amount-input.tsx`
- Smart placeholder behavior (shows 0.00 when empty)
- No leading zero bug when typing
- React Hook Form Controller integration
- Scroll-to-change disabled
- Used in Payment Form Panel and invoice forms

#### 2. Payment Types CRUD (Item #6)
**Files**:
- `app/actions/payment-types.ts` - Server actions (create, update, archive, restore, list, search)
- `hooks/use-payment-types.ts` - React Query hooks with cache invalidation
- `components/master-data/payment-type-list.tsx` - DataTable with edit/archive

**Features**:
- Admin-only RBAC protection
- Archive protection (cannot archive if has invoices)
- Automatic cache invalidation

#### 3. Activities Tab (Item #8)
**File**: `app/(dashboard)/settings/components/activities-tab.tsx`
- Timeline view with action icons
- Category filtering (Invoice, Payment, Comment, Attachment)
- Pagination with page navigation
- Click-to-navigate to related invoice
- Color-coded actions (green=approve, red=reject, amber=update)

#### 4. Settings Restructure (Item #9)
**File**: `components/v3/settings/settings-page.tsx`
- Profile Tab - User profile management
- Security Tab - Password change, security settings
- Activities Tab - Activity log and audit trail

#### 5. Payment Panel Redesign
**File**: `components/payments/payment-form-panel.tsx` (562 lines)
**Major UX Improvements**:
- Hero stats grid: Invoice Amount, TDS Deducted, Already Paid, Remaining
- Payment progress bar with color coding (amber < 50%, primary 50-99%, green = 100%)
- TDS Round toggle in header (only shows when rounding makes difference)
- Currency prefix on amount input (INR ₹)
- "After This Payment" preview section
- Full payment indicator: Green card with "Invoice will be marked as PAID"

Uses shared panel components:
- `PanelSummaryHeader`
- `PanelStatGroup`
- `PanelSection`

---

## December 18, 2025 Session #2 - Invoice Detail Panel Redesign

### Major UI/UX Overhaul of Invoice Detail Panel

This session implemented a comprehensive redesign of the Invoice Detail Panel V3 to improve information hierarchy, mobile responsiveness, and visual consistency.

---

### Changes Implemented

#### 1. Panel Title Enhancement
**File**: `components/invoices/invoice-detail-panel-v3/index.tsx`

**Before**: `Invoice {invoice_number}` (e.g., "Invoice lkbjhghhg")
**After**: `Invoice - {name}` (e.g., "Invoice - AC Charges")

The title now shows the human-readable invoice name (for non-recurring) or profile name (for recurring), making it immediately clear what the invoice is for.

```typescript
// Title derivation logic
const invoiceDisplayName = invoice.is_recurring
  ? invoice.invoice_profile?.name
  : invoice.invoice_name || invoice.description || invoice.invoice_number;

title={`Invoice - ${invoiceDisplayName}`}
```

---

#### 2. Header Section Redesign
**File**: `components/invoices/invoice-detail-panel-v3/panel-v3-header.tsx`

**Changes**:
| Aspect | Before | After |
|--------|--------|-------|
| **First Row** | Invoice number + Badges (horizontal) | Invoice number + Vendor name (left) |
| **Badges** | All horizontal in one row | Stacked vertically (right side) |
| **Invoice Name** | Shown as subtitle | Moved to panel title |
| **"from" prefix** | "from IOE Access" | "IOE Access" (cleaner) |
| **Recurring Badge** | `variant="secondary"` (filled gray) | `variant="outline"` (outlined) |
| **Padding** | `py-4` | `py-2` (more compact) |

**Visual Result**:
```
┌─────────────────────────────────────────────┐
│ lkbjhghhg                 [Pending Approval]│
│ IOE Access                      [Recurring] │
└─────────────────────────────────────────────┘
```

---

#### 3. Due Date Moved to Details Tab
**Files**:
- `components/invoices/invoice-detail-panel-v3/panel-v3-hero.tsx` - Removed due date display
- `components/invoices/invoice-detail-panel-v3/tabs/details-tab.tsx` - Added enhanced due date

**Before**: Due date shown in Hero section with overdue badge
**After**: Due date shown in Details tab under "Invoice Details" section

**New DueDateDisplay Component** (in details-tab.tsx):
```typescript
function DueDateDisplay({ dueDate, isPaid }: DueDateDisplayProps) {
  // Features:
  // - Calendar icon
  // - Color-coded text (red=overdue, amber=due soon)
  // - Status badge (Overdue/Due Soon/Paid)
  // - Mobile responsive (badge below date on mobile)
}
```

**Desktop Layout**:
```
Due Date
📅 Dec 01, 2025  [Overdue by 17 days]
```

**Mobile Layout** (stacked):
```
Due Date
📅 Dec 01, 2025
[Overdue by 17 days]
```

---

#### 4. Responsive Tab System with Overflow Menu
**File**: `components/panels/shared/panel-tabs.tsx`

**New Feature**: Tabs that don't fit on mobile screens overflow into a 3-dot menu.

**Props Added**:
```typescript
interface PanelTabsProps {
  // ... existing props
  mobileMaxTabs?: number; // Default: 3
}
```

**Behavior**:
- **Desktop**: All 4 tabs visible (Details, Payments, Attachments, Activity)
- **Mobile**: First 3 tabs visible + overflow menu with remaining tabs
- If active tab is in overflow, it swaps with last visible tab

**Implementation**:
- Uses `useIsMobile()` hook (max-width: 639px)
- DropdownMenu for overflow tabs
- Active tab detection in overflow

---

#### 5. Mobile Action Bar in Footer
**File**: `components/invoices/invoice-detail-panel-v3/index.tsx`

**Before**: Action bar always on right side (blocked content on mobile)
**After**:
- **Desktop**: Action bar on right side (unchanged)
- **Mobile**: Action bar in footer, left of Close button

**Mobile Footer Layout**:
```
┌─────────────────────────────────────────────┐
│ [✏][₹][⏸][✓][✗] [⋮]              [Close]   │
│  ↑               ↑                          │
│  Primary         Secondary Actions          │
│  Actions         (Archive, Delete)          │
│                  in overflow menu           │
└─────────────────────────────────────────────┘
```

**Primary Actions** (shown as icons):
- Edit (✏)
- Record Payment (₹)
- Put On Hold (⏸)
- Approve (✓)
- Reject (✗)

**Secondary Actions** (in overflow menu):
- Archive
- Delete

---

#### 6. New useMediaQuery Hook
**File**: `hooks/use-media-query.ts` (NEW)

**Exports**:
```typescript
// Generic hook
function useMediaQuery(query: string): boolean

// Predefined breakpoints (Tailwind defaults)
function useIsMobile(): boolean   // max-width: 639px
function useIsTablet(): boolean   // 640px - 1023px
function useIsDesktop(): boolean  // min-width: 1024px
```

**Features**:
- SSR-safe (checks `typeof window`)
- Uses modern `addEventListener` with fallback
- Properly cleans up listeners

---

### Files Modified

| File | Changes |
|------|---------|
| `hooks/use-media-query.ts` | **NEW** - Responsive breakpoint hook |
| `components/panels/shared/panel-tabs.tsx` | Added overflow menu for mobile |
| `components/invoices/invoice-detail-panel-v3/panel-v3-header.tsx` | Redesigned layout, stacked badges |
| `components/invoices/invoice-detail-panel-v3/panel-v3-hero.tsx` | Removed due date, cleaned unused code |
| `components/invoices/invoice-detail-panel-v3/tabs/details-tab.tsx` | Added DueDateDisplay with overdue badge |
| `components/invoices/invoice-detail-panel-v3/index.tsx` | New title, mobile footer, responsive action bar |

---

### Quality Gates

All checks passed:
- ✅ `pnpm lint` - 0 errors (only pre-existing warnings)
- ✅ `pnpm typecheck` - 0 errors
- ✅ `pnpm build` - Successful

---

**Session Status**: SPRINT 14 COMPLETE + Invoice Panel Redesign
**All Items**: 13/13 (100%)
**Overall Progress**: ~99% complete toward v1.0.0
**Next Steps**: Final testing, documentation review, v1.0.0 release prep

---

## December 18, 2025 Session #3 - Mobile Bug Fixes

### Issues Reported by User

The user reported three critical mobile bugs in the Invoice Detail Panel:

1. **Dropdown Menus Not Working**: Both 3-dot overflow menus (tabs and footer actions) didn't respond to clicks/taps on mobile
2. **Panel Content Clipped on Left Edge**: Content was being cut off on the left side (e.g., "Invoice Date" appeared as "nvoice Date")
3. **Tab Overflow Logic Bug**: When selecting a tab from the overflow menu (e.g., Activity), the replaced tab (Attachments) disappeared completely

---

### Root Cause Analysis

#### Bug 1: Dropdown Menus Not Working on Mobile

**Root Cause**: Radix UI's `DropdownMenu` and `Popover` components have known issues with touch events on mobile Safari and Chrome. The `modal` behavior interferes with focus management on touch devices.

**Investigation Path**:
1. Initially tried adding `modal={false}` to DropdownMenu - didn't work
2. Tried switching to Popover with portal - still didn't work
3. Finally realized the issue was fundamental to Radix UI touch handling

#### Bug 2: Panel Content Clipped on Left Edge

**Root Cause**: The inline `width: config.width` (800px) in `panel-level.tsx` overrode the CSS class `w-full`. Since inline styles have higher specificity than class styles, the panel was forced to 800px even on mobile devices, causing it to extend beyond the left edge of the viewport.

**Code Location**: `components/panels/panel-level.tsx:98-101`
```typescript
// BEFORE - The bug
style={{
  zIndex: config.zIndex,
  width: config.width,  // 800px - overrides w-full class!
}}
```

#### Bug 3: Tab Overflow Logic Bug

**Root Cause**: The original logic replaced the last visible tab with the active overflow tab, but didn't add the replaced tab to the overflow menu. This caused the replaced tab to "disappear" from both locations.

**Example of the bug**:
- Original: `visibleTabs = [Details, Payments, Attachments]`, `overflowTabs = [Activity]`
- User selects Activity
- Bug result: `visibleTabs = [Details, Payments, Activity]`, `overflowTabs = [Activity]` - Attachments gone!

---

### Solutions Implemented

#### Fix 1: Native Dropdowns for Mobile
**Files**: `components/panels/shared/panel-tabs.tsx`, `components/invoices/invoice-detail-panel-v3/index.tsx`

Replaced Radix UI components with native dropdown implementation:

```typescript
// New approach using useState and native buttons
const [isOverflowOpen, setIsOverflowOpen] = useState(false);
const menuRef = useRef<HTMLDivElement>(null);
const triggerRef = useRef<HTMLButtonElement>(null);

// Click outside detection
useEffect(() => {
  if (!isOverflowOpen) return;
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    if (
      menuRef.current && !menuRef.current.contains(event.target as Node) &&
      triggerRef.current && !triggerRef.current.contains(event.target as Node)
    ) {
      setIsOverflowOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('touchstart', handleClickOutside);
  };
}, [isOverflowOpen]);

// Native dropdown menu
{isOverflowOpen && (
  <div ref={menuRef} className="absolute ... z-[9999]">
    {items.map(item => (
      <button onClick={() => handleSelect(item)}>...</button>
    ))}
  </div>
)}
```

**Key Changes**:
- Native `<button>` elements instead of Radix triggers
- `touch-manipulation` CSS for removing touch delay
- `z-[9999]` for proper layering above panels
- Both `mousedown` and `touchstart` event listeners
- `select-none` to prevent text selection on tap

#### Fix 2: maxWidth Instead of width
**File**: `components/panels/panel-level.tsx`

```typescript
// BEFORE
style={{
  zIndex: config.zIndex,
  width: config.width,  // Forces 800px even on mobile
}}

// AFTER
style={{
  zIndex: config.zIndex,
  maxWidth: config.width,  // Allows shrinking on mobile
}}

// Also simplified getWidthClass()
const getWidthClass = () => 'w-full';  // Always 100%, maxWidth caps it
```

This allows the panel to be 100% width on mobile (via `w-full` class) while capping at the configured width on larger screens.

#### Fix 3: Proper Tab Swap Logic
**File**: `components/panels/shared/panel-tabs.tsx`

```typescript
// New computeTabSets with useMemo
const computeTabSets = React.useMemo(() => {
  if (!isMobile) {
    return { visible: tabs, overflow: [] as TabItem[] };
  }

  const baseVisible = tabs.slice(0, mobileMaxTabs);
  const baseOverflow = tabs.slice(mobileMaxTabs);

  // Check if active tab is in the overflow set
  const activeOverflowTab = baseOverflow.find((tab) => tab.id === activeTab);

  if (activeOverflowTab) {
    // Swap: replace last visible tab with active overflow tab
    const lastVisibleTab = baseVisible[baseVisible.length - 1];
    const newVisible = [...baseVisible.slice(0, -1), activeOverflowTab];
    // Put the replaced tab into overflow, remove the active one
    const newOverflow = [
      ...baseOverflow.filter((tab) => tab.id !== activeTab),
      lastVisibleTab,
    ];
    return { visible: newVisible, overflow: newOverflow };
  }

  return { visible: baseVisible, overflow: baseOverflow };
}, [tabs, activeTab, isMobile, mobileMaxTabs]);
```

**Result**:
- Default: `visible = [Details, Payments, Attachments]`, `overflow = [Activity]`
- User selects Activity: `visible = [Details, Payments, Activity]`, `overflow = [Attachments]` ✓

---

### Files Modified

| File | Changes |
|------|---------|
| `components/panels/shared/panel-tabs.tsx` | Native dropdown, proper tab swap logic |
| `components/panels/panel-level.tsx` | `maxWidth` instead of `width` |
| `components/invoices/invoice-detail-panel-v3/index.tsx` | Native dropdown for footer actions |

---

### Commits

```
0caae6a fix(tabs): properly swap overflow tab with last visible tab on mobile
039a4c4 fix(panel): use maxWidth for responsive panel sizing on mobile
3af4605 fix(mobile): replace Radix UI popover with native dropdown for mobile menus
```

---

### Lessons Learned

1. **Radix UI Touch Issues**: Radix UI's DropdownMenu and Popover have fundamental issues with touch events on mobile. For critical mobile UX, prefer native implementations.

2. **Inline Style Specificity**: Inline `style={{ width }}` overrides CSS classes. Use `maxWidth` or ensure responsive classes aren't needed.

3. **Tab Swap Logic**: When implementing "swap" behavior, ensure items move to BOTH locations - don't just replace one without updating the other.

4. **Mobile Testing is Critical**: Always test on actual mobile devices, not just responsive mode in desktop browsers.

---

### Testing Checklist

After these fixes, verify:
- [x] Tab overflow menu opens on mobile tap
- [x] Footer actions menu opens on mobile tap
- [x] Panel content is not clipped on left edge
- [x] Selecting Activity from overflow moves Attachments to overflow
- [x] Selecting Attachments from overflow moves Activity to overflow
- [x] All tabs remain accessible
- [x] Close button works on mobile
- [x] Panel fills viewport width on mobile

---

### Quality Gates

All checks passed:
- ✅ `pnpm lint` - 0 errors
- ✅ `pnpm typecheck` - 0 errors
- ✅ `pnpm build` - Successful

---

## Summary of All December 18, 2025 Sessions

| Session | Focus | Key Deliverables |
|---------|-------|------------------|
| #1 | Sprint 14 Completion | AmountInput, Payment Types CRUD, Activities Tab, Settings Restructure |
| #2 | Invoice Panel Redesign | Human-readable title, header redesign, due date in details, responsive tabs, mobile footer |
| #3 | Mobile Bug Fixes | Native dropdowns, maxWidth fix, proper tab swap logic |

---

**Final Session Status**: ALL MOBILE BUGS FIXED
**Sprint 14**: COMPLETE (13/13 items)
**Overall Progress**: ~99% complete toward v1.0.0
**Next Steps**: v1.0.0 release preparation

---

## December 19, 2025 Session - Payments Tab Badge & Currency Fixes

### Issues Reported by User

The user reported two issues during this session:

1. **Payments Tab Badge Missing Pending Count**: The Payments tab in the invoice detail panel wasn't showing a badge when there was a pending payment. The Attachments tab showed its count correctly, but Payments didn't.

2. **Currency Symbol Hardcoded**: Currency amounts were displaying `$` symbol instead of the invoice's actual currency symbol (e.g., `₹` for INR invoices).

---

### Root Cause Analysis

#### Bug 1: Payments Tab Badge Not Showing Pending Count

**Root Cause**: The `getPaymentSummary` server action was calculating `pendingPaymentCount` internally but NOT returning it in the response. The `PaymentSummary` type only had:
- `payment_count` (approved payments only)
- `has_pending_payment` (boolean)

But `pending_payment_count` (the actual count) was missing.

**Investigation Path**:
1. Checked `PaymentSummary` type in `types/payment.ts` - missing `pending_payment_count`
2. Checked `getPaymentSummary` in `app/actions/payments.ts` - calculated but not returned
3. Checked invoice detail panel - only using `payment_count` for badge

#### Bug 2: Currency Symbol Hardcoded

**Root Cause**: Multiple components had their own local `formatCurrency` functions that hardcoded either `'USD'` or `'INR'`:

```typescript
// ❌ WRONG - Hardcoded currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',  // Always INR!
  }).format(value);
}
```

The shared utility at `lib/utils/format.ts` already had the correct implementation:

```typescript
// ✅ CORRECT - Dynamic currency
export function formatCurrency(value: number, currencyCode?: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode || 'INR',
  }).format(value);
}
```

---

### Solutions Implemented

#### Fix 1: Added `pending_payment_count` to PaymentSummary

**Files Modified**:
- `types/payment.ts` - Added field to interface
- `app/actions/payments.ts` - Return field in response
- `components/invoices/invoice-detail-panel-v3/index.tsx` - Use combined count for badge

**Changes**:

```typescript
// types/payment.ts
export interface PaymentSummary {
  invoice_id: number;
  invoice_amount: number;
  total_paid: number;
  remaining_balance: number;
  /** Count of approved payments */
  payment_count: number;
  /** Count of pending payments awaiting approval */
  pending_payment_count: number;  // NEW
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  /** Whether there's a pending payment awaiting approval */
  has_pending_payment: boolean;
}
```

```typescript
// app/actions/payments.ts - getPaymentSummary return
return {
  success: true,
  data: {
    // ...existing fields...
    pending_payment_count: pendingPaymentCount,  // NEW
    // ...
  },
};
```

```typescript
// invoice-detail-panel-v3/index.tsx - Payments tab badge
{
  id: 'payments',
  label: 'Payments',
  badge: (paymentSummary?.payment_count ?? 0) + (paymentSummary?.pending_payment_count ?? 0),
  content: <PaymentsTab invoiceId={invoiceId} isAdmin={isAdmin} currencyCode={invoice.currency?.code} />,
}
```

#### Fix 2: Dynamic Currency Formatting Across All Components

**Strategy**: Remove all local `formatCurrency` functions and use the shared utility from `lib/utils/format.ts`, passing the invoice's `currency?.code` property.

**Files Modified** (9 files total):

| File | Changes |
|------|---------|
| `components/invoices/invoice-detail-panel-v3/tabs/payments-tab.tsx` | Added `currencyCode` prop, pass to PaymentHistoryList |
| `components/payments/payment-history-list.tsx` | Removed local formatCurrency, use shared with currencyCode prop |
| `components/panels/shared/panel-payment-card.tsx` | Added currencyCode prop, use shared formatCurrency |
| `components/v3/invoices/ledger-table-view.tsx` | Added currencyCode prop, updated all formatCurrency calls |
| `components/v3/invoices/ledger-summary-cards.tsx` | Added currencyCode prop to component and SummaryCard |
| `components/v3/invoices/all-invoices-tab.tsx` | Removed 2 local formatCurrency functions, use shared with invoice.currency?.code |
| `components/v3/invoices/tds-tab.tsx` | Removed local formatCurrency, use shared with invoice.currency?.code |
| `components/v3/dashboard/dashboard-page.tsx` | Removed local formatCurrency, use shared utility |
| `components/master-data/profile-payment-panel.tsx` | Removed local formatCurrency, use shared with profile?.currency?.code |

**Pattern Used**:

```typescript
// Before (❌ Wrong - hardcoded)
function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(value);
}
// Usage: {formatCurrency(amount)}

// After (✅ Correct - dynamic)
import { formatCurrency } from '@/lib/utils/format';
// Usage: {formatCurrency(amount, invoice.currency?.code)}
```

---

### Code Changes Summary

#### PaymentsTab Component Chain:

```
invoice-detail-panel-v3/index.tsx
  └── currencyCode={invoice.currency?.code}
      └── PaymentsTab
          └── currencyCode prop
              └── PaymentHistoryList
                  └── formatCurrency(amount, currencyCode)
```

#### Ledger Component Chain:

```
ledger-tab.tsx
  └── currencyCode={selectedProfile.currency?.code}
      └── LedgerSummaryCards
      │   └── formatCurrency(value, currencyCode)
      └── LedgerTableView
          └── formatCurrency(entry.amount, currencyCode)
```

---

### Commits

```
1af2419 fix(currency): use dynamic currency formatting across all components
```

---

### Files Modified

| File | Lines Changed | Changes |
|------|---------------|---------|
| `types/payment.ts` | +2 | Added `pending_payment_count` to PaymentSummary |
| `app/actions/payments.ts` | +1 | Return `pending_payment_count` in response |
| `components/invoices/invoice-detail-panel-v3/index.tsx` | +2 | Combined badge count, pass currencyCode |
| `components/invoices/invoice-detail-panel-v3/tabs/payments-tab.tsx` | +5 | Added currencyCode prop |
| `components/payments/payment-history-list.tsx` | +3, -8 | Removed local formatCurrency, use shared |
| `components/panels/shared/panel-payment-card.tsx` | +4, -8 | Added currencyCode prop |
| `components/v3/invoices/ledger-table-view.tsx` | +6, -10 | Added currencyCode prop |
| `components/v3/invoices/ledger-summary-cards.tsx` | +8, -10 | Added currencyCode props |
| `components/v3/invoices/all-invoices-tab.tsx` | +1, -20 | Removed 2 local formatCurrency functions |
| `components/v3/invoices/tds-tab.tsx` | +1, -10 | Removed local formatCurrency |
| `components/v3/dashboard/dashboard-page.tsx` | +1, -10 | Removed local formatCurrency |
| `components/master-data/profile-payment-panel.tsx` | +1, -10 | Removed local formatCurrency |

---

### Quality Gates

All checks passed:
- ✅ `pnpm lint` - 0 errors
- ✅ `pnpm typecheck` - 0 errors
- ✅ `pnpm build` - Successful

---

### Lessons Learned

1. **Return ALL calculated values**: When a server action calculates a useful value (like `pendingPaymentCount`), make sure to include it in the return type and response, not just use it internally.

2. **Centralize formatting utilities**: Having multiple local `formatCurrency` functions across components leads to inconsistency. Always use the shared utility from `lib/utils/format.ts`.

3. **Currency code propagation**: When displaying currency values, always pass the currency code from the source entity (invoice, profile) down through the component chain.

---

### Testing Checklist

After these fixes, verify:
- [x] Payments tab badge shows total count (approved + pending)
- [x] Currency symbols match invoice currency (₹ for INR, $ for USD)
- [x] Ledger tab shows correct currency per profile
- [x] TDS tab shows correct currency
- [x] All Invoices tab shows correct currency
- [x] Dashboard shows correct currency
- [x] Profile Payment Panel shows correct currency
- [x] Build passes successfully

---

**Session Status**: PAYMENTS TAB BADGE + CURRENCY FIXES COMPLETE
**Sprint 14**: COMPLETE (13/13 items)
**Overall Progress**: ~99% complete toward v1.0.0
**Next Steps**: v1.0.0 release preparation, documentation review

---

## December 19, 2025 Session #2 - UI Consistency Improvements

### Changes Implemented

This session focused on visual consistency improvements to the invoice detail panel action bar and payments tab.

#### 1. Record Payment Icon Change
**File**: `components/invoices/invoice-detail-panel-v3/panel-v3-action-bar.tsx`

- **Before**: Indian Rupee icon (₹) from `IndianRupee` lucide icon
- **After**: Credit card icon (`CreditCard`) - more universal for payment action

#### 2. Filters Button Styling Change
**File**: `components/v3/invoices/all-invoices-tab.tsx`

- **Before**: Default button variant
- **After**: `variant="outline"` - consistent with Export button styling

#### 3. Filter Badge Styling
**File**: `components/v3/invoices/all-invoices-tab.tsx`

- **Before**: Various badge colors
- **After**: Muted badge styling (`bg-muted text-muted-foreground`) - less visual noise

---

### Commits

```
a49409d style(dialog): change payment review dialog to amber color scheme
c46425b refactor(invoices): approve button now opens detail panel for review
```

---

### Quality Gates

All checks passed:
- ✅ `pnpm lint` - 0 errors
- ✅ `pnpm typecheck` - 0 errors
- ✅ `pnpm build` - Successful

---

## December 20, 2025 Session - Mobile Action Bar Refinement

### Session Overview

This session focused on refining the mobile action bar layout for the All Invoices tab, addressing button sizing consistency, height alignment, and creating an optimal single-row layout for narrow mobile screens.

### Issues Addressed

1. **Initial Issue**: Mobile action bar was too crowded
2. **Secondary Issue**: Button heights were inconsistent (Export `h-9`, Filter `h-10`, New `h-9` with varying widths)
3. **Root Cause Discovery**: Using `size="sm"` gave `h-9` (36px) while Input uses `h-10` (40px) - causing visual misalignment
4. **User Request Evolution**: Started with icon-only buttons, then refined to "+ New" text for CTA visibility

### Understanding the Button System

Through investigation of `components/ui/button.tsx`, we discovered the button sizing system:

```typescript
// Button size variants in button.tsx
size: {
  default: 'h-10 px-4 py-2',   // 40px height
  sm: 'h-9 rounded-md px-3',   // 36px height
  lg: 'h-11 rounded-md px-8',  // 44px height
  icon: 'h-10 w-10',           // 40px square
},
```

**Key insight**: Input component uses `h-10` (40px), so `size="icon"` (`h-10 w-10`) matches Input height perfectly.

### Final Implementation

**File**: `components/v3/invoices/all-invoices-tab.tsx`

**Action Bar Layout**:
```
Desktop: [Search field        ] [Filters (badge)] [< Dec >] [Export] [+ New Invoice ▾]
Mobile:  [Search...    ] [🔽] [📥] [+ New]
         └─ shrinks ─┘  └── icon-only ──┘ └─ CTA ─┘
```

#### Changes Made

1. **Search Field** (Lines 964-972)
   - `flex-1 min-w-[120px] max-w-[220px] sm:max-w-[320px]`
   - Shrinks on mobile while maintaining minimum usable width
   - `w-full min-w-0` on the Input itself for proper flexbox shrinking

2. **Spacer for Desktop Only** (Line 1021)
   - `hidden sm:flex sm:flex-1` - Only shows on desktop to push buttons right
   - On mobile, removed to let elements distribute naturally

3. **Filter Button on Mobile** (Lines 977-1011)
   - `size="icon"` for consistent 40x40px square
   - Badge overlay: `absolute -top-1 -right-1`
   - `shrink-0` to prevent shrinking

4. **Export Button** (Lines 1024-1032)
   - `size={isMobile ? 'icon' : 'default'}` - icon-only on mobile
   - `shrink-0` on mobile to prevent shrinking

5. **New Invoice Button** (Lines 1037-1046)
   - `size="default"` with `px-3` padding adjustment on mobile
   - Shows "+ New" text on mobile (important CTA visibility)
   - Shows "New Invoice" with Plus icon on desktop
   - `shrink-0` to prevent shrinking

#### Final Code Pattern

```typescript
{/* Search - shrinks on mobile */}
<div className="relative flex-1 min-w-[120px] max-w-[220px] sm:max-w-[320px]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search invoices..."
    className="w-full min-w-0 pl-9 bg-background"
  />
</div>

{/* Spacer - desktop only */}
<div className="hidden sm:flex sm:flex-1" />

{/* Export - icon only on mobile */}
<Button
  variant="outline"
  size={isMobile ? 'icon' : 'default'}
  className={cn(isMobile ? 'shrink-0' : 'gap-2')}
>
  <Download className="h-4 w-4" />
  {!isMobile && <span>Export</span>}
</Button>

{/* New Invoice - "+ New" on mobile, "New Invoice" on desktop */}
<Button size="default" className={cn(isMobile ? 'px-3 shrink-0' : 'gap-2')}>
  {isMobile ? (
    <span className="font-semibold">+ New</span>
  ) : (
    <>
      <Plus className="h-4 w-4" />
      <span>New Invoice</span>
    </>
  )}
</Button>
```

### Key Learnings

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Buttons different heights | `size="sm"` = 36px, Input = 40px | Use `size="icon"` (40px) for mobile icon buttons |
| Export looked squeezed | Custom padding with wrong size | Use `size="icon"` without custom padding |
| "+ New" had unused space | `size="sm"` with text had odd padding | Use `size="default"` with `px-3` for tighter fit |
| Buttons not right-aligned on mobile | Spacer was always visible | Make spacer `hidden sm:flex` |

### Critical Pattern: Button Height Consistency

When creating action bars with mixed elements (Input + Buttons), ensure height alignment:

```typescript
// Input uses h-10 (40px) by default from input.tsx
// To match:
// - Use size="icon" (h-10 w-10 = 40px square)
// - Use size="default" (h-10 = 40px)
// - DON'T use size="sm" (h-9 = 36px) - will be shorter
```

### Commits

```
1d41916 style(mobile): compact action bar layout for invoice list
```

---

### Quality Gates

All checks passed:
- ✅ `pnpm lint` - 0 errors
- ✅ `pnpm typecheck` - 0 errors
- ✅ `pnpm build` - Successful

---

## Summary of All December 2025 Sessions

| Date | Session | Focus | Key Deliverables |
|------|---------|-------|------------------|
| Dec 18 | #1 | Sprint 14 Completion | AmountInput, Payment Types CRUD, Activities Tab, Settings Restructure |
| Dec 18 | #2 | Invoice Panel Redesign | Human-readable title, header redesign, due date in details, responsive tabs, mobile footer |
| Dec 18 | #3 | Mobile Bug Fixes | Native dropdowns, maxWidth fix, proper tab swap logic |
| Dec 19 | #1 | Payments Tab & Currency | Pending count badge, dynamic currency formatting |
| Dec 19 | #2 | UI Consistency | CreditCard icon, outline filters button, muted badge |
| Dec 20 | #1 | Mobile Action Bar | Compact layout, button height consistency, "+ New" CTA |

---

## All Commits (December 2025)

```
1d41916 style(mobile): compact action bar layout for invoice list
3e6523d style(ui): consistent payment icon and filter button styling
9a7a306 feat(ux): make invoice table rows clickable (IMP-007)
b1e4ac1 feat(vendor): case-insensitive search + clickable chevron with touch support
e626b77 fix(vendor): single-click selection on Windows + browse all vendors
a042e3b feat(ui): add sync button and green button variants
febd616 docs: comprehensive session documentation for December 19, 2025
1af2419 fix(currency): use dynamic currency formatting across all components
a49409d style(dialog): change payment review dialog to amber color scheme
c46425b refactor(invoices): approve button now opens detail panel for review
0d18078 feat(invoices): add payment review popup dialog after approval
cb005cf feat(invoices): improve approval UX with pending payment auto-navigation
eb63d77 docs: comprehensive documentation update for December 18 sessions
0caae6a fix(tabs): properly swap overflow tab with last visible tab on mobile
039a4c4 fix(panel): use maxWidth for responsive panel sizing on mobile
3af4605 fix(mobile): replace Radix UI popover with native dropdown for mobile menus
231180b fix(mobile): replace DropdownMenu with Popover for better touch support
e021e4e fix(mobile): fix dropdown menus and tab underline on mobile view
3c1f6ce feat(invoice-panel): redesign invoice detail panel with mobile responsiveness
3a63bae feat(payments): redesign Record Payment panel with improved UX
```

---

## December 22, 2025 Session - Hero Stats Card Redesign

### Overview

Redesigning the invoice detail panel hero stats cards to replace generic/redundant icons with meaningful, contextual badges that provide at-a-glance information.

### Problem Statement

Current hero cards show redundant icons (₹ rupee symbol on amount cards) that don't add information value. The payment progress bar is a separate row below the cards, not integrated into the card design.

### Design Solution

Replace generic icons with contextual badges that communicate status:

| Card | Current Icon | New Badge | Purpose |
|------|--------------|-----------|---------|
| Inv Amount | ₹ (redundant) | **(R)** or **(R̸)** | Invoice type: Recurring vs Non-recurring |
| TDS Deducted | ₹ (redundant) | **[1%]**, **[10%]** | TDS percentage at a glance |
| Total Paid | ✓ checkmark | **Circular progress ring** | Payment % with colored background |
| Remaining | ⚠ alert | **Status icon** (✓/◷/⚠) | Payment status indicator |

### Detailed Specifications

#### 1. Inv Amount Card - Invoice Type Badge
```
Recurring:      ₹48,700  (R)    ← Orange circle with R
Non-recurring:  ₹48,700  (R̸)    ← Gray R with strikethrough
```
- **Background**: Muted (default)
- **(R)**: Orange/primary colored circle
- **(R̸)**: Gray, indicates "not recurring"

#### 2. TDS Deducted Card - Percentage Badge
```
₹487  [1%]     ← Shows TDS rate
₹5,000 [10%]   ← Shows TDS rate
```
- **Background**: Muted (default)
- **Badge**: Small rounded badge showing percentage

#### 3. Total Paid Card - Circular Progress + Dynamic Background
```
Fully paid:           ₹48,213 [100%]  → GREEN bg, full ring
Partial + Overdue:    ₹22,500 [50%]   → RED bg, partial ring
Partial + Not due:    ₹22,500 [50%]   → AMBER bg, partial ring
Unpaid + Overdue:     ₹0 [0%]         → RED bg, empty ring
Unpaid + Not due:     ₹0 [0%]         → AMBER bg, empty ring
```
- **Background**: Dynamic based on payment status AND due date
- **Progress ring**: Shows payment percentage visually
- **Ring colors**: Match background (green/red/amber)

#### 4. Remaining Card - Status Icon + Muted Background
```
Fully paid:          ₹0 (✓)        → Muted bg, GREEN checkmark
Partial + Overdue:   ₹22,500 (⚠)   → Muted bg, RED alert
Partial + Not due:   ₹22,500 (◷)   → Muted bg, AMBER clock
Unpaid + Overdue:    ₹48,213 (⚠)   → Muted bg, RED alert
Unpaid + Not due:    ₹48,213 (◷)   → Muted bg, AMBER clock
```
- **Background**: Always muted
- **Icon**: CheckCircle (paid), AlertTriangle (overdue), Clock (pending)
- **Icon color**: Green/Red/Amber based on status

### Implementation Plan

#### Files to Modify:
1. **`components/panels/shared/panel-stat-group.tsx`**
   - Extend `StatItem` interface for new badge types
   - Add `badgeType`, `badgeValue`, `badgeVariant` properties
   - Create badge rendering logic

2. **`components/invoices/invoice-detail-panel-v3/panel-v3-hero.tsx`**
   - Add `isRecurring` prop
   - Add `dueDate` prop for overdue calculation
   - Build new badge configurations for each card
   - Remove separate ProgressBar component

3. **`components/invoices/invoice-detail-panel-v3/index.tsx`**
   - Pass `isRecurring` and `dueDate` to hero component

#### New Components to Create:
- Circular progress ring component (SVG-based)
- R-circle icon (can be styled div or SVG)
- R-strikethrough icon (SVG)

### Visual States Summary

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Inv Amount     │  │ TDS Deducted   │  │ Total Paid     │  │ Remaining      │
│ ₹48,700   (R)  │  │ ₹487     [1%]  │  │ ₹0      [0%]   │  │ ₹48,213   (⚠)  │
│  Recurring     │  │  TDS percent   │  │  Progress ring │  │  Status icon   │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
   muted bg           muted bg           dynamic bg           muted bg
```

### Acceptance Criteria

- [ ] Inv Amount shows (R) for recurring, (R̸) for non-recurring
- [ ] TDS Deducted shows percentage badge [X%]
- [ ] Total Paid has circular progress ring with percentage
- [ ] Total Paid background: green (paid), red (overdue), amber (pending)
- [ ] Remaining shows status icon: ✓ (paid), ⚠ (overdue), ◷ (pending)
- [ ] All quality gates pass (lint, typecheck, build)

---

**Final Session Status**: MOBILE ACTION BAR REFINEMENT COMPLETE
**Sprint 14**: COMPLETE (13/13 items)
**Overall Progress**: ~99% complete toward v1.0.0
**Current Work**: Hero Stats Card Redesign (in progress)
