# PayLog Context Restoration Prompt - November 24, 2025

## Quick Context Restoration

Copy and paste this entire prompt at the start of your next session for instant context restoration.

---

## Project Overview

**Project**: PayLog - Professional Invoice Management System
**Version**: v0.9.5 (approaching v1.0.0 release)
**Status**: Production-ready, deployed on Railway, all critical bugs fixed
**Latest Session**: November 24, 2025 (Debugging & Critical Fixes)
**Current Sprint**: Sprint 13 Phase 6 (Documentation & Release Prep) - IN PROGRESS

---

## Tech Stack

### Core Framework
- **Next.js 14.2.33**: App Router, React Server Components, Server Actions
- **TypeScript 5.x**: Strict mode enabled, full type safety
- **React 18.3**: Client components with hooks, Suspense, Error Boundaries
- **Node.js 20.11**: LTS version for Railway deployment

### Database & ORM
- **PostgreSQL 17**: Production database hosted on Railway
- **Prisma 5.22.0**: Type-safe ORM with migrations
- **Database URL**: Railway PostgreSQL (connection string in .env)

### UI & Styling
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **shadcn/ui**: Radix UI component library (Button, Dialog, Dropdown, Alert, etc.)
- **Framer Motion**: UI animations and transitions
- **CSS Variables**: Custom design token system (see STYLING_GUIDE.md)

### Forms & Validation
- **React Hook Form**: Form state management with performance optimization
- **Zod**: Runtime type validation and schema validation
- **Client-side validation**: Real-time feedback
- **Server-side validation**: Security and data integrity

### State Management
- **React Query (TanStack Query v5)**: Server state management, caching, optimistic updates
- **Zustand**: Global client state (sidebar, navigation, UI preferences)
- **React Context**: Auth state, theme, user preferences

### Authentication & Authorization
- **NextAuth v5 (beta)**: Credentials provider with JWT strategy
- **bcryptjs**: Password hashing with cost factor 12
- **RBAC**: Role-based access control (standard_user, admin, super_admin)
- **Session Management**: JWT tokens, server-side session validation

### Notifications & Feedback
- **Sonner**: Toast notifications with rich colors and animations
- **Error Boundaries**: React error boundaries for graceful error handling
- **Loading States**: Suspense boundaries, skeleton loaders, spinners

### File Storage
- **Vercel Blob**: File upload and storage for invoice attachments
- **Supported formats**: PDF, JPG, PNG, GIF, DOCX, XLSX
- **Max file size**: 10 MB per file
- **File preview**: Download links, future: in-app preview modal

### Development Tools
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting (via lint-staged)
- **Husky**: Git hooks for pre-commit linting
- **pnpm**: Package manager (faster than npm/yarn)

### Deployment & Hosting
- **Railway**: Production hosting with auto-deploy from main branch
- **Production URL**: https://paylog-3.up.railway.app
- **Environment**: Railway PostgreSQL + Next.js build
- **Auto-deploy**: On push to main branch
- **Build time**: ~4-5 minutes per deployment

---

## Project Structure

