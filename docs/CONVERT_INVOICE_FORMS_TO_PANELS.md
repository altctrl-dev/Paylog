# Invoice Creation Method Toggle - Full Page vs Side Panels

**Created**: November 24, 2025
**Updated**: November 24, 2025 (Added toggle feature)
**Complexity**: ⭐⭐⭐ Medium-High (4-5 hours with toggle)
**Priority**: HIGH (Better UX, user choice, A/B testing capability)

---

## 🎯 Goal (UPDATED)

**User Request**: "I would like to have a toggle button on the settings to switch between current method and the sidepanel method to use them both and decide later."

### **Option 1 - Current Method**: Full-page routes
- `/invoices/new/recurring` (full page navigation)
- `/invoices/new/non-recurring` (full page navigation)
- Traditional page-based flow
- More screen real estate

### **Option 2 - New Method**: Stacked side panels
- Click "Add Invoice" → Panel slides in from right (700px width)
- Choose type → Opens appropriate form in panel
- Same fields, same validation
- Stay on invoice list (no navigation)
- Panel closes after successful submission
- Better for quick data entry while referencing other invoices

### **Implementation Strategy**:
✅ **Keep BOTH methods available**
✅ **Add toggle in Settings** (User preference: "Use side panels for invoice creation")
✅ **Respect user preference** across all invoice creation entry points
✅ **Default**: Side panels (new method)
✅ **Easy to A/B test** and gather user feedback

---

## ✅ Why This is Easy

1. ✅ **Panel system already exists** (`PanelLevel`, `PanelProvider`)
2. ✅ **Forms already exist** (just need to wrap them)
3. ✅ **Animation ready** (framer-motion slide-in)
4. ✅ **Similar patterns exist** (invoice-detail-panel-v2, edit panels)

---

## 📋 Implementation Plan (2-3 hours)

### **Phase 1: Create Panel Wrapper Components** (30 mins)

#### **File 1**: `components/invoices-v2/recurring-invoice-panel.tsx` (NEW)

```typescript
/**
 * Recurring Invoice Creation Panel
 *
 * Wraps the recurring invoice form in a stacked side panel.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { RecurringInvoiceForm } from './recurring-invoice-form';
import type { PanelConfig } from '@/types/panel';

interface RecurringInvoicePanelProps {
  config: PanelConfig;
  onClose: () => void;
}

export function RecurringInvoicePanel({ config, onClose }: RecurringInvoicePanelProps) {
  const handleSuccess = () => {
    // Close panel on successful submission
    onClose();
  };

  const handleCancel = () => {
    // Close panel on cancel
    onClose();
  };

  return (
    <PanelLevel
      config={config}
      title="Add Recurring Invoice"
      onClose={onClose}
    >
      <RecurringInvoiceForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PanelLevel>
  );
}
```

#### **File 2**: `components/invoices-v2/non-recurring-invoice-panel.tsx` (NEW)

```typescript
/**
 * Non-Recurring Invoice Creation Panel
 *
 * Wraps the non-recurring invoice form in a stacked side panel.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { NonRecurringInvoiceForm } from './non-recurring-invoice-form';
import type { PanelConfig } from '@/types/panel';

interface NonRecurringInvoicePanelProps {
  config: PanelConfig;
  onClose: () => void;
}

export function NonRecurringInvoicePanel({ config, onClose }: NonRecurringInvoicePanelProps) {
  const handleSuccess = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <PanelLevel
      config={config}
      title="Add Non-Recurring Invoice"
      onClose={onClose}
    >
      <NonRecurringInvoiceForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PanelLevel>
  );
}
```

**Estimated Time**: 30 minutes
**Files Created**: 2 files (~80 lines total)

---

### **Phase 2: Create Invoice Type Selector Panel** (45 mins)

Since we have two types, we need a selector panel first (like a menu):

#### **File 3**: `components/invoices-v2/invoice-type-selector-panel.tsx` (NEW)

