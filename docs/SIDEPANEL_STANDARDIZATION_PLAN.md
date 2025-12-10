# Sidepanel Standardization Plan

> **Document Version:** 1.1
> **Created:** December 10, 2025
> **Last Updated:** December 10, 2025
> **Status:** Planning Phase - Width Audit Complete
> **Related:** SPRINT_UI_OVERHAUL_PLAN.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Design System & Standards](#3-design-system--standards)
4. [Panel Width Strategy](#4-panel-width-strategy)
5. [Width Audit & Implementation Status](#5-width-audit--implementation-status)
6. [Panel Categories & Templates](#6-panel-categories--templates)
7. [Complete Panel Inventory](#7-complete-panel-inventory)
8. [Implementation Plan](#8-implementation-plan)
9. [File Change Summary](#9-file-change-summary)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Executive Summary

### Objective

Standardize all sidepanels in the application to follow the V3 Invoice Detail Panel design language, ensuring:

- **Consistent visual hierarchy** across all panels
- **Reusable shared components** for faster development
- **Clear information architecture** based on panel purpose
- **Appropriate width tiers** for different content types

### Reference Implementation

The **Invoice Detail Panel V3** (`components/invoices/invoice-detail-panel-v3/`) serves as the gold standard. It features:

- Sticky header with title, status badges
- Hero section with financial stats
- Vertical action bar (right side)
- Tabbed content area
- Simple footer with Close button

### Scope

- **7 Detail/View Panels** - Full V3 redesign
- **12 Form Panels** - Header/footer standardization
- **3 Dialog Panels** - Minor styling updates
- **1 Notification Panel** - Layout improvements

---

## 2. Current State Analysis

### 2.1 Panel Renderers

| Renderer | File Location | Panels Handled |
|----------|---------------|----------------|
| InvoicePanelRenderer | `components/invoices/invoice-panel-renderer.tsx` | 14 panel types |
| ProfilePanelRenderer | `components/master-data/profile-panel-renderer.tsx` | 4 panel types |
| UserPanelRendererGlobal | `components/users/user-panel-renderer-global.tsx` | 3 panel types |
| MasterDataRequestPanelRenderer | `components/master-data/master-data-request-panel-renderer.tsx` | 2 panel types |
| AdminRequestPanelRenderer | `components/master-data/admin-request-panel-renderer.tsx` | 2 panel types |

### 2.2 Existing Shared Components

Located at `components/panels/shared/`:

| Component | Purpose | Status |
|-----------|---------|--------|
| `PanelSection` | Labeled content block | ✅ Created |
| `PanelTabs` | Tab bar + content wrapper | ✅ Created |
| `PanelSummaryHeader` | Title, subtitle, badges | ✅ Created |
| `PanelStatGroup` | 2-4 stat cards row | ✅ Created |
| `PanelActionBar` | Vertical icon action bar | ✅ Created |
| `PanelAttachmentList` | File list with actions | ✅ Created |
| `PanelTimeline` | Activity timeline | ✅ Created |
| `PanelPaymentCard` | Payment item card | ✅ Created |

### 2.3 Current Panel Issues

| Issue | Affected Panels | Impact |
|-------|-----------------|--------|
| Inconsistent layouts | All non-V3 panels | Poor UX, cognitive load |
| Footer button chaos | Profile, User details | Too many buttons, unclear hierarchy |
| No visual hierarchy | Master Data panels | Hard to scan for key info |
| Missing action bars | All except Invoice V3 | Actions buried in footer |
| Underutilized width | Wide panels (800px) | Wasted horizontal space |

---

## 3. Design System & Standards

### 3.1 Panel Anatomy (V3 Standard)

```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER                                                   │
│ Title • Subtitle                               [Badges]    [X]  │
├───────────────────────────────────────────────────────┬─────────┤
│ HERO SECTION (optional)                               │         │
│                                                       │  ACTION │
│ Key stats, progress indicators, summary info          │   BAR   │
├───────────────────────────────────────────────────────┤         │
│ TAB BAR (optional)                                    │  [Icon] │
│                                                       │  [Icon] │
│ [Tab 1]  [Tab 2]  [Tab 3]                            │  [Icon] │
├───────────────────────────────────────────────────────┤    ═    │
│ CONTENT AREA (scrollable)                             │  [Icon] │
│                                                       │  [Icon] │
│ Main content: details, lists, forms, etc.            │         │
│                                                       │         │
├───────────────────────────────────────────────────────┴─────────┤
│ STICKY FOOTER                                                   │
│ [Close]                                       [Primary Action?] │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Usage by Panel Type

| Panel Type | Header | Hero | Action Bar | Tabs | Footer |
|------------|--------|------|------------|------|--------|
| **Detail (Complex)** | ✓ Title + Badges | ✓ Stats | ✓ Full | ✓ Multiple | Close only |
| **Detail (Simple)** | ✓ Title + Badges | ✗ | ✓ Minimal | ✗ | Close only |
| **Form (Create/Edit)** | ✓ Title | ✗ | ✗ | ✗ | Cancel + Save |
| **Dialog (Confirm)** | ✓ Title | ✗ | ✗ | ✗ | Cancel + Confirm |

### 3.3 Action Bar Placement

**All actions move to the vertical action bar** (right side), leaving footer clean:

| Before (Footer) | After (Action Bar) |
|-----------------|-------------------|
| Edit, Delete, Archive in footer | Edit, Delete, Archive as icons |
| Approve, Reject buttons | Approve, Reject icons (separated) |
| Close + many buttons | Close only in footer |

### 3.4 Color & Styling Standards

| Element | Style |
|---------|-------|
| Header background | `bg-background` |
| Hero background | `bg-muted/30` |
| Action bar background | `bg-muted/20` with `border-l` |
| Section labels | `text-xs font-medium text-muted-foreground uppercase` |
| Primary values | `text-sm font-medium` |
| Stat cards | `bg-muted/30 border border-border/50 rounded-lg` |
| Dividers | `border-border/50` |

---

## 4. Panel Width Strategy

### 4.1 Width Tiers

| Tier | Width | CSS Variable | Use Case |
|------|-------|--------------|----------|
| **SMALL** | 500px | `PANEL_WIDTH.SMALL` | Simple forms, confirmations, quick details |
| **MEDIUM** | 650px | `PANEL_WIDTH.MEDIUM` | Standard forms, moderate detail views |
| **LARGE** | 800px | `PANEL_WIDTH.LARGE` | Complex views with tabs, tables, action bars |

### 4.2 Width Assignments by Panel

#### Detail/View Panels

| Panel | Current Width | Recommended | Rationale |
|-------|---------------|-------------|-----------|
| Invoice Detail V3 | 800px (LARGE) | ✅ Keep | Tabs, payments, attachments, action bar |
| Profile Detail | 350px (custom) | 650px (MEDIUM) | Simple info, action bar adds width need |
| Profile Invoices | ~400px | 800px (LARGE) | Table view with actions |
| Profile Payment | ~400px | 800px (LARGE) | Table + payment form |
| User Detail | ~350px | 650px (MEDIUM) | Info cards, activity, action bar |
| Master Data Request Detail | ~500px | 650px (MEDIUM) | Request info, action bar |
| Admin Request Review | 700px (custom) | 800px (LARGE) | Comparison view, approve/reject |
| Notification Panel | ~350px | 500px (SMALL) | Simple list, no action bar |

#### Form Panels

| Panel | Current Width | Recommended | Rationale |
|-------|---------------|-------------|-----------|
| Invoice Create (Both) | 800px (LARGE) | ✅ Keep | Many fields, TDS, attachments |
| Invoice Edit (Both) | 800px (LARGE) | ✅ Keep | Same as create |
| Payment Record | MEDIUM | ✅ Keep | Standard form |
| Vendor Form | SMALL | ✅ Keep | Few fields |
| Category Form | SMALL | ✅ Keep | Few fields |
| Entity Form | SMALL | ✅ Keep | Few fields |
| Payment Type Form | SMALL | ✅ Keep | Few fields |
| Profile Form | ~500px | 650px (MEDIUM) | Moderate fields |
| User Form | ~500px | 650px (MEDIUM) | Moderate fields |
| Master Data Request Form | ~500px | 650px (MEDIUM) | Moderate fields |

#### Dialog Panels

| Panel | Current Width | Recommended | Rationale |
|-------|---------------|-------------|-----------|
| Invoice Hold | MEDIUM | 500px (SMALL) | Just textarea |
| Invoice Reject | MEDIUM | 500px (SMALL) | Just textarea |
| Rejection Modal | 500px | ✅ Keep | Just textarea |

---

## 5. Width Audit & Implementation Status

> **Audit Date:** December 10, 2025
> **Status:** Phase 0 (Pre-requisite) - Ready to Implement

### 5.1 Panels WITH Explicit Width (Already Correct ✅)

These panels already specify width correctly via `openPanel()`:

| Panel Type | Current Width | Location | Status |
|------------|---------------|----------|--------|
| `invoice-create-recurring` | LARGE (800px) | `navbar-plus-menu.tsx:90`, `navbar.tsx:163` | ✅ Correct |
| `invoice-create-non-recurring` | LARGE (800px) | `navbar-plus-menu.tsx:95`, `navbar.tsx:168` | ✅ Correct |
| `invoice-edit-recurring-v2` | LARGE (800px) | `invoice-detail-panel-v2.tsx:80`, `invoice-detail-panel-v3/index.tsx:107` | ✅ Correct |
| `invoice-edit-non-recurring-v2` | LARGE (800px) | `invoice-detail-panel-v2.tsx:83`, `invoice-detail-panel-v3/index.tsx:113` | ✅ Correct |
| `invoice-hold` | MEDIUM (650px) | `invoice-detail-panel-v2.tsx:88`, `invoice-detail-panel-v3/index.tsx:151` | ✅ Correct |
| `payment-record` | MEDIUM (650px) | `invoice-detail-panel-v2.tsx:104`, `invoice-detail-panel-v3/index.tsx:136` | ✅ Correct |
| `invoice-v3-detail` (from settings) | LARGE (800px) | `activities-tab.tsx:151` | ✅ Correct |

### 5.2 Panels WITH Hardcoded Width (Needs Constant) ⚠️

| Panel Type | Current Value | Should Be | Location |
|------------|---------------|-----------|----------|
| `admin-rejection-modal` | `500` (hardcoded) | `PANEL_WIDTH.SMALL` | `admin-request-review-panel.tsx:213` |

### 5.3 Panels WITHOUT Width Specification (Needs Adding) ❌

These panels use the default width and need explicit `PANEL_WIDTH` assignment:

#### Detail/View Panels

| Panel Type | Recommended Width | Rationale | Locations |
|------------|-------------------|-----------|-----------|
| `invoice-v3-detail` | **LARGE** | Complex detail with tabs, action bar | `profile-payment-panel.tsx:222`, `profile-invoices-panel.tsx:202` |
| `profile-invoices` | **LARGE** | List panel with table, actions | `invoices-page.tsx:437` |
| `profile-payment` | **LARGE** | List panel with payment history | `invoices-page.tsx:448` |
| `profile-detail` | **MEDIUM** | Simple detail view with action bar | `invoice-profile-management.tsx:121` |
| `user-detail` | **MEDIUM** | Simple detail view | `user-management.tsx:95`, `users-page-client.tsx:92` |
| `master-data-request-detail` | **MEDIUM** | Detail view with approve/reject | (via renderer) |
| `admin-request-review` | **LARGE** | Comparison view, complex | (via renderer) |

#### Form Panels

| Panel Type | Recommended Width | Rationale | Locations |
|------------|-------------------|-----------|-----------|
| `profile-form` | **MEDIUM** | Moderate fields | `invoice-profile-management.tsx:155` |
| `profile-edit` | **MEDIUM** | Moderate fields | `invoice-profile-management.tsx:140` |
| `user-form` | **MEDIUM** | Moderate fields | `user-management.tsx:73` |
| `user-edit` | **MEDIUM** | Moderate fields | `user-management.tsx:118`, `users-page-client.tsx:115` |
| `vendor-form` | **SMALL** | Few fields (name, description) | `vendor-management.tsx:20,30`, `master-data-settings.tsx:23,27` |
| `category-form` | **SMALL** | Few fields (name) | `category-management.tsx:20,24`, `master-data-settings.tsx:31,35` |
| `payment-type-form` | **SMALL** | Few fields | `payment-type-management.tsx:21,30` |
| `entity-form` | **SMALL** | Few fields | `entity-management.tsx:77,81` |
| `master-data-request-form` | **MEDIUM** | Moderate fields | `master-data-request-detail-panel.tsx:195,210` |

### 5.4 Width Implementation Checklist

#### Phase 0: Width Standardization (Pre-requisite, ~2 hours)

This should be done BEFORE any panel redesign work:

- [x] **Step 1**: Add width to all `invoice-v3-detail` calls → LARGE
- [x] **Step 2**: Add width to profile panel calls (`profile-invoices`, `profile-payment`, `profile-detail`) → LARGE/MEDIUM
- [x] **Step 3**: Add width to user panel calls (`user-detail`, `user-form`, `user-edit`) → MEDIUM
- [x] **Step 4**: Add width to master data form calls (`vendor-form`, `category-form`, `payment-type-form`, `entity-form`) → SMALL
- [x] **Step 5**: Replace hardcoded `500` with `PANEL_WIDTH.SMALL` in `admin-request-review-panel.tsx`
- [x] **Step 6**: Add width to `master-data-request-form` calls → MEDIUM (already done)

#### Files to Modify (18 locations in 12 files)

```
# High Priority - Detail Panels
components/master-data/profile-payment-panel.tsx        → line 222 (invoice-v3-detail)
components/master-data/profile-invoices-panel.tsx       → line 202 (invoice-v3-detail)
components/v3/invoices/invoices-page.tsx                → lines 437, 442, 448 (profile panels)
components/master-data/invoice-profile-management.tsx   → lines 121, 140, 155 (profile panels)

# Medium Priority - User Panels
components/admin/user-management.tsx                    → lines 73, 95, 118 (user panels)
app/(dashboard)/admin/users/users-page-client.tsx       → lines 92, 115 (user panels)

# Lower Priority - Master Data Forms
components/master-data/vendor-management.tsx            → lines 20, 30 (vendor-form)
components/master-data/category-management.tsx          → lines 20, 24 (category-form)
components/master-data/payment-type-management.tsx      → lines 21, 30 (payment-type-form)
components/master-data/entity-management.tsx            → lines 77, 81 (entity-form)
components/master-data/master-data-settings.tsx         → lines 23, 27, 31, 35 (forms)
components/master-data/master-data-request-detail-panel.tsx → lines 195, 210 (request-form)

# Fix Hardcoded Value
components/master-data/admin-request-review-panel.tsx   → line 213 (use PANEL_WIDTH.SMALL)
```

### 5.5 Recommended Implementation Order

**Why Phase 0 First?**
1. **Low risk** - Only adding width parameters, no functional changes
2. **High visibility** - Users immediately see consistent panel sizes
3. **Foundation** - Sets the stage for Phase 1-7 redesign work
4. **Quick win** - ~2 hours of work, immediate impact

**After Phase 0:**
Proceed with Phase 1 (Shared Components) → Phase 2 (Profile Panels V3) → etc.

---

## 6. Panel Categories & Templates

### 6.1 Template A: Complex Detail Panel

**For:** Invoice Detail, Profile Invoices, Profile Payment, Admin Request Review

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ PanelV3Header: Title, badges, close                             │
├─────────────────────────────────────────────────────────────────┤
│ PanelV3Hero: Stats, progress, summary                           │
├───────────────────────────────────────────────────────┬─────────┤
│ PanelTabs: Multiple content sections                  │ Action  │
│                                                       │  Bar    │
│ [Tab Content - scrollable]                           │         │
├───────────────────────────────────────────────────────┴─────────┤
│ Footer: [Close]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Width:** LARGE (800px)

**Shared Components Used:**
- `PanelV3Header` (or simplified version)
- `PanelV3Hero` (with custom stats)
- `PanelActionBar`
- `PanelTabs`
- `PanelSection` (within tabs)

### 6.2 Template B: Simple Detail Panel

**For:** Profile Detail, User Detail, Master Data Request Detail, Notification Panel

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ PanelV3Header: Title, badges, close                             │
├───────────────────────────────────────────────────────┬─────────┤
│ PanelSection: Key information                         │ Action  │
│                                                       │  Bar    │
│ PanelSection: Secondary information                   │(minimal)│
│                                                       │         │
│ [Content - scrollable]                               │         │
├───────────────────────────────────────────────────────┴─────────┤
│ Footer: [Close]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Width:** MEDIUM (650px) or SMALL (500px)

**Shared Components Used:**
- `PanelV3Header` (simplified)
- `PanelActionBar` (fewer actions)
- `PanelSection`

### 6.3 Template C: Form Panel

**For:** All create/edit forms

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Form Title                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Form fields (scrollable)                                        │
│                                                                 │
│ [Field 1]                                                       │
│ [Field 2]                                                       │
│ ...                                                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Footer: [Cancel]                                        [Save]  │
└─────────────────────────────────────────────────────────────────┘
```

**Width:** Varies by complexity (SMALL to LARGE)

**Notes:**
- No action bar (actions are Save/Cancel in footer)
- No hero section
- Form validation in footer buttons

### 6.4 Template D: Dialog Panel

**For:** Confirmation dialogs (Hold, Reject, Archive confirmation)

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Action Title                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Description text                                                │
│                                                                 │
│ [Textarea or confirmation message]                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Footer: [Cancel]                                     [Confirm]  │
└─────────────────────────────────────────────────────────────────┘
```

**Width:** SMALL (500px)

---

## 7. Complete Panel Inventory

### 7.1 Detail/View Panels (7 panels)

| # | Panel | Component | Template | Width | Priority | Effort |
|---|-------|-----------|----------|-------|----------|--------|
| 1 | Invoice Detail V3 | `invoice-detail-panel-v3/` | A (Complex) | LARGE | ✅ Done | - |
| 2 | Profile Detail | `profile-detail-panel.tsx` | B (Simple) | MEDIUM | High | Medium |
| 3 | Profile Invoices | `profile-invoices-panel.tsx` | A (Complex) | LARGE | High | High |
| 4 | Profile Payment | `profile-payment-panel.tsx` | A (Complex) | LARGE | High | High |
| 5 | User Detail | `user-detail-panel-global.tsx` | B (Simple) | MEDIUM | Medium | Medium |
| 6 | Master Data Request Detail | `master-data-request-detail-panel.tsx` | B (Simple) | MEDIUM | Medium | Medium |
| 7 | Admin Request Review | `admin-request-review-panel.tsx` | A (Complex) | LARGE | Medium | High |
| 8 | Notification Panel | `notification-panel.tsx` | B (Simple) | SMALL | Low | Low |

### 7.2 Form Panels (12 panels)

| # | Panel | Component | Template | Width | Priority | Effort |
|---|-------|-----------|----------|-------|----------|--------|
| 1 | Invoice Create Recurring | `recurring-invoice-form-panel.tsx` | C (Form) | LARGE | Low | Low |
| 2 | Invoice Create Non-Recurring | `non-recurring-invoice-form-panel.tsx` | C (Form) | LARGE | Low | Low |
| 3 | Invoice Edit Recurring | `edit-recurring-invoice-form.tsx` | C (Form) | LARGE | Low | Low |
| 4 | Invoice Edit Non-Recurring | `edit-non-recurring-invoice-form.tsx` | C (Form) | LARGE | Low | Low |
| 5 | Payment Record | `payment-form-panel.tsx` | C (Form) | MEDIUM | Low | Low |
| 6 | Vendor Form | `vendor-form-panel.tsx` | C (Form) | SMALL | Low | Low |
| 7 | Category Form | `category-form-panel.tsx` | C (Form) | SMALL | Low | Low |
| 8 | Entity Form | `entity-form-panel.tsx` | C (Form) | SMALL | Low | Low |
| 9 | Payment Type Form | `payment-type-form-panel.tsx` | C (Form) | SMALL | Low | Low |
| 10 | Profile Form | `profile-form-panel.tsx` | C (Form) | MEDIUM | Low | Low |
| 11 | User Form | `user-form-panel-global.tsx` | C (Form) | MEDIUM | Low | Low |
| 12 | Master Data Request Form | `master-data-request-form-panel.tsx` | C (Form) | MEDIUM | Low | Low |

### 7.3 Dialog Panels (3 panels)

| # | Panel | Component | Template | Width | Priority | Effort |
|---|-------|-----------|----------|-------|----------|--------|
| 1 | Invoice Hold | `invoice-hold-panel.tsx` | D (Dialog) | SMALL | Low | Low |
| 2 | Invoice Reject | `invoice-reject-panel.tsx` | D (Dialog) | SMALL | Low | Low |
| 3 | Rejection Modal | `rejection-reason-modal.tsx` | D (Dialog) | SMALL | Low | Low |

---

## 8. Implementation Plan

### Phase 0: Width Standardization (Pre-requisite) ⭐ START HERE

> **Effort:** ~2 hours | **Risk:** Low | **Impact:** High

Before any panel redesign, standardize all panel widths across the app. This is a quick win that:
- Establishes consistent panel sizing immediately
- Requires no functional changes (just adding width parameters)
- Sets the foundation for subsequent phases

**See Section 5.4 for detailed checklist and file locations.**

**Changes:**
- Add `PANEL_WIDTH.LARGE` to all `invoice-v3-detail` calls
- Add `PANEL_WIDTH.LARGE` to `profile-invoices` and `profile-payment` calls
- Add `PANEL_WIDTH.MEDIUM` to `profile-detail`, `user-*`, and `master-data-request-form` calls
- Add `PANEL_WIDTH.SMALL` to `vendor-form`, `category-form`, `payment-type-form`, `entity-form` calls
- Replace hardcoded `500` with `PANEL_WIDTH.SMALL` in `admin-request-review-panel.tsx`

---

### Phase 1: Create Simplified Header Component (1 day)

Create a simpler header component for panels that don't need the full Invoice V3 treatment:

**New File:** `components/panels/shared/panel-header-simple.tsx`

```tsx
interface PanelHeaderSimpleProps {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; variant: BadgeVariant }>;
}
```

### Phase 2: Profile Panels V3 (3-4 days)

**Priority:** High - Most frequently used after invoices

1. **Profile Detail Panel V3**
   - Apply Template B (Simple Detail)
   - Add vertical action bar (Edit, Delete)
   - Use `PanelSection` for grouped info
   - Width: MEDIUM (650px)

2. **Profile Invoices Panel V3**
   - Apply Template A (Complex Detail)
   - Hero with invoice count, total amount
   - Action bar with Create Invoice
   - Table view for invoices list
   - Width: LARGE (800px)

3. **Profile Payment Panel V3**
   - Apply Template A (Complex Detail)
   - Hero with outstanding balance
   - Action bar with Record Payment
   - Payment history list
   - Width: LARGE (800px)

### Phase 3: User Detail Panel V3 (2 days)

**Priority:** Medium

- Apply Template B (Simple Detail)
- Action bar with Edit, Reset Password, Deactivate
- Sections: Info, Statistics, Activity
- Width: MEDIUM (650px)

### Phase 4: Master Data & Admin Panels (2-3 days)

**Priority:** Medium

1. **Master Data Request Detail V3**
   - Apply Template B (Simple Detail)
   - Action bar: Resubmit (if rejected)
   - Width: MEDIUM (650px)

2. **Admin Request Review V3**
   - Apply Template A (Complex Detail)
   - Comparison view for request data
   - Action bar: Approve, Reject
   - Width: LARGE (800px)

### Phase 5: Form Panel Standardization (2 days)

**Priority:** Low - Forms work fine, just need consistency

- Standardize header styling across all form panels
- Consistent footer button placement (Cancel left, Save right)
- Consistent spacing and padding

### Phase 6: Dialog Panel Updates (1 day)

**Priority:** Low

- Update to SMALL width (500px)
- Consistent header/footer styling

### Phase 7: Notification Panel (1 day)

**Priority:** Low

- Simple list layout
- No action bar needed
- Width: SMALL (500px)

---

## 9. File Change Summary

### 9.1 New Files to Create

```
components/panels/shared/
└── panel-header-simple.tsx          # Simplified header for non-complex panels

components/master-data/
├── profile-detail-panel-v3.tsx      # V3 version of profile detail
├── profile-invoices-panel-v3.tsx    # V3 version with table
└── profile-payment-panel-v3.tsx     # V3 version with payment history

components/users/
└── user-detail-panel-v3.tsx         # V3 version of user detail

components/master-data/
├── master-data-request-detail-panel-v3.tsx
└── admin-request-review-panel-v3.tsx
```

### 9.2 Files to Modify

```
# Panel Renderers (update to route to V3 panels)
components/master-data/profile-panel-renderer.tsx
components/users/user-panel-renderer-global.tsx
components/master-data/master-data-request-panel-renderer.tsx
components/master-data/admin-request-panel-renderer.tsx

# Width updates (where openPanel is called)
- Multiple files that call openPanel with width parameter
```

### 9.3 Files to Keep (for reference/rollback)

```
# Original V2 panels - keep until V3 is stable
components/master-data/profile-detail-panel.tsx
components/users/user-detail-panel-global.tsx
components/master-data/master-data-request-detail-panel.tsx
components/master-data/admin-request-review-panel.tsx
```

---

## 10. Acceptance Criteria

### 10.1 General Standards

- [ ] All detail panels use vertical action bar (right side)
- [ ] All panels use standardized width tiers (SMALL/MEDIUM/LARGE)
- [ ] Footer contains only Close button for detail panels
- [ ] Footer contains Cancel + Primary action for form/dialog panels
- [ ] Consistent header styling with title and optional badges
- [ ] Hero section only for complex panels with financial data

### 10.2 Profile Detail Panel V3

- [ ] Uses Template B (Simple Detail)
- [ ] Width: MEDIUM (650px)
- [ ] Action bar: Edit, Delete icons
- [ ] Sections: Description, Entity, Vendor, Category, Currency, Billing, TDS, Visibility
- [ ] Access Management for super_admin

### 10.3 Profile Invoices Panel V3

- [ ] Uses Template A (Complex Detail)
- [ ] Width: LARGE (800px)
- [ ] Hero: Invoice count, total amount, pending balance
- [ ] Action bar: Create Invoice
- [ ] Table: Invoice list with status, amount, due date
- [ ] Click invoice → opens Invoice Detail V3

### 10.4 Profile Payment Panel V3

- [ ] Uses Template A (Complex Detail)
- [ ] Width: LARGE (800px)
- [ ] Hero: Total outstanding, payment count
- [ ] Action bar: Record Payment
- [ ] Payment history list with approve/reject for admins

### 10.5 User Detail Panel V3

- [ ] Uses Template B (Simple Detail)
- [ ] Width: MEDIUM (650px)
- [ ] Action bar: Edit, Reset Password, Deactivate/Reactivate
- [ ] Sections: Info Card, Statistics Card, Activity
- [ ] Last super admin protection

### 10.6 Admin Request Review V3

- [ ] Uses Template A (Complex Detail)
- [ ] Width: LARGE (800px)
- [ ] Action bar: Approve, Reject (with separator)
- [ ] Comparison view showing request vs current data
- [ ] Rejection requires reason (min 10 chars)

---

## Summary

| Phase | Scope | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| **Phase 0** | Width Standardization | ~2 hours | **Critical** | ✅ Complete |
| Phase 1 | Simplified Header Component | 1 day | High | ✅ Complete (existing) |
| Phase 2 | Profile Panels (3) | 3-4 days | High | Pending |
| Phase 3 | User Detail Panel | 2 days | Medium | Pending |
| Phase 4 | Master Data & Admin Panels (2) | 2-3 days | Medium | Pending |
| Phase 5 | Form Panel Standardization | 2 days | Low | Pending |
| Phase 6 | Dialog Panel Updates | 1 day | Low | Pending |
| Phase 7 | Notification Panel | 1 day | Low | Pending |

**Total Estimated Effort:** 12-14 days (including Phase 0)

### Recommended Execution Order

1. **Phase 0** (Width Standardization) - Do this FIRST, ~2 hours
2. **Phase 1** (Simplified Header) - Foundation for other panels
3. **Phase 2** (Profile Panels) - High usage, most value
4. **Phase 3-7** - In priority order

---

*Document Version: 1.1 | Last Updated: December 10, 2025*