```
paylog-3/
├── app/                              # Next.js App Router
│   ├── (dashboard)/                  # Authenticated routes
│   │   ├── invoices/                 # Invoice management
│   │   │   ├── page.tsx              # Invoice list with V1/V2 panels
│   │   │   └── new/                  # Invoice creation routes
│   │   │       ├── recurring/page.tsx
│   │   │       └── non-recurring/page.tsx
│   │   └── admin/                    # Admin-only routes (RBAC protected)
│   │       ├── master-data/          # Master data management
│   │       │   ├── vendors/
│   │       │   ├── categories/
│   │       │   ├── entities/
│   │       │   └── invoice-profiles/
│   │       └── users/                # User management
│   ├── actions/                      # Legacy server actions (being phased out)
│   ├── api/                          # API routes (minimal, most use Server Actions)
│   ├── layout.tsx                    # Root layout with Sonner Toaster
│   └── globals.css                   # Design tokens, Tailwind directives
│
├── components/                       # React components
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx         # Fixed: Portal wrapper for submenus
│   │   ├── alert.tsx                 # Added: Nov 22
│   │   └── ...                       # 30+ shadcn components
│   ├── layout-v2/                    # UI v2 redesign (Nov 18)
│   │   ├── header-v2.tsx             # Fixed: NavbarPlusMenu integration (Nov 24)
│   │   ├── sidebar-v2.tsx            # Collapsible sidebar (240px ↔ 60px)
│   │   └── navbar-plus-menu.tsx      # Created: Nov 23
│   ├── invoices/                     # Invoice V1 components
│   ├── invoices-v2/                  # Invoice V2 components (Sprint 13)
│   │   ├── recurring-invoice-form.tsx
│   │   ├── non-recurring-invoice-form.tsx
│   │   ├── invoice-v2-detail.tsx     # Detail panel (~370 lines, 7 sections)
│   │   └── invoice-form-fields.tsx
│   ├── master-data/                  # Master data components
│   │   └── vendor-form-panel.tsx     # Fixed: initialName, onSuccess props
│   └── panels/                       # Stacked panel system
│       ├── panel-container.tsx
│       ├── panel-level.tsx
│       └── invoice-panel-renderer.tsx
│
├── lib/                              # Shared utilities
│   ├── actions/                      # Server Actions (new pattern)
│   │   ├── user-management.ts        # User CRUD, RBAC
│   │   └── invoices-v2.ts            # Invoice V2 actions
│   ├── types/                        # TypeScript type definitions
│   │   ├── user-management.ts
│   │   └── invoice.ts                # Fixed: invoice_profile_id field name
│   ├── utils/                        # Utility functions
│   │   ├── format.ts                 # Fixed: Defensive currency formatting (Nov 24)
│   │   ├── password-generator.ts
│   │   ├── audit-logger.ts           # Enhanced: requestMetadata parameter
│   │   └── fuzzy-match.ts            # Levenshtein distance for vendor search
│   ├── auth.ts                       # NextAuth config, permission helpers
│   ├── rbac-v2.ts                    # RBAC utilities (canApproveVendor, etc.)
│   └── db.ts                         # Prisma client export
│
├── prisma/                           # Database schema and migrations
│   ├── schema.prisma                 # Database schema (Sprint 13 fields added)
│   └── migrations/                   # Prisma migration files
│
├── scripts/                          # Utility scripts
│   └── reset-admin-password.ts       # Created: Nov 24 (password_hash field fix)
│
├── docs/                             # Documentation
│   ├── SESSION_SUMMARY_2025_11_24_DEBUGGING.md  # Latest session
│   ├── SESSION_SUMMARY_2025_11_22_RAILWAY_FIXES.md
│   ├── SESSION_SUMMARY_2025_11_22.md
│   ├── SESSION_SUMMARY_2025_11_21.md
│   ├── SESSION_SUMMARY_2025_11_18.md
│   ├── SPRINTS_REVISED.md            # Project plan and sprint status
│   ├── ARCHITECTURE.md               # System architecture
│   ├── STYLING_GUIDE.md              # Design system documentation
│   └── ...                           # 30+ documentation files
│
├── next.config.mjs                   # Next.js config (unique build IDs for cache busting)
├── tailwind.config.ts                # Tailwind config (maps to CSS variables)
├── tsconfig.json                     # TypeScript config (strict mode)
├── package.json                      # Dependencies and scripts
├── .env                              # Environment variables (not in Git)
└── README.md                         # Project overview
```

---

## Sprint Progress

### Overall Progress
- **Total Story Points**: 208 SP (revised: +6 SP for Sprint 14)
- **Completed**: 197.5 SP (94.9%)
- **Remaining**: 10.5 SP (5.1%)
  - Sprint 13 Phase 6: 1.5 SP (Documentation)
  - Sprint 14: 9 SP (Post-Launch Enhancements)

