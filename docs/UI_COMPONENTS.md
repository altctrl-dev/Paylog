# UI Components Reference

This document provides an overview of all reusable UI components and where they are used across the application.

---

## Table of Contents

1. [Page Structure Pattern](#page-structure-pattern)
2. [Tab Components](#tab-components)
3. [Button Component](#button-component)
4. [Badge Component](#badge-component)
5. [Input Components](#input-components)
6. [Dialog & Alert Components](#dialog--alert-components)
7. [Other UI Components](#other-ui-components)

---

## Page Structure Pattern

All main pages should follow a consistent structure pattern for visual cohesion.

### Standard Page Layout

```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div>
    <h1 className="text-2xl font-bold text-foreground">Page Title</h1>
    <p className="text-sm text-muted-foreground mt-1">
      Brief description of the page
    </p>
  </div>

  {/* Tab Navigation */}
  <TabsResponsive
    value={activeTab}
    onChange={handleTabChange}
    breakpoint="sm"
  />

  {/* Tab Content */}
  <div role="tabpanel" id={`panel-${activeTab}`}>
    {/* Content based on active tab */}
  </div>
</div>
```

### Page Header Styling

| Element | Styling |
|---------|---------|
| Title | `text-2xl font-bold text-foreground` |
| Description | `text-sm text-muted-foreground mt-1` |
| Container | `space-y-6` for consistent vertical spacing |

### Pages Following This Pattern

| Page | Component | Location |
|------|-----------|----------|
| Invoices | `InvoicesPage` | `components/v3/invoices/invoices-page.tsx` |
| Settings | `SettingsPage` | `components/v3/settings/settings-page.tsx` |

---

## Tab Components

Tab components provide navigation between sections within a page.

### Design Specifications

| Property | Value |
|----------|-------|
| Container | `bg-muted/40`, `p-1`, `rounded-lg` |
| Tab Width | `w-[170px]` |
| Tab Padding | `py-1.5` |
| Font | `text-sm font-medium font-bold text-center` |
| Active State | `bg-background text-foreground shadow-sm border border-border/50` |
| Inactive State | `text-muted-foreground hover:text-foreground` |
| Transition | `transition-all duration-200` |

### Available Tab Components

| Component | Location | Tabs |
|-----------|----------|------|
| `InvoiceTabs` | `components/v3/invoices/invoice-tabs.tsx` | Recurring, All Invoices, TDS |
| `SettingsTabs` | `components/v3/settings/settings-tabs.tsx` | Profile, Security, Activities |

### Creating New Tab Components

To create tabs for a new page, follow this template:

```tsx
'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 1. Define tab type
export type YourTab = 'tab1' | 'tab2' | 'tab3';

// 2. Define tab configuration
const TAB_CONFIG: { id: YourTab; label: string }[] = [
  { id: 'tab1', label: 'Tab One' },
  { id: 'tab2', label: 'Tab Two' },
  { id: 'tab3', label: 'Tab Three' },
];

// 3. Use standard tab variants (copy from invoice-tabs.tsx)
const tabVariants = cva([...], { variants: {...} });

// 4. Create component following InvoiceTabs pattern
export function YourTabs({ value, onChange, className }: YourTabsProps) {
  // ... implementation
}

// 5. Create responsive wrapper
export function YourTabsResponsive({ value, onChange, breakpoint = 'sm' }: Props) {
  // ... implementation
}
```

### Responsive Behavior

- **Mobile**: Shows as dropdown selector (`<select>`)
- **Desktop**: Shows as horizontal pill tabs
- **Breakpoint**: Default `sm` (640px)

---

## Button Component

**Location:** `components/ui/button.tsx`

### Variants

| Variant | Styling | Usage |
|---------|---------|-------|
| `default` | Primary orange bg, white text (light) / dark text (dark), orange glow on hover | Primary actions (Submit, Save, Create, Approve) |
| `outline` | Border only, transparent bg, orange border/text on hover | Secondary actions (Cancel, Filter, Sort, Export) |
| `destructive` | Red bg for danger actions | Delete, Reject actions |
| `ghost` | No background, subtle hover | Icon buttons, navigation, toggles |
| `subtle` | Transparent bg, rounded-xl on hover, muted bg (light) / zinc-800 bg (dark) | Navbar icons, sidebar buttons |
| `secondary` | Muted background | *Currently unused* |
| `link` | Text with underline on hover | *Currently unused* |

### Sizes

| Size | Dimensions | Usage |
|------|------------|-------|
| `default` | `h-10 px-4 py-2` | Standard buttons |
| `sm` | `h-9 px-3` | Compact buttons, toolbars |
| `lg` | `h-11 px-8` | *Currently unused* |
| `icon` | `h-10 w-10` | Icon-only buttons |

---

### Default Variant (`variant="default"`)

Primary action buttons with orange background and glow effect.

**Files using this variant:**

| File | Line | Description |
|------|------|-------------|
| `components/v3/invoices/all-invoices-tab.tsx` | 346 | New Invoice button |
| `components/bulk-operations/bulk-action-bar.tsx` | 142 | Bulk action confirm |
| `components/invoices/invoice-detail-panel-v2.tsx` | 208 | Approve action |
| `components/users/password-reset-dialog.tsx` | 249 | Confirm reset |
| `components/users/last-super-admin-warning-dialog.tsx` | 86 | Confirm action |
| `components/v3/invoices/month-navigator.tsx` | 197 | Apply button |

---

### Outline Variant (`variant="outline"`)

Secondary action buttons with border, orange on hover.

**Files using this variant:**

| Location | Usage |
|----------|-------|
| **All Invoices Tab** | Filter, Sort, Export buttons |
| **TDS Tab** | Filter, Sort, Export buttons |
| **Reports Page** | This Month, Last Month, This Year, date picker |
| **Settings Page** | Refresh, action buttons |
| **Month Navigator** | Calendar picker button, Today button |
| **Invoice Forms** | Cancel buttons (recurring & non-recurring) |
| **Invoice Detail Panel** | Close, Edit, Hold buttons |
| **User Panels** | Close, Cancel buttons |
| **Payment Form** | Close button |
| **Bulk Operations** | Action buttons, column selector |
| **Comment Components** | Cancel, action buttons |
| **Filter Components** | Clear, date range buttons |
| **Admin Pages** | Refresh, Cancel buttons |
| **Theme Toggle** | Toggle button |
| **Alert Dialog** | Cancel button |
| **Error Pages** | Try Again buttons |

---

### Destructive Variant (`variant="destructive"`)

Danger action buttons for irreversible operations.

**Files using this variant:**

| File | Line | Description |
|------|------|-------------|
| `components/invoices/invoice-reject-panel.tsx` | 82 | Reject invoice |
| `components/bulk-operations/rejection-reason-dialog.tsx` | 160 | Confirm rejection |
| `components/ui/alert-dialog.tsx` | 99 | Destructive action confirm |
| `components/master-data/admin-request-review-panel.tsx` | 280 | Reject request |
| `components/master-data/profile-detail-panel.tsx` | 189 | Delete profile |
| `components/master-data/rejection-reason-modal.tsx` | 102 | Confirm rejection |
| `components/_archived/invoices/invoice-detail-panel.tsx` | 212 | Delete invoice |

---

### Ghost Variant (`variant="ghost"`)

Minimal buttons for icons and subtle interactions.

**Files using this variant:**

| Location | Usage |
|----------|-------|
| **Month Navigator** | Previous/Next arrows |
| **Data Tables** | Pagination arrows, row actions |
| **Comment Components** | Formatting buttons (bold, italic, etc.) |
| **Filter Pills** | Remove filter buttons |
| **Multi-Select** | Clear selection, remove items |
| **Recurring Cards** | View, Edit action buttons |
| **Panel Header** | Close button |
| **Calendar** | Navigation arrows |

---

### Subtle Variant (`variant="subtle"`)

Transparent background with soft rounded hover state. Used for navbar and sidebar icon buttons.

**Styling:**
- Light theme: No background → muted/60 bg with rounded-xl on hover
- Dark theme: No background → zinc-800 bg with rounded-xl on hover

**Files using this variant:**

| File | Line | Description |
|------|------|-------------|
| `components/v3/layout/navbar.tsx` | 182 | Quick actions (+) button |
| `components/v3/layout/navbar.tsx` | 239 | Theme toggle button |
| `components/v3/layout/navbar.tsx` | 260 | Notification bell button |
| `components/v3/layout/sidebar.tsx` | 183 | Help & Support button |
| `components/v3/layout/sidebar.tsx` | 275 | Sidebar collapse toggle |

---

### Size: Small (`size="sm"`)

Compact buttons for toolbars and dense UIs.

**Files using this variant:**

| Location | Usage |
|----------|-------|
| **Reports Page** | Date range quick filters |
| **Comment Components** | Formatting toolbar, submit button |
| **Invoice Detail Panel** | Edit, Pay, Approve buttons |
| **Bulk Action Bar** | Action buttons |
| **Date Range Filter** | Quick date buttons |
| **Settings Page** | Refresh, action buttons |
| **Dashboard Header** | Filter button |
| **Quick Actions** | Navigation links |

---

### Size: Icon (`size="icon"`)

Square buttons for icon-only actions.

**Files using this variant:**

| Location | Usage |
|----------|-------|
| **Navbar** | Theme toggle, notifications, sidebar toggle |
| **Sidebar** | Collapse button |
| **Month Navigator** | Previous/Next month arrows |
| **Data Tables** | Pagination, row actions |
| **Recurring Cards** | View, Edit buttons |
| **Panel Header** | Close button |
| **Calendar** | Month navigation |
| **Theme Toggle** | Dark/light mode switch |

---

## Badge Component

**Location:** `components/ui/badge.tsx`

### Variants

| Variant | Usage |
|---------|-------|
| `default` | Status indicators (Current session, Active states) |
| `secondary` | Counts, TDS percentages, metadata labels |
| `outline` | Timestamps, technical info, invoice numbers |
| `destructive` | Error states, alerts |

**Common Usage Locations:**

| File | Usage |
|------|-------|
| `components/invoices/invoice-status-badge.tsx` | Invoice status display |
| `components/users/user-status-badge.tsx` | User status display |
| `components/invoices-v2/invoice-preview-panel.tsx` | Invoice metadata |
| `components/bulk-operations/bulk-action-bar.tsx` | Selection count |
| `components/dashboard/activity-feed.tsx` | Activity type labels |
| `components/comments/comment-card.tsx` | Edited indicator |
| `components/ui/multi-select.tsx` | Selected count |

---

## Input Components

### Input

**Location:** `components/ui/input.tsx`

Standard text input field used across all forms.

**Common Usage:**
- Login form (email, password)
- Invoice forms (amounts, invoice numbers)
- Search bars (All Invoices, Admin panels)
- User forms (name, email)

### Textarea

**Location:** `components/ui/textarea.tsx`

Multi-line text input.

**Common Usage:**
- Comment forms
- Invoice descriptions
- Rejection reasons

### Select

**Location:** `components/ui/select.tsx`

Dropdown selection component.

**Common Usage:**
- Month/Year pickers
- Status filters
- Entity/Vendor selection

### Checkbox

**Location:** `components/ui/checkbox.tsx`

Toggle selection component.

**Common Usage:**
- Table row selection
- Bulk operations
- Form toggles (recurring invoice options)

### Switch

**Location:** `components/ui/switch.tsx`

Toggle switch component.

**Common Usage:**
- Settings toggles (notifications, preferences)
- Feature flags

---

## Dialog & Alert Components

### Dialog

**Location:** `components/ui/dialog.tsx`

Modal dialog for complex interactions.

**Common Usage:**
- Column selector
- Confirmation dialogs
- Form modals (before panel refactor)

### Alert Dialog

**Location:** `components/ui/alert-dialog.tsx`

Confirmation dialog for important actions.

**Common Usage:**
- Delete confirmations
- Role change confirmations
- Destructive action warnings

### Alert

**Location:** `components/ui/alert.tsx`

Inline alert messages.

**Variants:**
| Variant | Usage |
|---------|-------|
| `default` | General warnings, info messages |
| `destructive` | Error messages, validation failures |

**Common Usage:**
- Form validation errors
- API error display
- Warning messages

---

## Other UI Components

### Card

**Location:** `components/ui/card.tsx`

Container component for grouped content.

**Common Usage:**
- Dashboard widgets
- Recurring invoice cards
- Settings sections

### Table

**Location:** `components/ui/table.tsx`

Data table components (Table, TableHeader, TableBody, TableRow, TableCell).

**Common Usage:**
- All Invoices list
- TDS list
- Admin data tables
- User management

### Dropdown Menu

**Location:** `components/ui/dropdown-menu.tsx`

Context menus and action menus.

**Common Usage:**
- Filter dropdowns
- Sort options
- New Invoice type selector
- User menu
- Row action menus

### Popover

**Location:** `components/ui/popover.tsx`

Floating content container.

**Common Usage:**
- Calendar picker
- Month/Year selector
- Advanced filters

### Tooltip

**Location:** `components/ui/tooltip.tsx`

Hover hints for icons and buttons.

### Skeleton

**Location:** `components/ui/skeleton.tsx`

Loading placeholder.

**Common Usage:**
- Table loading states
- Card loading states
- Form field loading

### Calendar

**Location:** `components/ui/calendar.tsx`

Date picker component.

**Common Usage:**
- Invoice date selection
- Payment date selection
- Date range filters

### Avatar

**Location:** `components/ui/avatar.tsx`

User avatar display.

**Common Usage:**
- User menu in navbar
- Activity feed
- Comments

---

## Hardcoded Buttons (Not Using Button Component)

These buttons should be refactored to use the `Button` component:

| File | Line | Description |
|------|------|-------------|
| `components/layout-v2/navbar-plus-menu.tsx` | 127-133 | Navbar "+" button |

---

## Component Import Paths

All UI components are available from `@/components/ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
// ... etc
```

---

*Last updated: December 2025*
