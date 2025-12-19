# PayLog - Complete Context Restoration Prompt

**Document Version**: 2.1
**Last Updated**: December 19, 2025
**Purpose**: Use this prompt at the start of ANY new Claude session to restore full project context.

---

## Quick Context Restore

Copy and paste the following prompt at the start of your session:

---

```
I'm working on PayLog, an expense/invoice management system for Indian businesses. Please read these files to restore complete project context:

1. /Users/althaf/Projects/paylog-3/docs/PROJECT_HANDOFF_GUIDE.md (comprehensive project documentation)
2. /Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_DEC25.md (December 2025 session details)
3. /Users/althaf/Projects/paylog-3/schema.prisma (database schema)

After reading, confirm you understand:

## Project Identity
- **Name**: PayLog
- **Purpose**: Expense/invoice management for Indian businesses
- **Features**: Recurring invoices, TDS calculations, vendor management, payment tracking
- **Tech Stack**: Next.js 14.2.35, TypeScript, PostgreSQL, Prisma, shadcn/ui, React Query, Zustand
- **Hosting**: Railway (PostgreSQL + deployment)

## Current Status (December 19, 2025)
- Sprint 14: COMPLETE (13/13 items)
- Progress: ~99% toward v1.0.0
- Recent: Payments tab badge + Currency fixes (Dec 19)
- Commits: 87+ in December 2025

## Architecture Patterns (CRITICAL - MUST FOLLOW)

### 1. Server Actions over API Routes
All mutations use Next.js Server Actions in `app/actions/`:
```typescript
'use server';
export async function createInvoice(data) {
  const session = await auth();
  const invoice = await prisma.invoice.create({ ... });
  revalidatePath('/invoices');
  return { success: true, data: invoice };
}
```

### 2. Side Panels over Modals
Details/forms open in slide-in side panels:
```typescript
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
```

### 3. URL-Based Filter State
Filters stored in URL params for shareability:
```typescript
const searchParams = useSearchParams();
// ?tab=all&status=unpaid&vendor=5
```

### 4. React Query for Server State
```typescript
const { data } = useQuery({
  queryKey: ['invoices', filters],
  queryFn: () => fetchInvoices(filters),
});
```

### 5. Zod Schemas Shared Client/Server
Validation schemas used in both forms and server actions.

## Key Technical Patterns (MUST FOLLOW)

### TDS Calculation - ALWAYS use invoice's tds_rounded preference:
```typescript
import { calculateTds } from '@/lib/utils/tds';
calculateTds(amount, tdsPercentage, invoice.tds_rounded ?? false)
```

### Form Pre-filling - Use useEffect + setValue, NOT defaultValues:
```typescript
useEffect(() => {
  if (data) setValue('amount', data.invoice_amount);
}, [data, setValue]);
```

### Mobile Dropdowns - Use native dropdowns, NOT Radix UI:
```typescript
// Radix UI has touch event issues on mobile Safari/Chrome
// Use native dropdown with useState + useRef + touchstart events
// Pattern: components/panels/shared/panel-tabs.tsx
```

### Panel Responsive Width - Use maxWidth, NOT width:
```typescript
style={{ maxWidth: config.width }}  // Allows shrinking on mobile
className="w-full"  // 100% on mobile, capped by maxWidth
```

### Tab Overflow - Proper swap behavior:
```typescript
// When overflow tab is active, swap with last visible tab
// AND add replaced tab to overflow menu
// Pattern: components/panels/shared/panel-tabs.tsx (computeTabSets useMemo)
```

### Currency Formatting - Use shared utility with currencyCode:
```typescript
import { formatCurrency } from '@/lib/utils/format';
formatCurrency(amount, invoice.currency?.code)  // Dynamic currency
// NEVER use hardcoded: currency: 'INR' or 'USD'
```

### Media Query Hooks:
```typescript
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-media-query';
const isMobile = useIsMobile(); // max-width: 639px
```

### Zod File Validation:
```typescript
z.custom<File>((val) => val === null || val === undefined || val instanceof File)
```

## Quality Gates (EVERY commit - NON-NEGOTIABLE)
```bash
pnpm lint      # 0 errors
pnpm typecheck # 0 errors
pnpm build     # must succeed
```

## Key Files & Locations

### Invoice System:
- Detail Panel: components/invoices/invoice-detail-panel-v3/
- Tabs: components/v3/invoices/
- Server Actions: app/actions/invoices-v2.ts
- Forms: components/invoices-v2/

### Payment System:
- Payment Panel: components/payments/payment-form-panel.tsx
- Server Actions: app/actions/payments.ts
- Hooks: hooks/use-payments.ts

### Panel System:
- Panel Provider: components/panels/panel-provider.tsx
- Panel Level: components/panels/panel-level.tsx (responsive width)
- Shared Components: components/panels/shared/
- Panel Hook: hooks/use-panel.ts

### Responsive Hooks:
- Media Query: hooks/use-media-query.ts (useIsMobile, useIsTablet, useIsDesktop)

### Utilities:
- TDS Calculation: lib/utils/tds.ts
- Validations: lib/validations/

## December 2025 Session Summary

### Session #1 - Sprint 14 Completion:
- AmountInput component (fixes "01500" bug)
- Payment Types CRUD (full admin management)
- Activities Tab (standalone with filtering & pagination)
- Settings Restructure (Profile/Security/Activities tabs)

### Session #2 - Invoice Detail Panel Redesign:
- Panel title: "Invoice - {name}" (human-readable)
- Header: Invoice number + vendor (left), badges stacked (right)
- Due date moved to Details tab with overdue badge
- Mobile: Action bar in footer, tab overflow menu
- New useMediaQuery hook for responsive breakpoints

### Session #3 - Mobile Bug Fixes:
- Fixed: Dropdown menus not working (replaced Radix with native)
- Fixed: Panel content clipped on left edge (maxWidth instead of width)
- Fixed: Tab swap bug (proper swap logic in useMemo)
- Root causes: Radix UI touch issues, inline style specificity, incomplete swap logic

### Session #4 - Payments Tab Badge & Currency Fixes (LATEST - Dec 19):
- Fixed: Payments tab badge not showing pending count (added `pending_payment_count` to PaymentSummary)
- Fixed: Currency symbol hardcoded as $ instead of invoice's currency (use shared `formatCurrency` with `invoice.currency?.code`)
- Pattern: Pass `currencyCode` prop down component chain, use `formatCurrency(amount, currencyCode)`
- Files fixed: 12 files including payment-history-list, ledger components, all-invoices-tab, tds-tab, dashboard

## Database Models (16 total)
User, InvoiceProfile, Invoice, Vendor, Category, PaymentType, Payment,
Currency, Entity, MasterDataRequest, InvoiceAttachment, InvoiceComment,
ActivityLog, UserAuditLog, Notification, UserProfileVisibility

## Invoice Status Flow
pending_approval → unpaid/on_hold/rejected → partial → paid

## User Preferences (IMPORTANT)
1. Additive approach: Don't delete what you don't understand
2. Fix all errors (pre-existing and new)
3. Document everything for future sessions
4. Main documents to be maintained:
   - /Users/althaf/Projects/paylog-3/docs/PROJECT_HANDOFF_GUIDE.md
   - /Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_DEC25.md
   - /Users/althaf/Projects/paylog-3/docs/CONTEXT_RESTORE_PROMPT.md
5. Quality gates must pass before EVERY commit
6. Use reusable components from components/ui/ and components/panels/shared/
7. Test on actual mobile devices, not just browser responsive mode

What would you like to work on?
```