### Completed Sprints (Sprints 1-13 Phase 5)
- ✅ **Sprint 1**: Foundation Setup (13 SP)
- ✅ **Sprint 2**: Stacked Panels + Invoice CRUD (24 SP)
- ✅ **Sprint 3**: Payments & Workflow Transitions (16 SP)
- ✅ **Sprint 4**: Search, Filters & Reporting (22 SP)
- ✅ **Sprint 5**: Email Notifications (13 SP)
- ✅ **Sprint 6**: File Attachments (12 SP)
- ✅ **Sprint 7**: Activity Logging (14 SP)
- ✅ **Sprint 8**: Master Data Management (13 SP)
- ✅ **Sprint 9A**: Admin Reorganization (14 SP)
- ✅ **Sprint 9B**: Invoice Profile Enhancement (12 SP)
- ✅ **Sprint 9C**: UX Polish (3 SP)
- ✅ **Sprint 10**: Design System (16 SP)
- ✅ **Sprint 11**: User Management & RBAC (12 SP)
- ✅ **Sprint 12**: Dashboard & Analytics (14 SP)
- ✅ **Sprint 13 Phase 1-5**: Production Prep & Invoice V2 (5.5 SP)

### Current Sprint: Sprint 13 Phase 6 (1.5 SP) - IN PROGRESS

**Status**: ⏳ Ready to Start
**Goal**: Documentation & Release Prep for v1.0.0

**Tasks**:
1. **Complete USER_GUIDE.md** (0.5 SP)
   - User guide for invoice v2 workflows
   - Screenshots of new features (recurring/non-recurring forms)
   - Step-by-step tutorials (create invoice, approve vendor, etc.)
   - Troubleshooting section (common errors and solutions)

2. **API Documentation** (0.3 SP)
   - Document all server actions in `lib/actions/invoices-v2.ts`
   - Request/response types for each action
   - Error codes and handling patterns
   - Authentication requirements (RBAC checks)

3. **Production Deployment Guide** (0.2 SP)
   - Railway deployment steps (from scratch)
   - Environment variable setup (DATABASE_URL, NEXTAUTH_SECRET, etc.)
   - Database migration checklist (Prisma migrations)
   - SSL certificate setup
   - Domain configuration (custom domain setup)

4. **Changelog Generation** (0.3 SP)
   - Generate CHANGELOG.md from commit history (Sprints 1-13)
   - Group by category (Features, Fixes, Refactors, Breaking Changes)
   - Highlight major milestones (Invoice V2, UI v2, RBAC, etc.)
   - Version tags (v0.1.0 → v1.0.0)

5. **v1.0.0 Release Notes** (0.2 SP)
   - Executive summary of all features
   - Migration guide from v0.x (if applicable)
   - Known issues and workarounds
   - Roadmap preview (Sprint 14 items)
   - Credits and acknowledgments

### Next Sprint: Sprint 14 (9 SP planned, 6 SP implementation) - PLANNED

**Status**: 📋 Planned, detailed implementation plan exists
**Documentation**: `/Users/althaf/Projects/paylog-3/docs/SPRINT_14_IMPLEMENTATION_PLAN.md`

**10 Enhancement Items**:
1. Global Search & Advanced Filters (2 SP)
2. Bulk Operations (1.5 SP)
3. Enhanced Detail Panel Features (1 SP)
4. File Preview Modal (0.5 SP)
5. Audit Trail Dashboard (1 SP)
6. Email Template Customization (1 SP)
7. Export & Reporting Enhancements (1 SP)
8. Performance Optimization (1 SP)
9. Mobile App Preparation (1 SP)
10. Admin Analytics Dashboard (1.5 SP)

---

## Recent Sessions (Last 5)

### Session 5: November 24, 2025 - Production Debugging & Critical Fixes (THIS SESSION)
**Duration**: ~4.5 hours (20:27 - 00:55 IST)
**Focus**: Critical production bug fixes
**Status**: ✅ All bugs fixed, production stable

