# Context Restoration Prompt - PayLog Project

**Last Updated**: December 17, 2025
**Use This**: At the start of every new session

---

## Quick Start Prompt

Copy and paste this prompt to restore context:

```
I need to restore complete context for the PayLog project. Please read these files:

1. /Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_DEC25.md
2. /Users/althaf/Projects/paylog-3/docs/SPRINT_PLAN_DEC25.md

After reading, confirm you understand:
- Project status (Sprint 14+, ~97% complete)
- Recent December changes (V3 tabs, filtering, BUG-007 vendor workflow)
- Next priorities (Item #4 Amount Field UX first)
- Technical patterns (TDS calculation, panel system, permission logic)
- Quality gates (lint, typecheck, build before every commit)
- User preferences (additive approach, fix all errors, document everything)

Ready to continue?
```

---

## Project Overview

### What is PayLog?

**PayLog** is a comprehensive **expense and invoice management system** designed for businesses to track, manage, and process their recurring and one-time invoices efficiently.

### The Problem It Solves:

Businesses often struggle with:
- Tracking multiple recurring invoices from different vendors
- Managing TDS (Tax Deducted at Source) calculations accurately
- Keeping track of payment statuses across numerous invoices
- Coordinating invoice approvals between team members
- Maintaining a clear audit trail of all financial activities

### Target Users:

1. **Finance Teams** - Track invoices, record payments, generate TDS reports
2. **Admins** - Approve invoices, manage vendors, oversee master data
3. **Standard Users** - Create invoices, submit for approval, view their requests

### Business Workflow:

```
1. User creates invoice → Status: "pending_approval"
2. Admin reviews → Approves/Rejects/Puts on Hold
3. If approved → Status: "unpaid" (ready for payment)
4. User/Admin records payment → Status: "partial" or "paid"
5. System tracks TDS, generates ledger, sends notifications
```

### Key Concepts:

| Concept | Description |
|---------|-------------|
| **Recurring Invoices** | Linked to an "Invoice Profile" (e.g., monthly rent). Profile defines vendor, frequency, TDS settings. |
| **Non-Recurring Invoices** | One-time invoices with a custom "invoice name" (e.g., "Office Supplies - Dec 2025"). |
| **Invoice Profiles** | Templates for recurring invoices. Contains vendor, billing frequency, TDS percentage. |
| **TDS (Tax Deducted at Source)** | Indian tax concept. Payer deducts tax before paying vendor. PayLog calculates TDS amount. |
| **Ledger** | Transaction history per invoice profile showing invoices, payments, and running balance. |
| **Master Data** | Vendors, Categories, Payment Types, Entities - all require admin approval for new entries. |

### Example Use Case:

> **Scenario**: Company pays monthly rent of ₹50,000 to ABC Properties with 10% TDS.
>
> 1. Admin creates "Invoice Profile" for ABC Properties rent
> 2. Each month, user creates new invoice under this profile
> 3. System calculates: Invoice ₹50,000, TDS ₹5,000, Payable ₹45,000
> 4. Admin approves, user records payment of ₹45,000
> 5. TDS tab shows ₹5,000 to be deposited with government
> 6. Ledger shows complete history of rent payments

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, React 18 |
| **UI Components** | shadcn/ui, Tailwind CSS, Framer Motion |
| **Database** | PostgreSQL (hosted on Railway) |
| **ORM** | Prisma |
| **Authentication** | NextAuth.js with credentials provider |
| **File Storage** | SharePoint/OneDrive via Microsoft Graph API |
| **Deployment** | Railway (auto-deploy from main branch) |
| **State Management** | React Query (TanStack Query) for server state |
| **Forms** | React Hook Form + Zod validation |

### Architecture Highlights:

- **Server Actions**: Next.js 14 server actions for all mutations
- **Side Panels**: Slide-in panels for details/forms (not modal dialogs)
- **RBAC**: Role-based access control (super_admin, admin, user)
- **Real-time**: React Query handles cache invalidation and refetching

---

## Key Features

