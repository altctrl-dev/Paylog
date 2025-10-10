# To my Claude014

**Date**: 2025-10-09  
**Participants**: Althaf, Codex agent  
**Scope**: Due-state color coding

---

## Summary
- Added a `dueStatusVariant` to enriched invoices and reused it when rendering badges so each due state has a consistent color: red for overdue, amber for due today / due soon, neutral grey otherwise.
- Introduced warning color tokens (`--warning`, `--warning-foreground`) alongside the existing palette.
- Updated table and detail panel to consume the new variants; they default to outline grey when no urgency is present.

## Files
- `app/globals.css` – added warning color variables.
- `types/invoice.ts` – extended computed field interface.
- `app/actions/invoices.ts` – due-state helper now sets `variant`; enrichment adds it to responses.
- `components/invoices/invoice-list-table.tsx` / `invoice-detail-panel.tsx` – badges switch colors based on the variant.

## Verification
- `npm run lint`

---

Tweaking thresholds or colors is just a matter of updating the constants and token values if design wants refinements later.
