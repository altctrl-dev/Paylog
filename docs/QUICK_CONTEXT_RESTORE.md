# Quick Context Restoration Prompt

**Use this prompt at the start of every new Claude session to restore full project context.**

---

## Full Context Restoration Prompt

Copy everything below the line and paste it as your first message:

---

```
I need to restore complete context for the PayLog project. Please read these documentation files in order:

1. /Users/althaf/Projects/paylog-3/docs/PROJECT_HANDOFF_GUIDE.md (comprehensive project documentation)
2. /Users/althaf/Projects/paylog-3/docs/SPRINT_PLAN_DEC25.md (current sprint priorities)
3. /Users/althaf/Projects/paylog-3/schema.prisma (database schema - 16 models)

After reading, confirm you understand:

## Project Overview
- PayLog is an expense/invoice management system for Indian businesses
- Handles recurring invoices, TDS calculations, vendor management, payment tracking
- Tech: Next.js 14.2.35, TypeScript, PostgreSQL, Prisma, shadcn/ui, React Query, Zustand

## Current Status
- Sprint 14+ (~97% complete toward v1.0.0)
- 7/13 sprint items done, 6 remaining (21-29 hours of work)
- 80+ commits in December 2025

## Priority Order (remaining work)
1. Item #4: Amount Field UX (2-3h) - "01500" bug when typing amounts
2. Item #6: Payment Types CRUD (4-5h) - Currently just a placeholder
3. Item #7: Billing Frequency Mandatory (3-5h) - Make nullable field required
4. Item #5: Panel Styling Gaps (1-2h) - Minor UI adjustments
5. Item #8: Activities Tab (4-5h) - Standalone activities section
6. Item #9: Settings Restructure (3-4h) - Enhanced user settings
7. Item #13: Invoice Creation Toggle (4-5h) - Panel vs full-page preference

## Critical Patterns (MUST follow)
1. TDS Calculation: Always use `invoice.tds_rounded` preference
   ```typescript
   calculateTds(amount, tdsPercentage, invoice.tds_rounded ?? false)
   ```

2. Form Pre-filling: Use useEffect + setValue, NOT defaultValues
   ```typescript
   useEffect(() => {
     if (data) setValue('amount', data.invoice_amount);
   }, [data, setValue]);
   ```

3. Panel Opening:
   ```typescript
   openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
   ```

4. Zod File Validation: Explicit null/undefined check
   ```typescript
   z.custom<File>((val) => val === null || val === undefined || val instanceof File)
   ```

## Quality Gates (before EVERY commit)
- `pnpm lint` - 0 errors
- `pnpm typecheck` - 0 errors
- `pnpm build` - must succeed

## User Preferences (MANDATORY)
- Additive approach: "Don't delete anything you don't understand"
- Fix all errors (pre-existing and new)
- Document everything for future sessions

## Key Architectural Decisions
- Server Actions over API routes (Next.js 14)
- Side panels over modals for forms/details
- URL-based filter state for shareability
- React Query for all server state

## Key Files
- Invoices: components/v3/invoices/ (invoices-page.tsx, all-invoices-tab.tsx, etc.)
- Panels: components/invoices/invoice-detail-panel-v3/
- Server Actions: app/actions/invoices-v2.ts, app/actions/payments.ts
- TDS Utility: lib/utils/tds.ts

## Recently Fixed Bugs
- BUG-007: Two-step vendor approval when approving invoice with pending vendor
- BUG-003: TDS round-off using tds_rounded preference

Ready to continue development? Start with Item #4 (Amount Field UX) unless you have a different priority.
```

---

## Minimal Context Restore (if time-constrained)

```
Read /Users/althaf/Projects/paylog-3/docs/PROJECT_HANDOFF_GUIDE.md and confirm understanding of PayLog project. Current priority: Sprint 14 Item #4 (Amount Field UX).
```

---

## Mid-Session Context Refresh

If context gets lost during a session:

```
Please re-read /Users/althaf/Projects/paylog-3/docs/PROJECT_HANDOFF_GUIDE.md

Key reminders:
- Current priority: Item #4 (Amount Field UX) or [specify current task]
- Quality gates: pnpm lint, pnpm typecheck, pnpm build before commit
- Additive approach: don't delete what you don't understand
- TDS: always use invoice.tds_rounded preference
- Forms: useEffect + setValue, not defaultValues
```

---

## Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `docs/PROJECT_HANDOFF_GUIDE.md` | Complete project documentation | New team member onboarding |
| `docs/SPRINT_PLAN_DEC25.md` | Sprint priorities & timeline | Check remaining work |
| `docs/SESSION_SUMMARY_DEC25.md` | December changes & achievements | Review recent progress |
| `docs/CONTEXT_RESTORATION_PROMPT.md` | Technical reference | Deep technical context |
| `CONTEXT_RESTORATION_GUIDE.md` | Quick reference | Fast lookup |
| `docs/QUICK_CONTEXT_RESTORE.md` | This file | Copy/paste prompts |

---

**Last Updated**: December 17, 2025