### Invoice Management:
- **Recurring Invoices**: Linked to profiles, auto-calculated next due dates
- **Non-Recurring Invoices**: One-time with custom naming
- **Tabbed Views**: All Invoices, Recurring Cards, TDS Summary, Ledger
- **Comprehensive Filtering**: Status, vendor, category, date range, TDS, archived
- **Archive/Delete**: Soft delete with archive, hard delete for super_admin

### Payment Tracking:
- **Record Payments**: Track partial and full payments
- **TDS Calculation**: Automatic with round-up preference
- **Remaining Balance**: Shows what's still owed after TDS deduction
- **Payment Pending Status**: Special status for pending payment requests

### Vendor Management:
- **Approval Workflow**: New vendors require admin approval
- **BUG-007 Fix**: Two-step dialog when approving invoice with pending vendor
- **Vendor Details**: Name, address, bank details, GST exemption

### Admin Features:
- **Master Data Management**: Vendors, categories, payment types, entities
- **Approval Queue**: Pending invoices, vendors, archive requests
- **User Management**: Create/edit users, reset passwords

### Reporting:
- **TDS Tab**: Monthly TDS summary with export to Excel
- **Ledger Tab**: Per-profile transaction history with running balance
- **Export**: Excel export for all invoice views

---

## Project Structure

### Directory Layout:
```
paylog-3/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── invoices/        # Invoice management
│   │   ├── settings/        # User settings
│   │   └── admin/           # Admin-only pages
│   ├── api/                 # API routes
│   └── actions/             # Server Actions
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── v3/                  # V3 invoice components
│   ├── invoices/            # Invoice-specific components
│   ├── invoices-v2/         # V2 invoice forms
│   ├── master-data/         # Admin master data components
│   └── panels/              # Side panel system
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and configurations
│   ├── utils/               # Helper functions
│   ├── validations/         # Zod schemas
│   └── stores/              # Zustand stores
├── types/                   # TypeScript type definitions
├── schema.prisma            # Database schema (root level)
└── docs/                    # Project documentation
```

### Package Versions (Critical):
```json
{
  "next": "^14.2.35",
  "react": "^18.3.1",
  "typescript": "^5",
  "@prisma/client": "^5.20.0",
  "next-auth": "5.0.0-beta.30",
  "@tanstack/react-query": "^5.56.2",
  "react-hook-form": "^7.64.0",
  "zod": "^3.23.8",
  "zustand": "^4.5.5",
  "framer-motion": "^11.9.0"
}
```

---

## Database Schema (Complete - 16 Models)

### All Models Overview:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts | email, full_name, role, is_active |
| **InvoiceProfile** | Recurring invoice templates | name, vendor_id, tds_applicable, billing_frequency |
| **Invoice** | Invoice records | invoice_number, amount, status, is_recurring, tds_rounded |
| **Vendor** | Vendor/supplier info | name, status, address, bank_details, gst_exemption |
| **Category** | Invoice categories | name, description, is_active |
| **PaymentType** | Payment methods | name, requires_reference |
| **Payment** | Payment records | invoice_id, amount_paid, payment_date, status |
| **Currency** | Currency definitions | code, name, symbol |
| **Entity** | Business entities | name, address, country |
| **MasterDataRequest** | Approval workflow | entity_type, status, request_data |
| **InvoiceAttachment** | File attachments | file_name, storage_path, mime_type |
| **InvoiceComment** | Invoice comments | content, user_id, is_edited |
| **ActivityLog** | Audit trail | action, old_data, new_data |
| **UserAuditLog** | User change audit | event_type, target_user_id |
| **Notification** | User notifications | type, title, message, is_read |
| **UserProfileVisibility** | Profile access control | user_id, profile_id |
| **SchemaMigration** | Migration tracking | migration_name, applied_at |

### Core Models (Detailed):

