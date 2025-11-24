# PayLog - Detailed Sprint Plan V2 (Session-Restoration Optimized)

**Created**: November 24, 2025
**Last Updated**: November 24, 2025
**Status**: ACTIVE PLAN
**Purpose**: Comprehensive, session-restoration-friendly implementation guide

---

## 📊 Project Status Overview

**Total Story Points**: 208 SP
**Completed**: 197.5 SP (94.9%)
**Remaining**: 10.5 SP (5.1%)

**Current Sprint**: Sprint 14 (In Progress - 40% complete)
**Next**: Security Audit → Sprint 13 Phase 6 (Documentation) → v1.0.0 Launch

---

## 🎯 Execution Order (UPDATED - Nov 24, 2025)

```
Phase 1: Sprint 14 Completion        (~30-40 hours)
   ├─ Item #11 & #12: Edit Button     (6-8h)  🔥 CRITICAL
   ├─ NEW: Invoice Forms → Panels     (3h)    ⭐ HIGH VALUE
   ├─ Item #4: Amount Field UX        (2-3h)
   ├─ Item #5: Panel Styling          (1-2h)
   ├─ Item #6: Payment Types          (4-5h)
   ├─ Item #7: Billing Frequency      (3-5h)
   ├─ Item #8: Activities Tab         (4-5h)
   ├─ Item #9: Settings Restructure   (3-4h)
   └─ Item #10: Invoice Tabs          (4-5h)

Phase 2: Security Audit               (~8-12 hours)
   ├─ Automated security scans
   ├─ Manual code review
   ├─ Dependency audit
   ├─ Penetration testing
   └─ Security hardening

Phase 3: Sprint 13 Phase 6 (Docs)    (~3-4 hours)
   ├─ USER_GUIDE.md
   ├─ API Documentation
   ├─ Deployment Guide
   ├─ CHANGELOG.md
   └─ Release Notes v1.0.0

Phase 4: v1.0.0 Launch               (~2-4 hours)
   ├─ Final QA testing
   ├─ Deployment to production
   ├─ Post-deployment verification
   └─ Monitoring setup
```

---

## 🔥 PHASE 1: Sprint 14 Completion (30-40 hours)

---

### ✅ Item #11 & #12: Edit Button Feature (6-8 hours) - CRITICAL

**Status**: 🔥 BLOCKING WORKFLOW
**Priority**: 1 (DO FIRST)
**Detailed Plan**: `docs/EDIT_BUTTON_WORKFLOW.md`

#### **Business Rules (CONFIRMED)**:

**Standard Users**:
1. ✅ Can create invoices
2. ❌ Cannot edit while status = "pending_approval"
3. ✅ Can edit after admin action (approved/rejected/on_hold)
4. 🔄 Editing changes status → "pending_approval"
5. 🔒 Can only edit own invoices

**Admins**:
1. ✅ Can edit any invoice
2. ✅ Can edit in any status
3. ✅ Edits don't change status

#### **Implementation Phases**:

**Phase 1.1: Permission Logic** (30 mins)
- **File**: `components/invoices/invoice-detail-panel-v2.tsx`
- **Line**: 96-103 (replace `canEdit` logic)
```typescript
const isOwner = invoice?.created_by_id === session?.user?.id;
const isStandardUser = session?.user?.role === 'standard_user';
const isPending = invoice?.status === 'pending_approval';

const canEdit =
  isAdmin ||
  (isOwner && isStandardUser && !isPending);
```
- **Test**: Edit button shows/hides correctly

**Phase 1.2: Create Edit Forms** (4-5 hours)
- **New Files**:
  - `components/invoices-v2/edit-recurring-invoice-form.tsx` (~250 lines)
  - `components/invoices-v2/edit-non-recurring-invoice-form.tsx` (~200 lines)
- **Copy from**: existing create forms
- **Add**: Pre-fill logic with invoice data
- **Test**: Form opens, fields populate, validation works

