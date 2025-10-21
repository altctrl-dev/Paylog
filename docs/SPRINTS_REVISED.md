# PayLog Sprint Plan (Revised)

**Last Updated**: October 21, 2025
**Total Story Points**: 183 SP
**Completed**: 127 SP (69.4%)
**Remaining**: 56 SP (30.6%)

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

**Status**: 🚀 **CURRENT SPRINT**
**Goal**: Move master data to admin menu, add currency support, enhance all master data entities

### Deliverables

#### **Phase 1: Admin Menu Structure** (3 SP)
- [ ] Move "Master Data" from `/settings` → `/admin/master-data`
- [ ] Add RBAC middleware to `/admin/*` (admin + super_admin only)
- [ ] Update sidebar navigation (show "Admin" menu only to admin roles)
- [ ] Remove "Master Data" tab from Settings page
- [ ] Settings page now has: Profile + My Requests tabs only

#### **Phase 2: Currency Management** (3 SP)
- [ ] Create `Currency` table in schema
  - Fields: `id, code, name, symbol, is_active, created_at, updated_at`
  - Relations: `InvoiceProfile[]`, `Invoice[]`
- [ ] Seed with ISO 4217 currencies (top 50, all inactive by default)
- [ ] Build Currency CRUD UI in `/admin/master-data` (new tab 6)
- [ ] Currency selector: searchable dropdown with symbol + name
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Phase 3: Entity Enhancement** (2 SP)
- [ ] Rename `SubEntity` → `Entity` in schema
- [ ] Update all code references (SubEntity → Entity)
- [ ] Add `address` field (required, string)
- [ ] Add `country` field (required, dropdown from ~250 countries)
- [ ] Update Entity CRUD UI
- [ ] ❌ NO `is_active` checkbox in create/edit forms
- [ ] Archive/unarchive via trash icon in table only

#### **Phase 4: Vendor Enhancement** (3 SP)
- [ ] Add `address` field (optional, string)
- [ ] Add `gst_exemption` field (required, boolean, default false)
- [ ] Add `bank_details` field (optional, textarea)
- [ ] Update Vendor CRUD UI (4 fields total)
- [ ] Add "+ Add New Vendor" link in invoice form (admin only)
  - Opens Level 3 panel (500px)
  - Creates vendor immediately
  - Auto-selects in dropdown
- [ ] ❌ Remove "+ Request New Vendor" link (standard users)
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Phase 5: Category & Payment Type Updates** (3 SP)
- [ ] Category: Make `description` field required (was optional)
- [ ] PaymentType: Remove `description` field entirely
- [ ] PaymentType: Keep only `name` + `requires_reference` fields
- [ ] Update all CRUD UIs
- [ ] ❌ NO `is_active` checkbox in create/edit forms

#### **Cleanup Tasks**
- [ ] Drop `archive_requests` table from schema
- [ ] Delete archive request server actions (if any)
- [ ] Delete archive request components (if any)
- [ ] Remove `is_active` checkbox from ALL master data forms

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

**Average SP per Sprint**: 15.9 SP (127 SP / 8 sprints completed)
**Estimated Completion**: 13 sprints total (revised from 12)
**Current Progress**: 8/13 sprints (61.5% complete)
**Story Point Progress**: 127/183 SP (69.4% complete)

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
