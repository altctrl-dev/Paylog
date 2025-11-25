# Sprint 14 - Updated Status & Implementation Plan

**Last Updated**: November 25, 2025, 9:00 PM (Priority Reordered)
**Status**: 🚧 IN PROGRESS (38% complete)
**Completed**: 5/13 items
**Remaining**: 8/13 items

---

## 📊 Current Status Overview (with NEW Priority Order)

| Priority | Item | Status | Evidence | Effort Remaining |
|----------|------|--------|----------|------------------|
| ✅ | #1: Approval Buttons | ✅ DONE | invoice-detail-panel-v2.tsx lines 177-196 | 0h |
| ✅ | #2: User Panel Fix | ✅ DONE | User confirmed fixed | 0h |
| ✅ | #3: Currency Display | ✅ DONE | format.ts with Intl.NumberFormat | 0h |
| ✅ | **#11: Edit Button (Admin)** | **✅ DONE** | **edit-recurring-invoice-form.tsx (710 lines)** | **0h** |
| ✅ | **#12: Edit Button (Users)** | **✅ DONE** | **RBAC + status validation working** | **0h** |
| **1** | **#4: Amount Field UX** | **❌ TODO** | **No amount-input.tsx found** | **2-3h** |
| **2** | **#6: Payment Types** | **❌ TODO** | **Placeholder only (22 lines)** | **4-5h** |
| **3** | **#7: Billing Frequency** | **❌ TODO** | **User confirmed not done** | **3-5h** |
| **4** | **#5: Panel Styling** | **🟡 PARTIAL** | **Panel system exists, needs gap fix** | **1-2h** |
| **5** | **#8: Activities Tab** | **❌ TODO** | **No activity logging system** | **4-5h** |
| **6** | **#9: Settings Restructure** | **❌ TODO** | **No Security/Activities tabs** | **3-4h** |
| **7** | **#10: Invoice Tabs (Recurring/TDS)** | **❌ TODO** | **Single list only** | **4-5h** |
| **8** | **#13: Invoice Creation Toggle** | **❌ TODO** | **Panel vs full-page preference** | **4-5h** |

**Total Remaining Effort**: ~25-34 hours

---

## 🎯 NEW PRIORITY ORDER (User Revised - Nov 25, 2025 9:00 PM)

### **Priority 1: Amount Field UX** (2-3h) - NEXT UP
- Quick win, high-value UX improvement
- Affects all invoice forms (create + edit)
- Prevents "01500" typing issue

### **Priority 2: Payment Types CRUD** (4-5h)
- Complete master data feature set
- Admin functionality needed for full system

### **Priority 3: Billing Frequency Mandatory** (3-5h)
- Enable automated recurring invoice generation
- Database constraint required

### **Priority 4: Panel Styling Gaps** (1-2h)
- Polish existing panel system
- Quick visual fix

### **Priority 5: Activities Tab** (4-5h)
- Replace "My Requests" with comprehensive activity log
- New database table required

### **Priority 6: Settings Restructure** (3-4h)
- Profile + Security + Activities tabs
- Enhanced profile management

### **Priority 7: Invoice Menu Restructure** (4-5h)
- Recurring / All / TDS tabs
- Month navigator + column customizer

### **Priority 8: Invoice Creation Toggle** (4-5h)
- User choice: panel vs full-page
- Nice-to-have, can be done last

---

## ✅ COMPLETED ITEMS (5/13)

### **Item #11: Edit Button for Admins** - ✅ DONE
**Completed**: November 25, 2025 (6-hour session)
**Status**: ✅ FULLY WORKING
**User Confirmation**: "it is working now"

**What Was Implemented**:
- Created `edit-recurring-invoice-form.tsx` (710 lines)
- Created `edit-non-recurring-invoice-form.tsx` (680 lines)
- Added server actions: `updateRecurringInvoice()`, `updateNonRecurringInvoice()`
- Added React Query hooks: `useUpdateRecurringInvoice()`, `useUpdateNonRecurringInvoice()`
- Updated permission logic in `invoice-detail-panel-v2.tsx`
- Registered edit panels in `invoice-panel-renderer.tsx`