**4 Critical Bugs Fixed**:
1. ✅ **Currency Error**: Invalid ISO 4217 code "IN" causing RangeError
   - **Root Cause**: Database had country code instead of currency code
   - **Fix**: Updated 3 invoices (IN → INR), added defensive currency formatting
   - **File**: `lib/utils/format.ts` (+43 lines defensive programming)

2. ✅ **Invoice Panel Not Opening**: Detail panel not rendering
   - **Root Cause**: Browser cache serving old JavaScript bundle
   - **Fix**: User hard refresh (Cmd+Shift+R)
   - **No code changes needed**

3. ✅ **'+' Button Not Working on Railway**: Dropdown menu non-functional
   - **Root Cause**: UNCOMMITTED CHANGES in `header-v2.tsx` (Git workflow issue)
   - **Why Localhost Worked**: Uncommitted file present locally
   - **Why Railway Failed**: Git repository missing header-v2.tsx changes
   - **Fix**: Committed missing NavbarPlusMenu integration
   - **File**: `components/layout-v2/header-v2.tsx` (+13 lines)
   - **Critical Lesson**: ALWAYS check `git status` before debugging deployments

4. ✅ **Password Reset Script Error**: Invalid field name
   - **Root Cause**: Script used `password` field but schema defines `password_hash`
   - **Fix**: Updated script to use `password_hash`
   - **File**: `scripts/reset-admin-password.ts` (created, ~78 lines)

**Key Learning**: Most critical lesson from this session - when "works on localhost but not on production", check `git status` FIRST before assuming deployment issues.

**Commits Made**: 6 commits (46b8243, c1fa90d, 66f52e7, 48d6812, 3ac96f4, f2b1bf3)

**Documentation**: `/Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_24_DEBUGGING.md`

---

### Session 4: November 22, 2025 - Railway Production Deployment Fixes
**Duration**: ~4.5 hours (19:34 - 23:53 IST)
**Focus**: Fix 11 Railway build failures for Invoice V2 deployment
**Status**: ✅ All fixes applied, Railway deployment successful

**11 Fixes Applied**:
1. TypeScript errors in invoice v2 components (React Hook Form types)
2. Field name mismatch: invoice_profile_id vs profile_id
3. Schema sync: Sprint 13 fields not committed
4. Missing Alert UI component
5. Missing invoice creation pages
6. Missing fuzzy-match utility
7. Missing VendorFormPanel props
8. Missing Sonner toast library integration
9. ESLint errors (9 legitimate any type uses)
10. Missing RBAC v2 utility
11. Audit logger function signature mismatch

**Commits Made**: 11 commits (82d5393, 5cbd59b, b988660, e3d435f, 53b3068, 8065708, ca53752, 251051e, 82cf64d, 45fc7d0, ebdfa7f)

**Documentation**: `/Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_22_RAILWAY_FIXES.md`

---

### Session 3: November 22, 2025 - Sprint 13 Phase 5 Completion
**Duration**: ~6 hours
**Focus**: Vendor Approval Workflow implementation
**Status**: ✅ Complete, 2 critical bugs fixed

**Vendor Approval Workflow**:
- Database migration: vendor.status field (PENDING_APPROVAL, APPROVED, REJECTED)
- RBAC: Only admins can approve vendors
- UI: Admin approval modal with notes
- Backfill script: All existing vendors → APPROVED status

**2 Bugs Fixed**:
1. invoice_received_date not persisting (added to 4 persistence locations)
2. Paid status sync issue (unified to use is_paid field)

**Documentation**: `/Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_22.md`

---

### Session 2: November 21, 2025 - Invoice V2 Detail Page
**Duration**: ~5 hours
**Focus**: Build Invoice V2 detail panel component
**Status**: ✅ Complete

