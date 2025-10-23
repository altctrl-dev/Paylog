# Changelog

All notable changes to the PayLog Invoice Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Sprint 9A: Admin Reorganization & Enhanced Master Data (In Progress)

**Status**: Database migration complete (3/10 phases)
**Date**: October 23, 2025

#### Database Schema Changes

**New Models**:
- **Currency**: Multi-currency support (ISO 4217)
  - Fields: code, name, symbol, is_active
  - 50 currencies seeded (USD, EUR, GBP, JPY, CNY, INR, AUD, CAD, etc.)
  - All currencies start inactive (admin activates as needed)
  - Relations: Invoice, InvoiceProfile

- **Entity**: NEW table (coexists with SubEntity for safe migration)
  - Fields: name, code, address, country, is_active
  - 3 entities migrated from SubEntity
  - Country stored as ISO 3166-1 alpha-2 codes (US, IN, GB)
  - Relations: Invoice, InvoiceProfile

**Enhanced Models**:
- **Vendor**:
  - Added: address (string, optional)
  - Added: gst_exemption (boolean, required, default false)
  - Added: bank_details (text, optional)

- **Category**:
  - Updated: description (now required, was optional)
  - Backfilled existing records with "No description provided"

- **Invoice**:
  - Added: currency_id (foreign key to Currency, nullable)
  - Added: entity_id (foreign key to Entity, nullable)

**Removed Models**:
- **ArchiveRequest**: Dropped (0 pending requests, admin direct archive instead)

#### Key Decisions

1. **Safe Entity Migration**: NEW Entity table alongside SubEntity (zero breaking changes)
2. **PaymentType Description**: Kept description field (user requirement, all 3 fields mandatory)
3. **Admin RBAC**: 403 Forbidden for non-admin users (no redirect)
4. **Currency Activation**: All 50 currencies start inactive, admin activates as needed
5. **Country Storage**: ISO 3166-1 alpha-2 codes for efficiency, full names for display

#### Migration Results
- ✅ Zero breaking changes to existing code
- ✅ All existing invoices load correctly
- ✅ Prisma Client regenerated successfully
- ✅ TypeScript compilation passed
- ✅ Application builds without errors

#### Remaining Work (7 Phases)
- Phase 4: RBAC Middleware (IE+SA)
- Phase 5: Admin Menu Structure (IE)
- Phase 6: Currency Management UI (SUPB+IE)
- Phase 7: Entity Management UI (IE)
- Phase 8: Vendor Enhancement UI (SUPB+IE)
- Phase 9: Category/PaymentType Updates (IE)
- Phase 10: Testing & Integration (TA+ICA)
- Phase 11: Quality Gates & Docs (PRV+DA)

---

## [0.2.3] - 2025-10-09

### Critical Invoice Form Fixes & UX Improvements

#### Form Submission & Validation
- **FIXED**: Form submission not working - Save button now properly triggers HTML form submission
- **FIXED**: Form could be submitted with incomplete data - All fields now properly validated (except Notes)
- **FIXED**: Due date validation preventing past dates - Now allows past due dates for late-received invoices
- **FIXED**: Due date can still not be before invoice date (business rule enforced)
- **IMPROVED**: Real-time validation with `mode: 'onChange'` for immediate user feedback
- **IMPROVED**: Save button now disabled when form has validation errors

#### Mandatory Field Validation
- **ADDED**: Required validation for Invoice Profile field
- **ADDED**: Required validation for Category field
- **ADDED**: Required validation for Sub Entity field
- **ADDED**: Required validation for Invoice Date field
- **ADDED**: Required validation for Period Start date field
- **ADDED**: Required validation for Period End date field
- **ADDED**: Required validation for Due Date field
- **IMPROVED**: All date fields now properly validated as non-null with clear error messages
- **IMPROVED**: All select/dropdown fields now validate as required with clear error messages

#### UI/UX Enhancements
- **ADDED**: Red asterisks (*) to all mandatory field labels for clear visual indication
- **REMOVED**: Redundant warning messages (period date comparison, due date comparison, negative amount)
- **IMPROVED**: Single, clear error messages (no duplicate error/warning messages)
- **IMPROVED**: Consistent validation feedback across all fields

