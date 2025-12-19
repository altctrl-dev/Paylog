# PayLog - Complete Project Handoff Guide

**Document Version**: 1.2
**Last Updated**: December 19, 2025
**Prepared For**: New Development Team Onboarding

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Business Domain & Concepts](#business-domain--concepts)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [Application Structure](#application-structure)
7. [Key Features & Implementation](#key-features--implementation)
8. [Current Progress & Status](#current-progress--status)
9. [Outstanding Work & Roadmap](#outstanding-work--roadmap)
10. [Known Issues & Technical Debt](#known-issues--technical-debt)
11. [Critical Patterns & Conventions](#critical-patterns--conventions)
12. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
13. [Development Workflow](#development-workflow)
14. [Environment Setup](#environment-setup)
15. [Testing Strategy](#testing-strategy)
16. [Deployment & Infrastructure](#deployment--infrastructure)
17. [Security Considerations](#security-considerations)
18. [Performance Considerations](#performance-considerations)
19. [User Roles & Permissions](#user-roles--permissions)
20. [API & Server Actions Reference](#api--server-actions-reference)
21. [UI Component Library](#ui-component-library)
22. [Appendix: File Reference](#appendix-file-reference)

---

## Executive Summary

### What is PayLog?

PayLog is a **comprehensive expense and invoice management system** designed for businesses to track, manage, and process financial documents. It handles:

- **Recurring invoices** (rent, subscriptions, retainers)
- **One-time expenses** with custom naming
- **TDS (Tax Deducted at Source)** calculations for Indian tax compliance
- **Vendor management** with approval workflows
- **Payment tracking** with partial payment support
- **Multi-entity support** for businesses with multiple locations/divisions

### Current State

| Metric | Value |
|--------|-------|
| **Overall Progress** | ~99% toward v1.0.0 |
| **Sprint** | Sprint 14+ (COMPLETE) |
| **December 2025 Commits** | 85+ |
| **Remaining Work** | Final polish & testing |

### Key Achievements (December 2025)

- ✅ V3 Invoice Tabs System (All, Ledger, TDS, Recurring)
- ✅ Comprehensive filtering and sorting
- ✅ BUG-007 Vendor approval workflow
- ✅ SharePoint storage integration
- ✅ Notification system
- ✅ Archive/Delete functionality
- ✅ Security upgrades (Next.js 14.2.35)
- ✅ Smart AmountInput component (fixes "01500" bug)
- ✅ Payment Types CRUD (full admin management)
- ✅ Billing Frequency (dual input: value + unit)
- ✅ Settings Restructure (Profile, Security, Activities tabs)
- ✅ Standalone Activities Tab with filtering & pagination
- ✅ Payment Panel Redesign (hero stats, progress bar, TDS toggle)
- ✅ Invoice Detail Panel Redesign (responsive mobile, action bar in footer)
- ✅ useMediaQuery hook for responsive breakpoints
- ✅ Tab overflow menu for mobile screens
- ✅ Native mobile dropdowns (replacing Radix UI for touch compatibility)
- ✅ Panel responsive width (maxWidth instead of fixed width)
- ✅ Payments tab badge fix (shows pending + approved count)
- ✅ Dynamic currency formatting (uses invoice's currency code)

---

## Project Overview

### Problem Statement

Businesses face challenges with:

1. **Invoice Tracking**: Multiple recurring invoices from various vendors
2. **TDS Compliance**: Calculating and tracking tax deductions accurately
3. **Payment Management**: Tracking partial payments and outstanding balances
4. **Approval Workflows**: Coordinating invoice approvals between team members
5. **Audit Trail**: Maintaining clear records of all financial activities

### Solution

PayLog provides a centralized platform where:

- Finance teams can create, track, and manage invoices
- Admins can approve invoices and manage master data
- Users can view their submissions and track statuses
- The system automatically calculates TDS and tracks payments
- All activities are logged for audit purposes

### Target Users

| Role | Permissions | Use Cases |
|------|-------------|-----------|
| **Super Admin** | Full access | System configuration, permanent deletion, user management |
| **Admin** | Management access | Approve invoices/vendors, manage master data |
| **Standard User** | Basic access | Create invoices, record payments, view own data |

---

## Business Domain & Concepts

### Core Concepts

#### 1. Invoice Profiles (Recurring Invoice Templates)

An Invoice Profile is a **template** for recurring invoices. It defines:
- **Vendor**: Who you're paying
- **Category**: Type of expense (Rent, Utilities, etc.)
- **Entity**: Which business unit is paying
- **TDS Settings**: Whether TDS applies and at what percentage
- **Billing Frequency**: How often invoices are created (30 days, monthly, etc.)

**Example**: "ABC Properties - Office Rent" profile with:
- Vendor: ABC Properties
- TDS: 10%
- Frequency: Monthly

#### 2. Recurring vs Non-Recurring Invoices

| Type | Has Profile | Naming | Use Case |
|------|-------------|--------|----------|
| **Recurring** | Yes (`invoice_profile_id`) | Auto from profile name | Monthly rent, subscriptions |
| **Non-Recurring** | No | Custom `invoice_name` | One-time purchases, ad-hoc expenses |

#### 3. TDS (Tax Deducted at Source)

TDS is an Indian tax requirement where the **payer deducts tax** before paying the vendor.

**Example Calculation**:
```
Invoice Amount: ₹50,000
TDS Rate: 10%
TDS Amount: ₹5,000
Payable to Vendor: ₹45,000
TDS to Government: ₹5,000
```

**Important**: The `tds_rounded` field determines if TDS is rounded up (ceiling) or calculated exactly.

#### 4. Invoice Statuses

```
┌─────────────────┐
│ pending_approval│ ← New invoice created
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌────────┐ ┌─────────┐
│unpaid │ │on_hold │ │rejected │
└───┬───┘ └────────┘ └─────────┘
    │
    ▼ (payment recorded)
┌───────┐
│partial│ ← Some payment made
└───┬───┘
    │
    ▼ (full payment)
┌──────┐
│ paid │ ← Fully paid
└──────┘
```

#### 5. Ledger

The ledger shows **transaction history per invoice profile**:
- All invoices created under a profile
- All payments made
- Running balance (outstanding amount)
- TDS deducted

#### 6. Master Data

Master data requires **admin approval** for new entries:
- **Vendors**: Companies you pay
- **Categories**: Expense types
- **Entities**: Business units/locations
- **Payment Types**: How payments are made (Bank Transfer, Cash, etc.)
- **Currencies**: Supported currencies

---

## Technical Architecture

### Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js (App Router) | 14.2.35 | Full-stack React framework |
| **Language** | TypeScript | ^5 | Type safety |
| **UI Library** | React | 18.3.1 | Component library |
| **UI Components** | shadcn/ui + Radix | Latest | Accessible UI primitives |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS |
| **Database** | PostgreSQL | - | Relational database |
| **ORM** | Prisma | 5.20.0 | Database access |
| **Auth** | NextAuth.js | 5.0.0-beta.30 | Authentication |
| **Server State** | React Query | 5.56.2 | Data fetching/caching |
| **Client State** | Zustand | 4.5.5 | Global state (panels, etc.) |
| **Forms** | React Hook Form + Zod | 7.64.0 / 3.23.8 | Form handling + validation |
| **Animations** | Framer Motion | 11.9.0 | UI animations |
| **File Storage** | SharePoint | MS Graph API | Invoice attachments |
| **Email** | Resend | 4.8.0 | Email notifications |
| **Hosting** | Railway | - | PostgreSQL + Deployment |

### Architecture Decisions

#### 1. Server Actions over API Routes

**Decision**: Use Next.js 14 Server Actions for all mutations instead of traditional API routes.

**Why**:
- Type-safe end-to-end
- Simpler code organization
- Built-in error handling
- No need for separate API layer

**Implementation**:
```typescript
// app/actions/invoices-v2.ts
'use server';

export async function createInvoice(data: InvoiceFormData) {
  // Direct database access, no API route needed
  const invoice = await prisma.invoice.create({ ... });
  return { success: true, data: invoice };
}
```

#### 2. Side Panels over Modals

**Decision**: Use slide-in side panels for forms and detail views instead of modal dialogs.

**Why**:
- Better UX for complex forms
- User can see context (list) while editing
- Consistent navigation pattern
- Better mobile experience

**Implementation**:
```typescript
// Opening a panel
const { openPanel } = usePanel();
openPanel('invoice-v3-detail', { invoiceId: 123 }, { width: PANEL_WIDTH.LARGE });
```

#### 3. URL-Based Filter State

**Decision**: Store filter state in URL search params.

**Why**:
- Shareable filtered views
- Browser back/forward works
- Bookmarkable
- Survives page refresh

**Implementation**:
```typescript
// ?tab=all&status=unpaid&vendor=5
const searchParams = useSearchParams();
const status = searchParams.get('status');
```

#### 4. React Query for Server State

**Decision**: Use React Query (TanStack Query) for all data fetching.

**Why**:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading/error states

**Implementation**:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['invoices', filters],
  queryFn: () => fetchInvoices(filters),
});
```

### Directory Structure

```
paylog-3/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── invoices/page.tsx     # Invoices page
│   │   ├── admin/page.tsx        # Admin console
│   │   └── settings/page.tsx     # User settings
│   ├── api/                      # API routes (minimal usage)
│   │   └── auth/                 # NextAuth routes
│   └── actions/                  # Server Actions
│       ├── invoices-v2.ts        # Invoice CRUD
│       ├── payments.ts           # Payment operations
│       └── admin/                # Admin actions
│           ├── master-data-approval.ts
│           └── vendors.ts
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── confirmation-dialog.tsx  # Custom dialog system
│   │   └── ...
│   ├── v3/                       # V3 page components
│   │   ├── invoices/             # Invoice tab components
│   │   ├── admin/                # Admin page components
│   │   └── settings/             # Settings page components
│   ├── invoices/                 # Invoice-specific components
│   │   ├── invoice-detail-panel-v3/  # Detail panel
│   │   └── filters/              # Filter components
│   ├── invoices-v2/              # Invoice forms
│   │   ├── non-recurring-invoice-form.tsx
│   │   ├── recurring-invoice-form.tsx
│   │   └── edit-*.tsx
│   ├── master-data/              # Admin master data components
│   ├── panels/                   # Panel system
│   └── layout/                   # Layout components
│
├── hooks/                        # Custom React hooks
│   ├── use-invoices.ts
│   ├── use-invoices-v2.ts
│   ├── use-ledger.ts
│   ├── use-panel.ts
│   ├── use-media-query.ts        # Responsive breakpoint hooks
│   └── use-notifications.ts
│
├── lib/                          # Utilities and configurations
│   ├── utils/
│   │   ├── tds.ts                # TDS calculation
│   │   └── format.ts             # Formatting utilities
│   ├── validations/              # Zod schemas
│   │   ├── invoice-v2.ts
│   │   └── payment.ts
│   ├── stores/                   # Zustand stores
│   └── constants/
│       └── invoice.ts            # INVOICE_STATUS enum
│
├── types/                        # TypeScript types
│   ├── invoice.ts
│   ├── panel.ts                  # Panel width constants
│   └── ledger.ts
│
├── schema.prisma                 # Database schema (root level)
├── docs/                         # Documentation
└── prisma/
    ├── migrations/               # Database migrations
    └── seed.ts                   # Seed data
```

---

## Database Schema

### Complete Model Overview (16 Models)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORE MODELS                               │
├─────────────────────────────────────────────────────────────────┤
│  User ─────────────────────────────────────────────────────────►│
│    │                                                             │
│    ├── Invoice (created_by, hold_by, archived_by, rejected_by)  │
│    ├── Payment (created_by_user_id, approved_by_user_id)        │
│    ├── Vendor (created_by_user_id, approved_by_user_id)         │
│    ├── MasterDataRequest (requester_id, reviewer_id)            │
│    ├── Notification (user_id)                                   │
│    ├── ActivityLog (user_id)                                    │
│    └── UserAuditLog (target_user_id, actor_user_id)             │
├─────────────────────────────────────────────────────────────────┤
│  InvoiceProfile ────────────────────────────────────────────────►│
│    │                                                             │
│    ├── Vendor (vendor_id)                                       │
│    ├── Category (category_id)                                   │
│    ├── Entity (entity_id)                                       │
│    ├── Currency (currency_id)                                   │
│    └── Invoice (invoice_profile_id) [recurring invoices]        │
├─────────────────────────────────────────────────────────────────┤
│  Invoice ───────────────────────────────────────────────────────►│
│    │                                                             │
│    ├── Payment (invoice_id) [one-to-many]                       │
│    ├── InvoiceAttachment (invoice_id)                           │
│    ├── InvoiceComment (invoice_id)                              │
│    └── ActivityLog (invoice_id)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Model Details

#### User
```prisma
model User {
  id                  Int      @id @default(autoincrement())
  email               String   @unique
  full_name           String
  password_hash       String
  role                String   @default("standard_user")
  // Roles: "super_admin" | "admin" | "standard_user"
  is_active           Boolean  @default(true)
  display_name        String?
  display_picture_url String?
  initials            String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  // 20+ relations to other models
}
```

#### InvoiceProfile
```prisma
model InvoiceProfile {
  id                      Int      @id @default(autoincrement())
  name                    String   // "ABC Properties - Rent"
  description             String?
  vendor_id               Int
  category_id             Int
  entity_id               Int
  currency_id             Int
  visible_to_all          Boolean  @default(true)
  prepaid_postpaid        String?  // "prepaid" | "postpaid"

  // TDS Settings
  tds_applicable          Boolean  @default(false)
  tds_percentage          Float?

  // Billing Frequency (needs Sprint 14 Item #7)
  billing_frequency       String?  // "30 days", "1 month" (LEGACY)
  billing_frequency_unit  String?  // "day" | "month" | "year" (NEW)
  billing_frequency_value Int?     // Numeric value (NEW)

  // Relations
  vendor                  Vendor   @relation(...)
  category                Category @relation(...)
  entity                  Entity   @relation(...)
  currency                Currency @relation(...)
  recurring_invoices      Invoice[] @relation("InvoiceProfileToInvoice")
}
```

#### Invoice
```prisma
model Invoice {
  id                    Int       @id @default(autoincrement())
  invoice_number        String    // "INV-2025-0001"
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
  last_submission_at    DateTime  @default(now())

  // TDS Fields
  tds_applicable        Boolean   @default(false)
  tds_percentage        Float?
  tds_rounded           Boolean   @default(false)  // BUG-003 fix

  // Invoice Type
  is_recurring          Boolean   @default(false)
  invoice_profile_id    Int?      // NULL for non-recurring
  invoice_name          String?   // For non-recurring invoices

  // Hold/Reject Fields
  hold_reason           String?
  hold_by               Int?
  hold_at               DateTime?
  rejection_reason      String?
  rejected_by           Int?
  rejected_at           DateTime?

  // Archive Fields
  is_archived           Boolean   @default(false)
  archived_by           Int?
  archived_at           DateTime?
  archived_reason       String?

  // Pending Payment (for standard users)
  pending_payment_data  Json?     // Stores payment submitted with invoice

  created_by            Int
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
}
```

#### Vendor
```prisma
model Vendor {
  id                  Int       @id @default(autoincrement())
  name                String
  address             String?
  bank_details        String?
  gst_exemption       Boolean   @default(false)
  is_active           Boolean   @default(true)

  // Approval Workflow (BUG-007 fix)
  status              String    @default("PENDING_APPROVAL")
  // Values: "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejected_reason     String?
  deleted_at          DateTime? // Soft delete
}
```

#### Payment
```prisma
model Payment {
  id                  Int       @id @default(autoincrement())
  invoice_id          Int
  payment_type_id     Int?
  amount_paid         Float
  payment_date        DateTime
  payment_reference   String?   // Transaction reference
  status              String    @default("pending")

  // TDS at Payment Time
  tds_amount_applied  Float?    // Actual TDS deducted
  tds_rounded         Boolean   @default(false)

  // Approval Workflow
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejection_reason    String?
}
```

### Key Database Indexes

```prisma
// Performance-critical indexes
@@index([status])                    // Invoice status filtering
@@index([is_archived])               // Archive queries
@@index([is_recurring])              // Recurring invoice queries
@@index([invoice_profile_id])        // Profile-based queries
@@index([vendor_id])                 // Vendor-based queries
@@index([created_at])                // Date-based sorting

// Vendor indexes
@@index([status])                    // Vendor approval status

// Notification indexes
@@index([user_id, is_read, created_at])  // Unread notifications
```

---

## Application Structure

### Page Routes & Components

#### 1. Dashboard (`/dashboard`)

**Component**: `app/(dashboard)/dashboard/page.tsx`

Server component that displays:
- Total invoices count
- Pending approval count
- Total outstanding amount
- Recent activity

#### 2. Invoices Page (`/invoices`)

**Component**: `components/v3/invoices/invoices-page.tsx`

**Tabs**:
| Tab | URL | Component | Description |
|-----|-----|-----------|-------------|
| All Invoices | `?tab=all` | `all-invoices-tab.tsx` | Full invoice table with filtering |
| Ledger | `?tab=ledger` | `ledger-tab.tsx` | Per-profile transaction history |
| TDS | `?tab=tds` | `tds-tab.tsx` | TDS-applicable invoices |
| Recurring | `?tab=recurring` | (in page) | Profile cards with stats |

**Key Features**:
- Comprehensive filtering (status, vendor, category, date range, etc.)
- Multiple view modes (Pending, Monthly, Archived)
- Excel export
- Bulk selection
- Sort by date, amount, status, remaining balance

#### 3. Admin Console (`/admin`)

**Component**: `components/v3/admin/admin-page.tsx`

**Tabs**:
| Tab | Access | Description |
|-----|--------|-------------|
| Approvals | admin+ | Pending invoices, vendors, archive requests |
| Master Data | admin+ | 6 sub-sections |
| Users | super_admin | User management |

**Master Data Sub-sections**:
1. Vendors
2. Categories
3. Entities
4. Payment Types (placeholder - needs implementation)
5. Currencies
6. Invoice Profiles

#### 4. Settings Page (`/settings`)

**Component**: `components/v3/settings/settings-page.tsx`

**Tabs**:
| Tab | Description |
|-----|-------------|
| Profile | Display name, picture, initials |
| Security | Password change |
| Activities | Activity history |

### Panel System

The application uses a **slide-in panel system** for detail views and forms.

**Key Files**:
- `components/panels/panel-provider.tsx` - Zustand-based panel state
- `hooks/use-panel.ts` - Panel hook
- `types/panel.ts` - Panel width constants

**Panel Widths**:
```typescript
export const PANEL_WIDTH = {
  SMALL: 400,
  MEDIUM: 600,
  LARGE: 800,
} as const;
```

**Usage**:
```typescript
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';

const { openPanel, closePanel } = usePanel();

// Open invoice detail panel
openPanel('invoice-v3-detail', { invoiceId: 123 }, { width: PANEL_WIDTH.LARGE });

// Close panel
closePanel();
```

**Available Panels**:
- `invoice-v3-detail` - Invoice detail view
- `create-invoice` - New invoice form
- `edit-invoice` - Edit invoice form
- `vendor-detail` - Vendor information
- `profile-detail` - Invoice profile detail
- `payment-form` - Record payment form

---

## Key Features & Implementation

### 1. Invoice Creation Flow

#### Non-Recurring Invoice
```
User clicks "New Invoice"
  → Opens NonRecurringInvoiceForm panel
  → User fills: invoice_name, vendor, amount, dates, etc.
  → Optionally adds payment (for standard users)
  → Submit creates invoice with status "pending_approval"
  → If payment added, stored in pending_payment_data
```

#### Recurring Invoice
```
User clicks "Add Invoice" on a profile card
  → Opens RecurringInvoiceForm panel
  → Profile data pre-filled (vendor, category, TDS)
  → User fills: invoice number, amount, dates
  → Submit creates invoice linked to profile
```

### 2. Approval Workflow

#### Invoice Approval (with BUG-007 fix)
```
Admin clicks "Approve" on invoice
  ↓
checkInvoiceApprovalEligibility(invoiceId)
  ↓
If vendor is PENDING_APPROVAL:
  → Show two-step dialog:
    Step 1: "Vendor Details" (name, address, bank, GST)
    Step 2: "Confirmation" (numbered steps: 1. Approve Vendor, 2. Approve Invoice)
  → User clicks "Approve Both"
  → approveVendorAndInvoice(vendorId, invoiceId)
Else:
  → Direct approval
  → approveInvoice(invoiceId)
```

### 3. Payment Recording

```
User opens invoice detail panel
  → Payments tab
  → "Record Payment" button
  ↓
PaymentForm opens:
  - Amount (defaults to remaining balance)
  - Payment Date
  - Payment Type
  - Reference Number
  - TDS Amount (if applicable)
  ↓
Submit:
  - Standard user: Payment created as "pending"
  - Admin: Payment created as "approved"
  ↓
Invoice status updates:
  - If total paid >= invoice amount: "paid"
  - If partial payment: "partial"
```

### 4. TDS Calculation

**File**: `lib/utils/tds.ts`

```typescript
export function calculateTds(
  amount: number,
  tdsPercentage: number | null,
  rounded: boolean = false
): { tdsAmount: number; payableAmount: number } {
  if (!tdsPercentage || tdsPercentage <= 0) {
    return { tdsAmount: 0, payableAmount: amount };
  }

  let tdsAmount = (amount * tdsPercentage) / 100;

  if (rounded) {
    tdsAmount = Math.ceil(tdsAmount); // Round UP
  }

  return {
    tdsAmount,
    payableAmount: amount - tdsAmount,
  };
}
```

**Important**: Always pass the invoice's `tds_rounded` preference:
```typescript
const { tdsAmount, payableAmount } = calculateTds(
  invoice.invoice_amount,
  invoice.tds_percentage,
  invoice.tds_rounded ?? false  // Use invoice preference!
);
```

### 5. Ledger View

**Files**:
- `components/v3/invoices/ledger-tab.tsx`
- `hooks/use-ledger.ts`

**Features**:
- Profile dropdown selector
- Summary cards: Total Invoiced, TDS Deducted, Paid, Outstanding
- Table view with running balance
- Only shows non-pending_approval invoices

### 6. Filtering System

**File**: `components/v3/invoices/invoice-filter-popover.tsx`

**Filter Options**:
- Status (with "Pending Actions" for all non-paid)
- Vendor
- Category
- Invoice Profile
- Payment Type
- Entity
- Invoice Type (Recurring/Non-Recurring)
- TDS Applicable
- Archived
- Date Range
- Sort By (Date, Amount, Status, Remaining Balance)
- Sort Order (Ascending/Descending)

### 7. Notification System

**Model**: `Notification` in schema.prisma

**Types**:
- `invoice_pending` - New invoice needs approval
- `invoice_approved` - Invoice was approved
- `invoice_rejected` - Invoice was rejected
- `vendor_approved` - Vendor was approved
- `master_data_request` - Master data request status

**Implementation**:
- Notifications created via server actions
- Real-time polling with React Query
- Bell icon in navbar shows unread count
- Click notification navigates to related item

---

## Current Progress & Status

### Sprint 14 Completion Status

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Approval Buttons | ✅ DONE | - |
| 2 | User Panel Fix | ✅ DONE | - |
| 3 | Currency Display | ✅ DONE | - |
| 4 | Amount Field UX | ✅ DONE | AmountInput component created |
| 5 | Panel Styling | ✅ DONE | V3 standardization complete |
| 6 | Payment Types CRUD | ✅ DONE | Full CRUD with hooks |
| 7 | Billing Frequency | ✅ DONE | Dual input (value + unit) |
| 8 | Activities Tab | ✅ DONE | Standalone with filtering |
| 9 | Settings Restructure | ✅ DONE | Profile/Security/Activities |
| 10 | Invoice Tabs | ✅ DONE | - |
| 11 | Edit (Admin) | ✅ DONE | - |
| 12 | Edit (Users) | ✅ DONE | - |
| 13 | Invoice Toggle | ✅ DONE | Panel preference setting |

**Completed**: 13/13 items (100%)
**Status**: SPRINT COMPLETE

### Major Accomplishments (December 2025)

1. **V3 Invoice Tabs** - Complete tabbed interface
2. **Comprehensive Filtering** - All filter options implemented
3. **BUG-007 Vendor Workflow** - Two-step approval dialog
4. **Ledger Tab** - Per-profile transaction history
5. **Archive/Delete** - Soft delete with reasons
6. **Notification System** - Real-time notifications
7. **SharePoint Integration** - File storage
8. **Security Upgrades** - Next.js 14.2.35
9. **AmountInput Component** - Smart input fixing "01500" bug
10. **Payment Types CRUD** - Full admin management system
11. **Activities Tab** - Standalone with category filtering & pagination
12. **Settings Restructure** - Profile, Security, Activities tabs
13. **Payment Panel Redesign** - Hero stats, progress bar, TDS toggle

---

## Completed Sprint Items (December 2025)

### Item #4: Amount Field UX - ✅ COMPLETE
**Implementation**: `components/invoices-v2/amount-input.tsx`

Smart amount input component with:
- No leading zero issue when typing
- Smart placeholder behavior (shows 0.00 when empty)
- Direct typing without pre-filled zeros
- React Hook Form integration via Controller pattern
- Scroll-to-change disabled to prevent accidental value changes
- Used in Payment Form Panel and all invoice forms

---

### Item #6: Payment Types CRUD - ✅ COMPLETE

**Server Actions**: `app/actions/payment-types.ts`
- `getPaymentTypes` - List with filters and pagination
- `searchPaymentTypes` - Fast autocomplete search
- `createPaymentType` - Admin-only creation
- `updatePaymentType` - Admin-only update
- `archivePaymentType` - Soft delete (no invoices required)
- `restorePaymentType` - Restore archived

**React Query Hooks**: `hooks/use-payment-types.ts`
- `usePaymentTypes` - List query
- `useSearchPaymentTypes` - Search query
- `useActivePaymentTypes` - Simplified list for dropdowns
- `useCreatePaymentType`, `useUpdatePaymentType`, `useArchivePaymentType`, `useRestorePaymentType` - Mutations

**UI**: `components/master-data/payment-type-list.tsx`
- DataTable with Name, Description, Requires Reference, Invoice Count, Status, Created, Actions
- Edit and Archive buttons with confirmation dialogs
- Archive protection (cannot archive if has invoices)

---

### Item #7: Billing Frequency - ✅ COMPLETE

**Implementation**: Profile form now supports dual input
- `billing_frequency_value` - Numeric value
- `billing_frequency_unit` - "days" | "months"
- Both displayed in profile detail panels

---

### Item #8: Activities Tab - ✅ COMPLETE

**Implementation**: `app/(dashboard)/settings/components/activities-tab.tsx`

Full standalone Activities section:
- Timeline view with icons per activity type
- Category filtering (All, Invoice, Payment, Comment, Attachment)
- Pagination with page navigation
- Click-to-navigate to related invoice
- Real-time refresh capability
- Color-coded actions (green=approved/created, red=rejected/deleted, amber=updated)

---

### Item #9: Settings Restructure - ✅ COMPLETE

**Implementation**: `components/v3/settings/settings-page.tsx`

Three-tab structure:
1. **Profile Tab** - User profile settings
2. **Security Tab** - Password change, security settings
3. **Activities Tab** - Activity log and audit trail

Uses `SettingsTabsResponsive` for mobile/desktop navigation.

---

### Payment Panel Redesign - ✅ COMPLETE (Dec 18, 2025)

**Implementation**: `components/payments/payment-form-panel.tsx` (562 lines)

Major UX improvements:
- **Hero Stats Grid**: Invoice Amount, TDS Deducted, Already Paid, Remaining
- **Payment Progress Bar**: Visual progress with color coding (amber < 50%, primary 50-99%, green = 100%)
- **TDS Round Toggle**: In header, only shows when rounding makes a difference
- **Currency Prefix**: Amount input shows "INR ₹" prefix
- **After This Payment Preview**: Shows projected progress and completion indicator
- **Full Payment Indicator**: Green card with checkmark "Invoice will be marked as PAID"

Uses shared panel components:
- `PanelSummaryHeader` - Title and subtitle
- `PanelStatGroup` - 2x2 or 3-column stat grid
- `PanelSection` - Section with title

---

### Invoice Detail Panel Redesign - ✅ COMPLETE (Dec 18, 2025)

**Files Modified**:
- `components/invoices/invoice-detail-panel-v3/index.tsx`
- `components/invoices/invoice-detail-panel-v3/panel-v3-header.tsx`
- `components/invoices/invoice-detail-panel-v3/panel-v3-hero.tsx`
- `components/invoices/invoice-detail-panel-v3/tabs/details-tab.tsx`
- `components/panels/shared/panel-tabs.tsx`
- `hooks/use-media-query.ts` (NEW)

**Major Changes**:

1. **Panel Title**: Changed from `Invoice {number}` → `Invoice - {name}`
   - Uses invoice name (non-recurring) or profile name (recurring)
   - More human-readable and context-aware

2. **Header Section Redesign**:
   - Invoice number + Vendor on left side
   - Badges stacked vertically on right side
   - Recurring badge uses `outline` variant (not filled)
   - Removed "from" prefix before vendor name
   - Reduced padding (`py-2` from `py-4`)

3. **Due Date Relocated**:
   - Moved from Hero section to Details tab
   - New `DueDateDisplay` component with:
     - Calendar icon
     - Color-coded text (red=overdue, amber=due soon)
     - Status badge (Overdue by X days / Due in X days / Paid)
     - Mobile responsive (badge stacks below date)

4. **Responsive Tab Overflow**:
   - Desktop: All 4 tabs visible
   - Mobile: First 3 tabs + 3-dot overflow menu
   - `mobileMaxTabs` prop (default: 3)
   - Smart handling of active tab in overflow

5. **Mobile Action Bar in Footer**:
   - Desktop: Action bar on right side (unchanged)
   - Mobile: Primary actions in footer (left of Close button)
   - Secondary actions (Archive, Delete) in overflow menu
   - Uses tooltips for action descriptions

**New Hook - useMediaQuery**:
```typescript
// hooks/use-media-query.ts
export function useMediaQuery(query: string): boolean;
export function useIsMobile(): boolean;   // max-width: 639px
export function useIsTablet(): boolean;   // 640px - 1023px
export function useIsDesktop(): boolean;  // min-width: 1024px
```

---

### Payments Tab Badge & Currency Fixes - ✅ COMPLETE (Dec 19, 2025)

**Files Modified**:
- `types/payment.ts` - Added `pending_payment_count` to PaymentSummary
- `app/actions/payments.ts` - Return `pending_payment_count` in response
- `components/invoices/invoice-detail-panel-v3/index.tsx` - Combined badge count
- Multiple components updated for dynamic currency formatting

**Bug Fixes**:

1. **Payments Tab Badge Missing Pending Count**:
   - Root cause: `pendingPaymentCount` was calculated in `getPaymentSummary` but not returned
   - Fix: Added `pending_payment_count` to `PaymentSummary` type and return value
   - Result: Payments tab badge now shows total (approved + pending)

2. **Currency Symbol Hardcoded**:
   - Root cause: Local `formatCurrency` functions hardcoded `'INR'` or `'USD'`
   - Fix: Removed all local formatCurrency functions, use shared utility with `currencyCode` prop
   - Pattern: `formatCurrency(amount, invoice.currency?.code)`
   - Files fixed: 9 components across payments, ledger, invoices, dashboard

**New Pattern - Currency Code Propagation**:
```typescript
// Parent component
<PaymentsTab currencyCode={invoice.currency?.code} />

// Child component
import { formatCurrency } from '@/lib/utils/format';
{formatCurrency(amount, currencyCode)}
```

---

## Future Roadmap (Post v1.0.0)

**Low Priority / Technical Debt**:
- Timeline view for Ledger tab
- Advanced reporting dashboard
- AI-powered insights
- Bulk operations for invoices
- Multi-currency support per invoice
- Automatic invoice generation from profiles
- Mobile app

---

## Known Issues & Technical Debt

### Active Issues

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| - | Amount field "01500" bug | Medium | TODO (Item #4) |
| - | Payment Types placeholder | Medium | TODO (Item #6) |
| - | Billing frequency nullable | Low | TODO (Item #7) |

### Resolved Issues (December 2025)

| ID | Description | Fix | Commit |
|----|-------------|-----|--------|
| BUG-007 | Vendor approval workflow | Two-step dialog | `71bc53a` |
| BUG-003 | TDS round-off calculation | Use tds_rounded | `c2b6536` |
| - | Payment status display | Fixed display logic | `6996664` |
| - | Due date handling | Fixed null handling | `6996664` |
| - | Month group sorting | Sort based on date | `7b3bc04` |
| - | Remaining balance | Calculate after TDS | `5445e5c` |
| - | Pending stats | Exclude from cards | `5fe6b5f` |
| - | Ledger view | Exclude pending | `1dccfcd` |

### Technical Debt

1. **Large Components**: `all-invoices-tab.tsx` is 1849 lines - could be split
2. **Legacy frequency field**: `billing_frequency` string vs new `billing_frequency_unit`/`billing_frequency_value`
3. **Mixed validation**: Some forms use inline validation, some use Zod schemas
4. **Test coverage**: Limited automated tests

---

## Critical Patterns & Conventions

### 1. TDS Calculation Pattern

**ALWAYS** pass the invoice's `tds_rounded` preference:

```typescript
// ✅ CORRECT
const { tdsAmount, payableAmount } = calculateTds(
  invoice.invoice_amount,
  invoice.tds_percentage,
  invoice.tds_rounded ?? false
);

// ❌ WRONG - Missing tds_rounded
const { tdsAmount, payableAmount } = calculateTds(
  invoice.invoice_amount,
  invoice.tds_percentage
);
```

### 2. Form Pre-filling Pattern

**Use useEffect + setValue**, NOT defaultValues:

```typescript
// ✅ CORRECT - Use useEffect
const { setValue, watch } = useForm<FormData>();

useEffect(() => {
  if (invoice) {
    setValue('invoice_profile_id', invoice.invoice_profile_id);
    setValue('amount', invoice.invoice_amount);
  }
}, [invoice, setValue]);

// ❌ WRONG - defaultValues with async data
const { } = useForm<FormData>({
  defaultValues: {
    amount: invoice?.invoice_amount, // May be undefined on first render!
  }
});
```

### 3. Panel Opening Pattern

```typescript
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';

const { openPanel } = usePanel();

// Open with data and options
openPanel(
  'invoice-v3-detail',
  { invoiceId: invoice.id },
  { width: PANEL_WIDTH.LARGE }
);
```

### 4. Permission Check Pattern

```typescript
const isPendingApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
const isPaid = invoice.status === INVOICE_STATUS.PAID;
const isRejected = invoice.status === INVOICE_STATUS.REJECTED;

// Can record payment?
const canRecordPayment = !isPendingApproval && !isPaid && !isRejected;

// Can approve/reject?
const canApproveReject = isAdmin && isPendingApproval;

// Can archive?
const canArchive = !invoice.is_archived;

// Can delete permanently?
const canDelete = isSuperAdmin && invoice.is_archived;
```

### 5. Zod Validation Pattern

**For optional file fields**, always include null/undefined check:

```typescript
// ✅ CORRECT - Explicit null/undefined check
const fileSchema = z.custom<File>((val) => {
  return val === null || val === undefined || val instanceof File;
}).nullable().optional();

// ❌ WRONG - Rejects null/undefined
const fileSchema = z.custom<File>().nullable().optional();
```

### 6. Server Action Pattern

```typescript
// app/actions/invoices-v2.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createInvoice(data: InvoiceFormData) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const invoice = await prisma.invoice.create({
      data: {
        ...data,
        created_by: session.user.id,
        status: 'pending_approval',
      },
    });

    revalidatePath('/invoices');
    return { success: true, data: invoice };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: 'Failed to create invoice' };
  }
}
```

### 7. React Query Pattern

```typescript
// hooks/use-invoices-v2.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
```

### 8. Mobile Responsive Pattern

**Use native dropdowns for mobile instead of Radix UI**:

```typescript
// ❌ WRONG - Radix UI has touch event issues on mobile
import { DropdownMenu, DropdownMenuContent } from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent>...</DropdownMenuContent>
</DropdownMenu>

// ✅ CORRECT - Native dropdown with state for mobile
const [isOpen, setIsOpen] = useState(false);
const menuRef = useRef<HTMLDivElement>(null);
const triggerRef = useRef<HTMLButtonElement>(null);

// Click outside detection
useEffect(() => {
  if (!isOpen) return;
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);  // Important for mobile!
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('touchstart', handleClickOutside);
  };
}, [isOpen]);

// Render
<div className="relative">
  <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className="touch-manipulation">
    <MoreVertical />
  </button>
  {isOpen && (
    <div ref={menuRef} className="absolute ... z-[9999]">
      {items.map(item => <button key={item.id} onClick={() => handleSelect(item)} />)}
    </div>
  )}
</div>
```

**Key CSS classes for mobile**:
- `touch-manipulation` - Removes 300ms touch delay
- `select-none` - Prevents text selection on tap
- `z-[9999]` - Ensures menu appears above panel containers

### 9. Panel Width Pattern

**Use maxWidth for responsive panel sizing**:

```typescript
// ❌ WRONG - Fixed width breaks mobile
style={{
  width: config.width,  // 800px - overrides CSS classes!
}}

// ✅ CORRECT - maxWidth allows shrinking
style={{
  maxWidth: config.width,  // Caps at 800px, allows 100% on mobile
}}
className="w-full"  // 100% on all screens, capped by maxWidth
```

### 10. Tab Overflow Pattern

**For mobile tab overflow with swap behavior**:

```typescript
const computeTabSets = useMemo(() => {
  if (!isMobile) return { visible: tabs, overflow: [] };

  const baseVisible = tabs.slice(0, mobileMaxTabs);
  const baseOverflow = tabs.slice(mobileMaxTabs);
  const activeOverflowTab = baseOverflow.find(t => t.id === activeTab);

  if (activeOverflowTab) {
    // SWAP: active overflow tab replaces last visible tab
    const lastVisible = baseVisible[baseVisible.length - 1];
    return {
      visible: [...baseVisible.slice(0, -1), activeOverflowTab],
      overflow: [...baseOverflow.filter(t => t.id !== activeTab), lastVisible],
    };
  }
  return { visible: baseVisible, overflow: baseOverflow };
}, [tabs, activeTab, isMobile, mobileMaxTabs]);
```

### 11. Currency Formatting Pattern

**ALWAYS** use the shared `formatCurrency` utility with the invoice/profile's currency code:

```typescript
// ✅ CORRECT - Dynamic currency from invoice
import { formatCurrency } from '@/lib/utils/format';

// In component receiving invoice data:
{formatCurrency(invoice.invoice_amount, invoice.currency?.code)}

// In component receiving currencyCode prop:
interface PaymentsTabProps {
  invoiceId: number;
  currencyCode?: string;  // Pass from parent
}
{formatCurrency(amount, currencyCode)}
```

```typescript
// ❌ WRONG - Hardcoded currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',  // Always INR - ignores invoice currency!
  }).format(value);
}
```

**Key Files**:
- Shared utility: `lib/utils/format.ts`
- Currency code source: `invoice.currency?.code` or `profile?.currency?.code`

---

## Common Pitfalls & Solutions

### Pitfall 1: Form Invalid on Mount

**Symptom**: Form shows validation errors immediately on open

**Cause**: Invalid `defaultValues` that fail Zod validation

**Solution**: Remove defaultValues, use useEffect + setValue
```typescript
useEffect(() => {
  if (data) {
    setValue('amount', data.invoice_amount);
  }
}, [data, setValue]);
```

### Pitfall 2: File Upload Validation Fails

**Symptom**: File upload always shows "Invalid"

**Cause**: `z.custom<File>()` runs before `.nullable().optional()`

**Solution**: Explicit null/undefined check in validator
```typescript
z.custom<File>((val) => {
  return val === null || val === undefined || val instanceof File;
}).nullable().optional()
```

### Pitfall 3: "Not a Recurring Invoice" Error

**Symptom**: Error when saving recurring invoice

**Cause**: Using `profile_id` instead of `invoice_profile_id`

**Solution**: Check schema.prisma for exact field names

### Pitfall 4: TDS Amount Inconsistent

**Symptom**: TDS calculations differ between views

**Cause**: Not using invoice's `tds_rounded` preference

**Solution**: Always pass `invoice.tds_rounded` to `calculateTds()`

### Pitfall 5: Panel Not Closing

**Symptom**: Panel stays open after action

**Cause**: Not calling `closePanel()` after success

**Solution**: Call `closePanel()` in success handler
```typescript
const handleSubmit = async () => {
  const result = await createInvoice(data);
  if (result.success) {
    closePanel(); // Don't forget!
    toast.success('Invoice created');
  }
};
```

### Pitfall 6: Query Not Updating

**Symptom**: Data doesn't refresh after mutation

**Cause**: Missing `invalidateQueries` or wrong query key

**Solution**: Ensure query key matches
```typescript
// On create
queryClient.invalidateQueries({ queryKey: ['invoices'] });

// If filtered
queryClient.invalidateQueries({
  queryKey: ['invoices', { status: 'pending' }]
});
```

---

## Development Workflow

### Getting Started

```bash
# 1. Clone repository
git clone <repo-url>
cd paylog-3

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Generate Prisma client
pnpm prisma generate

# 5. Start development server
pnpm dev
```

### Daily Development

```bash
# Start dev server
pnpm dev                    # http://localhost:3000

# Database GUI
pnpm prisma studio          # http://localhost:5555
```

### Before EVERY Commit

**Quality Gates** (MANDATORY):

```bash
# 1. ESLint check (0 errors required)
pnpm lint

# 2. TypeScript check (0 errors required)
pnpm typecheck

# 3. Production build (must succeed)
pnpm build

# Only if all pass:
git add .
git commit -m "type(scope): message"
git push
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

# Types:
feat:     New feature
fix:      Bug fix
chore:    Maintenance
refactor: Code refactoring
docs:     Documentation
style:    Formatting
test:     Tests
```

**Examples**:
```
feat(invoices): add TDS tab to invoice page
fix(vendor): implement BUG-007 approval workflow
chore(deps): upgrade next.js to 14.2.35
```

### Database Changes

```bash
# Edit schema.prisma, then:

# Option 1: Create migration (recommended)
pnpm prisma migrate dev --name your_migration_name

# Option 2: Push without migration (dev only)
pnpm prisma db push

# Always regenerate client after schema changes
pnpm prisma generate
```

---

## Environment Setup

### Required Environment Variables

```env
# Database (Railway PostgreSQL)
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret"

# SharePoint Storage (Microsoft 365)
AZURE_TENANT_ID="your-tenant-id"
AZURE_CLIENT_ID="your-client-id"
AZURE_CLIENT_SECRET="your-client-secret"
SHAREPOINT_SITE_ID="your-site-id"
SHAREPOINT_DRIVE_ID="your-drive-id"

# Email (Resend)
RESEND_API_KEY="re_xxxxx"

# Optional
NODE_ENV="development"
```

### Local Development vs Production

| Variable | Local | Production |
|----------|-------|------------|
| DATABASE_URL | Local PostgreSQL or Railway dev | Railway production |
| NEXTAUTH_URL | http://localhost:3000 | https://your-domain.com |
| NEXTAUTH_SECRET | Any 32-char string | Strong random secret |

---

## Testing Strategy

### Current State

- Jest configured but minimal test coverage
- Manual testing is primary QA method

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Recommended Testing Approach

1. **Unit Tests**: TDS calculation, formatters, validators
2. **Component Tests**: Form validation, panel behavior
3. **Integration Tests**: Server actions, database operations
4. **E2E Tests**: Critical user flows (create invoice, approve, pay)

---

## Deployment & Infrastructure

### Hosting

| Service | Purpose |
|---------|---------|
| **Railway** | PostgreSQL database + Next.js deployment |
| **SharePoint** | File storage for attachments |

### Deployment Flow

```
Push to main branch
  ↓
Railway detects changes
  ↓
Runs: pnpm install && pnpm build
  ↓
Deploys new version
  ↓
Automatic rollback on failure
```

### Database Migrations

```bash
# Local development
pnpm prisma migrate dev

# Production (Railway)
pnpm prisma migrate deploy
```

---

## Security Considerations

### Authentication

- NextAuth.js with credentials provider
- Password hashing with bcrypt
- Session-based authentication

### Authorization

- Role-based access control (RBAC)
- Server-side permission checks in Server Actions
- Client-side UI hiding for unauthorized actions

### Data Protection

- All database queries use Prisma (SQL injection protection)
- Input validation with Zod schemas
- File uploads to SharePoint (not local filesystem)

### Security Updates

- Next.js upgraded to 14.2.35 for security fixes
- Regular dependency audits

---

## Performance Considerations

### Current Optimizations

1. **React Query caching**: Reduces redundant API calls
2. **Server Components**: Dashboard uses server-side data fetching
3. **Database indexes**: Key query patterns indexed
4. **Pagination**: Large lists are paginated

### Potential Improvements

1. **Virtualized lists**: For very long invoice lists
2. **Image optimization**: Avatar/attachment thumbnails
3. **Bundle splitting**: Large component chunking

---

## User Roles & Permissions

### Role Hierarchy

```
super_admin (highest)
  ↓
admin
  ↓
standard_user (lowest)
```

### Permission Matrix

| Action | super_admin | admin | standard_user |
|--------|-------------|-------|---------------|
| Create Invoice | ✅ | ✅ | ✅ |
| Edit Own Invoice | ✅ | ✅ | ✅ |
| Edit Any Invoice | ✅ | ✅ | ❌ |
| Approve Invoice | ✅ | ✅ | ❌ |
| Reject Invoice | ✅ | ✅ | ❌ |
| Archive Invoice | ✅ | ✅ | Request only |
| Delete Invoice | ✅ | ❌ | ❌ |
| Manage Vendors | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| View All Invoices | ✅ | ✅ | Own only |

---

## API & Server Actions Reference

### Invoice Actions (`app/actions/invoices-v2.ts`)

| Action | Parameters | Returns |
|--------|------------|---------|
| `createInvoice` | InvoiceFormData | { success, data/error } |
| `updateInvoice` | id, InvoiceFormData | { success, data/error } |
| `approveInvoice` | invoiceId | { success, error } |
| `rejectInvoice` | invoiceId, reason | { success, error } |
| `archiveInvoice` | invoiceId, reason | { success, error } |
| `deleteInvoice` | invoiceId, reason | { success, error } |
| `checkInvoiceApprovalEligibility` | invoiceId | { vendorPending, vendor } |
| `approveVendorAndInvoice` | vendorId, invoiceId | { success, error } |

### Payment Actions (`app/actions/payments.ts`)

| Action | Parameters | Returns |
|--------|------------|---------|
| `createPayment` | PaymentFormData | { success, data/error } |
| `approvePayment` | paymentId | { success, error } |
| `rejectPayment` | paymentId, reason | { success, error } |

### Vendor Actions (`app/actions/admin/vendors.ts`)

| Action | Parameters | Returns |
|--------|------------|---------|
| `approveVendor` | vendorId | { success, error } |
| `rejectVendor` | vendorId, reason | { success, error } |

---

## UI Component Library

### Custom Components

| Component | Location | Purpose |
|-----------|----------|---------|
| ConfirmationDialog | `components/ui/confirmation-dialog.tsx` | Reusable confirmation dialogs |
| InputDialog | `components/ui/confirmation-dialog.tsx` | Dialog with text input |
| AmountInput | TODO | Smart amount field |

### shadcn/ui Components Used

- Button (with custom "subtle" variant)
- Input, Select, Checkbox, Switch
- Dialog, AlertDialog, Sheet
- Table, DataTable
- Card, Badge, Skeleton
- Popover, Tooltip
- Form (with react-hook-form)

---

## Appendix: File Reference

### Largest Files (by line count)

| File | Lines | Purpose |
|------|-------|---------|
| `all-invoices-tab.tsx` | 1849 | Main invoice table |
| `confirmation-dialog.tsx` | 605 | Dialog system |
| `invoices-page.tsx` | 534 | Invoice page container |
| `tds-tab.tsx` | 453 | TDS tab |
| `schema.prisma` | 442 | Database schema |
| `invoice-tabs.tsx` | 291 | Tab navigation |
| `ledger-tab.tsx` | 261 | Ledger tab |

### Key Configuration Files

| File | Purpose |
|------|---------|
| `schema.prisma` | Database schema |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `.env.local` | Environment variables (not in git) |

---

## Contact & Resources

### Documentation Files

| File | Purpose |
|------|---------|
| `docs/PROJECT_HANDOFF_GUIDE.md` | This document |
| `docs/SESSION_SUMMARY_DEC25.md` | December changes summary |
| `docs/SPRINT_PLAN_DEC25.md` | Sprint priorities |
| `docs/CONTEXT_RESTORATION_PROMPT.md` | Quick context restore |
| `CONTEXT_RESTORATION_GUIDE.md` | Quick reference |

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Document End**

*This document should be updated as the project evolves. Last comprehensive update: December 19, 2025.*