```prisma
model User {
  id                  Int      @id @default(autoincrement())
  email               String   @unique
  full_name           String
  password_hash       String
  role                String   @default("standard_user")  // super_admin | admin | standard_user
  is_active           Boolean  @default(true)
  display_name        String?
  display_picture_url String?
  initials            String?
  // 20+ relations to other models
}

model InvoiceProfile {
  id                      Int      @id
  name                    String                // e.g., "ABC Properties - Rent"
  description             String?
  vendor_id               Int
  category_id             Int
  entity_id               Int
  currency_id             Int
  visible_to_all          Boolean  @default(true)
  prepaid_postpaid        String?               // "prepaid" | "postpaid"
  tds_applicable          Boolean  @default(false)
  tds_percentage          Float?
  billing_frequency       String?               // e.g., "30 days", "1 month"
  billing_frequency_unit  String?               // "day" | "month" | "year"
  billing_frequency_value Int?
  // Relations: vendor, category, entity, currency, recurring_invoices, visibilities
}

model Invoice {
  id                    Int       @id
  invoice_number        String               // e.g., "INV-2025-0001"
  vendor_id             Int
  category_id           Int?
  entity_id             Int?
  currency_id           Int?
  invoice_amount        Float
  invoice_date          DateTime?
  invoice_received_date DateTime?
  due_date              DateTime?
  period_start          DateTime?
  period_end            DateTime?
  description           String?
  notes                 String?

  // Status & Workflow
  status                String    @default("pending_approval")
  submission_count      Int       @default(1)
  last_submission_at    DateTime

  // TDS Fields
  tds_applicable        Boolean   @default(false)
  tds_percentage        Float?
  tds_rounded           Boolean   @default(false)  // BUG-003 fix - round up TDS

  // Invoice Type
  is_recurring          Boolean   @default(false)
  invoice_profile_id    Int?                       // Links to profile for recurring
  invoice_name          String?                    // For non-recurring: custom name

  // Hold/Reject
  hold_reason           String?
  hold_by               Int?
  hold_at               DateTime?
  rejection_reason      String?
  rejected_by           Int?
  rejected_at           DateTime?

  // Archive
  is_archived           Boolean   @default(false)
  archived_by           Int?
  archived_at           DateTime?
  archived_reason       String?

  // Pending Payment (stored during creation, processed on approval)
  pending_payment_data  Json?

  created_by            Int
  // Relations: vendor, category, entity, currency, creator, payments, attachments, comments, activity_logs
}

model Vendor {
  id                  Int       @id
  name                String
  address             String?
  bank_details        String?
  gst_exemption       Boolean   @default(false)
  is_active           Boolean   @default(true)

  // Approval Workflow (BUG-007)
  status              String    @default("PENDING_APPROVAL")  // Changed from APPROVED
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejected_reason     String?
  deleted_at          DateTime?  // Soft delete
  // Relations: created_by, approved_by, invoice_profiles, invoices
}

model Payment {
  id                  Int       @id
  invoice_id          Int
  payment_type_id     Int?
  amount_paid         Float
  payment_date        DateTime
  payment_reference   String?                // Transaction reference
  status              String    @default("pending")

  // TDS at Payment
  tds_amount_applied  Float?    // Actual TDS deducted
  tds_rounded         Boolean   @default(false)

  // Approval Workflow
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejection_reason    String?
  // Relations: invoice, payment_type, created_by, approved_by
}

model Notification {
  id             Int       @id
  user_id        Int
  type           String    // invoice_pending, invoice_approved, vendor_approved, etc.
  title          String
  message        String
  link           String?   // Navigation URL
  reference_type String?   // invoice, vendor, master_data_request
  reference_id   Int?
  is_read        Boolean   @default(false)
  read_at        DateTime?
  created_at     DateTime  @default(now())
}
```

### Status Values:

**Invoice Statuses**:
- `pending_approval` - Awaiting admin approval
- `unpaid` - Approved, no payment recorded
- `partial` - Some payment recorded
- `paid` - Fully paid
- `overdue` - Past due date
- `on_hold` - Paused by admin
- `rejected` - Declined by admin

**Vendor Statuses**:
- `PENDING_APPROVAL` - New vendor awaiting approval
- `APPROVED` - Active vendor
- `REJECTED` - Rejected vendor

**Payment Statuses**:
- `pending` - Awaiting approval
- `approved` - Payment confirmed
- `rejected` - Payment declined