#### Technical Improvements
- **UPDATED**: Zod validation schema with `.refine()` for proper null validation on date fields
- **UPDATED**: Form button to use `type="submit"` with `form="invoice-form"` attribute
- **UPDATED**: Form element with `id="invoice-form"` for proper HTML form linkage
- **CLEANED**: Removed unused watch variables (kept only `watchedTdsApplicable` for conditional logic)
- **IMPROVED**: Form submission flow now follows HTML standards

### Bug Fixes
- **FIXED**: SessionProvider wrapper missing in QueryProvider (resolved authentication errors)
- **FIXED**: Prisma Client not regenerated after schema changes (tds_percentage field)
- **FIXED**: Save button refreshing without submitting due to incorrect event handling

### User Experience
**Before**: Users could submit incomplete forms, confusing validation messages, no indication of required fields
**After**: Clear required field indicators, comprehensive validation, single error messages, proper form submission

---

## [0.2.2] - 2025-10-08

### Sprint 2 Completion & Enhancements

#### Invoice Form Improvements
- **ADDED**: Invoice period tracking (period_start, period_end dates)
- **ADDED**: TDS (Tax Deducted at Source) applicable flag with radio button UI
- **ADDED**: Sub entity selection (links to divisions/departments/branches)
- **ADDED**: Internal notes field (multi-line textarea)
- **CHANGED**: Vendor field now required for all invoices
- **CHANGED**: Invoice form panel width increased from 500px to 700px
- **CHANGED**: Button text changed from "New Invoice" to "Add Invoice"
- **IMPROVED**: Complete form rewrite with 12 fields in optimized order
- **IMPROVED**: Enhanced validation with period date checking
- **IMPROVED**: Non-blocking validation warnings for past due dates

#### Database Schema Updates
- **ADDED**: SubEntity model (7 fields) for organizational divisions
- **ADDED**: Invoice.period_start (DateTime, optional)
- **ADDED**: Invoice.period_end (DateTime, optional)
- **ADDED**: Invoice.tds_applicable (Boolean, default false)
- **ADDED**: Invoice.sub_entity_id (Int, optional foreign key)
- **ADDED**: Invoice.notes (String, optional)
- **CHANGED**: Invoice.vendor_id from optional to required
- **CHANGED**: Invoice.vendor relation onDelete from SetNull to Restrict

#### Seed Data
- **ADDED**: 5 payment types (Cash, Check, Bank Transfer, Credit Card, UPI)
- **ADDED**: 3 sub entities (Head Office, Branch A, Branch B)
- **IMPROVED**: Seed script now idempotent (skips existing records)

#### UI/UX Enhancements
- **ADDED**: Invoice detail panel displays all new fields
- **ADDED**: Period display formatted as "dd MMM yyyy - dd MMM yyyy"
- **ADDED**: TDS status display ("Applicable" / "Not Applicable")
- **ADDED**: Sub entity name display
- **ADDED**: Notes section with preserved line breaks
- **IMPROVED**: Form field order optimized for data entry workflow

#### Technical Improvements
- **UPDATED**: TypeScript types for all new fields
- **UPDATED**: Zod validation schemas with custom refinements
- **UPDATED**: Server Actions to include sub entity support
- **UPDATED**: Panel width constants (Level 2: 500px → 700px)
- **UPDATED**: All documentation with new features

### Migration
```bash
npm run db:push
npm run db:seed
```

### Breaking Changes
- ⚠️ **Vendor is now required** - All invoices must have a vendor_id
- Migration handles this automatically by creating "Unknown Vendor" if needed

---

### Sprint 3-5 Planning Phase (v0.2.1 - 2025-10-08)

#### Sprint 5 Expansion
- **Expanded Sprint 5** from 18 SP to 26 SP (+44% increase)
- **Added user-created master data with admin approval** workflow
- **Total project scope increased** to 177 SP (from 169 SP, +4.7%)

#### Database Schema Updates
- **New Table**: `master_data_requests` (14 columns, 5 indexes)
  - Columns: id, entity_type, entity_data, status, requested_by, approved_by, rejected_by, approval_reason, rejection_reason, resubmission_count, previous_attempt_id, admin_edits, created_at, updated_at
  - Indexes: status, entity_type, requested_by, approved_by, created_at