**Key Features**:
- All fields pre-filled from existing invoice
- Invoice profile read-only (can't change after creation)
- File upload optional (replaces only if new file provided)
- Validation error display (red alert box)
- ESC key handler with unsaved changes warning
- Number input scroll disabled

**Issues Fixed** (8 bugs through 6 iterations):
1. Invalid defaultValues causing validation failures
2. Vendor field showing empty (fetch on mount fix)
3. File upload validation error (z.custom validator first attempt)
4. Form submission broken (onSubmit signature)
5. Zod validator rejecting all input (explicit null/undefined check)
6. Form invalid on mount (removed defaultValues)
7. "Not a recurring invoice" error (wrong field name: profile_id → invoice_profile_id)
8. Pre-existing lint errors (6 files, 9 errors, all fixed)

**Files Created**: 2 (1,390 lines total)
**Files Modified**: 10 (550+ lines)
**Commits**: 6 (all quality gates passed)

**Technical Lessons Learned**:
- Zod custom validators run BEFORE `.nullable()` and `.optional()`
- React Hook Form onSubmit must accept validated data parameter
- Never set invalid defaultValues that fail schema validation
- Always verify database field names in schema.prisma
- Client-side Zod defaults don't work (use form config)

**No further work needed.**

---

### **Item #12: Edit Button for Standard Users** - ✅ DONE
**Completed**: November 25, 2025 (same session as #11)
**Status**: ✅ FULLY WORKING

**Business Rules Implemented**:

**Standard Users**:
- ✅ Can create new invoices → status becomes "pending_approval"
- ❌ Cannot edit while in "pending_approval" (must wait for admin)
- ✅ Can edit after admin action (approved/rejected/on_hold)
- 🔄 Editing changes status back to "pending_approval"
- 🔒 Can only edit own invoices (ownership check)

**Admins**:
- ✅ Can edit any invoice in any status
- ✅ Edits don't change status

**Permission Logic**:
```typescript
// components/invoices/invoice-detail-panel-v2.tsx line 103-105
const isOwner = invoice?.created_by === Number(userId);
const isInvoicePending = invoice?.status === 'pending_approval';
const canEdit = isAdmin || (isOwner && !isInvoicePending);
```

**Server Authorization**:
```typescript
// app/actions/invoices-v2.ts (updateRecurringInvoice)
if (isAdminUser) {
  newStatus = existing.status; // Admin edit doesn't change status
} else {
  if (existing.created_by !== user.id) {
    return { error: 'Unauthorized: You can only edit your own invoices' };
  }
  if (existing.status === INVOICE_STATUS.PENDING_APPROVAL) {
    return { error: 'Cannot edit invoice while it is pending approval' };
  }
  newStatus = INVOICE_STATUS.PENDING_APPROVAL; // Standard user edit triggers re-approval
}
```

**All Acceptance Criteria Met**: ✅

**No further work needed.**

---

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

## ❌ TODO ITEMS (8/13) - NEW PRIORITY ORDER

### **🥇 Priority 1: Item #4 - Amount Field '0' Placeholder Behavior**
**Status**: ❌ TODO
**Effort**: 2-3 hours
**Why First**: Quick UX win, affects all invoice forms

**Problem**:
- Amount fields show `0` by default
- User types "1500" → becomes "01500"
- Must manually delete the 0 first
- Poor user experience across all invoice forms

**Solution**: Create `AmountInput` component with smart placeholder behavior
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

**Implementation Plan**:

**Phase 1: Create AmountInput Component** (30 mins)
1. Create `components/invoices-v2/amount-input.tsx`
2. Implement smart placeholder logic
3. Add proper TypeScript types
4. Test with React Hook Form integration

**Phase 2: Replace in All Forms** (1.5-2 hours)
1. Identify all forms with amount fields (~8 files):
   - `recurring-invoice-form.tsx` (amount)
   - `non-recurring-invoice-form.tsx` (amount)
   - `edit-recurring-invoice-form.tsx` (amount, paid_amount)
   - `edit-non-recurring-invoice-form.tsx` (amount, paid_amount)
   - Any other forms with currency/amount inputs
2. Replace `<Input type="number" />` with `<AmountInput />`
3. Update imports

**Phase 3: Testing** (30 mins)
1. Test focus behavior (placeholder shows "0.00")
2. Test typing (no leading zero issue)
3. Test blur with empty value (shows placeholder)
4. Test blur with value (shows value)
5. Test form submission (value validated correctly)

**Files to Create**:
- `components/invoices-v2/amount-input.tsx` (new, ~40 lines)

**Files to Update**:
- `components/invoices-v2/recurring-invoice-form.tsx`
- `components/invoices-v2/non-recurring-invoice-form.tsx`
- `components/invoices-v2/edit-recurring-invoice-form.tsx`
- `components/invoices-v2/edit-non-recurring-invoice-form.tsx`
- ~4 other forms with amount fields

**Quality Gates**:
- [ ] Lint passes
- [ ] TypeCheck passes
- [ ] Build passes
- [ ] Manual testing complete

---

### **🥈 Priority 2: Item #6 - Payment Types Implementation**
**Status**: ❌ TODO (placeholder only)
**Effort**: 4-5 hours
**Why Second**: Complete master data feature set

**Current State**:
- File exists: `components/master-data/payment-type-management.tsx`
- Only 22 lines with "Coming soon" message
- No CRUD operations

**What's Needed**:
1. Payment Types tab in Admin > Master Data
2. CRUD UI (create, edit, archive)
3. Server actions for payment type management
4. Form validation (name required, reference checkbox)

**Implementation Plan**:

**Phase 1: Database & Schema** (1h)
```prisma
model PaymentType {
  id              Int      @id @default(autoincrement())
  name            String   @unique
  requires_reference Boolean @default(false)
  is_archived     Boolean  @default(false)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  // Relations
  invoices        Invoice[]

  @@map("payment_types")
}
```

**Phase 2: Server Actions** (1h)
- `app/actions/admin/payment-types.ts`
  - `createPaymentType()`
  - `updatePaymentType()`
  - `archivePaymentType()`
  - `getPaymentTypes()`

**Phase 3: UI Components** (1.5h)
- `components/master-data/payment-type-management.tsx` (replace placeholder)
  - DataTable with columns: Name, Requires Reference, Actions
  - Add/Edit/Archive buttons
  - Search and filter
- `components/master-data/payment-type-form-panel.tsx`
  - Form with: Name (text), Requires Reference (checkbox)
  - Validation: Name required, min 2 chars

**Phase 4: Integration** (30 mins)
- Update payment type selects in invoice forms to use new data
- Add "Manage Payment Types" link in forms (admin only)

**Phase 5: Testing** (30 mins)
- Create payment type
- Edit payment type
- Archive payment type
- Use in invoice form

**Files to Create**:
- `app/actions/admin/payment-types.ts` (new, ~150 lines)
- `components/master-data/payment-type-form-panel.tsx` (new, ~120 lines)

**Files to Modify**:
- `components/master-data/payment-type-management.tsx` (replace placeholder)
- `prisma/schema.prisma` (add PaymentType model)

**Database Migration**:
```sql
CREATE TABLE payment_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  requires_reference BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add some default payment types
INSERT INTO payment_types (name, requires_reference) VALUES
  ('Bank Transfer', true),
  ('Cash', false),
  ('Check', true),
  ('Credit Card', true),
  ('UPI', true),
  ('NEFT/RTGS', true);
```

---

### **🥉 Priority 3: Item #7 - Invoice Profile Billing Frequency (Mandatory)**
**Status**: ❌ TODO
**Effort**: 3-5 hours
**Why Third**: Enable automated recurring invoice generation

**Problem**:
- `billing_frequency` field is optional in database
- Some profiles have NULL frequency
- Breaks automated recurring invoice generation
- System can't calculate "next invoice date"

**Solution**:

**Phase 1: Database Migration** (1h)
```sql
-- Step 1: Update existing NULL values
UPDATE invoice_profiles
SET billing_frequency = '30 days'
WHERE billing_frequency IS NULL;

-- Step 2: Make column NOT NULL
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency SET NOT NULL;

-- Step 3: Set default
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency SET DEFAULT '30 days';

-- Step 4: Add format constraint
ALTER TABLE invoice_profiles
ADD CONSTRAINT billing_frequency_format
CHECK (billing_frequency ~ '^\d+ (day|days|month|months|year|years)$');
```

**Phase 2: Update Schema** (30 mins)
```prisma
model InvoiceProfile {
  billing_frequency String  @default("30 days") // Make non-nullable
}
```

**Phase 3: Update Form UI** (1-1.5h)
- Replace single text input with dual input:
```typescript
<div className="flex gap-2">
  <Input
    type="number"
    min="1"
    placeholder="30"
    value={frequencyNumber}
    onChange={(e) => setFrequencyNumber(e.target.value)}
    className="w-24"
  />
  <Select
    value={frequencyUnit}
    onValueChange={setFrequencyUnit}
  >
    <SelectItem value="day">Day(s)</SelectItem>
    <SelectItem value="month">Month(s)</SelectItem>
    <SelectItem value="year">Year(s)</SelectItem>
  </Select>
</div>
```

**Phase 4: Update Server Actions** (30 mins)
- Combine number + unit → "30 days" before saving
- Parse "30 days" → { number: 30, unit: "days" } for editing

**Phase 5: Validation** (30 mins)
- Number must be > 0
- Unit must be day/month/year
- Singular/plural handling (1 day, 2 days)

**Phase 6: Testing** (30 mins)
- Create profile with new format
- Edit existing profile
- Verify automated generation works

**Files to Update**:
- `prisma/schema.prisma` (make billing_frequency non-nullable)
- `components/master-data/invoice-profile-form-panel.tsx` (dual input UI)
- `app/actions/admin/invoice-profiles.ts` (combine/parse logic)
- `lib/validations/invoice-profile.ts` (format validation)

**Migration Script**:
- `prisma/migrations/XXXXXX_make_billing_frequency_mandatory/migration.sql`

---

### **Priority 4: Item #5 - Side Panel Styling Gaps** 🟡 PARTIAL
**Status**: 80% done, needs minor gap fix
**Effort**: 1-2 hours
**Why Fourth**: Polish existing system

**Current State**:
- Unified panel system exists: `PanelLevel`, `PanelHeader`, `PanelFooter`
- Framer Motion animations working
- Responsive widths (350px/700px/500px based on level)
- ESC key handler working

**Remaining Work**:
1. Verify no gap at top of panels (between browser top and panel header)
2. Ensure all panels touch page top edge (0px from viewport top)
3. Standardize padding/spacing across all panel types
4. Test on different screen sizes

**Implementation Plan**:

**Phase 1: Audit Current Panels** (30 mins)
- Check all panel types for top gap
- Measure padding consistency
- Document inconsistencies

**Phase 2: Fix CSS** (30 mins)
```css
/* Ensure panels start at viewport top */
.panel-container {
  top: 0;
  padding-top: 0;
}

.panel-header {
  margin-top: 0;
}
```

**Phase 3: Testing** (30 mins)
- Test all panel widths (350/500/700)
- Test different panel types (invoice, vendor, user, etc.)
- Test stacked panels (level 1, level 2, level 3)

**Files to Update**:
- `components/panels/panel-level.tsx`
- `components/panels/panel-header.tsx`
- Panel-specific styles

---

### **Priority 5: Item #8 - Activities Tab (Replace My Requests)**
**Status**: ❌ TODO
**Effort**: 4-5 hours
**Why Fifth**: Major UX improvement

**Current**: Settings has Profile + "My Requests" tabs
**Needed**: Settings with Profile + Security + Activities tabs

**Activities Tab Features**:
- Comprehensive activity log for user
- Filter by type (Invoice, Profile, Security, Master Data)
- Date range picker
- Pagination (20 per page)
- Timeline view with icons

**Implementation Plan**:

**Phase 1: Database Schema** (30 mins)
```sql
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- 'invoice_created', 'invoice_edited', etc.
  activity_description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_activity_type (activity_type)
);
```

**Phase 2: Activity Logger** (1h)
- `lib/activity-logger.ts`
  - `logActivity(userId, type, description, metadata)`
  - Types: invoice_created, invoice_edited, invoice_approved, etc.

**Phase 3: Server Actions** (1h)
- `app/actions/activities.ts`
  - `getUserActivities(userId, filters, pagination)`
  - Filters: type, date range
  - Returns paginated results

**Phase 4: UI Component** (1.5h)
- `app/(dashboard)/settings/components/activities-tab.tsx`
  - Timeline view with icons
  - Filter dropdowns
  - Date range picker
  - "Load More" button

**Phase 5: Integration** (1h)
- Update all relevant server actions to log activities
- Test activity logging across all features

**Files to Create**:
- `lib/activity-logger.ts` (new, ~80 lines)
- `app/actions/activities.ts` (new, ~120 lines)
- `app/(dashboard)/settings/components/activities-tab.tsx` (new, ~250 lines)
- `types/activity.ts` (new, ~30 lines)

**Files to Modify**:
- `app/actions/invoices-v2.ts` (add activity logging)
- `app/actions/admin/master-data-approval.ts` (add activity logging)
- Other server actions

---

### **Priority 6: Item #9 - Settings Menu Restructure**
**Status**: ❌ TODO
**Effort**: 3-4 hours
**Why Sixth**: Enhanced profile management

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

**Implementation Plan**:

**Phase 1: Profile Tab Enhancements** (1.5h)
- Profile picture upload (max 500KB, auto-compress)
- Initials field (max 3 chars, auto-generated from name)
- Country dropdown (searchable with flags)
- Timezone dropdown (auto-detect current)
- Appearance settings (theme, compact mode)

**Phase 2: Security Tab** (1h)
- Email (display only, with "Change Email" button → verify via OTP)
- Password (show last changed date, "Change Password" button)
- 2FA toggle (with QR code setup)
- Active sessions list

**Phase 3: Integration** (1h)
- Wire up all new fields to user schema
- Add server actions for updates
- Add validation

**Files to Create**:
- `app/(dashboard)/settings/components/profile-tab.tsx` (new, ~200 lines)
- `app/(dashboard)/settings/components/security-tab.tsx` (new, ~180 lines)
- `components/ui/image-upload.tsx` (new, ~120 lines)

**Files to Modify**:
- `app/(dashboard)/settings/page.tsx` (restructure tabs)
- `app/actions/user-settings.ts` (new profile update actions)

---

### **Priority 7: Item #10 - Invoice Menu Restructure**
**Status**: ❌ TODO
**Effort**: 4-5 hours
**Why Seventh**: Better invoice organization

**Current**: Single invoice list with filters
**Needed**: Tabs for Recurring / All / TDS

**New Structure**:
```
Invoices
├── Recurring (only recurring invoices, profile filter)
├── All (current view + month navigator)
└── TDS (TDS-applicable invoices with calculations)
```

**Implementation Plan**:

**Phase 1: Recurring Tab** (1.5h)
- Show only invoices with `is_recurring = true`
- Filter by invoice profile
- Show next generation date
- Status indicator (Active/Paused/Ended)

**Phase 2: All Tab (Enhanced)** (1.5h)
- Month navigator: ◀ October 2025 ▶
- Column customizer (show/hide columns)
- Current filters remain
- "This month" / "Last month" shortcuts

**Phase 3: TDS Tab** (1.5h)
- Show invoices with `tds_applicable = true`
- Month navigator
- Columns: Vendor, Invoice #, Date, Paid On, Amount, TDS %, TDS Amt, Payable
- Footer: Total TDS for month
- "Export TDS Report" button (CSV/PDF)

**Phase 4: Testing** (30 mins)
- Verify filters work in each tab
- Test month navigation
- Test TDS calculations
- Test export functionality

**Files to Create**:
- `app/(dashboard)/invoices/recurring/page.tsx` (new, ~200 lines)
- `app/(dashboard)/invoices/tds/page.tsx` (new, ~250 lines)
- `app/(dashboard)/invoices/components/month-navigator.tsx` (new, ~80 lines)
- `app/(dashboard)/invoices/components/column-customizer.tsx` (new, ~120 lines)

**Files to Modify**:
- `app/(dashboard)/invoices/page.tsx` (keep as "All" tab)
- `app/(dashboard)/invoices/layout.tsx` (add tab navigation)

---

### **Priority 8: Item #13 - Invoice Creation Method Toggle**
**Status**: ❌ TODO
**Effort**: 4-5 hours
**Why Last**: Nice-to-have, user choice feature

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

**Phase 1: Database & Preference Storage** (1h)
1. Add `use_panel_for_invoice_creation BOOLEAN DEFAULT true` to users table
2. Create server action `updateUserPreference()`
3. Update Prisma schema and regenerate client

**Phase 2: Settings Toggle UI** (30mins)
1. Add toggle switch in Settings page
2. "Use side panels for invoice creation" label
3. Toast confirmation when toggling
4. Update session after preference change

**Phase 3: Panel Components** (1.5h)
1. Create `RecurringInvoicePanel` (wraps existing form)
2. Create `NonRecurringInvoicePanel` (wraps existing form)
3. Create `InvoiceTypeSelectorPanel` (choose recurring/non-recurring)
4. Register all 3 panels in `panel-provider.tsx`

**Phase 4: Conditional Routing** (30mins)
1. Update `app/(dashboard)/invoices/page.tsx` handleNewInvoice
2. Update `components/layout-v2/navbar-plus-menu.tsx` menu item
3. Check user preference → open panel OR navigate to route
4. Keep both routes functional (don't delete anything)

**Phase 5: Testing** (45mins)
1. Toggle ON → Click "Add Invoice" → Panel opens
2. Toggle OFF → Click "Add Invoice" → Full page loads
3. Preference persists across sessions
4. Works from all entry points (list page, '+' menu)

**Total Effort**: 4-5 hours

**Files to Create**:
- `components/invoices-v2/recurring-invoice-panel.tsx`
- `components/invoices-v2/non-recurring-invoice-panel.tsx`
- `components/invoices-v2/invoice-type-selector-panel.tsx`
- `app/actions/user-preferences.ts`

**Files to Modify**:
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

---

## 📊 Revised Sprint 14 Totals (with NEW Priority)

| Priority | Item | Effort | Cumulative |
|----------|------|--------|-----------|
| 1 | #4: Amount Field | 2-3h | 2-3h |
| 2 | #6: Payment Types | 4-5h | 6-8h |
| 3 | #7: Billing Frequency | 3-5h | 9-13h |
| 4 | #5: Panel Styling | 1-2h | 10-15h |
| 5 | #8: Activities Tab | 4-5h | 14-20h |
| 6 | #9: Settings Restructure | 3-4h | 17-24h |
| 7 | #10: Invoice Tabs | 4-5h | 21-29h |
| 8 | #13: Invoice Creation Toggle | 4-5h | 25-34h |
| **TOTAL** | **8 items** | **25-34h** | - |

**Note**: Items #1, #2, #3, #11, #12 already complete (0h remaining)

---

## 🎯 Next Steps (User Confirmed Priority)

### **Immediate Next Session**:
1. **Start with Item #4** (Amount Field UX) - 2-3 hours
   - Quick win
   - High-value UX improvement
   - Affects all invoice forms

### **Week 1 Plan** (6-8 hours):
1. Item #4: Amount Field (2-3h)
2. Item #6: Payment Types (4-5h)

### **Week 2 Plan** (7-10 hours):
3. Item #7: Billing Frequency (3-5h)
4. Item #5: Panel Styling (1-2h)
5. Item #8: Activities Tab (4-5h) - start if time permits

### **Week 3-4 Plan** (remaining 11-17 hours):
6. Item #8: Activities Tab (complete if needed)
7. Item #9: Settings Restructure (3-4h)
8. Item #10: Invoice Tabs (4-5h)
9. Item #13: Invoice Creation Toggle (4-5h)

---

## 📝 Summary

**Sprint 14 Status**:
- **Original**: 10 items, 6 SP
- **Updated**: 13 items (+3 new items: #11, #12, #13)
- **Completed**: 5 items (38%)
- **Remaining**: 8 items (62%)
- **Effort**: 25-34 hours remaining

**Priority Order Updated**: November 25, 2025, 9:00 PM
- User requested re-prioritization
- Amount Field UX moved to #1 (quick win)
- Invoice Creation Toggle moved to #8 (nice-to-have)

**Next Priority**: Item #4 (Amount Field '0' Placeholder) - 2-3 hours

---

## 💡 Important Notes for Next Session

### **Quality Gates (MANDATORY)**:
- [ ] Lint passes (`pnpm lint`)
- [ ] TypeCheck passes (`pnpm typecheck`)
- [ ] Build passes (`pnpm build`)
- [ ] Manual testing complete
- [ ] Git commit with clear message

### **User Preferences**:
- ✅ Always take an additive approach (don't delete anything)
- ✅ Fix pre-existing errors as encountered
- ✅ Follow established code patterns
- ✅ Document everything thoroughly

### **Established Patterns**:
- Permission logic: `isAdmin || (isOwner && !isPending)`
- Server authorization: Check both ownership and status
- File upload: Optional with explicit null/undefined handling
- Form pre-filling: useEffect + setValue (not defaultValues)
- Number inputs: No spinner arrows (global CSS)

---

**Ready to start with Item #4 (Amount Field UX) in next session! 🚀**