**Invoice V2 Detail Panel** (~370 lines, 7 sections):
- Header: Invoice number, status badges, amount
- Core Info: Vendor, date, profile, entity
- Payment Details: Paid status, amount, currency
- Recurring Info: Frequency, start/end dates
- Invoice Received: Date received field
- Attachments: File list with download links
- Activity Log: Audit trail

**Documentation**: `/Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_21.md`

---

### Session 1: November 18, 2025 - UI v2 Redesign
**Duration**: ~8 hours (4 phases)
**Focus**: Complete UI v2 redesign
**Status**: ✅ Complete, all quality gates passed

**UI v2 Features**:
- Collapsible sidebar: 240px (expanded) ↔ 60px (collapsed)
- Modern navbar: User menu, search, notifications, theme toggle
- Zustand store: Global sidebar state management
- React Context: User session, RBAC permissions
- Dynamic badges: RBAC-filtered navigation items
- Mobile responsive: Hamburger menu + backdrop overlay
- Smooth animations: Framer Motion transitions

**Documentation**: `/Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_18.md`

---

## Current Production Status

### Working Features (All Tested on Railway)
- ✅ Authentication & Authorization (NextAuth, RBAC)
- ✅ Invoice Management (V1 and V2 systems)
- ✅ Invoice Creation (Recurring and Non-Recurring forms)
- ✅ Invoice Detail Panels (V1 and V2 with 7 sections)
- ✅ Master Data Management (Vendors, Categories, Entities, Profiles)
- ✅ Vendor Approval Workflow (Admin approval with notes)
- ✅ User Management (CRUD, role management, password reset)
- ✅ File Attachments (Upload, download, storage on Vercel Blob)
- ✅ Activity Logging (Audit trail with IP and user agent)
- ✅ Search & Filters (Invoice search, date range, status filters)
- ✅ Dashboard & Analytics (KPI cards, charts, insights)
- ✅ Email Notifications (Welcome, password reset, invoice notifications)
- ✅ Currency Formatting (Defensive handling with country-to-currency mapping)
- ✅ Dropdown Menus (Portal wrapper for correct positioning)
- ✅ NavbarPlusMenu (Create actions dropdown working on Railway)
- ✅ Toast Notifications (Sonner integration with rich colors)
- ✅ Design System (Custom CSS variables, Tailwind config)
- ✅ UI v2 (Collapsible sidebar, modern navbar, mobile responsive)
- ✅ Cache Busting (Unique build IDs for Railway deployments)

### Known Issues
- None currently blocking production

### Future Enhancements (Sprint 14)
- Global Search & Advanced Filters
- Bulk Operations (approve vendors, mark invoices as paid, export)
- File Preview Modal (in-app PDF and image preview)
- Enhanced Detail Panel (edit button, duplicate, history tab)
- Audit Trail Dashboard (admin analytics)
- Email Template Customization
- Export & Reporting Enhancements
- Performance Optimization
- Mobile App Preparation
- Admin Analytics Dashboard

---

## Database Schema (Key Tables)

### Core Tables
- **users**: Authentication, RBAC (id, email, password_hash, role, is_active)
- **invoices**: Invoice records (id, invoice_number, vendor_id, amount, status, is_recurring, is_paid, invoice_received_date, invoice_profile_id, entity_id, currency_id)
- **vendors**: Vendor master data (id, name, contact_email, status [PENDING_APPROVAL, APPROVED, REJECTED], address, gst_exemption, bank_details)
- **categories**: Expense categories (id, name, description, is_active)
- **entities**: Business entities (id, name, address, country, is_active)
- **currencies**: ISO 4217 currencies (id, code, name, symbol, is_active)
- **invoice_profiles**: Recurring invoice templates (id, name, frequency, default_amount)

### Audit & Logging Tables
- **activity_logs**: Invoice activity audit (id, invoice_id, user_id, action, old_data, new_data, ip_address, user_agent)
- **user_audit_logs**: User management audit (id, target_user_id, actor_user_id, event_type, old_data, new_data)

