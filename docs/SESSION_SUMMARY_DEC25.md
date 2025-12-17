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