**Phase 1.3: Server Actions** (1-2 hours)
- **File**: `app/actions/invoices-v2.ts`
- **New Functions**:
  - `updateRecurringInvoice(invoiceId, data)`
  - `updateNonRecurringInvoice(invoiceId, data)`
- **Logic**: Standard user edit → status = "pending_approval"
- **Test**: Update succeeds, status changes correctly

**Phase 1.4: React Query Hooks** (30 mins)
- **File**: `hooks/use-invoices-v2.ts`
- **New Hooks**:
  - `useUpdateRecurringInvoiceV2()`
  - `useUpdateNonRecurringInvoiceV2()`
- **Test**: Mutations work, cache invalidates

**Phase 1.5: Wire Up Panel** (30 mins)
- **Files**:
  - `components/invoices/invoice-detail-panel-v2.tsx` (handleEdit)
  - `components/panels/panel-provider.tsx` (register panels)
- **Test**: Edit button → panel opens → form shows

**Phase 1.6: Testing** (1 hour)
- Standard user workflow (all statuses)
- Admin workflow (all statuses)
- Ownership checks
- Status transitions
- Validation errors

**Acceptance Criteria**:
- [x] Edit button permission logic correct
- [x] Forms pre-fill with invoice data
- [x] Standard user edit → status = "pending_approval"
- [x] Admin edit → status unchanged
- [x] Ownership enforced
- [x] All validation works

---

### ⭐ NEW: Invoice Forms → Panels (3 hours) - HIGH VALUE

**Status**: 🆕 NEW IMPROVEMENT
**Priority**: 2 (High UX value, quick win)
**Detailed Plan**: `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md`

#### **Goal**: Convert full-page routes to stacked panels

**Current**:
- Routes: `/invoices/new/recurring`, `/invoices/new/non-recurring`
- Full-page navigation

**New**:
- Click "Add Invoice" → Panel slides in
- Type selector → Form panel
- Stay on invoice list

#### **Implementation Phases**:

**Phase 2.1: Create Panel Wrappers** (30 mins)
- **New Files**:
  - `components/invoices-v2/recurring-invoice-panel.tsx`
  - `components/invoices-v2/non-recurring-invoice-panel.tsx`
- **Code**: Wrap existing forms in `PanelLevel`
- **Test**: Forms work in panels

**Phase 2.2: Create Type Selector** (45 mins)
- **New File**: `components/invoices-v2/invoice-type-selector-panel.tsx`
- **UI**: Two cards (Recurring / Non-Recurring)
- **Test**: Clicking opens correct form panel

**Phase 2.3: Register Panels** (15 mins)
- **File**: `components/panels/panel-provider.tsx`
- **Add**: 3 new panel cases
- **Test**: Panels render correctly

**Phase 2.4: Update Buttons** (15 mins)
- **Files**:
  - `app/(dashboard)/invoices/page.tsx` (handleNewInvoice)
  - `components/layout-v2/navbar-plus-menu.tsx` (menu item)
- **Change**: Open panel instead of route
- **Test**: Buttons open panels

**Phase 2.5: Verify Form Props** (30 mins)
- **Files**:
  - `components/invoices-v2/recurring-invoice-form.tsx`
  - `components/invoices-v2/non-recurring-invoice-form.tsx`
- **Add**: `onSuccess`, `onCancel` props
- **Test**: Panel closes on success/cancel

**Phase 2.6: Adjust Width & Polish** (30 mins)
- **Width**: 700px (or 800px if needed)
- **Scrolling**: Verify tall forms scroll
- **Responsive**: Test mobile (full-width)
- **Test**: UX feels smooth

**Phase 2.7: Remove Old Routes** (15 mins)
- **Delete**:
  - `app/(dashboard)/invoices/new/recurring/page.tsx`
  - `app/(dashboard)/invoices/new/non-recurring/page.tsx`
- **Or**: Add redirect to /invoices
- **Test**: Old URLs redirect