### File Storage
- **attachments**: Invoice file attachments (id, invoice_id, file_name, file_url, file_size, mime_type, uploaded_by_id)

### Sprint 13 Schema Enhancements
- Added `is_recurring` field to invoices (boolean, default false)
- Added `is_paid` field to invoices (boolean, default false)
- Added `invoice_received_date` field to invoices (DateTime, nullable)
- Added `invoice_profile_id` field to invoices (foreign key, nullable)
- Added `entity_id` field to invoices (foreign key, nullable)
- Added `currency_id` field to invoices (foreign key, nullable)
- Added `status` field to vendors (enum: PENDING_APPROVAL, APPROVED, REJECTED)

---

## Environment Variables

**Required Variables** (in .env file):
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # Local
NEXTAUTH_URL="https://paylog-3.up.railway.app"  # Production
NEXTAUTH_SECRET="your-secret-here"  # Generate with: openssl rand -base64 32

# File Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# Email (SendGrid)
SENDGRID_API_KEY="your-sendgrid-api-key"
EMAIL_FROM="noreply@paylog.com"

# Railway (auto-set in production)
RAILWAY_ENVIRONMENT="production"
PORT=3000
```

---

## Development Workflow

### Starting Development
```bash
# 1. Navigate to project
cd /Users/althaf/Projects/paylog-3

# 2. Check git status (CRITICAL - always check first!)
git status
git diff  # Review uncommitted changes

# 3. Install dependencies (if needed)
pnpm install

# 4. Start dev server
pnpm dev
# Server runs at: http://localhost:3000

# 5. Open Prisma Studio (optional, for database inspection)
npx prisma studio
# Studio runs at: http://localhost:5555
```

### Before Every Commit
```bash
# ALWAYS run quality gates before committing:
1. pnpm typecheck  # TypeScript errors (must be 0)
2. pnpm lint       # ESLint warnings (fix new ones)
3. pnpm build      # Production build (must succeed)

# If all pass:
4. git add <files>
5. git commit -m "feat: Your commit message"
6. git push
```

### Git Workflow
- **Main branch**: `main` (protected, auto-deploys to Railway)
- **Commit format**: Conventional Commits (feat:, fix:, docs:, refactor:, test:, chore:)
- **Commit footer**: Always include Claude Code attribution
- **Pre-commit hook**: Husky runs lint-staged automatically

### Quality Gates (MUST PASS)
1. **TypeScript**: `pnpm typecheck` - 0 errors required
2. **ESLint**: `pnpm lint` - Fix new warnings (pre-existing OK)
3. **Build**: `pnpm build` - Must succeed, check bundle size
4. **Manual Test**: Test in browser before pushing

### Railway Deployment
- **Auto-deploy**: On push to main branch
- **Build time**: ~4-5 minutes
- **Health check**: Automatic after deployment
- **Logs**: `railway logs --tail` (monitor in real-time)
- **Status**: `railway status` (check deployment status)

---

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm typecheck              # TypeScript type checking
pnpm lint                   # ESLint code quality check
pnpm format                 # Prettier code formatting

# Database
npx prisma studio           # Open Prisma Studio GUI
npx prisma generate         # Regenerate Prisma Client
npx prisma db push          # Push schema changes to database
npx prisma migrate dev      # Create and apply migration
npx prisma migrate deploy   # Apply migrations (production)

# Git
git status                  # Check uncommitted changes (ALWAYS CHECK FIRST!)
git diff                    # Review all modifications
git log --oneline -10       # View recent commits
git show <commit-hash>      # View specific commit details

# Railway
railway status              # Check Railway deployment status
railway logs --tail         # Monitor production logs
railway open                # Open Railway dashboard

# Scripts
pnpm tsx scripts/reset-admin-password.ts <email> <new-password>  # Reset user password
```

---

## Key Files to Reference