**MasterDataRequest Statuses**:
- `draft` - Being prepared
- `pending_review` - Awaiting admin review
- `approved` - Request approved
- `rejected` - Request rejected
- `resubmitted` - Revised and resubmitted

### Database Indexes:

Key indexes for performance:
- `idx_invoices_status` - Quick status filtering
- `idx_invoices_archived` - Archive queries
- `idx_invoices_recurring` - Recurring invoice queries
- `idx_vendors_status` - Vendor approval queries
- `idx_notifications_user_unread` - Unread notification counts
- `idx_payments_invoice` - Payment lookups by invoice

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# SharePoint/OneDrive Storage
AZURE_TENANT_ID="..."
AZURE_CLIENT_ID="..."
AZURE_CLIENT_SECRET="..."
SHAREPOINT_SITE_ID="..."
SHAREPOINT_DRIVE_ID="..."

# Email (Resend)
RESEND_API_KEY="..."
```

---

## Current State (December 2025)

### Sprint 14+ Progress:
- **Completed**: 7/13 items (54%)
- **Overall**: ~97% toward v1.0.0

### Major December Accomplishments:
1. V3 Invoice Tabs (Recurring, All, TDS, Ledger)
2. Comprehensive filtering system
3. BUG-007 vendor approval workflow (two-step dialog)
4. V3 sidepanel standardization
5. Reusable ConfirmationDialog components
6. Ledger tab implementation
7. Archive/delete functionality
8. SharePoint storage integration
9. Security upgrades (Next.js 14.2.35)
10. 80+ commits in December alone

### Remaining Items:
| Priority | Item | Description | Effort |
|----------|------|-------------|--------|
| 1 | #4 | Amount Field UX | 2-3h |
| 2 | #6 | Payment Types CRUD | 4-5h |
| 3 | #7 | Billing Frequency | 3-5h |
| 4 | #5 | Panel Styling | 1-2h |
| 5 | #8 | Activities Tab | 4-5h |
| 6 | #9 | Settings Restructure | 3-4h |
| 7 | #13 | Invoice Toggle | 4-5h |

---

## Critical Technical Patterns

### 1. TDS Calculation
```typescript
import { calculateTds } from '@/lib/utils/tds';

const { tdsAmount, payableAmount } = calculateTds(
  invoiceAmount,
  tdsPercentage,
  invoice.tds_rounded ?? false  // Use invoice's preference
);
```

### 2. Panel Opening
```typescript
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';

const { openPanel } = usePanel();
openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
```

### 3. Permission Logic
```typescript
const isPendingApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
const canRecordPayment = !isPendingApproval &&
  invoice.status !== INVOICE_STATUS.PAID;
const canApproveReject = isAdmin && isPendingApproval;
```

### 4. Form Pre-filling (NOT defaultValues)
```typescript
useEffect(() => {
  if (data) {
    setValue('invoice_profile_id', data.invoice_profile_id);
    setValue('amount', data.invoice_amount);
  }
}, [data, setValue]);
```

### 5. Zod Custom Validators
```typescript
// WRONG - Rejects null/undefined
z.custom<File>().nullable().optional()

// CORRECT - Explicitly allows null/undefined
z.custom<File>((val) => {
  return val === null || val === undefined || val instanceof File;
}).nullable().optional()
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

### Invoices Page (4 Tabs):

```typescript
// components/v3/invoices/invoices-page.tsx
export type InvoiceTab = 'recurring' | 'all' | 'tds' | 'ledger';
```

| Tab | Component | Description | Features |
|-----|-----------|-------------|----------|
| **All Invoices** | `all-invoices-tab.tsx` | Full invoice table | Filtering, sorting, export, CRUD |
| **Ledger** | `ledger-tab.tsx` | Per-profile transaction history | Profile selector, summary cards, running balance |
| **TDS** | `tds-tab.tsx` | TDS-applicable invoices | Month navigation, TDS totals, Excel export |
| **Recurring** | (in invoices-page.tsx) | Profile cards with stats | Invoice count, pending, overdue per profile |