- **New Table**: `payment_types` (7 columns)
  - Columns: id, name, description, is_active, created_at, updated_at, created_by
- **Modified Table**: `users` (added relations)
  - master_data_requests (user-created requests)
  - approved_requests (admin-approved requests)
- **Modified Table**: `payments` (added payment type)
  - payment_type_id (nullable foreign key)
  - Index on payment_type_id

#### Planning Deliverables
- **Requirements Clarifier**: 6 user stories, workflow states, acceptance criteria, edge cases
- **UX Flow Designer**: 6 user journeys with wireflows, component specifications
- **Database Modeler**: Complete schema with audit trail, resubmission chain, state machine
- **Implementation Planner**: 5 phases (Core Infrastructure, User UI, Admin UI, Inline Requests, Real-Time Notifications)

#### Sprint 5 Feature Breakdown (26 SP)
- **Email Notifications** (13 SP):
  - Infrastructure: Email service abstraction, queue system, retry logic (5 SP)
  - Notification Triggers: Invoice lifecycle, master data approvals (4 SP)
  - Email Templates: React Email templates for all triggers (2 SP)
  - Email Management: User preferences, logging, delivery tracking (2 SP)
- **User-Created Master Data** (13 SP):
  - Core Infrastructure: Server Actions, duplicate detection API (3 SP)
  - User UI: Request forms, "My Requests" tab, status management (4 SP)
  - Admin UI: Review panel, inline editing, bulk operations (3 SP)
  - Inline Requests: Level 3 panel integration in invoice/payment forms (2 SP)
  - Real-Time Notifications: WebSocket + polling fallback, toast system (1 SP)

#### Key Features (Planned for Sprint 5)
- **Master Data Request Workflow**:
  - Standard users can request: Vendors, Categories, Invoice Profiles, Payment Types
  - Workflow states: Draft → Pending Approval → Approved/Rejected
  - Resubmission logic: Max 3 attempts with rejection reasons
  - Admin capabilities: Inline editing before approval, bulk operations
  - Duplicate detection: Fuzzy matching (85% similarity threshold for vendors)
- **Email Notification System**:
  - Provider abstraction: Resend (primary), SendGrid (fallback)
  - Queue processing: Node cron-based with exponential backoff
  - Template engine: React Email for type-safe templates
  - Triggers: Invoice lifecycle, master data approvals/rejections
  - User preferences: Opt-in/opt-out, digest mode, frequency controls
- **Integration Highlights**:
  - Inline request flows: Level 3 panels from invoice/payment forms
  - Real-time updates: WebSocket with polling fallback (10s interval)
  - Audit trail: Admin edits stored as JSON diff
  - Single table design: MasterDataRequest handles all entity types

#### Sprint 8 Rename
- **Before**: "Sprint 8: Vendor & Category Management"
- **After**: "Sprint 8: Master Data Management (Admin)"
- **Reason**: Complements Sprint 5 user requests with admin-side management tools

### Planned for Sprint 3
- Payment CRUD operations
- Invoice status transition workflows
- Hold and rejection workflows
- Resubmission counter enforcement

---

## [0.2.0] - 2025-10-08

### Added

#### Stacked Panel System
- Global stacked panel infrastructure supporting 3 levels
- Zustand store for panel state management (`lib/store/panel-store.ts`)
- Framer Motion spring animations (300ms, GPU-accelerated)
- Panel components:
  - `PanelContainer` - Root container with overlay and portal rendering
  - `PanelLevel` - Individual panel with keyboard support and focus management
  - `PanelHeader` - Sticky header with close button
  - `PanelFooter` - Sticky footer for action buttons
  - `PanelProvider` - Panel type routing system
- Custom hooks:
  - `usePanel()` - Panel operations (open, close, closeAll)
  - `usePanelStack()` - Read-only panel stack state
- Responsive design:
  - Level 1: 350px width (detail views)
  - Level 2-3: 500px width (edit forms, dialogs)
  - Mobile: 100% width (full-screen)
- Accessibility features:
  - ARIA roles (`role="dialog"`, `aria-modal="true"`)
  - Keyboard navigation (ESC to close, Tab navigation)
  - Focus trap within active panel
  - Auto-focus on panel open