### Documentation (Start Here)
- `/Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_24_DEBUGGING.md` - Latest session (THIS SESSION)
- `/Users/althaf/Projects/paylog-3/docs/SPRINTS_REVISED.md` - Project plan and progress
- `/Users/althaf/Projects/paylog-3/docs/ARCHITECTURE.md` - System architecture overview
- `/Users/althaf/Projects/paylog-3/docs/STYLING_GUIDE.md` - Design system documentation
- `/Users/althaf/Projects/paylog-3/docs/SPRINT_14_IMPLEMENTATION_PLAN.md` - Next sprint details

### Code (Important Files)
- `app/layout.tsx` - Root layout with Sonner Toaster
- `components/layout-v2/header-v2.tsx` - Navbar with NavbarPlusMenu (fixed Nov 24)
- `components/layout-v2/navbar-plus-menu.tsx` - Create actions dropdown
- `lib/utils/format.ts` - Defensive currency formatting (fixed Nov 24)
- `lib/rbac-v2.ts` - RBAC permission utilities
- `lib/actions/invoices-v2.ts` - Invoice V2 server actions
- `lib/auth.ts` - NextAuth config and permission helpers
- `prisma/schema.prisma` - Database schema (Sprint 13 fields added)
- `next.config.mjs` - Next.js config with unique build IDs

### Scripts
- `scripts/reset-admin-password.ts` - Admin password reset utility (created Nov 24)

---

## Critical Lessons from Recent Sessions

