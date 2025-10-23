# PayLog Sprint Plan (Revised)

**Last Updated**: October 23, 2025
**Total Story Points**: 183 SP
**Completed**: 130 SP (71.0%)
**Remaining**: 53 SP (29.0%)

---

## 📊 Sprint Status Overview

| Sprint | Status | Story Points | Deliverables |
|--------|--------|--------------|--------------|
| Sprint 1 | ✅ Complete | 13 SP | Foundation Setup |
| Sprint 2 | ✅ Complete | 24 SP | Stacked Panels + Invoice CRUD (Enhanced) |
| Sprint 3 | ✅ Complete | 16 SP | Payments & Workflow Transitions + Due Date Intelligence |
| Sprint 4 | ✅ Complete | 22 SP | Search, Filters & Reporting |
| Sprint 5 | ✅ Complete | 13 SP | Email Notifications & User-Created Master Data |
| Sprint 6 | ✅ Complete | 12 SP | File Attachments & Storage |
| Sprint 7 | ✅ Complete | 14 SP | Activity Logging & Collaboration |
| Sprint 8 | ✅ Complete | 13 SP | Master Data Management (Admin) |
| **Sprint 9A** | **🚀 Current** | **14 SP** | **Admin Reorganization & Enhanced Master Data** |
| **Sprint 9B** | **🔲 Planned** | **12 SP** | **Invoice Profile Enhancement** |
| Sprint 10 | 🔲 Planned | 12 SP | User Management & RBAC |
| Sprint 11 | 🔲 Planned | 14 SP | Dashboard & Analytics |
| Sprint 12 | 🔲 Planned | 9 SP | Polish, Testing & Production Prep |

---

## 🔄 What Changed from Original Plan?

### **Original Sprint 9** (Cancelled)
- ❌ Archive Request Workflow (11 SP)
- **Reason**: Standard users can't access admin-only master data, so archive request workflow doesn't make sense
- **Solution**: Admins use direct archive/unarchive via trash icon

### **New Sprints 9A + 9B** (Added)
- ✅ Sprint 9A: Admin Reorganization & Enhanced Master Data (14 SP)
- ✅ Sprint 9B: Invoice Profile Enhancement (12 SP)
- **Total**: 26 SP
- **Net Change**: +15 SP (26 - 11 = +15)

### **Project Impact**
- **Original Total**: 179 SP
- **Revised Total**: 183 SP (+4 SP)
- **Reason**: More comprehensive master data enhancements than originally planned

---

## 🚀 Sprint 9A: Admin Reorganization & Enhanced Master Data (14 SP)

**Status**: 🚀 **CURRENT SPRINT (IN PROGRESS - 3/10 phases complete)**
**Goal**: Move master data to admin menu, add currency support, enhance all master data entities
**Progress**: 130/183 SP Complete (71.0%)

### ✅ Completed Phases (3/10)

#### **Phase 1: Requirements Clarification & Change Mapping (RC+CN)** - COMPLETE ✅
- ✅ Clarified target audience, scope, depth, format preferences
- ✅ Analyzed impact on existing codebase
- ✅ Mapped database schema changes
- ✅ Documented key decisions (see "Adjusted Plan" section below)

#### **Phase 2: Schema Design (DME)** - COMPLETE ✅
- ✅ Created `Currency` table (50 ISO 4217 currencies)
- ✅ Created `Entity` table (NEW table, coexists with SubEntity)
- ✅ Enhanced `Vendor` with address, gst_exemption, bank_details
- ✅ Enhanced `Category` with required description
- ✅ Retained `PaymentType.description` field (user requirement change)
- ✅ Added Invoice foreign keys: currency_id, entity_id (nullable)
- ✅ Dropped `ArchiveRequest` table (0 pending requests confirmed)

#### **Phase 3: Migration Execution** - COMPLETE ✅
- ✅ Applied Prisma schema changes
- ✅ Seeded 50 ISO 4217 currencies (all inactive)
- ✅ Migrated 3 entities from SubEntity (placeholder addresses)
- ✅ Backfilled Category descriptions ("No description provided")
- ✅ Regenerated Prisma Client successfully
- ✅ Zero breaking changes to existing code
- ✅ All existing invoices load correctly

### 🔄 Adjusted Plan (Key Decisions)

**Decision 1: Safe Entity Migration Strategy**
- **Original Plan**: Rename SubEntity → Entity (breaking change)
- **Adjusted Plan**: Create NEW Entity table alongside SubEntity (zero breaking changes)
- **Rationale**: Safer migration, easy rollback, no downtime
- **Impact**: Both tables coexist; migration path established for Sprint 9B