```typescript
/**
 * Invoice Type Selector Panel
 *
 * First panel that opens when user clicks "Add Invoice".
 * User selects between Recurring or Non-Recurring.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import { RefreshCw, FileText } from 'lucide-react';
import type { PanelConfig } from '@/types/panel';

interface InvoiceTypeSelectorPanelProps {
  config: PanelConfig;
  onClose: () => void;
}

export function InvoiceTypeSelectorPanel({ config, onClose }: InvoiceTypeSelectorPanelProps) {
  const { openPanel } = usePanel();

  const handleRecurringClick = () => {
    // Open recurring invoice form panel (stacks on top of this)
    openPanel('recurring-invoice-form', {}, { width: 700, level: 2 });
    onClose(); // Close this selector panel
  };

  const handleNonRecurringClick = () => {
    // Open non-recurring invoice form panel
    openPanel('non-recurring-invoice-form', {}, { width: 700, level: 2 });
    onClose(); // Close this selector panel
  };

  return (
    <PanelLevel
      config={config}
      title="Add Invoice"
      onClose={onClose}
    >
      <div className="space-y-4 py-6">
        <p className="text-sm text-muted-foreground">
          Choose the type of invoice you want to create:
        </p>

        {/* Recurring Invoice Option */}
        <Card
          className="p-6 hover:border-primary transition-colors cursor-pointer"
          onClick={handleRecurringClick}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Recurring Invoice</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For invoices that repeat automatically (monthly, quarterly, etc.)
                based on an invoice profile with pre-defined billing frequency.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Auto-generates on schedule</li>
                <li>• Uses invoice profile settings</li>
                <li>• Best for subscription-based services</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Non-Recurring Invoice Option */}
        <Card
          className="p-6 hover:border-primary transition-colors cursor-pointer"
          onClick={handleNonRecurringClick}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Non-Recurring Invoice</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For one-time invoices that don't repeat automatically.
                Manual invoice creation for ad-hoc services or purchases.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• One-time invoice</li>
                <li>• Manual creation</li>
                <li>• Best for project-based work</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </PanelLevel>
  );
}
```

**Estimated Time**: 45 minutes
**Files Created**: 1 file (~120 lines)

---

### **Phase 3: Register Panels in Provider** (15 mins)

#### **File**: `components/panels/panel-provider.tsx`

**Add to panel renderer** (around line 50+):

```typescript
// ... existing panel cases ...

case 'invoice-type-selector':
  return (
    <InvoiceTypeSelectorPanel
      config={panel.config}
      onClose={() => closePanel(panel.id)}
    />
  );

case 'recurring-invoice-form':
  return (
    <RecurringInvoicePanel
      config={panel.config}
      onClose={() => closePanel(panel.id)}
    />
  );

case 'non-recurring-invoice-form':
  return (
    <NonRecurringInvoicePanel
      config={panel.config}
      onClose={() => closePanel(panel.id)}
    />
  );
```

**Add imports at top**:
```typescript
import { InvoiceTypeSelectorPanel } from '@/components/invoices-v2/invoice-type-selector-panel';
import { RecurringInvoicePanel } from '@/components/invoices-v2/recurring-invoice-panel';
import { NonRecurringInvoicePanel } from '@/components/invoices-v2/non-recurring-invoice-panel';
```

**Estimated Time**: 15 minutes
**Files Modified**: 1 file (~20 lines added)

---

### **Phase 4: Update "Add Invoice" Button** (15 mins)

#### **File 1**: `app/(dashboard)/invoices/page.tsx`

**Find the "Add Invoice" button** (around line 88):

```typescript
// BEFORE:
<Button onClick={handleNewInvoice}>Add Invoice</Button>

// AFTER: (no change needed, just verify handleNewInvoice)
```

**Update handleNewInvoice function** (around line 38-40):

```typescript
// BEFORE:
const handleNewInvoice = () => {
  openPanel('invoice-create', {}, { width: 700 });
};

// AFTER:
const handleNewInvoice = () => {
  // Open invoice type selector panel (500px width, Level 1)
  openPanel('invoice-type-selector', {}, { width: 500, level: 1 });
};
```