- Z-index isolation (10000-10003 range)
- Panel documentation (`docs/PANEL_SYSTEM.md`)

#### Invoice CRUD
- Server Actions for invoice operations (`app/actions/invoices.ts`):
  - `getInvoices()` - Fetch all invoices with filtering
  - `getInvoiceById()` - Fetch single invoice with relations
  - `createInvoice()` - Create new invoice
  - `updateInvoice()` - Update existing invoice
  - `deleteInvoice()` - Delete invoice
  - `placeInvoiceOnHold()` - Place invoice on hold (admin)
  - `releaseInvoiceFromHold()` - Release from hold
  - `hideInvoice()` - Hide invoice from default views
  - `unhideInvoice()` - Unhide invoice
- React Query integration:
  - Query hooks for data fetching
  - Mutation hooks with optimistic updates
  - Automatic cache invalidation
  - Error handling with toast notifications
- Zod validation schemas (`lib/validations/invoice.ts`)
- Invoice components:
  - `InvoiceList` - Invoice list page with data fetching
  - `InvoiceDetailPanel` - Read-only detail view (Level 1)
  - `InvoiceFormPanel` - Create/edit form (Level 2)
- Type definitions (`types/invoice.ts`)

#### UI Components
- Invoice list page (`app/(dashboard)/invoices/page.tsx`)
- Invoice panels integrated with stacked system
- Panel demo page (`app/(dashboard)/panels-demo/page.tsx`)
- Example panels for testing

### Changed
- Updated project structure to include panels and invoice features
- Enhanced TypeScript definitions for invoice operations
- Improved error handling patterns across Server Actions

### Technical
- **Story Points Completed**: 22 SP
- **Sprint Duration**: Oct 8, 2025
- **Files Added**: 15+ new files (panels, invoices, hooks)
- **Database**: SQLite (14 models with Phase 1 features)

---

## [0.1.0] - 2025-10-08

### Added

#### Foundation Setup
- Next.js 14.2.15 project with App Router
- TypeScript 5.x with strict mode enabled
- Prisma 5.20.0 ORM with SQLite database
- NextAuth v5 (beta.22) authentication
  - Credentials provider (email + password)
  - JWT session management
  - HTTP-only secure cookies
- Tailwind CSS 3.4.1 + Shadcn/ui design system
- React 18.3.1 with Server Components

#### Database Schema
- 14 models implementing Phase 1 features:
  - `User` - User management with 3 roles
  - `Invoice` - Invoice tracking with status management
  - `Vendor` - Vendor directory
  - `Category` - Invoice categorization
  - `InvoiceProfile` - Profile-based visibility
  - `UserProfileVisibility` - Profile access control
  - `Payment` - Payment tracking
  - `ArchiveRequest` - Soft delete workflow
  - `SchemaMigration` - Migration tracking
- Phase 1 features:
  - On Hold workflow (hold_reason, hold_by, hold_at)
  - Resubmission counter (submission_count, max 3 attempts)
  - Super Admin role with protection (cannot deactivate last super admin)
  - Hidden invoices (is_hidden, hidden_by, hidden_reason)
  - Profile visibility (visible_to_all, UserProfileVisibility)
  - Archive requests (pending approval workflow)
- Database indexes for performance:
  - Invoice status, hidden flag, submission count
  - User role and active status
  - Payment invoice relationship
- Database seed script (`prisma/seed.ts`):
  - Super admin user (admin@paylog.com / admin123)
  - 3 sample vendors
  - 4 sample categories
  - 1 invoice profile

#### Authentication & Authorization
- Route groups:
  - `(auth)` - Public authentication routes
  - `(dashboard)` - Protected dashboard routes
- Middleware for route protection (`middleware.ts`)
- NextAuth configuration (`lib/auth.ts`):
  - Credentials provider
  - JWT callbacks with role attachment
  - Session callbacks
- Role-based access control (RBAC):
  - `standard_user` - Create and view own invoices
  - `admin` - Approve/reject, manage vendors/categories
  - `super_admin` - Full system access, user management
- Login page with form validation (`app/(auth)/login/page.tsx`)
- Session management and logout functionality

