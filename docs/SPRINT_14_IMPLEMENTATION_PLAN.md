# Sprint 14 Implementation Plan: Invoice Management System Enhancement

## Executive Summary

Sprint 14 focuses on completing the invoice management workflow and enhancing the user experience across the PayLog platform. This sprint addresses 10 critical items ranging from blocking workflow issues to new feature implementations.

### Sprint Goals
1. **Unblock Critical Workflows**: Fix invoice approval buttons and user management panel
2. **Enhance UX Consistency**: Fix currency display, amount field behavior, and panel styling
3. **Complete Master Data**: Implement payment types and enhance invoice profiles
4. **Improve Navigation**: Restructure settings and invoices menus with better organization

### Sprint Scope
- **Duration**: 8-10 development days
- **Total LOC Estimate**: ~2,500 lines (1,500 modifications, 1,000 new)
- **Files Affected**: ~35 files
- **New Components**: 12 components
- **Database Changes**: 2 migrations

### Success Criteria
- All critical workflows functional (invoice approval, user management)
- Consistent UI/UX across all panels and forms
- Complete master data management for payment types
- Restructured navigation with improved user experience
- Zero TypeScript errors maintained
- All features tested and production-ready

## Context Management Plan

### Working Set Index (WSI)
**Initial Seed (Top 5 Focus Areas)**:
1. `/components/invoices/invoice-detail-panel-v2.tsx` - Critical approval buttons
2. `/app/admin/components/user-details-panel.tsx` - Fix loading error
3. `/lib/utils.ts` - Currency formatting functions
4. `/app/(dashboard)/settings/page.tsx` - Settings restructure
5. `/app/(dashboard)/invoices/page.tsx` - Invoice menu restructure

### Context Budget Management
- **Target**: ≤15,000 tokens per phase
- **Compaction Triggers**: After each phase completion
- **JIT Retrieval**: Use grep for specific component patterns
- **NOTES.md Updates**: Each subagent must append decisions

---

## Phase 1: Critical Workflow Blockers

### Objective
Fix blocking issues that prevent core workflows from functioning.

### Scope (Items #1-2)
- Invoice approval buttons for pending invoices
- User details panel loading error

### Owner
- Primary: Implementation Engineer (IE)
- Support: Code Navigator (CN), Test Architect (TA)

### Entry Criteria
- [x] Sprint 13 Phase 5 completed
- [x] Dev server running
- [x] Database migrated

### Detailed Checklist

#### Task 1.1: Invoice Approval Workflow Buttons
**Files to Modify**:
- `/components/invoices/invoice-detail-panel-v2.tsx`
- `/app/actions/invoices-v2.ts`
- `/hooks/use-invoices-v2.ts`

**Implementation**:
```typescript
// Add to invoice-detail-panel-v2.tsx around line 90
{invoice.status === 'pending_approval' && userRole === 'admin' && (
  <div className="flex gap-2 p-4 border-t">
    <Button
      onClick={() => handleApprove(invoice.id)}
      className="flex-1"
      variant="default"
    >
      Approve Invoice
    </Button>
    <Button
      onClick={() => handleReject(invoice.id)}
      className="flex-1"
      variant="outline"
    >
      Reject Invoice
    </Button>
  </div>
)}
```

**Acceptance Criteria**:
- [ ] Admin sees Approve/Reject buttons for pending_approval invoices
- [ ] Standard users don't see these buttons
- [ ] Buttons trigger appropriate server actions
- [ ] Invoice status updates correctly on action
- [ ] UI updates optimistically with proper error handling

#### Task 1.2: Fix User Details Panel Loading
**Files to Modify**:
- `/app/admin/components/user-details-panel.tsx`
- `/app/admin/actions.ts`
- `/lib/utils/cache-utils.ts` (create if needed)

**Root Cause**: Headers being accessed inside unstable_cache function

**Implementation**:
```typescript
// Fix the caching issue by moving headers outside cache boundary
export async function getUserDetails(userId: string) {
  // Don't use headers() inside unstable_cache
  const data = await getCachedUserData(userId);
  // Apply any header-based logic here, outside cache
  return processUserData(data);
}
```

**Acceptance Criteria**:
- [ ] User details panel loads successfully
- [ ] No console errors about headers in cache
- [ ] Data displays correctly
- [ ] Loading state resolves properly
- [ ] Error boundary catches any failures gracefully

### Exit Criteria
- [ ] Both approval buttons and user panel working
- [ ] No TypeScript errors
- [ ] Manual testing completed
- [ ] Evidence pack prepared

### Estimated Effort
- **LOC**: ~200 (150 modified, 50 new)
- **Time**: 4-6 hours
- **Risk**: Low (isolated changes)

### Dependencies
- None (can start immediately)