#### **File 2**: `components/layout-v2/navbar-plus-menu.tsx`

**Update the "New Invoice" menu item** (find the onClick handler):

```typescript
// BEFORE (probably has router.push):
onClick: () => router.push('/invoices/new/recurring')

// AFTER:
onClick: () => {
  openPanel('invoice-type-selector', {}, { width: 500, level: 1 });
}
```

**Add usePanel hook**:
```typescript
import { usePanel } from '@/hooks/use-panel';

// Inside component:
const { openPanel } = usePanel();
```

**Estimated Time**: 15 minutes
**Files Modified**: 2 files (~10 lines changed)

---

### **Phase 5: Verify Form Components Support Panel Mode** (30 mins)

#### **Check**: `components/invoices-v2/recurring-invoice-form.tsx`

**Ensure it accepts**:
- `onSuccess?: () => void` prop
- `onCancel?: () => void` prop

**If missing, add**:
```typescript
interface RecurringInvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RecurringInvoiceForm({ onSuccess, onCancel }: RecurringInvoiceFormProps) {
  // ... existing code ...

  const handleSubmit = async (data: RecurringInvoiceInput) => {
    // ... existing submit logic ...

    if (result.success) {
      toast({ title: 'Invoice created successfully!' });
      onSuccess?.(); // Call panel close callback
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... existing fields ... */}

      <div className="flex gap-2">
        <Button type="submit">Create Invoice</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
```

**Do the same for**:
- `components/invoices-v2/non-recurring-invoice-form.tsx`

**Estimated Time**: 30 minutes
**Files Modified**: 2 files (~20 lines added each)

---

### **Phase 6: Adjust Panel Width** (30 mins)

Invoice forms have many fields. Test and adjust width:

**Options**:
1. **700px** (standard Level 2) - Try this first
2. **800px** (custom, wider) - If 700px feels cramped
3. **900px** (extra wide) - If you have complex forms

**Update PanelLevel if needed**:

```typescript
// components/panels/panel-level.tsx
const getWidthClass = () => {
  switch (config.level) {
    case 1:
      return 'w-full sm:w-[500px]';
    case 2:
      return 'w-full sm:w-[700px]'; // or 800px for forms
    case 3:
      return 'w-full sm:w-[500px]';
    default:
      return 'w-full sm:w-[700px]';
  }
};
```

**Or pass custom width**:
```typescript
openPanel('recurring-invoice-form', {}, { width: 800 });
```

**Test**:
- Open panel on desktop (1920px screen)
- Open panel on laptop (1366px screen)
- Open panel on tablet (768px screen)
- Verify scrolling works for long forms

**Estimated Time**: 30 minutes

---

### **Phase 7: Add Settings Toggle (NEW - User Preference)** (1 hour)

**UPDATED REQUIREMENT**: Keep both methods, let user choose via Settings toggle

#### **Step 7.1: Add User Preference Field** (15 mins)

**Database Migration**:
```sql
-- Add user preference for invoice creation method
ALTER TABLE users
ADD COLUMN use_panel_for_invoice_creation BOOLEAN DEFAULT true;

-- Update existing users to default (true = use panels)
UPDATE users SET use_panel_for_invoice_creation = true;
```

**Prisma Schema Update**:
```prisma
model User {
  // ... existing fields ...
  use_panel_for_invoice_creation Boolean @default(true)
}
```

#### **Step 7.2: Create Settings Toggle UI** (30 mins)

**File**: `app/(dashboard)/settings/page.tsx`

Add new setting in Profile or Preferences tab:

