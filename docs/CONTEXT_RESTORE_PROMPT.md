# PayLog - Complete Context Restoration Prompt

**Use this prompt at the start of ANY new Claude session to restore full project context.**

---

## Quick Context Restore (Copy & Paste This)

```
I'm working on PayLog, an expense/invoice management system. Please read these files to restore complete context:

1. /Users/althaf/Projects/paylog-3/docs/PROJECT_HANDOFF_GUIDE.md
2. /Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_DEC25.md
3. /Users/althaf/Projects/paylog-3/schema.prisma

After reading, confirm you understand:

## Project Identity
- **PayLog**: Expense/invoice management for Indian businesses
- **Purpose**: Recurring invoices, TDS calculations, vendor management, payment tracking
- **Tech Stack**: Next.js 14.2.35, TypeScript, PostgreSQL, Prisma, shadcn/ui, React Query, Zustand

## Current Status (December 18, 2025)
- Sprint 14 COMPLETE (13/13 items)
- Invoice Detail Panel Redesign COMPLETE
- ~99% toward v1.0.0
- 85+ commits in December 2025

## Architecture Patterns (CRITICAL - MUST FOLLOW)

### 1. Server Actions over API Routes
All mutations use Next.js Server Actions, NOT API routes.
```typescript
// app/actions/invoices-v2.ts
'use server';
export async function createInvoice(data) { ... }
```

### 2. Side Panels over Modals
Details/forms open in slide-in side panels:
```typescript
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
calculateTds(amount, tdsPercentage, invoice.tds_rounded ?? false)
```

### Form Pre-filling - Use useEffect + setValue, NOT defaultValues:
```typescript
useEffect(() => {
  if (data) setValue('amount', data.invoice_amount);
}, [data, setValue]);
```

### Panel Opening:
```typescript
openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
```

### Zod File Validation:
```typescript
z.custom<File>((val) => val === null || val === undefined || val instanceof File)
```

### Mobile Responsive with useMediaQuery:
```typescript
const isMobile = useIsMobile(); // max-width: 639px
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
- Shared Components: components/panels/shared/
- Panel Hook: hooks/use-panel.ts

### Responsive Hooks:
- Media Query: hooks/use-media-query.ts
  - useIsMobile(), useIsTablet(), useIsDesktop()

### Utilities:
- TDS Calculation: lib/utils/tds.ts
- Validations: lib/validations/

## Recent Major Completions (Dec 18, 2025)

### Invoice Detail Panel Redesign:
- Panel title: "Invoice - {name}" (human-readable)
- Header: Invoice number + vendor (left), badges stacked (right)
- Due date moved to Details tab with overdue badge
- Mobile: Action bar in footer, tab overflow menu
- New useMediaQuery hook for responsive breakpoints

### Previous Completions:
- AmountInput component (fixes "01500" bug)
- Payment Types CRUD (full admin management)
- Activities Tab (standalone with filtering & pagination)
- Settings Restructure (Profile/Security/Activities)
- Payment Panel Redesign (hero stats, progress bar, TDS toggle)

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
4. Quality gates must pass before EVERY commit
5. Make use of reusable components

What would you like to work on?
```

---

## Extended Context (For Complex Tasks)

If you need to work on specific areas, add these to your restore prompt:

### For Invoice Panel Work:
```
Read these additional files for invoice panel context:
- components/invoices/invoice-detail-panel-v3/index.tsx (main orchestration)
- components/invoices/invoice-detail-panel-v3/panel-v3-header.tsx
- components/invoices/invoice-detail-panel-v3/panel-v3-hero.tsx
- components/invoices/invoice-detail-panel-v3/tabs/details-tab.tsx
- components/panels/shared/panel-tabs.tsx
- hooks/use-media-query.ts
```

### For Payment Work:
```
Read these additional files for payment context:
- components/payments/payment-form-panel.tsx
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

### For Filter/Table Work:
```
Read these additional files for filtering context:
- components/v3/invoices/all-invoices-tab.tsx
- components/v3/invoices/invoice-filter-popover.tsx
- hooks/use-invoices-v2.ts
```

---

## Architecture Reference

```
paylog-3/
├── app/
│   ├── (auth)/                   # Auth pages
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── admin/page.tsx
│   │   └── settings/
│   │       └── components/
│   │           ├── profile-tab.tsx
│   │           ├── security-tab.tsx
│   │           └── activities-tab.tsx
│   └── actions/
│       ├── invoices-v2.ts
│       ├── payments.ts
│       ├── payment-types.ts
│       └── activity-log.ts
├── components/
│   ├── v3/invoices/              # Invoice tabs system
│   ├── v3/settings/              # Settings page
│   ├── invoices-v2/              # Invoice forms + AmountInput
│   ├── invoices/invoice-detail-panel-v3/  # Detail panel (REDESIGNED)
│   ├── payments/                 # Payment form panel
│   ├── master-data/              # Admin master data
│   └── panels/                   # Panel system
├── hooks/
│   ├── use-invoices-v2.ts
│   ├── use-payments.ts
│   ├── use-payment-types.ts
│   ├── use-panel.ts
│   └── use-media-query.ts        # NEW - Responsive hooks
├── lib/
│   ├── utils/tds.ts              # TDS calculation
│   └── validations/
│       ├── invoice-v2.ts
│       └── payment.ts
└── types/
    ├── invoice.ts
    ├── payment.ts
    └── panel.ts
```

---

## Key Bug Fixes Reference

| Bug | Issue | Fix |
|-----|-------|-----|
| BUG-007 | Vendor approval workflow | Two-step dialog for pending vendors |
| BUG-003 | TDS round-off calculation | Use `tds_rounded` preference |
| "01500" | Leading zeros in amount | AmountInput component |

---

## Invoice Detail Panel V3 - Current State (Dec 18, 2025)

### Structure:
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
│                               [Overdue by 17 days]  │  ← Due date in Details
│                                                     │
│                                                     │
├──────────────────────────────────────────────────────┤
│ [✏][₹][✓][✗] [⋮]                        [Close]    │  ← Mobile: actions in footer
└──────────────────────────────────────────────────────┘
```

### Desktop vs Mobile:
- **Desktop**: Action bar on right side, all tabs visible
- **Mobile**: Action bar in footer, tabs overflow to 3-dot menu

---

## Next Steps (Post-Sprint 14)

1. **v1.0.0 Release Prep**
   - User documentation review
   - API documentation review
   - Security audit
   - Performance benchmarks
   - Production deployment verification

2. **Future Enhancements**
   - Timeline view for Ledger tab
   - Advanced reporting dashboard
   - Automated invoice generation from profiles
   - Mobile app

---

**Document Created**: December 18, 2025
**Last Updated**: December 18, 2025
**Session**: Invoice Detail Panel Redesign Complete