### Quality Gates
- [ ] Lint passes (`pnpm lint`)
- [ ] TypeCheck passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Manual tests pass

---

## Phase 2: High-Priority UX Fixes

### Objective
Fix critical UX issues affecting all users daily.

### Scope (Items #3-5)
- Currency symbol display based on actual currency
- Amount field '0' placeholder behavior
- Consistent side panel styling

### Owner
- Primary: Implementation Engineer (IE)
- Support: SUPB (Shadcn UI Portal Builder), Test Architect (TA)

### Entry Criteria
- [ ] Phase 1 completed
- [ ] formatCurrency function located
- [ ] All side panels identified

### Detailed Checklist

#### Task 2.1: Fix Currency Display
**Files to Modify**:
- `/lib/utils.ts` (formatCurrency function)
- `/types/currency.ts` (ensure proper types)

**New Implementation**:
```typescript
// lib/utils.ts
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  currencySymbol?: string
): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    // Add more as needed
  };

  const symbol = currencySymbol || symbols[currencyCode] || currencyCode;
  return `${symbol}${amount.toLocaleString()}`;
}
```

**Acceptance Criteria**:
- [ ] Correct currency symbols display for all currencies
- [ ] Invoice list shows proper symbols
- [ ] Dashboard shows proper symbols
- [ ] Falls back gracefully for unknown currencies

#### Task 2.2: Fix Amount Field Behavior
**Files to Modify**:
- `/components/ui/input.tsx` (if custom)
- `/components/invoices-v2/amount-input.tsx` (create)

**New Component**:
```typescript
// components/invoices-v2/amount-input.tsx
export function AmountInput({
  value,
  onChange,
  placeholder = "Enter amount",
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Input
      type="number"
      value={isFocused || value > 0 ? value : ''}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={onChange}
      {...props}
    />
  );
}
```

**Files to Update** (use new AmountInput):
- `/components/invoices-v2/add-invoice-form.tsx`
- `/components/invoices-v2/edit-invoice-form.tsx`
- All other forms with amount fields

**Acceptance Criteria**:
- [ ] Amount fields show placeholder when empty
- [ ] '0' clears on focus or first keystroke
- [ ] Maintains value when > 0
- [ ] Works consistently across all forms

#### Task 2.3: Unified Side Panel Component
**New Files**:
- `/components/ui/side-panel.tsx`
- `/components/ui/side-panel-header.tsx`
- `/components/ui/side-panel-footer.tsx`

**Component Structure**:
```typescript
// components/ui/side-panel.tsx
export function SidePanel({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className
}) {
  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-[500px] bg-background",
      "border-l shadow-lg transform transition-transform",
      "flex flex-col", // No gap at top
      isOpen ? "translate-x-0" : "translate-x-full",
      className
    )}>
      <SidePanelHeader title={title} onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
      {footer && <SidePanelFooter>{footer}</SidePanelFooter>}
    </div>
  );
}
```

**Files to Refactor** (use new SidePanel):
- `/app/admin/components/user-details-panel.tsx`
- `/components/master-data/invoice-profile-form-panel.tsx`
- `/components/invoices/invoice-detail-panel-v2.tsx`
- All other side panels

**Acceptance Criteria**:
- [ ] All panels touch page top (no gap)
- [ ] Consistent styling across app
- [ ] Smooth animations
- [ ] Proper scroll handling
- [ ] Responsive on smaller screens

### Exit Criteria
- [ ] All UX issues resolved
- [ ] Consistent experience across app
- [ ] No visual regressions
- [ ] Components reusable

### Estimated Effort
- **LOC**: ~400 (200 modified, 200 new)
- **Time**: 6-8 hours
- **Risk**: Medium (affects many components)

### Dependencies
- Phase 1 completed

### Quality Gates
- [ ] Visual regression testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness check
- [ ] Storybook stories created

---

## Phase 3: Master Data Features

### Objective
Complete master data management functionality.

### Scope (Items #6-7)
- Payment Types CRUD operations
- Invoice Profile billing frequency

### Owner
- Primary: Implementation Engineer (IE)
- Secondary: Data & Migration Engineer (DME)
- Support: Test Architect (TA)

### Entry Criteria
- [ ] Phase 2 completed
- [ ] Database schema reviewed
- [ ] Master data tab structure understood

### Detailed Checklist

#### Task 3.1: Payment Types Implementation
**New Files**:
- `/app/admin/components/payment-types-tab.tsx`
- `/app/admin/components/payment-type-form.tsx`
- `/app/admin/actions/payment-types.ts`
- `/types/payment-type.ts`