```typescript
'use client';

import { useSession, update } from 'next-auth/react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [usePanels, setUsePanels] = useState(
    session?.user?.use_panel_for_invoice_creation ?? true
  );

  const handleToggle = async (checked: boolean) => {
    setUsePanels(checked);

    // Update user preference in database
    await updateUserPreference({ use_panel_for_invoice_creation: checked });

    // Update session
    await update();

    toast({
      title: 'Preference Updated',
      description: `Invoice creation will use ${checked ? 'side panels' : 'full pages'}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* ... existing settings ... */}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Invoice Creation Method</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="invoice-panel-toggle">Use side panels for invoice creation</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, invoice forms open in side panels. When disabled, forms open in full pages.
            </p>
          </div>
          <Switch
            id="invoice-panel-toggle"
            checked={usePanels}
            onCheckedChange={handleToggle}
          />
        </div>
      </Card>
    </div>
  );
}
```

#### **Step 7.3: Create Server Action** (15 mins)

**File**: `app/actions/user-preferences.ts` (NEW)

```typescript
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateUserPreference(data: {
  use_panel_for_invoice_creation?: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update preference' };
  }
}
```

**Estimated Time**: 1 hour

---

### **Phase 8: Implement Conditional Routing** (30 mins)

Update all invoice creation entry points to respect user preference:

#### **File 1**: `app/(dashboard)/invoices/page.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePanel } from '@/hooks/use-panel';

export default function InvoicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { openPanel } = usePanel();

  const usePanels = session?.user?.use_panel_for_invoice_creation ?? true;

  const handleNewInvoice = () => {
    if (usePanels) {
      // Open side panel (new method)
      openPanel('invoice-type-selector', {}, { width: 500, level: 1 });
    } else {
      // Navigate to full page (current method)
      router.push('/invoices/new/recurring'); // or show type selector first
    }
  };

  return (
    <div>
      <Button onClick={handleNewInvoice}>Add Invoice</Button>
    </div>
  );
}
```

#### **File 2**: `components/layout-v2/navbar-plus-menu.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePanel } from '@/hooks/use-panel';