### Lesson 1: Git Workflow - ALWAYS Check Uncommitted Changes FIRST
**From**: November 24 session (Issue #3: '+' button not working on Railway)

**Problem**: Spent 3+ hours debugging Railway deployment when root cause was uncommitted local changes in `header-v2.tsx`

**Root Cause**:
- Developer made changes to `header-v2.tsx` locally (NavbarPlusMenu integration)
- Tested on localhost: WORKED PERFECTLY ✅
- Committed `navbar-plus-menu.tsx` component but forgot `header-v2.tsx`
- Railway deployed without header changes
- Localhost kept working (uncommitted changes present)

**Correct Workflow**:
```bash
# BEFORE starting any debugging:
1. git status                # Check for uncommitted changes
2. git diff                  # Review all modifications
3. git diff --cached         # Review staged changes

# If uncommitted changes exist:
4. Review each file carefully
5. Determine if changes are needed for feature
6. Commit related changes together

# THEN proceed with debugging
```

**Time Impact**: Wasted 3 hours debugging when 5 minutes checking git would have found the issue

**Prevention**: Add to debugging checklist: "Check git status FIRST before debugging deployment issues"

---

### Lesson 2: Defensive Programming for External Data
**From**: November 24 session (Issue #1: Currency error)

**Problem**: Currency field accepted invalid values (country codes instead of currency codes), causing app crashes

**Solution**: Defensive programming pattern in utility functions

```typescript
// Defensive utility function pattern
export function safeFormatCurrency(amount: number, code?: string): string {
  let validCode = code || 'USD';

  // 1. Map common mistakes (country codes → currency codes)
  const corrections: Record<string, string> = {
    'IN': 'INR',
    'US': 'USD',
    // ...more mappings
  };

  if (validCode in corrections) {
    console.warn(`Invalid code "${validCode}", using "${corrections[validCode]}"`);
    validCode = corrections[validCode];
  }

  // 2. Try-catch for unexpected invalid codes
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCode,
    }).format(amount);
  } catch (error) {
    // 3. Fallback: never crash, always display something
    console.error(`Currency formatting error:`, error);
    return `${validCode} ${amount.toFixed(2)}`;
  }
}
```

**Benefits**: App never crashes due to bad data, logs warn about issues, provides degraded but functional experience

---

### Lesson 3: Commit Related Changes Together (Atomic Commits)
**From**: November 24 session (Issue #3: '+' button)

**Problem**: Committed component file but not integration file, resulting in half-implemented feature

**Correct Approach**: Atomic Commits
```bash
# Create component
# Integrate component
# Test locally
# THEN commit both together

git add components/layout-v2/navbar-plus-menu.tsx
git add components/layout-v2/header-v2.tsx
git commit -m "feat: Add NavbarPlusMenu dropdown with full integration"
```

**Checklist Before Committing**:
- ☐ Component file created
- ☐ Component integrated in parent
- ☐ Component tested in browser
- ☐ All import statements present
- ☐ All related files staged together
- ☐ `git diff` shows complete feature
- ☐ No "TODO: integrate this" comments

---

### Lesson 4: Always Run Quality Gates Before Pushing
**From**: November 22 session (11 Railway build failures)

**Problem**: Local dev passed but Railway builds failed due to TypeScript errors, missing files, ESLint issues

**Correct Workflow**:
```bash
# BEFORE pushing any commit:
pnpm typecheck  # TypeScript strict mode (catches type errors)
pnpm lint       # ESLint with all rules (catches code quality issues)
pnpm build      # Production build test (catches build-time errors)

# If all pass, then commit and push
git add .
git commit -m "feat: Add feature"
git push
```

**Time Impact**: 3 minutes checking locally saves 30+ minutes waiting for Railway builds

---

### Lesson 5: Browser Cache vs Server Cache vs Git
**From**: November 24 session (Issue #2 and #3)

**Three Different Cache Layers**:
1. **Browser Cache**: Fixed with hard refresh (Cmd+Shift+R)
2. **Server/CDN Cache**: Fixed with unique build IDs
3. **Git "Cache"** (working directory): Fixed with `git status` and committing

**Debugging Priority**:
1. Check Git first (free, instant)
2. Test browser cache (hard refresh, incognito)
3. Check server cache (build IDs, headers)

---

## Ready to Continue?

### Next Task: Sprint 13 Phase 6 - Documentation & Release Prep (1.5 SP)

**What to Do**:
1. Start with USER_GUIDE.md (0.5 SP)
   - Create step-by-step tutorials for invoice v2 workflows
   - Add screenshots of recurring and non-recurring invoice forms
   - Document vendor approval workflow
   - Add troubleshooting section

2. API Documentation (0.3 SP)
   - Document server actions in `lib/actions/invoices-v2.ts`
   - Include request/response types
   - Document error codes
   - Add authentication requirements

3. Deployment Guide (0.2 SP)
   - Railway setup from scratch
   - Environment variables
   - Database migrations
   - SSL and domain configuration

4. Changelog (0.3 SP)
   - Generate from git history (Sprints 1-13)
   - Group by category
   - Highlight milestones

5. Release Notes (0.2 SP)
   - Executive summary
   - Migration guide
   - Known issues
   - Roadmap

### Commands to Start
```bash
cd /Users/althaf/Projects/paylog-3
git status  # Should be clean (all Nov 24 fixes committed)
git log --oneline -10  # Review recent commits
pnpm dev  # Start local dev server if needed
```

### Files to Create/Update
- `docs/USER_GUIDE.md` (create)
- `docs/API_DOCUMENTATION.md` (create)
- `docs/DEPLOYMENT_GUIDE.md` (create or update RAILWAY_DEPLOYMENT_GUIDE.md)
- `CHANGELOG.md` (create)
- `docs/RELEASE_NOTES_v1.0.0.md` (create)

---

## Quick Reference

**Production URL**: https://paylog-3.up.railway.app

**Admin Credentials**: Use password reset script if needed:
```bash
pnpm tsx scripts/reset-admin-password.ts admin@example.com NewSecurePass123
```

**Database**: Railway PostgreSQL (connection string in .env)

**Branch**: main (protected, auto-deploys to Railway)

**Quality Gates**: TypeScript 0 errors ✅ | ESLint 0 new warnings ✅ | Build success ✅

**Sprint Status**: Sprint 13 Phase 6 (Documentation) - Ready to Start

**Token Budget**: ~127K remaining (73K used this session)

---

**Ready to continue. Next: Start Phase 6 documentation tasks (1.5 SP).**

Copy this entire document to restore full context in your next session.