#### UI Components
- Shadcn/ui base components:
  - `Button` - Multiple variants and sizes
  - `Input` - Form input field
  - `Label` - Form label
  - `Card` - Card container with header/content/footer
- Layout components:
  - `Sidebar` - Navigation sidebar with role-based menu
  - `Header` - Dashboard header with user info and logout
- Auth components:
  - `LoginForm` - Login form with Zod validation
- Providers:
  - `QueryProvider` - React Query client wrapper

#### Pages & Routing
- Root page with redirect logic (`app/page.tsx`)
- Login page (`app/(auth)/login/page.tsx`)
- Dashboard pages (protected):
  - Main dashboard (`app/(dashboard)/dashboard/page.tsx`)
  - Invoices list (`app/(dashboard)/invoices/page.tsx`)
  - Settings (`app/(dashboard)/settings/page.tsx`)
  - Admin panel (`app/(dashboard)/admin/page.tsx`)
  - Reports (`app/(dashboard)/reports/page.tsx`)

#### Configuration
- TypeScript configuration (`tsconfig.json`)
- Next.js configuration (`next.config.mjs`)
- Tailwind CSS configuration (`tailwind.config.ts`)
- PostCSS configuration (`postcss.config.mjs`)
- ESLint configuration (`.eslintrc.json`)
- Prettier configuration (`.prettierrc`)
- Environment variables template (`.env.example`)
- Git ignore rules (`.gitignore`)

#### Developer Experience
- Hot reload for rapid development
- ESLint + Prettier for code quality
- Prisma Studio for database inspection
- TypeScript strict mode for type safety
- Clear error messages and validation feedback

#### Documentation
- README.md - Project overview and getting started
- SETUP.md - Detailed setup instructions
- Package.json scripts:
  - `dev` - Development server
  - `build` - Production build
  - `start` - Production server
  - `lint` - Code linting
  - `db:generate` - Generate Prisma Client
  - `db:push` - Push schema to database
  - `db:migrate` - Run migrations
  - `db:studio` - Open Prisma Studio
  - `db:seed` - Seed database with sample data

### Technical
- **Story Points Completed**: 13 SP
- **Sprint Duration**: Oct 8, 2025
- **Files Created**: 37 new files
- **Database**: SQLite (14 tables, 20+ indexes)
- **Node Version**: 18+ required

### Login Credentials
Default super admin account created by seed script:
```
Email: admin@paylog.com
Password: admin123
Role: super_admin
```

---

## Version History

| Version | Date | Sprint | Status | Notes |
|---------|------|--------|--------|-------|
| 0.2.2 | 2025-10-08 | Sprint 2 | ✅ Released | Sprint 2 Enhancements |
| 0.2.0 | 2025-10-08 | Sprint 2 | ✅ Released | Panels + Invoice CRUD |
| 0.1.0 | 2025-10-08 | Sprint 1 | ✅ Released | Foundation Setup |
| 0.3.0 | TBD | Sprint 3 | 🔲 Planned | Payments & Workflows |

---

## Sprint Progress

- **Total Sprints**: 12
- **Completed**: 2 (16.7%)
- **Story Points Complete**: 37/179 (20.7%)
- **Current Phase**: Sprint 3-5 Planning
- **Next Sprint**: Sprint 3 (Payments & Workflow Transitions)

---

## Upgrade Guide

### From 0.1.0 to 0.2.0

1. **Install new dependencies**:
```bash
npm install
```

2. **Database migration**:
```bash
npm run db:generate
npm run db:migrate
```

3. **Add PanelProvider to layout**:
```tsx
// app/(dashboard)/layout.tsx
import { PanelProvider } from '@/components/panels';

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <PanelProvider />
    </>
  );
}
```

4. **Use new invoice features**:
```tsx
import { usePanel } from '@/hooks/use-panel';

function MyComponent() {
  const { openPanel } = usePanel();

  return (
    <Button onClick={() => openPanel('invoice-detail', { invoiceId: 123 })}>
      View Invoice
    </Button>
  );
}
```

---

## Breaking Changes

### 0.2.0
- None (additive release)

### 0.1.0
- Initial release

---

## Contributors

- PayLog Development Team

---

## License

Internal use only. Not for public distribution.
