# Sprint 14 - Updated Status & Implementation Plan

**Last Updated**: November 24, 2025 (Added Item #13 - Invoice Creation Toggle)
**Status**: 🚧 IN PROGRESS (31% complete)
**Completed**: 4/13 items
**Remaining**: 9/13 items

---

## 📊 Current Status Overview

| Item | Priority | Status | Evidence | Effort Remaining |
|------|----------|--------|----------|------------------|
| #1: Approval Buttons | CRITICAL | ✅ DONE | invoice-detail-panel-v2.tsx lines 177-196 | 0h |
| #2: User Panel Fix | CRITICAL | ✅ DONE | User confirmed fixed | 0h |
| #3: Currency Display | HIGH | ✅ DONE | format.ts with Intl.NumberFormat | 0h |
| #4: Amount Field UX | HIGH | ❌ TODO | No amount-input.tsx found | 2-3h |
| #5: Panel Styling | HIGH | 🟡 PARTIAL | Panel system exists, needs gap fix | 1-2h |
| #6: Payment Types | MEDIUM | ❌ TODO | Placeholder only (22 lines) | 4-5h |
| #7: Billing Frequency | MEDIUM | ❌ TODO | User confirmed not done | 3-5h |
| #8: Activities Tab | MEDIUM | ❌ TODO | No activity logging system | 4-5h |
| #9: Settings Restructure | MEDIUM | ❌ TODO | No Security/Activities tabs | 3-4h |
| #10: Invoice Tabs (Recurring/TDS) | MEDIUM | ❌ TODO | Single list only | 4-5h |
| **#11: Edit Button (Admin)** | **🔥 NEW** | **❌ TODO** | **Doesn't work for admins** | **2-3h** |
| **#12: Edit Button (Users)** | **🔥 NEW** | **❌ TODO** | **Missing for standard users** | **4-5h** |
| **#13: Invoice Creation Toggle** | **⭐ NEW** | **❌ TODO** | **Panel vs full-page preference** | **4-5h** |

**Total Remaining Effort**: ~34-44 hours

---

## 🔥 NEW CRITICAL ISSUES (Sprint 14 Extension)

### **Item #11: Edit Button Not Working for Admins**
**Priority**: 🔥 CRITICAL
**Reported**: November 24, 2025
**Status**: ❌ NOT WORKING

**Problem**:
- Edit button exists in invoice detail panel (line 154-162 in invoice-detail-panel-v2.tsx)
- Clicking it shows "Edit Not Available" toast message
- Code comment says: "TODO: Implement V2 invoice edit forms"
- Admin users cannot edit invoices

**Current Code**:
```typescript
// components/invoices/invoice-detail-panel-v2.tsx line 65-74
const handleEdit = () => {
  // TODO: Implement V2 invoice edit forms (recurring and non-recurring)
  // The V1 edit form doesn't support V2 fields (is_recurring, invoice_profile_id, inline payments)
  // For now, show a message that this feature is coming soon
  toast({
    title: 'Edit Not Available',
    description: 'V2 invoice editing is coming soon. For now, you can create a new invoice or contact support.',
    variant: 'default',
  });
};
```

**Root Cause**:
- V2 invoices have new fields (is_recurring, invoice_profile_id, currency_id, entity_id)
- Existing V1 edit form doesn't support these fields
- V2 edit forms haven't been created yet

**Solution Needed**:
1. Create V2 edit forms:
   - `components/invoices-v2/edit-recurring-invoice-form.tsx`
   - `components/invoices-v2/edit-non-recurring-invoice-form.tsx`
2. Add edit routes:
   - `/invoices/edit/[id]/recurring`
   - `/invoices/edit/[id]/non-recurring`
3. Update `handleEdit` to open correct form based on `invoice.is_recurring`
4. Implement server actions for updating V2 invoices
5. Handle inline payment updates

**Acceptance Criteria**:
- Admin clicks Edit → opens side panel with pre-filled form
- Form shows all V2 fields (profile, entity, currency, recurring settings)
- Admin can modify any field
- Save updates invoice successfully
- Panel closes and invoice list refreshes

**Estimated Effort**: 2-3 hours

---

### **Item #12: Edit Button Missing for Standard Users**
**Priority**: 🔥 CRITICAL
**Reported**: November 24, 2025
**Status**: ❌ MISSING
**Business Rules**: ✅ CLARIFIED (see EDIT_BUTTON_WORKFLOW.md)

**Problem**:
- Standard users don't see Edit button in invoice detail panel
- Current code: `canEdit = isAdmin` (line 103)
- Standard users created the invoice but can't edit it

**Current Code**:
```typescript
// components/invoices/invoice-detail-panel-v2.tsx line 103
const canEdit = isAdmin; // Admins can always edit
```

**Confirmed Business Rules** (Nov 24, 2025):

**Standard Users**:
1. ✅ Can create new invoices
2. ❌ **Cannot edit while in "pending_approval" status** (must wait for admin)
3. ✅ Can edit after admin action (approved/rejected/on_hold)
4. 🔄 Editing triggers re-approval (status → "pending_approval")
5. 🔒 Can only edit own invoices (ownership check)

**Admins**:
1. ✅ Can edit any invoice (no ownership restriction)
2. ✅ Can edit in any status (no status restriction)
3. ✅ Admin edits don't change status

**Required Logic**:
```typescript
const isOwner = invoice.created_by_id === session?.user?.id;
const isStandardUser = session?.user?.role === 'standard_user';
const isPending = invoice.status === 'pending_approval';

const canEdit =
  isAdmin || // Admins can always edit
  (isOwner && isStandardUser && !isPending); // Standard users: own invoices, not pending
```

**Workflow**:
```
Standard User:
1. Create invoice → Submit → Status: "pending_approval"
2. Edit button DISABLED (waiting for admin action)
3. Admin approves → Status: "unpaid"
4. Edit button ENABLED (user can now edit)
5. User edits → Save → Status: "pending_approval" (goes back for re-approval)

Admin:
1. Can edit ANY invoice in ANY status
2. Edits do NOT change status
```

**Acceptance Criteria**:
- [x] Standard user sees Edit button for own invoices (not pending)
- [x] Edit button disabled with tooltip during pending status
- [x] Edit button hidden for invoices created by others
- [x] Editing as standard user → status changes to "pending_approval"
- [x] Editing as admin → status unchanged
- [x] Form pre-fills with current invoice data
- [x] Save successful → panel closes, list refreshes

**Estimated Effort**: 6-8 hours total (both Items #11 and #12)
**Detailed Plan**: See `docs/EDIT_BUTTON_WORKFLOW.md`

---

### **Item #13: Invoice Creation Method Toggle** (NEW)
**Priority**: ⭐ HIGH VALUE
**Added**: November 24, 2025
**Status**: ❌ TODO

**User Request** (exact quote):
> "I would like to have a toggle button on the settings to switch between current method and the sidepanel method to use them both and decide later."

**Goal**: Give users choice between two invoice creation methods

**Method 1 - Current (Full Pages)**:
- Navigate to `/invoices/new/recurring` or `/invoices/new/non-recurring`
- Full page with all form fields
- More screen real estate
- Traditional workflow

**Method 2 - New (Side Panels)**:
- Click "Add Invoice" → Panel slides in from right
- Choose type → Form opens in stacked panel (700px)
- Stay on invoice list while creating
- Better for quick data entry while referencing other invoices

**Implementation Plan**:

**Phase 1: Database & Preference Storage** (1h):
1. Add `use_panel_for_invoice_creation BOOLEAN DEFAULT true` to users table
2. Create server action `updateUserPreference()`
3. Update Prisma schema and regenerate client

**Phase 2: Settings Toggle UI** (30mins):
1. Add toggle switch in Settings page
2. "Use side panels for invoice creation" label
3. Toast confirmation when toggling
4. Update session after preference change

**Phase 3: Panel Components** (1.5h):
1. Create `RecurringInvoicePanel` (wraps existing form)
2. Create `NonRecurringInvoicePanel` (wraps existing form)
3. Create `InvoiceTypeSelectorPanel` (choose recurring/non-recurring)
4. Register all 3 panels in `panel-provider.tsx`

**Phase 4: Conditional Routing** (30mins):
1. Update `app/(dashboard)/invoices/page.tsx` handleNewInvoice
2. Update `components/layout-v2/navbar-plus-menu.tsx` menu item
3. Check user preference → open panel OR navigate to route
4. Keep both routes functional (don't delete anything)

**Phase 5: Testing** (45mins):
1. Toggle ON → Click "Add Invoice" → Panel opens
2. Toggle OFF → Click "Add Invoice" → Full page loads
3. Preference persists across sessions
4. Works from all entry points (list page, '+' menu)

**Total Effort**: 4-5 hours

**Files to Create** (7 files):
- `components/invoices-v2/recurring-invoice-panel.tsx`
- `components/invoices-v2/non-recurring-invoice-panel.tsx`
- `components/invoices-v2/invoice-type-selector-panel.tsx`
- `app/actions/user-preferences.ts`

**Files to Modify** (5 files):
- `prisma/schema.prisma` (add preference field)
- `app/(dashboard)/settings/page.tsx` (add toggle)
- `app/(dashboard)/invoices/page.tsx` (conditional routing)
- `components/layout-v2/navbar-plus-menu.tsx` (conditional routing)
- `components/panels/panel-provider.tsx` (register panels)

**Database Migration**:
```sql
ALTER TABLE users
ADD COLUMN use_panel_for_invoice_creation BOOLEAN DEFAULT true;
UPDATE users SET use_panel_for_invoice_creation = true;
```

**Benefits**:
- ✅ User choice (not forced)
- ✅ A/B testing capability
- ✅ Can gather feedback and decide later
- ✅ Low risk (can revert to full pages)
- ✅ Both methods maintained

**Acceptance Criteria**:
- [x] Toggle exists in Settings
- [x] Toggling ON → invoice creation uses panels
- [x] Toggling OFF → invoice creation uses full pages
- [x] Preference persists across sessions
- [x] Works from all entry points (list, navbar '+' menu)
- [x] Both methods work correctly (no regressions)
- [x] Toast shows confirmation on toggle

**Detailed Plan**: See `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md`

---

## ✅ COMPLETED ITEMS (4/13)

### **Item #1: Invoice Approval Buttons** - ✅ DONE
**Completed**: Before Nov 24, 2025
**Evidence**:
- File: `components/invoices/invoice-detail-panel-v2.tsx` lines 177-196
- Approve button: Green with CheckCircle icon
- Reject button: Red with XCircle icon
- Permission check: `canApprove = invoice.status === 'pending_approval' && isAdmin`
- Hooks: `useApproveInvoiceV2`, `useRejectInvoiceV2`
- Rejection dialog with reason validation (min 10 chars)

**No further work needed.**

---

### **Item #2: User Details Panel Loading Error** - ✅ DONE
**Completed**: Before Nov 24, 2025
**Confirmed by**: User
**Issue**: `headers()` inside `unstable_cache` causing crash
**Status**: Fixed (no longer reproduces)

**No further work needed.**

---

### **Item #3: Currency Display Bug** - ✅ DONE
**Completed**: Nov 24, 2025 (commit `46b8243`)
**Evidence**:
- File: `lib/utils/format.ts` lines 94-145
- Uses `Intl.NumberFormat` with proper locale per currency
- Defensive country-to-currency mapping (IN→INR, US→USD, GB→GBP, etc.)
- Try-catch with fallback for invalid codes
- Proper symbols: $ (USD), ₹ (INR), € (EUR), £ (GBP), ¥ (JPY)

**No further work needed.**

---

### **Item #5: Side Panel Styling** - 🟡 PARTIAL (80% done)
**Status**: Panel system exists, needs minor gap fix
**Evidence**:
- Unified system: `PanelLevel`, `PanelHeader`, `PanelFooter`
- Framer Motion animations
- Responsive widths (350px/700px/500px based on level)
- ESC key handler

**Remaining Work** (1-2 hours):
- Verify no gap at top of panels
- Ensure all panels touch page top edge
- Standardize padding/spacing across all panels

---

## ❌ TODO ITEMS (8/12)

### **Item #4: Amount Field '0' Placeholder Behavior**
**Priority**: HIGH
**Status**: ❌ TODO
**Effort**: 2-3 hours

**Problem**:
- Amount fields show `0` by default
- User types "1500" → becomes "01500"
- Must manually delete the 0 first

**Solution**: Create `AmountInput` component with smart placeholder
```typescript
// components/invoices-v2/amount-input.tsx
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

**Files to Create**:
- `components/invoices-v2/amount-input.tsx` (new)

**Files to Update**:
- `components/invoices-v2/recurring-invoice-form.tsx`
- `components/invoices-v2/non-recurring-invoice-form.tsx`
- All other forms with amount fields (~8 files)

---

### **Item #6: Payment Types Implementation**
**Priority**: MEDIUM
**Status**: ❌ TODO (placeholder only)
**Effort**: 4-5 hours

**Current State**:
- File exists: `components/master-data/payment-type-management.tsx`
- Only 22 lines with "Coming soon" message
- No CRUD operations

**What's Needed**:
1. Payment Types tab in Admin > Master Data
2. CRUD UI (create, edit, archive)
3. Server actions for payment type management
4. Form validation (name required, reference checkbox)

**Files to Create**:
- `app/admin/components/payment-types-tab.tsx`
- `app/admin/components/payment-type-form.tsx`
- `app/admin/actions/payment-types.ts`
- `types/payment-type.ts`

---

### **Item #7: Invoice Profile Billing Frequency (Mandatory)**
**Priority**: MEDIUM
**Status**: ❌ TODO
**Effort**: 3-5 hours
**Confirmed by**: User (not done)

**Problem**:
- `billing_frequency` field is optional in database
- Some profiles have NULL frequency
- Breaks automated recurring invoice generation

**Solution**:
1. Database migration:
```sql
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency SET NOT NULL,
ALTER COLUMN billing_frequency SET DEFAULT '30 days';

ALTER TABLE invoice_profiles
ADD CONSTRAINT billing_frequency_format
CHECK (billing_frequency ~ '^\d+ (day|days|month|months)$');
```

2. Update form with dual input (number + unit selector):
```typescript
<div className="flex gap-2">
  <Input type="number" min="1" placeholder="30" />
  <Select>
    <SelectItem value="days">Days</SelectItem>
    <SelectItem value="months">Months</SelectItem>
  </Select>
</div>
```

**Files to Update**:
- `prisma/schema.prisma` (migration)
- `components/master-data/invoice-profile-form-panel.tsx`
- `app/admin/actions/invoice-profiles.ts`

---

### **Item #8: Activities Tab (Replace My Requests)**
**Priority**: MEDIUM
**Status**: ❌ TODO
**Effort**: 4-5 hours

**Current**: Settings has Profile + "My Requests" tabs
**Needed**: Settings with Profile + Security + Activities tabs

**Activities Tab Features**:
- Comprehensive activity log for user
- Filter by type (Invoice, Profile, Security, Master Data)
- Date range picker
- Pagination
- Timeline view with icons

**Database Migration**:
```sql
CREATE TABLE user_activities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type VARCHAR(50),
  activity_description TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

**Files to Create**:
- `lib/activity-logger.ts`
- `app/actions/activities.ts`
- `app/(dashboard)/settings/components/activities-tab.tsx`
- `types/activity.ts`

---

### **Item #9: Settings Menu Restructure**
**Priority**: MEDIUM
**Status**: ❌ TODO
**Effort**: 3-4 hours

**Current Structure**:
```
Settings
├── Profile (display name, email, theme toggle)
└── My Requests (vendor/category requests)
```

**New Structure**:
```
Settings
├── Profile (name, initials, country, timezone, picture, appearance)
├── Security (email, password, 2FA)
└── Activities (activity log from Item #8)
```

**New Components Needed**:
- Profile picture upload (max 500KB, auto-compress)
- Initials field (max 3 chars)
- Country dropdown (searchable with flags)
- Timezone dropdown
- Security tab with password reset + MFA toggle

**Files to Create**:
- `app/(dashboard)/settings/components/profile-tab.tsx`
- `app/(dashboard)/settings/components/security-tab.tsx`
- `components/ui/image-upload.tsx`

---

### **Item #10: Invoice Menu Restructure**
**Priority**: MEDIUM
**Status**: ❌ TODO
**Effort**: 4-5 hours

**Current**: Single invoice list with filters
**Needed**: Tabs for Recurring / All / TDS

**New Structure**:
```
Invoices
├── Recurring (only recurring invoices, profile filter)
├── All (current view + month navigator)
└── TDS (TDS-applicable invoices with calculations)
```

**Key Features**:
1. **Recurring Tab**:
   - Show only invoices with `is_recurring = true`
   - Filter by invoice profile
   - Show next generation date
   - Active/Paused/Ended status

2. **All Tab** (enhanced):
   - Month navigator: ◀ October 2025 ▶
   - Column customizer (show/hide columns)
   - Current filters remain

3. **TDS Tab**:
   - Show invoices with `tds_applicable = true`
   - Month navigator
   - Columns: Vendor, Invoice #, Date, Paid On, Amount, TDS %, TDS Amt, Payable
   - Footer: Total TDS for month
   - Export TDS Report button

**Files to Create**:
- `app/(dashboard)/invoices/recurring/page.tsx`
- `app/(dashboard)/invoices/tds/page.tsx`
- `app/(dashboard)/invoices/components/month-navigator.tsx`
- `app/(dashboard)/invoices/components/column-customizer.tsx`

---

## 📋 Updated Implementation Priority (with Item #13)

### **Phase 1: Critical Fixes** (🔥 DO FIRST)
**Effort**: 6-8 hours
1. **Item #11**: Edit button for admins (2-3h)
2. **Item #12**: Edit button for standard users (4-5h)

**Why**: Blocking workflow, users can't edit invoices

---

### **Phase 2: High-Priority UX** (Quick Wins)
**Effort**: 7-10 hours
3. **Item #13**: Invoice creation toggle (4-5h) ⭐ NEW
4. **Item #4**: Amount field placeholder (2-3h)
5. **Item #5**: Panel styling gaps (1-2h)

**Why**: High-value UX improvements, user choice, easy wins

---

### **Phase 3: Master Data Completion**
**Effort**: 7-10 hours
6. **Item #6**: Payment types CRUD (4-5h)
7. **Item #7**: Billing frequency mandatory (3-5h)

**Why**: Complete feature set, enable automation

---

### **Phase 4: Settings & Navigation**
**Effort**: 11-14 hours
8. **Item #8**: Activities tab (4-5h)
9. **Item #9**: Settings restructure (3-4h)
10. **Item #10**: Invoice tabs (Recurring/TDS) (4-5h)

**Why**: Major UX improvements, better organization

---

## 📊 Revised Sprint 14 Totals

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| Phase 1: Critical | 2 | 6-8h | 🔥 |
| Phase 2: UX | 3 | 7-10h | HIGH |
| Phase 3: Master Data | 2 | 7-10h | MEDIUM |
| Phase 4: Navigation | 3 | 11-14h | MEDIUM |
| **TOTAL** | **10** | **31-42h** | - |

**Note**: Items #1, #2, #3 already complete (0h remaining)

---

## 🎯 Next Steps

### Immediate Actions:
1. **Get business rule clarification** for Item #12 (standard user edit permissions)
2. **Start Phase 1** (Edit buttons) - blocking workflow
3. **Complete Phase 2** (UX fixes) - quick wins
4. **Plan Phase 3-4** based on remaining Sprint 13 Phase 6 progress

### Before Starting:
- [ ] User confirms edit button business rules (Item #12)
- [ ] Verify panel styling issues (Item #5) by visual inspection
- [ ] Check if TDS calculations already exist in database

### Questions for User:
1. **Edit Permissions**: Should standard users edit their own invoices? Only in draft/pending status?
2. **Edit Workflow**: If standard user edits approved invoice, does it go back to pending_approval?
3. **Payment Types**: Are there existing payment types in database to migrate?
4. **Priority**: Phase 1 (edit buttons) or Sprint 13 Phase 6 (documentation) first?

---

## 📝 Summary

**Sprint 14 Extended Status**:
- **Original**: 10 items, 6 SP
- **Updated**: 13 items (+3 new items: #11, #12, #13)
- **Completed**: 4 items (31%)
- **Remaining**: 9 items (69%)
- **Effort**: 31-42 hours remaining

**New This Session (Nov 24)**:
- ✅ Item #13: Invoice creation toggle feature (4-5h)
- ✅ Comprehensive planning documents updated
- ✅ Toggle allows user choice between panel vs full-page methods

**Critical Path**: Fix edit buttons first (Phase 1), then invoice toggle + UX wins (Phase 2), then complete feature set (Phases 3-4).

**Current Blocker**: Edit button not working for admins, missing for standard users.

**Next Priority**: Item #11 & #12 (Edit buttons) - 6-8 hours

---

**Ready to start Phase 1 (edit buttons) with confirmed business rules! 🚀**