**Acceptance Criteria**:
- [x] "Add Invoice" opens type selector (500px panel)
- [x] Type selector shows 2 options with descriptions
- [x] Clicking option opens form panel (700px)
- [x] Form has all fields, validation works
- [x] Submit creates invoice, closes panel, refreshes list
- [x] Cancel closes panel
- [x] ESC key works
- [x] Responsive on mobile
- [x] Old routes removed/redirected

---

### Item #4: Amount Field UX (2-3 hours)

**Status**: ❌ TODO
**Priority**: 3 (High UX value)

#### **Problem**:
- Amount fields show `0` by default
- User types "1500" → becomes "01500"
- Must manually delete 0 first

#### **Solution**: Smart placeholder component

**Phase 4.1: Create AmountInput Component** (1 hour)
- **New File**: `components/invoices-v2/amount-input.tsx` (~40 lines)
```typescript
export function AmountInput({ value, onChange, ...props }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Input
      type="number"
      value={isFocused || value > 0 ? value : ''}
      placeholder="0.00"
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={onChange}
      {...props}
    />
  );
}
```

**Phase 4.2: Replace Amount Inputs** (1-2 hours)
- **Files to Update** (~8-10 files):
  - `components/invoices-v2/recurring-invoice-form.tsx`
  - `components/invoices-v2/non-recurring-invoice-form.tsx`
  - `components/invoices-v2/edit-recurring-invoice-form.tsx`
  - `components/invoices-v2/edit-non-recurring-invoice-form.tsx`
  - All other forms with amount fields
- **Change**: Replace `<Input type="number">` with `<AmountInput>`
- **Test**: Each form works correctly

**Acceptance Criteria**:
- [x] Empty field shows "0.00" placeholder
- [x] Focus clears placeholder
- [x] User types "1500" → shows 1500 (no leading 0)
- [x] Blur with empty → shows placeholder
- [x] Consistent across all forms

---

### Item #5: Panel Styling Consistency (1-2 hours)

**Status**: 🟡 PARTIAL (80% done)
**Priority**: 4

#### **Current**: Panel system exists, might have gaps

#### **Tasks**:

**Phase 5.1: Audit All Panels** (30 mins)
- **Find all panels**:
```bash
find components -name "*panel*.tsx" -type f
```
- **Check**: Gap at top, padding consistency, header alignment
- **Document**: Which panels have issues

**Phase 5.2: Fix PanelLevel Component** (30 mins)
- **File**: `components/panels/panel-level.tsx`
- **Ensure**: No gap at top (flex layout, no margin)
- **Verify**: Header touches top edge

**Phase 5.3: Update Inconsistent Panels** (30 mins)
- **Fix**: Panels not using `PanelLevel` correctly
- **Standardize**: Padding, spacing, header styles

**Acceptance Criteria**:
- [x] All panels touch page top (no gap)
- [x] Consistent header styling
- [x] Consistent padding (p-6 for content)
- [x] Smooth animations (slide-in)
- [x] Responsive widths

---

### Item #6: Payment Types CRUD (4-5 hours)

**Status**: ❌ TODO (placeholder only)
**Priority**: 5

#### **Current**: Placeholder with "Coming soon"

#### **Implementation**:

**Phase 6.1: Database Verify** (15 mins)
- **Check**: `payment_types` table schema
- **Verify**: Fields: name, requires_reference, is_active
- **Test**: Can insert/query

**Phase 6.2: Server Actions** (1 hour)
- **New File**: `app/actions/admin/payment-types.ts`
- **Functions**:
  - `createPaymentType(data)`
  - `updatePaymentType(id, data)`
  - `archivePaymentType(id)`
  - `getPaymentTypes()`
- **RBAC**: Check admin role
- **Test**: CRUD operations work

**Phase 6.3: Payment Type Form** (1 hour)
- **New File**: `app/admin/components/payment-type-form.tsx`
- **Fields**:
  - Name (required, text)
  - Requires Reference (boolean checkbox)