**Tab Navigation**: `components/v3/invoices/invoice-tabs.tsx`
- Desktop: Horizontal tab bar
- Mobile: Dropdown selector
- URL state: `?tab=all`, `?tab=recurring`, `?tab=tds`, `?tab=ledger`

### Admin Page (3 Tabs):

```typescript
// components/v3/admin/admin-page.tsx
export type AdminTab = 'approvals' | 'master-data' | 'users';
```

| Tab | Access | Description |
|-----|--------|-------------|
| **Approvals** | admin+ | Pending invoices, vendors, archive requests |
| **Master Data** | admin+ | 6 sub-tabs: Vendors, Categories, Entities, Payment Types, Currencies, Profiles |
| **Users** | super_admin only | User management, password reset |

### Settings Page (3 Tabs):

```typescript
// components/v3/settings/settings-page.tsx
export type SettingsTab = 'profile' | 'security' | 'activities';
```

| Tab | Description |
|-----|-------------|
| **Profile** | Display name, picture, initials |
| **Security** | Password change, email settings |
| **Activities** | User activity history |

---

## Key File Locations

### Invoice System (V3):
- Main page: `components/v3/invoices/invoices-page.tsx` (534 lines)
- Tab navigation: `components/v3/invoices/invoice-tabs.tsx` (291 lines)
- All Invoices: `components/v3/invoices/all-invoices-tab.tsx` (1849 lines - largest component)
- TDS Tab: `components/v3/invoices/tds-tab.tsx` (453 lines)
- Ledger Tab: `components/v3/invoices/ledger-tab.tsx` (261 lines)
- Ledger Summary: `components/v3/invoices/ledger-summary-cards.tsx`
- Ledger Table: `components/v3/invoices/ledger-table-view.tsx`
- Recurring Card: `components/v3/invoices/recurring-card.tsx`
- Month Navigator: `components/v3/invoices/month-navigator.tsx`
- Filters: `components/v3/invoices/invoice-filter-popover.tsx`, `invoice-filter-sheet.tsx`

### Admin System (V3):
- Main page: `components/v3/admin/admin-page.tsx` (165 lines)
- Tab navigation: `components/v3/admin/admin-tabs.tsx`
- Master Data: `components/master-data/` (vendor-list, category-list, etc.)

### Settings System (V3):
- Main page: `components/v3/settings/settings-page.tsx` (76 lines)

### Panel System:
- V3 Detail Panel: `components/invoices/invoice-detail-panel-v3/` (modular)
  - `index.tsx` - Main panel container
  - `panel-header.tsx` - Header with invoice info
  - `panel-hero.tsx` - Amount display with TDS
  - `panel-action-bar.tsx` - Action buttons (permission-based)
  - `panel-tabs/` - Details, Payments, Attachments, Activity tabs
- Panel Provider: `components/panels/panel-provider.tsx`
- Panel Types: `types/panel.ts` (PANEL_WIDTH constants)

### Server Actions:
- Invoices: `app/actions/invoices-v2.ts`
- Payments: `app/actions/payments.ts`
- Master Data: `app/actions/admin/master-data-approval.ts`
- Vendors: `app/actions/admin/vendors.ts`

### Hooks:
- Invoices: `hooks/use-invoices.ts`, `hooks/use-invoices-v2.ts`
- Ledger: `hooks/use-ledger.ts`
- Panels: `hooks/use-panel.ts`
- Notifications: `hooks/use-notifications.ts`

### Utilities:
- TDS: `lib/utils/tds.ts` (calculateTds function)
- Format: `lib/utils/format.ts` (currency, date formatting)
- Constants: `lib/constants/invoice.ts` (INVOICE_STATUS enum)

### UI Components:
- Confirmation Dialog: `components/ui/confirmation-dialog.tsx` (605 lines)
- Alert Dialog: `components/ui/alert-dialog.tsx`
- Button: `components/ui/button.tsx` (with subtle variant)

---

## User Preferences (MANDATORY)

1. **Additive Approach**
   > "Always take an additive approach. Don't delete anything that you don't understand."