**Decision 2: PaymentType Description KEPT**
- **Original Plan**: Remove description field from PaymentType
- **Adjusted Plan**: KEEP description field (make it required with name and requires_reference)
- **Rationale**: User requirement - all 3 fields mandatory for PaymentType
- **Impact**: No schema change for PaymentType description

**Decision 3: Admin RBAC Behavior**
- **Question**: 403 Forbidden or redirect for non-admin users accessing /admin/*?
- **Decision**: 403 Forbidden with error page
- **Rationale**: Clearer error, no redirect loops if user bookmarks URL

**Decision 4: Currency List (50 ISO 4217)**
- **Selected**: USD, EUR, GBP, JPY, CNY, INR, AUD, CAD, CHF, BRL, KRW, MXN, RUB, SGD, HKD, SEK, NOK, ZAR, TRY, NZD + 30 more regional currencies
- **All start inactive**: Admins explicitly activate currencies as needed

**Decision 5: Entity Country Field**
- **Format**: Store ISO 3166-1 alpha-2 codes (US, IN, GB)
- **Display**: Full country names with autocomplete search
- **Rationale**: Database optimization (2 chars) + UX friendliness (full names)

### Migration Results Summary

**Database Changes Applied:**
- ✅ Currency table: 50 ISO 4217 currencies (all inactive)
- ✅ Entity table: 3 entities migrated from SubEntity (placeholder addresses)
- ✅ Vendor enhancements: address, gst_exemption, bank_details fields
- ✅ Category enhancement: description field (required, backfilled)
- ✅ Invoice foreign keys: currency_id, entity_id (nullable for backward compatibility)
- ✅ ArchiveRequest table: DROPPED (0 pending requests confirmed)
- ✅ Prisma Client: Regenerated successfully, all models working

**Post-Migration Status:**
- SubEntity table preserved (untouched)
- Zero breaking changes to existing code
- All existing invoices load correctly
- Safe rollback available within 24-hour window

**Pending Admin Tasks (Post-Implementation):**
1. Activate Currencies: `UPDATE currencies SET is_active = true WHERE code IN ('USD', 'INR');`
2. Update Entity Addresses: Replace "Migration: Address pending" with real addresses
3. Update Entity Countries: Replace default 'US' with correct ISO alpha-2 codes
4. Update Vendor Fields: Add addresses, GST exemption, bank details (via admin UI in Phase 7)

### 🔲 Remaining Phases (7/10)

#### **Phase 4: RBAC Middleware (IE+SA)** - PENDING
- [ ] Implement middleware for `/admin/*` routes
- [ ] Block non-admin access with 403 Forbidden error page
- [ ] Add server-side permission checks in admin actions
- [ ] Test with standard_user, admin, super_admin roles

#### **Phase 5: Admin Menu Structure (IE)** - PENDING
- [ ] Move "Master Data" from `/settings` → `/admin/master-data`
- [ ] Update sidebar navigation (show "Admin" menu only to admin roles)
- [ ] Remove "Master Data" tab from Settings page
- [ ] Settings page now has: Profile + My Requests tabs only

#### **Phase 6: Currency Management UI (SUPB+IE)** - PENDING
- [ ] Build Currency CRUD UI in `/admin/master-data` (new tab)
- [ ] Currency selector: searchable dropdown with symbol + name
- [ ] Activation toggle in table view (not in forms)
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Phase 7: Entity Management UI (IE)** - PENDING
- [ ] Update Entity CRUD UI with address/country fields
- [ ] Address field: required, text input
- [ ] Country field: required, searchable dropdown (ISO alpha-2)
- [ ] Archive/unarchive via trash icon in table only
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Phase 8: Vendor Enhancement UI (SUPB+IE)** - PENDING
- [ ] Update Vendor CRUD UI with new fields:
  - Address (optional, string)
  - GST Exemption (required, boolean, default false)
  - Bank Details (optional, textarea)
- [ ] Add "+ Add New Vendor" link in invoice form (admin only)
  - Opens Level 3 panel (500px)
  - Creates vendor immediately
  - Auto-selects in dropdown
- [ ] ❌ Remove "+ Request New Vendor" link (standard users)
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Phase 9: Category/PaymentType Updates (IE)** - PENDING
- [ ] Category: Verify description field is required (already in schema)
- [ ] PaymentType: Verify description field is required (already in schema)
- [ ] Update CRUD UIs to reflect required fields
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Phase 10: Testing & Integration (TA+ICA)** - PENDING
- [ ] Validate all CRUD operations
- [ ] Test RBAC middleware (403 for non-admins)
- [ ] Test currency activation workflow
- [ ] Test entity address/country fields
- [ ] Test vendor enhancements
- [ ] Run lint, typecheck, build
- [ ] Integration audit (ICA) - no regressions
- [ ] Manual testing on PostgreSQL (local + Railway)

#### **Phase 11: Quality Gates & Docs (PRV+DA)** - PENDING
- [ ] Production readiness verification (PRV)
- [ ] Update documentation (README, CHANGELOG, SESSION_HANDOFF)
- [ ] Update sprint status in SPRINTS_REVISED.md
- [ ] Create migration guide for admins
- [ ] Final quality check (lint, typecheck, build, tests)
- [ ] Deploy-ready confirmation

### Technical Highlights
- Admin-only master data management (RBAC enforced)
- ISO 4217 currency support (170+ currencies)
- Entity renamed for clarity (Entity vs. SubEntity)
- Simplified forms (no is_active checkbox clutter)
- Quick vendor creation from invoice form (admin only)

### Acceptance Criteria
- ✅ `/admin/master-data` accessible only to admin + super_admin
- ✅ Settings page has no Master Data tab
- ✅ Currency table exists with ISO 4217 data
- ✅ Entity renamed everywhere (no SubEntity references)
- ✅ Vendor has address/GST/bank details fields
- ✅ Category description is required
- ✅ PaymentType has no description field
- ✅ NO `is_active` checkbox in any create/edit form
- ✅ Admin can create vendor from invoice form (panel)
- ✅ Standard users see NO quick-create links in invoice form

---

## 🔲 Sprint 9B: Invoice Profile Enhancement (12 SP)

**Status**: 🔲 **PLANNED**
**Goal**: Enhance invoice profiles with 12 comprehensive fields, implement profile-based invoice creation

### Deliverables

#### **Phase 1: Schema Migration** (2 SP)
- [ ] Add 7 new fields to `InvoiceProfile`:
  - `entity_id` (Int, required) - Foreign key to Entity
  - `vendor_id` (Int, required) - Foreign key to Vendor
  - `category_id` (Int, required) - Foreign key to Category
  - `currency_id` (Int, required) - Foreign key to Currency
  - `prepaid_postpaid` (String?, optional) - 'prepaid' or 'postpaid'
  - `tds_applicable` (Boolean, required, default false)
  - `tds_percentage` (Float?, optional) - Required if tds_applicable=true
- [ ] Create foreign key constraints with `onDelete: Restrict`
- [ ] Add indexes on all foreign keys
- [ ] Migrate existing profiles (set default values for new fields)

#### **Phase 2: Invoice Profile CRUD UI** (4 SP)
- [ ] Build 12-field Invoice Profile form:
  - Profile Name (required)
  - Entity (required, dropdown)
  - Description (optional, textarea)
  - Vendor (required, searchable dropdown)
  - Category (required, searchable dropdown)
  - Currency (required, searchable dropdown with symbol)
  - Prepaid/Postpaid (optional, radio buttons)
  - TDS Applicable (required, checkbox)
  - TDS Percentage (required if applicable, number input)
- [ ] Conditional TDS percentage field (show only if TDS applicable)
- [ ] Validation: TDS percentage required if TDS applicable
- [ ] ❌ NO `is_active` checkbox in form
- [ ] Archive/unarchive via trash icon in table

#### **Phase 3: Invoice Creation with Profiles** (4 SP)
- [ ] Update invoice form to lock vendor/entity when profile selected
- [ ] Pre-fill fields from profile:
  - **LOCKED**: Vendor (disabled dropdown + tooltip)
  - **LOCKED**: Entity (disabled dropdown + tooltip)
  - **EDITABLE**: Category (pre-filled, can change)
  - **EDITABLE**: TDS Applicable (pre-filled, can toggle)
  - **EDITABLE**: TDS Percentage (pre-filled, can edit)
  - **EDITABLE**: Currency (shown, auto-set from profile)
- [ ] Visual indicators for locked fields (gray background + lock icon)
- [ ] Handle profile change (reset locked fields, keep user data)
- [ ] Add "+ Add New Invoice Profile" link (admin only)
  - Shows confirmation dialog
  - Saves current invoice as draft (localStorage)
  - Navigates to `/admin/master-data/invoice-profiles/new?returnTo=invoice-draft`
  - After creation, redirects back with draft restored
  - Auto-selects new profile
- [ ] ❌ Remove "+ Request New Invoice Profile" link (standard users)
- [ ] Keep "+ Add New Vendor" link (admin only, opens panel)
- [ ] ❌ Remove "+ Request New Vendor" link (standard users)

#### **Phase 4: Testing & QA** (2 SP)
- [ ] Test all CRUD operations on invoice profiles
- [ ] Test invoice creation from profiles
- [ ] Test locked vs. editable field behavior
- [ ] Test admin quick-create workflows (vendor panel + profile navigation)
- [ ] Test draft save/restore for invoice profiles
- [ ] Verify RBAC (standard users can't access admin routes)
- [ ] Test with multiple currencies
- [ ] Test TDS conditional logic
- [ ] Run lint, typecheck, build
- [ ] Test on PostgreSQL (local + Railway)

### Technical Highlights
- 12-field invoice profiles (comprehensive template)
- Profile-based invoice creation (locked + editable fields)
- Draft save for complex profile creation (localStorage)
- Admin quick-create from invoice form (UX optimization)
- Currency integration (multi-currency support)
- TDS conditional logic (show percentage only if applicable)

### Acceptance Criteria
- ✅ Invoice profiles have 12 fields (7 new + 5 existing)
- ✅ Foreign keys to Entity, Vendor, Category, Currency
- ✅ Invoice form locks vendor/entity when profile selected
- ✅ Category/TDS/Currency pre-filled but editable
- ✅ Admin "+ Add New Invoice Profile" navigates with draft save
- ✅ Admin "+ Add New Vendor" opens panel (quick create)
- ✅ Standard users see NO quick-create links
- ✅ TDS percentage field conditional on TDS applicable
- ✅ All quality gates pass (lint, typecheck, build, tests)

---

## 🔲 Sprint 10: User Management & RBAC (12 SP)

**Status**: 🔲 **PLANNED**
**Goal**: Complete user management and permissions

### Deliverables
- [ ] User CRUD (super admin only)
  - [ ] Create user
  - [ ] Edit user (name, email, role)
  - [ ] Deactivate user
  - [ ] Reset password
  - [ ] List users with pagination
- [ ] User UI
  - [ ] User management page
  - [ ] User detail panel
  - [ ] User form panel
  - [ ] Password reset dialog
- [ ] Role management
  - [ ] Assign roles (standard_user, admin, super_admin)
  - [ ] Protect last super admin (cannot deactivate)
  - [ ] Role-based UI visibility
- [ ] Profile visibility management
  - [ ] Grant user access to private profiles
  - [ ] Revoke user access
  - [ ] List users with profile access
- [ ] Audit trail
  - [ ] Log user actions (create, edit, delete)
  - [ ] Show audit history per user
  - [ ] Show recent activity (dashboard)

### Acceptance Criteria
- Only super admins can create/edit users
- Last super admin cannot be deactivated
- Password reset sends email (Sprint 5 integration)
- Profile visibility grants work correctly
- Audit trail captures all user actions

---

## 🔲 Sprint 11: Dashboard & Analytics (14 SP)

**Status**: 🔲 **PLANNED**
**Goal**: Build comprehensive dashboard with KPIs

### Deliverables
- [ ] Dashboard KPIs
  - [ ] Total invoices (all statuses)
  - [ ] Pending approvals count
  - [ ] Total amount unpaid
  - [ ] Total amount paid (current month)
  - [ ] Overdue invoices count
  - [ ] Invoices on hold count
- [ ] Charts & visualizations
  - [ ] Invoice status breakdown (pie chart)
  - [ ] Payment trends (line chart, 6 months)
  - [ ] Top vendors by spending (bar chart)
  - [ ] Monthly invoice volume (line chart)
- [ ] Recent activity feed
  - [ ] Recent invoices created
  - [ ] Recent payments received
  - [ ] Recent status changes
  - [ ] Recent rejections
- [ ] Quick actions
  - [ ] Create invoice (button)
  - [ ] Approve pending (button + count)
- [ ] Role-based dashboard
  - [ ] Standard user: own invoices only
  - [ ] Admin: all invoices
  - [ ] Super admin: system stats

### Acceptance Criteria
- KPIs update in real-time
- Charts render within 1 second
- Activity feed shows last 10 items
- Quick actions respect RBAC
- Dashboard responsive on mobile

---

## 🔲 Sprint 12: Polish, Testing & Production Prep (9 SP)

**Status**: 🔲 **PLANNED**
**Goal**: Final polish and production readiness

### Deliverables
- [ ] Testing
  - [ ] Unit tests (key functions, 80% coverage)
  - [ ] Integration tests (API routes)
  - [ ] E2E tests (critical user flows)
  - [ ] Load testing (simulate 100 concurrent users)
- [ ] Performance optimization
  - [ ] Database query optimization
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] Caching strategy
- [ ] Security audit
  - [ ] OWASP Top 10 checklist
  - [ ] SQL injection prevention
  - [ ] XSS prevention
  - [ ] CSRF protection
  - [ ] Rate limiting
- [ ] Production setup
  - [ ] Environment variables documentation
  - [ ] Database migration strategy
  - [ ] Backup and restore procedures
  - [ ] Monitoring setup (logging, alerts)
  - [ ] Deployment guide (Docker, Railway, Vercel)
- [ ] Documentation
  - [ ] User guide
  - [ ] Admin guide
  - [ ] API documentation
  - [ ] Troubleshooting guide
- [ ] Polish
  - [ ] Loading states everywhere
  - [ ] Error boundaries
  - [ ] Empty states
  - [ ] 404/500 pages
  - [ ] Favicon and branding

### Acceptance Criteria
- 80%+ test coverage
- Lighthouse score >90 (performance, accessibility)
- Security audit passes
- Production deployment successful
- Documentation complete and accurate

---

## 📈 Sprint Velocity

**Average SP per Sprint**: 16.3 SP (130 SP / 8 sprints completed)
**Estimated Completion**: 13 sprints total (revised from 12)
**Current Progress**: Sprint 9A In Progress (3/10 phases complete)
**Story Point Progress**: 130/183 SP (71.0% complete)

**Sprint Completions**:
- Sprint 1: 13 SP ✅
- Sprint 2: 24 SP ✅ (+2 SP scope increase)
- Sprint 3: 16 SP ✅
- Sprint 4: 22 SP ✅ (+7 SP scope increase)
- Sprint 5: 13 SP ✅ (-13 SP scope reduction, focused implementation)
- Sprint 6: 12 SP ✅ (on target, local filesystem MVP)
- Sprint 7: 14 SP ✅ (on target, activity logging & collaboration)
- Sprint 8: 13 SP ✅ (on target, master data management)

**Remaining Sprints**:
- Sprint 9A: 14 SP 🚀 (current)
- Sprint 9B: 12 SP 🔲
- Sprint 10: 12 SP 🔲
- Sprint 11: 14 SP 🔲
- Sprint 12: 9 SP 🔲

---

## 🎯 Current Focus: Sprint 9A

**Priority**: Admin menu reorganization and enhanced master data
**Blockers**: None
**Dependencies**: PostgreSQL 17 migration complete ✅

**To Start Sprint 9A**:
1. Move Master Data from Settings to Admin menu
2. Implement RBAC middleware for `/admin/*` routes
3. Create Currency table with ISO 4217 seed data
4. Rename SubEntity → Entity with address/country fields
5. Enhance Vendor with address/GST/bank details
6. Update Category (description required) and PaymentType (remove description)
7. Remove `is_active` checkbox from all forms
8. Add admin quick-create vendor from invoice form
9. Remove standard user quick-create links from invoice form
10. Clean up ArchiveRequest table and related code

---

## 📊 Project Milestones

### Completed Milestones
- ✅ **Milestone 1**: Core Invoice Management (Sprints 1-4) - 75 SP
- ✅ **Milestone 2**: Collaboration & Master Data (Sprints 5-8) - 52 SP

### Upcoming Milestones
- 🚀 **Milestone 3**: Enhanced Master Data & Profiles (Sprints 9A-9B) - 26 SP
- 🔲 **Milestone 4**: User Management & Analytics (Sprints 10-11) - 26 SP
- 🔲 **Milestone 5**: Production Launch (Sprint 12) - 9 SP

---

## 🔄 Version History

### Version 2.0 (October 21, 2025)
- Replaced Sprint 9 (Archive Request Workflow) with Sprint 9A + 9B
- Added comprehensive master data enhancements
- Added currency support (ISO 4217)
- Enhanced invoice profile with 12 fields
- Removed archive request workflow (admin direct archive instead)
- Total SP: 179 → 183 (+4 SP)
- Updated PostgreSQL migration status (local + Railway) ✅

### Version 1.0 (October 15, 2025)
- Original sprint plan with 12 sprints
- Total SP: 179
- Completed through Sprint 8

---

**Last Updated**: October 21, 2025
**Next Review**: After Sprint 9A completion
**Status**: Active Development