- **Validation**: Name min 2 chars
- **Test**: Form validation works

**Phase 6.4: Payment Types Tab** (1-2 hours)
- **New File**: `app/admin/components/payment-types-tab.tsx`
- **UI**:
  - Table: Name, Requires Ref?, Actions
  - "Add Payment Type" button
  - Edit icon → opens form panel
  - Archive icon → soft delete
- **Test**: Table shows data, actions work

**Phase 6.5: Register in Admin Page** (30 mins)
- **File**: `components/admin/master-data-management.tsx`
- **Add**: "Payment Types" tab
- **Test**: Tab shows, navigation works

**Phase 6.6: Types Definition** (15 mins)
- **New File**: `types/payment-type.ts`
- **Export**: TypeScript types for form/display

**Acceptance Criteria**:
- [x] Admin sees "Payment Types" tab
- [x] Can create payment type (name, requires_reference)
- [x] Can edit payment type
- [x] Can archive payment type (soft delete)
- [x] Table shows all payment types with status
- [x] RBAC enforced (admin-only)

---

### Item #7: Billing Frequency Mandatory (3-5 hours)

**Status**: ❌ TODO (user confirmed not done)
**Priority**: 6

#### **Problem**: Optional field breaks recurring invoice automation

#### **Implementation**:

**Phase 7.1: Database Migration** (1 hour)
- **New File**: `prisma/migrations/YYYYMMDD_billing_frequency_required/migration.sql`
```sql
-- Backfill NULL values first
UPDATE invoice_profiles
SET billing_frequency = '30 days'
WHERE billing_frequency IS NULL;

-- Make field required
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency SET NOT NULL,
ALTER COLUMN billing_frequency SET DEFAULT '30 days';

-- Add format validation
ALTER TABLE invoice_profiles
ADD CONSTRAINT billing_frequency_format
CHECK (billing_frequency ~ '^\d+ (day|days|month|months)$');
```
- **Test**: Migration runs without errors

**Phase 7.2: Update Schema** (15 mins)
- **File**: `prisma/schema.prisma`
- **Change**: `billing_frequency String?` → `billing_frequency String @default("30 days")`
- **Run**: `prisma generate`

**Phase 7.3: Update Form UI** (1-2 hours)
- **File**: `components/master-data/invoice-profile-form-panel.tsx`
- **New UI**: Dual input (number + unit selector)
```typescript
<div className="flex gap-2">
  <Input
    type="number"
    min="1"
    placeholder="30"
    value={frequencyValue}
    onChange={(e) => setFrequencyValue(e.target.value)}
    required
  />
  <Select value={frequencyUnit} onValueChange={setFrequencyUnit}>
    <SelectItem value="days">Days</SelectItem>
    <SelectItem value="months">Months</SelectItem>
  </Select>
</div>
```
- **Combine**: `${frequencyValue} ${frequencyUnit}` → "30 days"
- **Test**: Form validation works

**Phase 7.4: Update Server Actions** (30 mins)
- **File**: `app/actions/admin/invoice-profiles.ts`
- **Add**: Validation for billing_frequency format
- **Test**: Server rejects invalid formats

**Phase 7.5: Update Existing Profiles** (30 mins)
- **Script**: Backfill any remaining NULL values
- **Test**: All profiles have valid billing_frequency

**Acceptance Criteria**:
- [x] billing_frequency is required (not nullable)
- [x] Form has dual input (number + unit)
- [x] Can select days or months
- [x] Validation prevents invalid formats
- [x] Existing profiles migrated
- [x] Database constraint enforces format

---

### Item #8: Activities Tab (4-5 hours)

**Status**: ❌ TODO
**Priority**: 7

#### **Goal**: Replace "My Requests" with comprehensive activity log

#### **Implementation**:

**Phase 8.1: Database Migration** (1 hour)
```sql
CREATE TABLE user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_activities_user_id (user_id),
  INDEX idx_user_activities_created_at (created_at),
  INDEX idx_user_activities_type (activity_type)
);
```
- **Test**: Table created, can insert/query