---

## Extended Context (For Specific Work Areas)

Add these to your restore prompt based on what you're working on:

### For Invoice Panel Work:
```
Read these additional files for invoice panel context:
- components/invoices/invoice-detail-panel-v3/index.tsx (main orchestration, mobile footer)
- components/invoices/invoice-detail-panel-v3/panel-v3-header.tsx
- components/invoices/invoice-detail-panel-v3/panel-v3-hero.tsx
- components/invoices/invoice-detail-panel-v3/tabs/details-tab.tsx
- components/panels/shared/panel-tabs.tsx (native dropdown, tab swap)
- components/panels/panel-level.tsx (responsive width)
- hooks/use-media-query.ts
```

### For Payment Work:
```
Read these additional files for payment context:
- components/payments/payment-form-panel.tsx (562 lines, hero stats, progress bar)
- app/actions/payments.ts
- hooks/use-payments.ts
- lib/validations/payment.ts
```

### For Admin/Master Data Work:
```
Read these additional files for admin context:
- components/v3/admin/admin-page.tsx
- components/master-data/payment-type-list.tsx
- app/actions/payment-types.ts
- hooks/use-payment-types.ts
```

### For Mobile/Responsive Work:
```
Read these additional files for mobile context:
- hooks/use-media-query.ts (useIsMobile, useIsTablet, useIsDesktop)
- components/panels/shared/panel-tabs.tsx (native dropdown pattern, tab swap)
- components/panels/panel-level.tsx (maxWidth responsive pattern)
- components/invoices/invoice-detail-panel-v3/index.tsx (mobile footer action bar)
```

