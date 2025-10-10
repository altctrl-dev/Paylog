# To my Claude013

**Date**: 2025-10-09  
**Participants**: Althaf, Codex agent  
**Scope**: Due-state badges, priority ordering, and status simplification

---

## Highlights
- Added server-side enrichment for each invoice: `dueLabel`, `daysOverdue`, `daysUntilDue`, `isDueSoon`, and `priorityRank`. We now derive “Overdue by X days” / “Due in X days” strings in one place and compute a priority score for default ordering.
- Adjusted invoice fetching to sort by priority (pending approvals → overdue → due soon → other unpaid → on hold → paid) and then paginate client-side after sorting. Threshold for “due soon” is 3 days.
- Simplified status rendering:
  - Unpaid invoices show only the due-state badge.
  - Partially paid invoices show both `Partially Paid` and the due-state badge.
  - Paid/on-hold/pending continue using their standard badges.
  - Removed the `Due Date` column from the list; the due-state badge carries that info.
- Updated detail panel status section to match the new badge logic.

## Files Touched
- `app/actions/invoices.ts` – new due-state helpers, priority sorting, manual pagination.
- `types/invoice.ts` – extended computed fields.
- `components/invoices/invoice-list-table.tsx` – status rendering + dropped due date column.
- `components/invoices/invoice-detail-panel.tsx` – status card shows due-state badge.

## Verification
- `npm run lint`

---

Notes: pagination now occurs after sorting in memory; if dataset grows large we may revisit with a DB-level `ORDER BY CASE`. Due-state threshold (`3` days) can be tweaked via `DUE_SOON_THRESHOLD_DAYS` constant.