**Phase 8.2: Activity Logger Utility** (1 hour)
- **New File**: `lib/activity-logger.ts`
```typescript
export async function logActivity(
  userId: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, any>
) {
  await prisma.userActivity.create({
    data: { userId, activityType: type, activityDescription: description, metadata }
  });
}
```
- **Add**: Helper functions for common activities
- **Test**: Can log activities

**Phase 8.3: Server Actions** (30 mins)
- **New File**: `app/actions/activities.ts`
- **Functions**:
  - `getActivities(filters)` - Get user's activities
  - `getActivityTypes()` - Get distinct types for filter
- **Test**: Can fetch activities with filters

**Phase 8.4: Activities Tab UI** (1-2 hours)
- **New File**: `app/(dashboard)/settings/components/activities-tab.tsx`
- **UI**:
  - Filter dropdown (All, Invoice, Profile, Security, Master Data)
  - Date range picker
  - Activity list (timeline view with icons)
  - Pagination (20 per page)
- **Test**: UI displays activities correctly

**Phase 8.5: Integrate Logger** (1 hour)
- **Update**: Existing server actions to log activities
- **Add to**:
  - Invoice create/edit/approve/reject
  - Profile updates
  - Password changes
  - Master data requests
- **Test**: Activities logged correctly

**Phase 8.6: Update Settings Page** (30 mins)
- **File**: `app/(dashboard)/settings/page.tsx`
- **Replace**: "My Requests" tab with "Activities" tab
- **Test**: Tab switch works

**Acceptance Criteria**:
- [x] user_activities table exists
- [x] Activity logger utility works
- [x] Activities tab shows user's activities
- [x] Can filter by type (dropdown)
- [x] Can filter by date range
- [x] Pagination works (20 per page)
- [x] Activities logged for all major actions
- [x] Timeline view with icons

---

### Item #9: Settings Menu Restructure (3-4 hours)

**Status**: ❌ TODO
**Priority**: 8

#### **Goal**: Profile, Security, Activities tabs

**Current**:
```
Settings
├── Profile (name, email, theme)
└── My Requests (vendor/category requests)
```

**New**:
```
Settings
├── Profile (name, initials, country, timezone, picture, appearance)
├── Security (email, password, 2FA)
└── Activities (from Item #8)
```

#### **Implementation**:

**Phase 9.1: Profile Tab Enhancement** (1-2 hours)
- **New File**: `app/(dashboard)/settings/components/profile-tab.tsx`
- **New Fields**:
  - Profile Picture (image upload, max 500KB, auto-compress)
  - Display Name (editable)
  - Initials (max 3 chars)
  - Country (searchable dropdown with flags)
  - Timezone (searchable dropdown)
  - Appearance (light/dark/system toggle)
- **Test**: All fields work, save updates user

**Phase 9.2: Image Upload Component** (1 hour)
- **New File**: `components/ui/image-upload.tsx`
- **Features**:
  - Drag & drop or click to upload
  - Image preview
  - Max size validation (500KB)
  - Auto-compress large images
  - Delete button
- **Test**: Upload works, compression works

**Phase 9.3: Security Tab** (1 hour)
- **New File**: `app/(dashboard)/settings/components/security-tab.tsx`
- **Fields**:
  - Email (read-only, show "Contact admin to change")
  - Password Reset (button → triggers reset flow)
  - Two-Factor Auth (toggle + setup button)
  - MFA QR Code (show when setting up)
  - Backup Codes (show after MFA setup)
- **Test**: Password reset works, MFA toggle works

**Phase 9.4: Update Settings Page** (30 mins)
- **File**: `app/(dashboard)/settings/page.tsx`
- **Replace**: Old tab structure with new 3-tab structure
- **Test**: Tab navigation works