**Database Migration**:
```sql
-- Already exists, verify columns:
-- payment_types table:
-- - id (uuid)
-- - name (text, not null)
-- - requires_reference (boolean, default false)
-- - is_active (boolean, default true)
-- - created_at, updated_at
```

**Component Implementation**:
```typescript
// app/admin/components/payment-types-tab.tsx
export function PaymentTypesTab() {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Payment Types</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          Add Payment Type
        </Button>
      </div>

      <DataTable
        columns={paymentTypeColumns}
        data={paymentTypes}
        onEdit={setEditingType}
        onArchive={handleArchive}
      />

      <SidePanel
        isOpen={isFormOpen || !!editingType}
        onClose={() => {
          setIsFormOpen(false);
          setEditingType(null);
        }}
        title={editingType ? "Edit Payment Type" : "Add Payment Type"}
      >
        <PaymentTypeForm
          paymentType={editingType}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingType(null);
          }}
        />
      </SidePanel>
    </div>
  );
}
```

**Server Actions**:
```typescript
// app/admin/actions/payment-types.ts
export async function createPaymentType(data: CreatePaymentTypeInput) {
  // Validate admin role
  // Create payment type
  // Return success/error
}

export async function updatePaymentType(id: string, data: UpdatePaymentTypeInput) {
  // Validate admin role
  // Update payment type
  // Return success/error
}

export async function archivePaymentType(id: string) {
  // Validate admin role
  // Set is_active = false
  // Return success/error
}
```

**Acceptance Criteria**:
- [ ] Admins can create payment types
- [ ] Name field is mandatory
- [ ] Reference requirement checkbox works
- [ ] Edit functionality works
- [ ] Archive (soft delete) works
- [ ] List shows all payment types with status

#### Task 3.2: Invoice Profile Billing Frequency
**Files to Modify**:
- `/components/master-data/invoice-profile-form-panel.tsx`
- `/app/admin/actions/invoice-profiles.ts`
- `/types/invoice.ts`

**Database Migration**:
```sql
-- Migration: make billing_frequency mandatory
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency SET NOT NULL,
ALTER COLUMN billing_frequency SET DEFAULT '30 days';

-- Add constraint to validate format
ALTER TABLE invoice_profiles
ADD CONSTRAINT billing_frequency_format
CHECK (billing_frequency ~ '^\d+ (day|days|month|months)$');
```

**Form Enhancement**:
```typescript
// Add to invoice-profile-form-panel.tsx
<div className="space-y-2">
  <Label htmlFor="billing_frequency">
    Billing Frequency *
  </Label>
  <div className="flex gap-2">
    <Input
      id="frequency_value"
      type="number"
      min="1"
      placeholder="30"
      value={frequencyValue}
      onChange={(e) => setFrequencyValue(e.target.value)}
      required
    />
    <Select
      value={frequencyUnit}
      onValueChange={setFrequencyUnit}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="days">Days</SelectItem>
        <SelectItem value="months">Months</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <p className="text-sm text-muted-foreground">
    How often should invoices be generated?
  </p>
</div>
```

**Acceptance Criteria**:
- [ ] Billing frequency field is mandatory
- [ ] Supports days and months units
- [ ] Validation prevents invalid values
- [ ] Existing profiles can be updated
- [ ] New profiles require frequency

### Exit Criteria
- [ ] Payment types fully functional
- [ ] Invoice profiles enhanced
- [ ] Database migrations applied
- [ ] All CRUD operations tested

### Estimated Effort
- **LOC**: ~800 (300 modified, 500 new)
- **Time**: 8-10 hours
- **Risk**: Medium (database changes)

### Dependencies
- Phase 2 completed
- Database backup before migration

### Quality Gates
- [ ] Migration rollback tested
- [ ] CRUD operations verified
- [ ] Type safety maintained
- [ ] API endpoints secure

---

## Phase 4: Settings & Navigation Restructure

### Objective
Restructure settings and invoice navigation for better UX.

### Scope (Items #8-10)
- Activities tab replacing My Requests
- Settings menu with Profile/Security/Activities tabs
- Invoice menu with Recurring/All/TDS tabs and month navigation

### Owner
- Primary: Implementation Engineer (IE)
- Secondary: UI/UX Specialist (SUPB)
- Support: Test Architect (TA)

### Entry Criteria
- [ ] Phase 3 completed
- [ ] Activity logging system designed
- [ ] Navigation patterns established

### Detailed Checklist

#### Task 4.1: Activity Logging System
**New Files**:
- `/lib/activity-logger.ts`
- `/app/actions/activities.ts`
- `/types/activity.ts`

**Database Migration**:
```sql
CREATE TABLE user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_activities_user_id (user_id),
  INDEX idx_user_activities_created_at (created_at)
);
```