### For Filter/Table Work:
```
Read these additional files for filtering context:
- components/v3/invoices/all-invoices-tab.tsx (1849 lines)
- components/v3/invoices/invoice-filter-popover.tsx
- hooks/use-invoices-v2.ts
```

---

## Architecture Reference

```
paylog-3/
├── app/
│   ├── (auth)/                   # Auth pages (login, register)
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── admin/page.tsx
│   │   └── settings/
│   │       └── components/
│   │           ├── profile-tab.tsx
│   │           ├── security-tab.tsx
│   │           └── activities-tab.tsx
│   └── actions/                  # Server Actions (NOT API routes)
│       ├── invoices-v2.ts
│       ├── payments.ts
│       ├── payment-types.ts
│       └── activity-log.ts
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── v3/invoices/              # Invoice tabs system
│   ├── v3/settings/              # Settings page
│   ├── invoices-v2/              # Invoice forms + AmountInput
│   ├── invoices/invoice-detail-panel-v3/  # Detail panel (redesigned)
│   ├── payments/                 # Payment form panel (redesigned)
│   ├── master-data/              # Admin master data
│   └── panels/
│       ├── panel-provider.tsx    # Zustand store
│       ├── panel-level.tsx       # Individual panel (responsive maxWidth)
│       └── shared/
│           └── panel-tabs.tsx    # Tabs with overflow (native dropdown)
├── hooks/
│   ├── use-invoices-v2.ts
│   ├── use-payments.ts
│   ├── use-payment-types.ts
│   ├── use-panel.ts
│   └── use-media-query.ts        # Responsive breakpoint hooks
├── lib/
│   ├── utils/tds.ts              # TDS calculation
│   └── validations/              # Zod schemas
└── types/
    ├── invoice.ts
    ├── payment.ts
    └── panel.ts
```

---

## Critical Bug Fixes Reference

| Bug | Issue | Fix | Location |
|-----|-------|-----|----------|
| BUG-007 | Vendor approval workflow | Two-step dialog for pending vendors | all-invoices-tab.tsx |
| BUG-003 | TDS round-off calculation | Use `tds_rounded` preference | lib/utils/tds.ts |
| "01500" | Leading zeros in amount | AmountInput component | components/invoices-v2/amount-input.tsx |
| Mobile dropdown | Touch not working on Radix UI | Native dropdown with touchstart | panel-tabs.tsx, index.tsx |
| Panel clipping | Left edge content cut off | maxWidth instead of width | panel-level.tsx |
| Tab swap | Tab disappearing from both locations | Proper swap in useMemo | panel-tabs.tsx |
| Payments badge | Not showing pending count | Add `pending_payment_count` to PaymentSummary | types/payment.ts, payments.ts |
| Currency symbol | Hardcoded $ or ₹ | Use shared `formatCurrency(amount, currencyCode)` | lib/utils/format.ts |

---