**Phase 9.5: Server Actions** (30 mins)
- **File**: `app/actions/user-settings.ts`
- **Functions**:
  - `updateProfile(data)`
  - `uploadProfilePicture(file)`
  - `toggleMFA()`
  - `generateBackupCodes()`
- **Test**: All actions work

**Acceptance Criteria**:
- [x] Profile tab has all new fields
- [x] Image upload works (max 500KB, compressed)
- [x] Security tab exists
- [x] Password reset button works
- [x] MFA toggle works (show setup flow)
- [x] Activities tab works (from Item #8)
- [x] Tab navigation smooth

---

### Item #10: Invoice Tabs (Recurring/TDS) (4-5 hours)

**Status**: ❌ TODO
**Priority**: 9

#### **Goal**: Add Recurring and TDS tabs to invoice list

**Current**:
```
Invoices
└── All (single list with filters)
```

**New**:
```
Invoices
├── Recurring (only is_recurring=true)
├── All (current view + month navigator)
└── TDS (tds_applicable=true with calculations)
```

#### **Implementation**:

**Phase 10.1: Month Navigator Component** (1 hour)
- **New File**: `app/(dashboard)/invoices/components/month-navigator.tsx`
- **UI**:
  - ◀ [October 2025] ▶
  - Click arrows → prev/next month
  - Click month → calendar picker
- **Test**: Navigation works, filters invoices

**Phase 10.2: Recurring Tab** (1 hour)
- **New File**: `app/(dashboard)/invoices/recurring/page.tsx`
- **Filters**:
  - Invoice Profile (dropdown)
  - Status (Active/Paused/Ended)
  - Frequency (dropdown)
- **Columns**:
  - Profile Name, Vendor, Amount, Frequency, Next Gen Date, Status
- **Test**: Shows only recurring invoices

**Phase 10.3: TDS Tab** (2-3 hours)
- **New File**: `app/(dashboard)/invoices/tds/page.tsx`
- **Month Navigator**: At top
- **Columns**:
  - Vendor, Invoice #, Invoice Date, Paid On, Amount, TDS %, TDS Amt, Payable Amt
- **Footer**:
  - Total TDS for month: ₹15,000
  - Export TDS Report (Excel/PDF button)
- **Test**: Calculations correct, export works

**Phase 10.4: Column Customizer** (1 hour)
- **New File**: `app/(dashboard)/invoices/components/column-customizer.tsx`
- **UI**: Dropdown with checkboxes for columns
- **Save**: User preference in localStorage
- **Test**: Show/hide columns works

**Phase 10.5: Update Invoices Page** (30 mins)
- **File**: `app/(dashboard)/invoices/page.tsx`
- **Add**: Tab navigation (Recurring / All / TDS)
- **Add**: Month Navigator to "All" tab
- **Test**: Tabs work, navigation smooth

**Acceptance Criteria**:
- [x] Recurring tab shows only recurring invoices
- [x] Can filter by profile, status, frequency
- [x] TDS tab shows TDS-applicable invoices
- [x] Month navigator filters by month
- [x] TDS calculations correct (Amount × TDS %)
- [x] Footer shows total TDS for month
- [x] Export TDS Report works (Excel)
- [x] Column customizer works (show/hide columns)
- [x] All tab has month navigator

---

## 🔒 PHASE 2: Security Audit (8-12 hours)

**Priority**: BEFORE DOCUMENTATION
**When**: After Sprint 14 completion
**Detailed Plan**: `docs/SECURITY_AUDIT_CHECKLIST.md` (to be created)

### **Audit Categories**:

#### **2.1: Automated Security Scans** (2 hours)
- npm audit (dependency vulnerabilities)
- Snyk scan (security issues)
- ESLint security plugin
- TypeScript strict mode validation
- OWASP Top 10 check

#### **2.2: Authentication & Authorization** (2 hours)
- NextAuth configuration review
- Session management
- RBAC implementation review
- Password hashing (bcrypt strength)
- Token security

#### **2.3: Input Validation & Sanitization** (2 hours)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (React escaping)
- CSRF protection
- File upload validation
- API input sanitization

#### **2.4: Data Protection** (2 hours)
- Environment variables (.env security)
- Secrets management
- Database encryption at rest
- Sensitive data handling
- Logs don't contain secrets

#### **2.5: API Security** (1-2 hours)
- Rate limiting
- API authentication
- CORS configuration
- HTTP security headers
- Error handling (no sensitive info leaks)

#### **2.6: Penetration Testing** (2-3 hours)
- Manual testing of auth flows
- Privilege escalation attempts
- RBAC bypass attempts
- File upload attacks
- Session hijacking tests

#### **2.7: Compliance & Best Practices** (1 hour)
- GDPR considerations
- Data retention policies
- Audit logging
- Security headers
- SSL/TLS configuration

**Deliverables**:
- Security Audit Report (Markdown)
- Vulnerability List (priority: High/Medium/Low)
- Remediation Plan
- Security Hardening Checklist

---

## 📝 PHASE 3: Sprint 13 Phase 6 - Documentation (3-4 hours)

**When**: AFTER security audit complete
**Why**: Ensures documentation reflects secure, production-ready system

### **3.1: USER_GUIDE.md** (1 hour)

**Content**:
- Getting Started
- Dashboard Overview
- Creating Invoices (V2 workflow with panels)
- Managing Master Data
- Approval Workflow (Admin)
- Recurring Invoices
- TDS Reporting
- Settings & Profile
- FAQs

**Audience**: End users (admins + standard users)

### **3.2: API Documentation** (1 hour)

**Content**:
- Server Actions reference
- Request/response formats
- Authentication requirements
- Rate limits
- Error codes
- Examples for each endpoint

**Audience**: Developers

### **3.3: Deployment Guide** (30 mins)

**Content**:
- Railway setup from scratch
- Environment variables
- Database setup
- Prisma migrations
- Build & deploy process
- Post-deployment verification

**Audience**: DevOps

### **3.4: CHANGELOG.md** (30 mins)

**Content**:
- Generate from git history
- Organize by sprint
- Highlight breaking changes
- Note migration requirements

**Format**: Keep-a-Changelog standard

### **3.5: Release Notes v1.0.0** (30 mins)

**Content**:
- Executive summary
- Key features
- Migration guide (from v0.x)
- Known issues
- Support contacts

**Audience**: All stakeholders

---

## 🚀 PHASE 4: v1.0.0 Launch (2-4 hours)

### **4.1: Final QA Testing** (1 hour)
- Full user workflow test (end-to-end)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness
- Performance testing (Lighthouse score)
- Accessibility check (WCAG 2.1)

### **4.2: Pre-Deployment Checklist** (30 mins)
- [x] All tests passing
- [x] Security audit complete
- [x] Documentation complete
- [x] Environment variables set
- [x] Database backed up
- [x] Rollback plan ready

### **4.3: Deployment** (1 hour)
- Tag release: `v1.0.0`
- Push to main branch
- Railway auto-deploys
- Run post-deployment migrations (if any)
- Verify deployment URL

### **4.4: Post-Deployment Verification** (1 hour)
- Smoke tests (critical paths)
- Database integrity check
- Performance monitoring
- Error tracking (Sentry/similar)
- User acceptance testing

### **4.5: Monitoring Setup** (30 mins)
- Configure uptime monitoring
- Set up alerts (error rate, response time)
- Dashboard setup (Railway metrics)
- Log aggregation

---

## 📊 Effort Summary

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|---------------|----------|
| Phase 1: Sprint 14 | 10 items | 30-40 hours | HIGH |
| Phase 2: Security Audit | 7 categories | 8-12 hours | CRITICAL |
| Phase 3: Documentation | 5 documents | 3-4 hours | MEDIUM |
| Phase 4: Launch | 5 steps | 2-4 hours | HIGH |
| **TOTAL** | **27 tasks** | **43-60 hours** | - |

---

## 🎯 Sprint 14 Priority Matrix

**Week 1** (Critical Path):
1. Edit Button (#11, #12) - 6-8h 🔥
2. Invoice Forms → Panels (NEW) - 3h ⭐
3. Amount Field (#4) - 2-3h
4. Panel Styling (#5) - 1-2h

**Week 2** (Feature Completion):
5. Payment Types (#6) - 4-5h
6. Billing Frequency (#7) - 3-5h
7. Activities Tab (#8) - 4-5h

**Week 3** (Navigation & Polish):
8. Settings Restructure (#9) - 3-4h
9. Invoice Tabs (#10) - 4-5h

**Week 4** (Security & Launch):
10. Security Audit - 8-12h
11. Documentation - 3-4h
12. Launch - 2-4h

---

## 📋 Session Restoration Quick Reference

**If starting a new session, read in this order**:
1. This file (SPRINT_PLAN_DETAILED_V2.md) - Master plan
2. `docs/SPRINT_14_STATUS_UPDATED.md` - Current progress
3. Specific item plan (e.g., `EDIT_BUTTON_WORKFLOW.md`)
4. Recent session summary (e.g., `SESSION_SUMMARY_2025_11_24_DEBUGGING.md`)

**Files to check for status**:
- `SPRINTS_REVISED.md` - Overall progress (197.5/208 SP)
- `SPRINT_14_STATUS_UPDATED.md` - Current sprint (4/12 items done)
- Git status: `git status` (uncommitted changes?)
- Deployment: https://paylog-production-5265.up.railway.app

**Quick commands**:
```bash
# Check current state
git status
pnpm lint
pnpm typecheck
pnpm build

# Run dev server
pnpm dev

# Database
DATABASE_URL="..." pnpm prisma studio
DATABASE_URL="..." pnpm prisma migrate status
```

---

## ✅ Done Checklist (Track Progress)

**Sprint 14**:
- [x] Item #1: Approval buttons
- [x] Item #2: User panel fix
- [x] Item #3: Currency display
- [ ] Item #4: Amount field UX
- [x] Item #5: Panel styling (80% done)
- [ ] Item #6: Payment types
- [ ] Item #7: Billing frequency
- [ ] Item #8: Activities tab
- [ ] Item #9: Settings restructure
- [ ] Item #10: Invoice tabs
- [ ] Item #11: Edit button (admins)
- [ ] Item #12: Edit button (users)
- [ ] NEW: Invoice forms → panels

**Security Audit**:
- [ ] Automated scans
- [ ] Auth/RBAC review
- [ ] Input validation
- [ ] Data protection
- [ ] API security
- [ ] Penetration testing
- [ ] Compliance check

**Documentation**:
- [ ] USER_GUIDE.md
- [ ] API Documentation
- [ ] Deployment Guide
- [ ] CHANGELOG.md
- [ ] Release Notes v1.0.0

**Launch**:
- [ ] Final QA
- [ ] Pre-deployment checklist
- [ ] Deploy to production
- [ ] Post-deployment verification
- [ ] Monitoring setup

---

**Last Updated**: November 24, 2025
**Next Update**: After completing each phase
**Maintained By**: Development Team

---

## 🆘 Quick Help

**Problem**: Lost context between sessions
**Solution**: Read this file + `SPRINT_14_STATUS_UPDATED.md` + latest `SESSION_SUMMARY_*.md`

**Problem**: Don't know what to work on next
**Solution**: Check "Done Checklist" above, start first unchecked item

**Problem**: Need detailed steps for specific item
**Solution**: Each item references a detailed plan file (e.g., `EDIT_BUTTON_WORKFLOW.md`)

**Problem**: Feature was "done" but not working
**Solution**: Check git commits, verify deployment, check Railway logs

**Problem**: Multiple items could be worked on
**Solution**: Follow priority order in "Sprint 14 Priority Matrix"

---

END OF DETAILED SPRINT PLAN