**Activity Logger**:
```typescript
// lib/activity-logger.ts
export async function logActivity(
  userId: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, any>
) {
  await prisma.userActivity.create({
    data: {
      userId,
      activityType: type,
      activityDescription: description,
      metadata: metadata || {},
    }
  });
}

// Hook into existing actions
export function withActivityLogging<T extends (...args: any[]) => any>(
  action: T,
  getActivityInfo: (args: Parameters<T>) => ActivityInfo
): T {
  return (async (...args) => {
    const result = await action(...args);
    if (result.success) {
      const info = getActivityInfo(args);
      await logActivity(info.userId, info.type, info.description, info.metadata);
    }
    return result;
  }) as T;
}
```

#### Task 4.2: Settings Menu Restructure
**Files to Modify**:
- `/app/(dashboard)/settings/page.tsx`
- `/app/(dashboard)/settings/layout.tsx`

**New Components**:
- `/app/(dashboard)/settings/components/profile-tab.tsx`
- `/app/(dashboard)/settings/components/security-tab.tsx`
- `/app/(dashboard)/settings/components/activities-tab.tsx`
- `/components/ui/image-upload.tsx`

**Profile Tab Implementation**:
```typescript
// settings/components/profile-tab.tsx
export function ProfileTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ImageUpload
          value={user.profilePicture}
          onChange={handleProfilePictureChange}
          maxSize={500 * 1024} // 500KB
          compress
        />
        <div>
          <h3 className="font-medium">Profile Picture</h3>
          <p className="text-sm text-muted-foreground">
            Upload a picture (max 500KB)
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Display Name</Label>
          <Input value={user.displayName} onChange={...} />
        </div>
        <div>
          <Label>Initials</Label>
          <Input value={user.initials} maxLength={3} onChange={...} />
        </div>
        <div>
          <Label>Country</Label>
          <CountrySelect value={user.country} onChange={...} />
        </div>
        <div>
          <Label>Timezone</Label>
          <TimezoneSelect value={user.timezone} onChange={...} />
        </div>
      </div>

      <div>
        <Label>Appearance</Label>
        <ThemeSwitcher />
      </div>
    </div>
  );
}
```