2. **Quality Gates**
   > Run lint, typecheck, build before EVERY commit

3. **Fix All Errors**
   > "We are all on the same team. Fix all pre-existing and existing errors."

4. **Document Everything**
   > Comprehensive documentation for future sessions

---

## Development Commands

### Core Commands:
```bash
# Start dev server
pnpm dev                    # http://localhost:3000

# Quality gates (run before EVERY commit)
pnpm lint                   # ESLint check
pnpm typecheck              # TypeScript check (tsc --noEmit)
pnpm build                  # Production build

# Testing
pnpm test                   # Run Jest tests
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage report
```

### Database Commands:
```bash
pnpm prisma studio          # Open Prisma Studio GUI
pnpm prisma migrate dev     # Create and apply migrations
pnpm prisma db push         # Push schema changes (no migration)
pnpm prisma generate        # Regenerate Prisma Client
pnpm db:seed                # Run seed script
```

### User Management Scripts:
```bash
pnpm user:create            # Create new user
pnpm user:reset-password    # Reset user password
pnpm user:verify            # Verify user exists
```

### Git Workflow:
```bash
git add .
git commit -m "type(scope): message"  # Conventional commits
git push                              # Auto-deploys to Railway

# Commit types: feat, fix, chore, refactor, docs, style, test
```

### Pre-Commit Checklist:
1. `pnpm lint` - No ESLint errors
2. `pnpm typecheck` - No TypeScript errors
3. `pnpm build` - Build succeeds
4. Test manually if UI changes
5. Write clear commit message

---

## Common Issues & Solutions

### Issue: Form shows invalid on mount
**Cause**: Invalid defaultValues failing validation
**Fix**: Remove defaultValues, use useEffect + setValue

### Issue: File upload validation fails
**Cause**: z.custom runs before .nullable().optional()
**Fix**: Explicit check for null/undefined in validator

### Issue: "Not a recurring invoice" error
**Cause**: Wrong field name (profile_id vs invoice_profile_id)
**Fix**: Check schema.prisma for exact field names

### Issue: TDS amount inconsistent
**Cause**: Not using invoice's tds_rounded preference
**Fix**: Pass tds_rounded to calculateTds()

---

## Quick Reference

### Invoice Statuses:
- `pending_approval` - Awaiting admin action
- `unpaid` - Approved, no payment
- `partial` - Partially paid
- `paid` - Fully paid
- `overdue` - Past due date
- `on_hold` - Paused
- `rejected` - Declined

### Panel Widths:
- `PANEL_WIDTH.SMALL` - 400px
- `PANEL_WIDTH.MEDIUM` - 600px
- `PANEL_WIDTH.LARGE` - 800px

### Roles:
- `super_admin` - Full access + delete
- `admin` - Management access
- `user` - Standard access

---

## Next Session Start

**Start with**: Item #4 (Amount Field UX)
- Create AmountInput component
- Replace in all invoice forms
- Test focus/blur/submission

**Estimated Time**: 2-3 hours
**Impact**: Quick UX win affecting all forms

---

## Documentation Files

| File | Purpose |
|------|---------|
| `docs/SESSION_SUMMARY_DEC25.md` | December changes |
| `docs/SPRINT_PLAN_DEC25.md` | Sprint priorities |
| `docs/CONTEXT_RESTORATION_PROMPT.md` | This file |
| `CONTEXT_RESTORATION_GUIDE.md` | Quick reference |
| `docs/SPRINT_14_STATUS_UPDATED.md` | Sprint 14 details |

---

## If Context Gets Lost Mid-Session

```
Please re-read: /Users/althaf/Projects/paylog-3/docs/CONTEXT_RESTORATION_PROMPT.md

Key reminders:
- Current priority: Item #4 (Amount Field UX)
- Quality gates: lint, typecheck, build before commit
- Additive approach: don't delete what you don't understand
- TDS: use invoice.tds_rounded preference
- Forms: useEffect + setValue, not defaultValues
```

---

**Ready to Code!**

Everything documented. Context restorable instantly.
Start with the Quick Start Prompt above.