## Invoice Detail Panel V3 - Visual Structure

```
┌──────────────────────────────────────────────────────┐
│ Invoice - AC Charges                             [X] │  ← Human-readable title
├──────────────────────────────────────────────────────┤
│ lkbjhghhg               [Pending Approval]       [✏]│  ← Invoice # + stacked badges
│ IOE Access                      [Recurring]      [₹]│  ← Vendor (no "from")
├──────────────────────────────────────────────────────┤
│ [Inv Amount] [TDS] [Total Paid] [Remaining]      [⏸]│  ← Hero stats
│ ▓░░░░░░░░░░ Payment Progress: 0%                 [✓]│  ← Progress bar
├──────────────────────────────────────────────────────┤
│ Details │ Payments │ Attachments │ [⋮]           [✗]│  ← Tabs (overflow on mobile)
├──────────────────────────────────────────────────────┤
│ INVOICE DETAILS                                  ───│
│ Invoice Date: Dec 01, 2025    Due Date:          [🗃]│
│ ...                           📅 Dec 01, 2025    [🗑]│
│                               [Overdue by 17 days]  │  ← Due date in Details tab
│                                                     │
├──────────────────────────────────────────────────────┤
│ [✏][₹][✓][✗] [⋮]                        [Close]    │  ← Mobile: actions in footer
└──────────────────────────────────────────────────────┘
```

### Desktop vs Mobile Behavior:
| Element | Desktop | Mobile |
|---------|---------|--------|
| Action bar | Right side panel | Footer (left of Close) |
| Tabs | All 4 visible | First 3 + overflow menu |
| Panel width | config.width (800px) | 100% viewport width |
| Dropdown menus | Radix UI works | Native dropdown required |

---

## Recent Commits (December 2025)

```
1af2419 fix(currency): use dynamic currency formatting across all components
0caae6a fix(tabs): properly swap overflow tab with last visible tab on mobile
039a4c4 fix(panel): use maxWidth for responsive panel sizing on mobile
3af4605 fix(mobile): replace Radix UI popover with native dropdown for mobile menus
3c1f6ce feat(invoice-panel): redesign invoice detail panel with mobile responsiveness
3a63bae feat(payments): redesign Record Payment panel with improved UX
```

---

## v1.0.0 Release Status

### Completed (~99%):
- [x] All Sprint 14 items (13/13)
- [x] Invoice Detail Panel redesign
- [x] Payment Panel redesign
- [x] Mobile responsiveness
- [x] All critical bug fixes

### Remaining (~1%):
- [ ] Final documentation review
- [ ] Security audit
- [ ] Performance benchmarks
- [ ] Production deployment verification

---

## Lessons Learned (December 2025)

1. **Radix UI Touch Issues**: DropdownMenu and Popover have fundamental issues with touch events on mobile Safari/Chrome. For critical mobile UX, use native implementations.

2. **Inline Style Specificity**: `style={{ width }}` overrides CSS classes. Use `maxWidth` when responsive CSS classes need to work.

3. **Tab Swap Logic**: When implementing "swap" behavior, ensure items move to BOTH locations - don't just replace one without updating the other.

4. **Mobile Testing**: Always test on actual mobile devices, not just browser responsive mode.

5. **Form Pre-filling**: Use `useEffect + setValue`, NOT `defaultValues` when data loads asynchronously.

6. **TDS Calculation**: Always use the invoice's `tds_rounded` preference to ensure consistency.

7. **Return ALL Calculated Values**: When server actions calculate values (like `pendingPaymentCount`), include them in the return type and response - don't just use internally.

8. **Centralize Formatting Utilities**: Never create local `formatCurrency` functions - always use the shared utility from `lib/utils/format.ts` with the entity's currency code.

9. **Currency Code Propagation**: Pass `currencyCode` prop from parent (where invoice/profile is available) down to child components that display currency values.

---

**Document End**

*Update this prompt after each session to maintain context continuity.*

**Last Updated**: December 19, 2025
**Session**: Payments Tab Badge & Currency Fixes Complete
