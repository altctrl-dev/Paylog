# Context Restoration Guide - PayLog Project

**Last Updated**: December 17, 2025
**Status**: Sprint 14+ (~97% complete toward v1.0.0)

---

## Quick Start (Copy This Prompt)

```
I need to restore complete context for the PayLog project. Please read:

1. /Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_DEC25.md
2. /Users/althaf/Projects/paylog-3/docs/SPRINT_PLAN_DEC25.md
3. /Users/althaf/Projects/paylog-3/docs/CONTEXT_RESTORATION_PROMPT.md

After reading, confirm you understand the current state and priorities.
```

---

## What is PayLog?

**PayLog** is a comprehensive expense and invoice management system for businesses.

### Core Features:
- Recurring & one-time invoice tracking
- TDS (Tax Deducted at Source) calculations
- Vendor management with approval workflow
- Payment recording and tracking
- Ledger views per invoice profile
- Role-based access control (RBAC)

### Tech Stack:
| Technology | Purpose |
|------------|---------|
| Next.js 14 | Full-stack framework |
| TypeScript | Type safety |
| PostgreSQL | Database (Railway) |
| Prisma | ORM |
| shadcn/ui | UI components |
| React Query | Server state |
| React Hook Form + Zod | Forms & validation |

---

## Current Status

| Metric | Value |
|--------|-------|
| **Sprint** | Sprint 14+ |
| **Progress** | ~97% toward v1.0.0 |
| **Sprint 14 Items** | 7/13 complete (54%) |
| **December Commits** | 80+ |

### December 2025 Highlights:
- V3 Invoice Tabs (All, Ledger, TDS, Recurring)
- Comprehensive filtering system
- BUG-007 vendor approval workflow
- V3 sidepanel standardization
- Reusable dialog components
- SharePoint storage integration
- Security upgrades (Next.js 14.2.35)

---

## Next Priority

**Item #4: Amount Field UX** (2-3 hours)
- Problem: Typing "1500" shows "01500"
- Solution: Smart AmountInput component
- Impact: Quick UX win for all forms

---

## Priority Order

1. Item #4 - Amount Field UX (2-3h)
2. Item #6 - Payment Types CRUD (4-5h)
3. Item #7 - Billing Frequency (3-5h)
4. Item #5 - Panel Styling (1-2h)
5. Item #8 - Activities Tab (4-5h)
6. Item #9 - Settings Restructure (3-4h)
7. Item #13 - Invoice Toggle (4-5h)

**Total Remaining**: 21-29 hours

---

## Critical Patterns

### TDS Calculation:
```typescript
import { calculateTds } from '@/lib/utils/tds';
const { tdsAmount, payableAmount } = calculateTds(amount, tdsPercentage, invoice.tds_rounded);
```

### Panel Opening:
```typescript
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
```

### Form Pre-fill (use useEffect, NOT defaultValues):
```typescript
useEffect(() => {
  if (data) {
    setValue('invoice_profile_id', data.invoice_profile_id);
    setValue('amount', data.invoice_amount);
  }
}, [data, setValue]);
```

### Zod Custom Validators:
```typescript
// WRONG - Rejects null/undefined
z.custom<File>().nullable().optional()

// CORRECT - Include null/undefined check
z.custom<File>((val) => val === null || val === undefined || val instanceof File)
```

---

## User Preferences (MANDATORY)

1. **Additive Approach** - "Don't delete anything you don't understand"
2. **Quality Gates** - lint, typecheck, build before every commit
3. **Fix All Errors** - Pre-existing and new
4. **Document Everything** - Comprehensive docs for future sessions

---

## Commands

```bash
# Development
pnpm dev              # Start server (localhost:3000)

# Quality Gates (before EVERY commit)
pnpm lint             # ESLint check
pnpm typecheck        # TypeScript check
pnpm build            # Production build

# Database
pnpm prisma studio    # Database UI
pnpm prisma migrate dev # Apply migrations

# Git
git add . && git commit -m "type: message" && git push  # Auto-deploys
```

---

## Application Pages & Tabs

| Route | Tabs | Component |
|-------|------|-----------|
| `/invoices` | All, Ledger, TDS, Recurring | `components/v3/invoices/invoices-page.tsx` |
| `/admin` | Approvals, Master Data, Users | `components/v3/admin/admin-page.tsx` |
| `/settings` | Profile, Security, Activities | `components/v3/settings/settings-page.tsx` |

---

## Database (16 Models)

**Core**: User, InvoiceProfile, Invoice, Vendor, Category, PaymentType, Payment
**Supporting**: Currency, Entity, MasterDataRequest, Notification
**Audit**: ActivityLog, UserAuditLog, InvoiceAttachment, InvoiceComment
**Access**: UserProfileVisibility, SchemaMigration

---

## Key Files

| Area | Location |
|------|----------|
| Invoice Tabs | `components/v3/invoices/` |
| All Invoices Tab | `components/v3/invoices/all-invoices-tab.tsx` (1849 lines) |
| Ledger Tab | `components/v3/invoices/ledger-tab.tsx` |
| TDS Tab | `components/v3/invoices/tds-tab.tsx` |
| V3 Detail Panel | `components/invoices/invoice-detail-panel-v3/` |
| Admin Page | `components/v3/admin/admin-page.tsx` |
| Settings Page | `components/v3/settings/settings-page.tsx` |
| Server Actions | `app/actions/invoices-v2.ts` |
| TDS Utility | `lib/utils/tds.ts` |
| Validations | `lib/validations/invoice-v2.ts` |
| Panel System | `components/panels/panel-provider.tsx` |
| UI Dialogs | `components/ui/confirmation-dialog.tsx` |
| Database Schema | `schema.prisma` (root level - 442 lines) |

---

## Database Models (Key)

```prisma
model Invoice {
  status           String  // pending_approval | unpaid | partial | paid | overdue | on_hold | rejected
  is_recurring     Boolean
  invoice_profile_id Int?  // Links to profile for recurring
  tds_rounded      Boolean // BUG-003: TDS rounding preference
}

model Vendor {
  status           String  // PENDING_APPROVAL | APPROVED | REJECTED (BUG-007)
}
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Form invalid on mount | Invalid defaultValues | Use useEffect + setValue |
| File upload fails | z.custom before nullable | Explicit null check in validator |
| "Not recurring" error | Wrong field name | Use `invoice_profile_id` not `profile_id` |
| TDS inconsistent | Missing tds_rounded | Pass invoice.tds_rounded to calculateTds |

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `docs/SESSION_SUMMARY_DEC25.md` | December changes, all features |
| `docs/SPRINT_PLAN_DEC25.md` | Sprint priorities & timeline |
| `docs/CONTEXT_RESTORATION_PROMPT.md` | Full technical reference |
| `CONTEXT_RESTORATION_GUIDE.md` | This quick reference |

---

**Ready?** Use the Quick Start prompt above!