export function NavbarPlusMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const { openPanel } = usePanel();

  const usePanels = session?.user?.use_panel_for_invoice_creation ?? true;

  const menuItems = [
    {
      label: 'New Invoice',
      icon: FileText,
      onClick: () => {
        if (usePanels) {
          openPanel('invoice-type-selector', {}, { width: 500 });
        } else {
          router.push('/invoices/new/recurring');
        }
      },
    },
    // ... other menu items
  ];

  return <DropdownMenu items={menuItems} />;
}
```

**Estimated Time**: 30 minutes

---

### **Phase 9: Keep Full-Page Routes** (0 mins - No changes needed)

**IMPORTANT**: Do NOT delete the full-page routes!

**Keep these files**:
- ✅ `app/(dashboard)/invoices/new/recurring/page.tsx`
- ✅ `app/(dashboard)/invoices/new/non-recurring/page.tsx`

**Why**: Users with toggle disabled will still use these routes.

**Estimated Time**: 0 minutes (no work needed)

---

### **Phase 10: Testing** (45 mins)

#### **Test Cases**:

1. **Basic Flow**:
   - Click "Add Invoice" button
   - ✅ Type selector panel opens (500px)
   - Click "Recurring Invoice"
   - ✅ Recurring form panel opens (700px), selector closes
   - Fill form and submit
   - ✅ Success toast, panel closes, list refreshes

2. **Cancel Flow**:
   - Open type selector
   - Click "Recurring Invoice"
   - Click "Cancel" button in form
   - ✅ Panel closes, no invoice created

3. **ESC Key**:
   - Open panel
   - Press ESC
   - ✅ Panel closes

4. **Backdrop Click**:
   - Open panel
   - Click outside panel (backdrop)
   - ✅ Panel closes (or stays open, depending on config)

5. **Panel Stacking**:
   - Open invoice detail panel (existing invoice)
   - Click "Add Invoice" from navbar
   - ✅ Type selector stacks on top
   - ✅ Can close selector, detail panel still open

6. **Validation**:
   - Open form
   - Submit with empty fields
   - ✅ Validation errors show
   - ✅ Panel stays open

7. **Responsive**:
   - Test on mobile (panel should be full-width)
   - Test on tablet (panel should be ~700px)
   - Test on desktop (panel should be 700px)

8. **Toggle Feature Tests** (NEW):
   - Go to Settings → Find "Use side panels for invoice creation" toggle
   - ✅ Toggle ON → Click "Add Invoice" → Panel opens
   - ✅ Toggle OFF → Click "Add Invoice" → Full page route loads
   - ✅ Toggle ON → Click '+' menu → Panel opens
   - ✅ Toggle OFF → Click '+' menu → Full page route loads
   - ✅ Preference persists across sessions (check localStorage/database)
   - ✅ Toast shows confirmation when toggle changes

**Estimated Time**: 45 minutes

---

## 📊 Implementation Summary (UPDATED with Toggle Feature)

| Phase | Task | Time | Files | LOC |
|-------|------|------|-------|-----|
| 1 | Panel wrapper components | 30min | 2 new | ~80 |
| 2 | Type selector panel | 45min | 1 new | ~120 |
| 3 | Register in provider | 15min | 1 mod | ~20 |
| 4 | Update buttons | 15min | 2 mod | ~10 |
| 5 | Verify form props | 30min | 2 mod | ~40 |
| 6 | Adjust width | 30min | 1 mod | ~10 |
| 7 | **Settings toggle UI** | **1h** | **3 new** | **~100** |
| 8 | **Conditional routing** | **30min** | **2 mod** | **~30** |
| 9 | **Keep full-page routes** | **0min** | **0** | **0** |
| 10 | Testing | 45min | - | - |
| **TOTAL** | **With Toggle Feature** | **4.5-5h** | **12** | **~410** |

**Net Result**: +410 LOC (includes toggle infrastructure)
**User Benefit**: Choice between methods, A/B testing capability ✅

---

## ✅ Benefits of Panel Approach

1. **Better UX**:
   - Stay on invoice list (no navigation)
   - Can reference other invoices while creating new one
   - Faster workflow (no page load)

2. **Consistent UI**:
   - Same panel system as edit/detail panels
   - Familiar slide-in animation
   - Stack multiple panels if needed

3. **Mobile Friendly**:
   - Full-width on mobile (better than page)
   - Easy to close (swipe or ESC)

4. **Less Code**:
   - Remove full-page route components
   - Reuse existing form components
   - Net -120 LOC (cleaner codebase)

---

## 🎯 Acceptance Criteria

- [x] "Add Invoice" button opens type selector panel (500px)
- [x] Type selector shows Recurring and Non-Recurring options with descriptions
- [x] Clicking option opens form panel (700px), closes selector
- [x] Form has all existing fields and validation
- [x] Submit creates invoice, shows success toast, closes panel
- [x] Cancel closes panel without creating invoice
- [x] ESC key closes panel
- [x] Panel scrolls if form is tall
- [x] Responsive on mobile (full-width)
- [x] Works with panel stacking (can open detail panel + create panel)
- [x] Old routes removed or deprecated

---

## 🚀 Recommendation

**This is a GREAT improvement!**

**Why do it**:
- ✅ Better UX (stay on page)
- ✅ Quick implementation (3 hours)
- ✅ Cleaner code (-120 LOC)
- ✅ Consistent with rest of app

**Priority**: HIGH (before edit button feature)

**Suggested Order**:
1. **This (Invoice Forms → Panels)** - 3 hours
2. **Edit Button Feature** - 6-8 hours
3. **Other Sprint 14 items**

---

## 🎬 Ready to Start?

We can implement this in **3 hours** with immediate visual improvements:

**Phase 1-2** (1h 15min): Create panel components
- You'll see type selector panel working
- Forms open in panels (even if not fully polished)

**Phase 3-4** (30min): Wire up buttons
- "Add Invoice" opens panel instead of route

**Phase 5-8** (1h 15min): Polish and test
- Adjust widths, add cancel handlers, test flows

**Want to start now? I can begin with Phase 1 (Panel Wrappers - 30 mins).** 🚀