**Security Tab**:
```typescript
// settings/components/security-tab.tsx
export function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <Label>Email Address</Label>
        <Input value={user.email} disabled />
        <p className="text-sm text-muted-foreground mt-1">
          Contact admin to change email
        </p>
      </div>

      <div>
        <Label>Password</Label>
        <Button variant="outline" onClick={handleResetPassword}>
          Reset Password
        </Button>
      </div>

      <div>
        <Label>Two-Factor Authentication</Label>
        <div className="flex items-center gap-4 mt-2">
          <Switch
            checked={user.mfaEnabled}
            onCheckedChange={handleMFAToggle}
          />
          <span>{user.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        {!user.mfaEnabled && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleSetupMFA}
          >
            Setup MFA
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Activities Tab**:
```typescript
// settings/components/activities-tab.tsx
export function ActivitiesTab() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>({});

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={filter.type} onValueChange={...}>
          <SelectTrigger>
            <SelectValue placeholder="All activities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="vendor_request">Vendor Requests</SelectItem>
            <SelectItem value="invoice_request">Invoice Requests</SelectItem>
            <SelectItem value="profile_update">Profile Updates</SelectItem>
            <SelectItem value="security">Security</SelectItem>
          </SelectContent>
        </Select>

        <DateRangePicker
          value={filter.dateRange}
          onChange={...}
        />
      </div>

      <div className="space-y-2">
        {activities.map(activity => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

#### Task 4.3: Invoice Menu Restructure
**Files to Modify**:
- `/app/(dashboard)/invoices/page.tsx`
- `/app/(dashboard)/invoices/layout.tsx`

**New Components**:
- `/app/(dashboard)/invoices/components/month-navigator.tsx`
- `/app/(dashboard)/invoices/components/column-customizer.tsx`
- `/app/(dashboard)/invoices/recurring/page.tsx`
- `/app/(dashboard)/invoices/tds/page.tsx`

**Month Navigator**:
```typescript
// invoices/components/month-navigator.tsx
export function MonthNavigator({
  value,
  onChange
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const handlePrevMonth = () => {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() - 1);
    onChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() + 1);
    onChange(newDate);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            {format(value, 'MMMM yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <MonthYearPicker
            value={value}
            onChange={onChange}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

**TDS Tab Implementation**:
```typescript
// invoices/tds/page.tsx
export default function TDSPage() {
  const [month, setMonth] = useState(new Date());
  const [tdsData, setTdsData] = useState<TDSEntry[]>([]);

  const columns: ColumnDef<TDSEntry>[] = [
    {
      accessorKey: 'vendor',
      header: 'Invoice Details',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.vendorName}</p>
          <p className="text-sm text-muted-foreground">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice Number',
    },
    {
      accessorKey: 'invoiceDate',
      header: 'Invoice Date',
      cell: ({ row }) => format(row.original.invoiceDate, 'dd MMM yyyy'),
    },
    {
      accessorKey: 'paidOn',
      header: 'Paid On',
      cell: ({ row }) =>
        row.original.paidOn
          ? format(row.original.paidOn, 'dd MMM yyyy')
          : '-',
    },
    {
      accessorKey: 'invoiceAmount',
      header: 'Invoice Amt',
      cell: ({ row }) => formatCurrency(row.original.invoiceAmount, row.original.currency),
    },
    {
      accessorKey: 'tdsPercentage',
      header: 'TDS %',
      cell: ({ row }) => `${row.original.tdsPercentage}%`,
    },
    {
      accessorKey: 'tdsAmount',
      header: 'TDS Amt',
      cell: ({ row }) => formatCurrency(row.original.tdsAmount, row.original.currency),
    },
    {
      accessorKey: 'payableAmount',
      header: 'Payable Amt',
      cell: ({ row }) => formatCurrency(
        row.original.invoiceAmount - row.original.tdsAmount,
        row.original.currency
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">TDS Details</h1>
        <MonthNavigator value={month} onChange={setMonth} />
      </div>

      <DataTable
        columns={columns}
        data={tdsData}
        customizable
      />

      <div className="flex justify-end gap-4 text-sm">
        <div>
          Total TDS: {formatCurrency(totalTDS, 'INR')}
        </div>
        <Button variant="outline" size="sm">
          Export TDS Report
        </Button>
      </div>
    </div>
  );
}
```

**Column Customization**:
```typescript
// invoices/components/column-customizer.tsx
export function ColumnCustomizer({
  columns,
  visibleColumns,
  onColumnsChange
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Show Columns</h4>
          <DndContext>
            <SortableContext items={columns}>
              {columns.map(column => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onColumnsChange([...visibleColumns, column.id]);
                    } else {
                      onColumnsChange(visibleColumns.filter(id => id !== column.id));
                    }
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Exit Criteria
- [ ] All navigation restructured
- [ ] Activity logging functional
- [ ] Settings tabs complete
- [ ] Invoice tabs with month navigation
- [ ] TDS calculations accurate

### Estimated Effort
- **LOC**: ~1,100 (400 modified, 700 new)
- **Time**: 10-12 hours
- **Risk**: High (major UX changes)

### Dependencies
- Phase 3 completed
- Activity table migration
- User acceptance of new navigation

### Quality Gates
- [ ] User flow testing
- [ ] Performance testing (activity queries)
- [ ] Mobile responsiveness
- [ ] Accessibility audit

---

## Technical Architecture

### Component Hierarchy

```
src/
├── components/
│   ├── ui/
│   │   ├── side-panel.tsx (NEW - reusable panel)
│   │   ├── amount-input.tsx (NEW - smart amount field)
│   │   ├── image-upload.tsx (NEW - profile pictures)
│   │   └── month-year-picker.tsx (NEW - date selection)
│   ├── invoices/
│   │   ├── invoice-detail-panel-v2.tsx (MODIFY - add approval)
│   │   └── invoice-approval-actions.tsx (NEW)
│   └── invoices-v2/
│       └── tds-summary.tsx (NEW)
├── app/
│   ├── (dashboard)/
│   │   ├── settings/
│   │   │   ├── page.tsx (MODIFY - add tabs)
│   │   │   └── components/
│   │   │       ├── profile-tab.tsx (NEW)
│   │   │       ├── security-tab.tsx (NEW)
│   │   │       └── activities-tab.tsx (NEW)
│   │   └── invoices/
│   │       ├── page.tsx (MODIFY - add tabs)
│   │       ├── recurring/page.tsx (NEW)
│   │       ├── tds/page.tsx (NEW)
│   │       └── components/
│   │           ├── month-navigator.tsx (NEW)
│   │           └── column-customizer.tsx (NEW)
│   ├── admin/
│   │   ├── components/
│   │   │   ├── user-details-panel.tsx (MODIFY - fix cache)
│   │   │   ├── payment-types-tab.tsx (NEW)
│   │   │   └── payment-type-form.tsx (NEW)
│   │   └── actions/
│   │       └── payment-types.ts (NEW)
│   └── actions/
│       ├── invoices-v2.ts (MODIFY - add approval)
│       └── activities.ts (NEW)
├── lib/
│   ├── utils.ts (MODIFY - fix formatCurrency)
│   ├── activity-logger.ts (NEW)
│   └── utils/
│       └── cache-utils.ts (NEW)
└── types/
    ├── activity.ts (NEW)
    └── payment-type.ts (NEW)
```

### Server Action Patterns

```typescript
// Standard pattern with activity logging
export const approveInvoice = withActivityLogging(
  async function approveInvoice(invoiceId: string) {
    const session = await getServerSession();
    if (!session || session.user.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'approved',
          approvedBy: session.user.id,
          approvedAt: new Date()
        }
      });

      return { success: true, data: invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  (args) => ({
    userId: session.user.id,
    type: 'invoice_approval',
    description: `Approved invoice ${args[0]}`,
    metadata: { invoiceId: args[0] }
  })
);
```

### Database Optimization

```typescript
// Optimized activity query with pagination
export async function getUserActivities(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) {
  const where: Prisma.UserActivityWhereInput = {
    userId,
    ...(options.type && { activityType: options.type }),
    ...(options.dateFrom && {
      createdAt: {
        gte: options.dateFrom,
        ...(options.dateTo && { lte: options.dateTo })
      }
    })
  };

  const [activities, total] = await prisma.$transaction([
    prisma.userActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: ((options.page || 1) - 1) * (options.limit || 20),
      take: options.limit || 20,
    }),
    prisma.userActivity.count({ where })
  ]);

  return {
    activities,
    total,
    pages: Math.ceil(total / (options.limit || 20))
  };
}
```

---

## Migration Strategy

### Phase 1: No migrations needed

### Phase 2: No migrations needed

### Phase 3: Database Migrations

```sql
-- Migration 1: Make billing_frequency mandatory
BEGIN;

-- Add default to existing nulls
UPDATE invoice_profiles
SET billing_frequency = '30 days'
WHERE billing_frequency IS NULL;

-- Make column not null
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency SET NOT NULL,
ALTER COLUMN billing_frequency SET DEFAULT '30 days';

-- Add validation
ALTER TABLE invoice_profiles
ADD CONSTRAINT billing_frequency_format
CHECK (billing_frequency ~ '^\d+ (day|days|month|months)$');

COMMIT;
```

### Phase 4: Activity Table Migration

```sql
-- Migration 2: Create user_activities table
BEGIN;

CREATE TABLE user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_activities_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);

-- Add composite index for common queries
CREATE INDEX idx_user_activities_user_type_date
ON user_activities(user_id, activity_type, created_at DESC);

COMMIT;
```

### Rollback Plans

**Phase 3 Rollback**:
```sql
-- Rollback billing_frequency changes
BEGIN;
ALTER TABLE invoice_profiles
DROP CONSTRAINT IF EXISTS billing_frequency_format;
ALTER TABLE invoice_profiles
ALTER COLUMN billing_frequency DROP NOT NULL,
ALTER COLUMN billing_frequency DROP DEFAULT;
COMMIT;
```

**Phase 4 Rollback**:
```sql
-- Rollback activity table
BEGIN;
DROP TABLE IF EXISTS user_activities CASCADE;
COMMIT;
```

---

## Risk Assessment

### High Risk Items

1. **User Details Panel Cache Issue**
   - **Risk**: Incorrect fix could break other cached functions
   - **Mitigation**: Isolate header access, test all admin panels
   - **Rollback**: Revert to previous caching strategy

2. **Database Migrations**
   - **Risk**: Data corruption or loss
   - **Mitigation**: Test on staging, backup before migration
   - **Rollback**: Have rollback scripts ready

3. **Navigation Restructure**
   - **Risk**: User confusion with new UI
   - **Mitigation**: Add tooltips, provide user guide
   - **Rollback**: Feature flag to toggle old/new UI

### Medium Risk Items

1. **Currency Display Changes**
   - **Risk**: Incorrect amounts shown
   - **Mitigation**: Extensive testing with all currencies
   - **Rollback**: Revert formatCurrency function

2. **Activity Logging Performance**
   - **Risk**: Database bloat, slow queries
   - **Mitigation**: Proper indexing, pagination, archival strategy
   - **Rollback**: Disable logging temporarily

### Low Risk Items

1. **Side Panel Styling**
   - **Risk**: Minor visual inconsistencies
   - **Mitigation**: Storybook testing, visual regression tests
   - **Rollback**: CSS adjustments

---

## Testing Strategy

### Phase 1: Critical Workflows

**Manual Testing Checklist**:
- [ ] Login as admin user
- [ ] Navigate to invoice with pending_approval status
- [ ] Verify Approve/Reject buttons appear
- [ ] Click Approve - verify status changes
- [ ] Click Reject - verify status changes
- [ ] Login as standard user
- [ ] Verify no approval buttons visible
- [ ] Navigate to Admin > User Management
- [ ] Click on any user
- [ ] Verify details panel loads without errors
- [ ] Check console for no cache-related errors

### Phase 2: UX Consistency

**Visual Testing**:
- [ ] Check all invoice lists for correct currency symbols
- [ ] Verify INR shows ₹, USD shows $, EUR shows €
- [ ] Test amount fields in all forms
- [ ] Verify '0' clears on focus
- [ ] Test typing after clearing
- [ ] Open all side panels
- [ ] Verify no gap at top
- [ ] Check scroll behavior
- [ ] Test on mobile viewport

### Phase 3: Master Data

**CRUD Testing**:
- [ ] Create payment type with all fields
- [ ] Edit payment type name
- [ ] Toggle reference requirement
- [ ] Archive payment type
- [ ] Verify archived types hidden from active list
- [ ] Create invoice profile without frequency (should fail)
- [ ] Add frequency to existing profile
- [ ] Test various frequency formats

### Phase 4: Navigation

**User Flow Testing**:
- [ ] Upload profile picture (<500KB)
- [ ] Upload large image (>500KB) - should compress
- [ ] Change all profile fields
- [ ] Reset password flow
- [ ] Enable/disable MFA
- [ ] View activities with filters
- [ ] Navigate between months in invoice view
- [ ] Customize table columns
- [ ] View TDS calculations
- [ ] Export TDS report

### Performance Testing

```typescript
// Test activity query performance
console.time('Activity Query');
const activities = await getUserActivities(userId, {
  page: 1,
  limit: 50,
  dateFrom: new Date('2025-01-01')
});
console.timeEnd('Activity Query'); // Should be <100ms
```

### Security Testing

- [ ] Verify only admins can approve invoices
- [ ] Test payment type creation without admin role
- [ ] Verify activity logs don't expose sensitive data
- [ ] Check MFA implementation security
- [ ] Test image upload size limits
- [ ] Verify SQL injection prevention

---

## Implementation Timeline

### Week 1
- **Day 1-2**: Phase 1 (Critical Workflows)
  - Morning: Invoice approval buttons
  - Afternoon: User panel cache fix
  - Testing & verification

- **Day 3-4**: Phase 2 (UX Fixes)
  - Morning: Currency display fix
  - Afternoon: Amount field behavior
  - Day 4: Side panel component & refactoring

- **Day 5**: Buffer & Testing
  - Comprehensive testing of Phases 1-2
  - Bug fixes
  - Documentation updates

### Week 2
- **Day 6-7**: Phase 3 (Master Data)
  - Day 6: Payment types implementation
  - Day 7: Invoice profile frequency
  - Database migrations

- **Day 8-10**: Phase 4 (Navigation)
  - Day 8: Activity logging system
  - Day 9: Settings restructure
  - Day 10: Invoice menu restructure

### Final Review
- Integration testing
- Performance optimization
- User acceptance testing
- Deployment preparation

---

## Success Metrics

### Quantitative Metrics
- Zero TypeScript errors maintained
- All tests passing (100% of existing + new)
- Page load times <2 seconds
- Activity queries <100ms
- Bundle size increase <50KB

### Qualitative Metrics
- Consistent UI across all panels
- Intuitive navigation structure
- Clear visual hierarchy
- Smooth animations and transitions
- Positive user feedback

### Completion Criteria
- [ ] All 10 items implemented
- [ ] All phases tested and verified
- [ ] Documentation updated
- [ ] No regression in existing features
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

## File Modification Summary

### Total Impact
- **Files Modified**: ~25 files
- **Files Created**: ~20 files
- **Lines Changed**: ~1,500
- **Lines Added**: ~1,000
- **Components Created**: 12
- **Database Migrations**: 2

### Critical Path Files
1. `/components/invoices/invoice-detail-panel-v2.tsx`
2. `/app/admin/components/user-details-panel.tsx`
3. `/lib/utils.ts`
4. `/app/(dashboard)/settings/page.tsx`
5. `/app/(dashboard)/invoices/page.tsx`

---

## Notes for Subagents

### For Code Navigator (CN)
- Focus on identifying all currency display locations
- Map all side panel components for consistency check
- Trace user details panel data flow for cache issue

### For Implementation Engineer (IE)
- Prioritize reusable components (SidePanel, AmountInput)
- Maintain consistent error handling patterns
- Use existing server action patterns

### For Test Architect (TA)
- Create test fixtures for different currencies
- Add visual regression tests for panels
- Write activity query performance tests

### For Data & Migration Engineer (DME)
- Ensure migrations are idempotent
- Test rollback procedures
- Optimize activity table indexes

### For Integration & Cohesion Auditor (ICA)
- Verify no silos between phases
- Check component reusability
- Ensure consistent patterns

### For Production Readiness Verifier (PRV)
- Run full regression suite
- Check bundle size impact
- Verify security controls

---

## Appendix: Code Patterns

### Approval Action Pattern
```typescript
export async function handleApproval(
  invoiceId: string,
  action: 'approve' | 'reject',
  reason?: string
) {
  const session = await validateAdminSession();
  if (!session) throw new Error('Unauthorized');

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const result = await prisma.$transaction(async (tx) => {
    // Update invoice
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus,
        [`${action}dBy`]: session.user.id,
        [`${action}dAt`]: new Date(),
        ...(reason && { rejectionReason: reason })
      }
    });

    // Log activity
    await tx.userActivity.create({
      data: {
        userId: session.user.id,
        activityType: `invoice_${action}`,
        activityDescription: `${action}d invoice ${invoice.invoiceNumber}`,
        metadata: { invoiceId, reason }
      }
    });

    return invoice;
  });

  // Send notification
  await notifyInvoiceStatusChange(result);

  return result;
}
```

### Cache-Safe Data Fetching
```typescript
// Separate cache from headers
export async function getUserDetailsWithCache(userId: string) {
  // Get cached data (no headers inside)
  const cachedData = await getCachedUserDetails(userId);

  // Apply header-based logic outside cache
  const headers = await getHeaders();
  const timezone = headers.get('x-timezone') || 'UTC';

  return {
    ...cachedData,
    formattedDates: formatDatesForTimezone(cachedData, timezone)
  };
}

const getCachedUserDetails = unstable_cache(
  async (userId: string) => {
    // Pure data fetching, no headers
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        activities: { take: 10 }
      }
    });
  },
  ['user-details'],
  { revalidate: 60 }
);
```

---

## Future Work / Sprint 15 Backlog

### High Priority

#### 1. V2 Invoice Edit Forms
**Status**: Deferred from Sprint 14 Phase 1
**Priority**: High
**Estimated Effort**: 3-4 days

**Description**:
Implement edit functionality for V2 invoices (both recurring and non-recurring). Currently, V2 invoices can only be created but not edited after approval.

**Technical Requirements**:
- Create `RecurringInvoiceEditForm` component that supports editing existing recurring invoices
- Create `NonRecurringInvoiceEditForm` component that supports editing existing non-recurring invoices
- Add `invoice-v2-edit-recurring` and `invoice-v2-edit-non-recurring` panel types to `invoice-panel-renderer.tsx`
- Update server actions to support V2 invoice updates (preserve `is_recurring`, `invoice_profile_id`, inline payment fields)
- Add validation to prevent changing invoice type (recurring ↔ non-recurring) after creation
- Implement proper permission checks (admins only)

**Files to Create**:
- `/components/invoices-v2/recurring-invoice-edit-form.tsx` (~400 LOC)
- `/components/invoices-v2/non-recurring-invoice-edit-form.tsx` (~400 LOC)
- `/app/actions/edit-invoice-v2.ts` (~250 LOC)

**Files to Modify**:
- `/components/invoices/invoice-panel-renderer.tsx` - Add V2 edit panel types
- `/components/invoices/invoice-detail-panel-v2.tsx` - Update Edit button to route to correct V2 form
- `/hooks/use-invoices-v2.ts` - Add `useUpdateInvoiceV2` mutation hook

**Acceptance Criteria**:
- [ ] Recurring invoices can be edited without losing profile association
- [ ] Non-recurring invoices can be edited with all fields editable
- [ ] Inline payment data is preserved during edits
- [ ] Cannot change invoice type after creation (validation error)
- [ ] Edit button in V2 detail panel opens correct form based on `is_recurring` field
- [ ] All validations from create forms apply to edit forms
- [ ] Activity log records invoice edits with old/new data comparison
- [ ] TypeScript strict mode compliance maintained
- [ ] Tests for edit flows (positive and negative cases)

**Why Deferred**:
The V1 invoice edit form (`InvoiceFormPanel`) doesn't support V2 fields (`is_recurring`, `invoice_profile_id`, inline payment tracking). Using it to edit V2 invoices would risk data corruption or loss of V2-specific features. A proper V2 edit implementation requires dedicated forms that understand the V2 data model.

**Current Workaround**:
Edit button in V2 detail panel shows a toast message: "V2 invoice editing is coming soon. For now, you can create a new invoice or contact support."

---

## End of Sprint 14 Implementation Plan

This comprehensive plan provides clear guidance for implementing all 10 items in Sprint 14. Each phase is designed to be independently executable while maintaining overall cohesion. The plan emphasizes production readiness, thorough testing, and maintaining the high quality standards established in previous sprints.

Total Estimated Effort: **8-10 development days**
Total Estimated LOC: **~2,500 lines**
Risk Level: **Medium** (with proper mitigation strategies in place)