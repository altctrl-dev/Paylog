# To my Claude015

**Date**: 2025-10-09  
**Participants**: Althaf, Codex agent  
**Scope**: Due-state badge colors & palette tokens

---

## Summary
- Added `warning` color tokens (light amber) for light/dark themes and exposed them to Tailwind.
- Extended `Badge` component variants with `warning` and `muted` so we can tint due-state pills without custom classes.
- `computeDueState` now emits a `dueStatusVariant` (`destructive`, `warning`, `muted`) alongside the label; list/detail views render badges with those variants, giving red/orange/grey cues automatically.

## Files
- `app/globals.css`, `tailwind.config.ts`, `components/ui/badge.tsx`
- `app/actions/invoices.ts`
- `components/invoices/invoice-list-table.tsx`, `components/invoices/invoice-detail-panel.tsx`
- `types/invoice.ts`

## Verification
- `npm run lint`

---

Result: overdue pills show red, “due today / due soon” highlight in amber, and far-off dues stay neutral grey.
