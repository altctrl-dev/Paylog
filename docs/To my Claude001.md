# To my Claude001

**Date**: 2025-10-09  
**Participants**: Althaf, Codex agent  
**Scope**: Invoice overdue handling alignment

---

## Context
- Invoice list UI exposed an “Overdue” status filter, but no invoices ever appeared because `status` was never set to `overdue`.
- Persisted status is used to track payment progress (`pending_approval`, `unpaid`, `partial`, `paid`, etc.) while overdue is really a derivative of due date and outstanding balance.

## Conversation Highlights
- Flagged that the status filter showed an Overdue option, yet the list never returned results.
- Discussed whether to persist an `overdue` status or compute it alongside the base payment status.
- Agreed to keep stored status focused on payment state and surface overdue as an additional indicator.

## Issue
- **Symptom**: Selecting “Overdue” in the invoice list produced an empty result set even with past-due invoices.
- **Root Cause**: Status transitions never set invoices to `overdue`; approvals default to `unpaid`, and payment updates only toggle among `unpaid`, `partial`, and `paid`.

## Resolution Steps
1. **Analysis**: Reviewed `getInvoices`, `approveInvoice`, and payment status logic—confirmed no path ever persisted `overdue`.
2. **Decision**: Treat overdue as a computed state derived from due date and outstanding balance; keep persisted status unchanged.
3. **Server Updates**:
   - Added payment aggregates and `isOverdue` calculation in `getInvoices` and `getInvoiceById`.
   - Adjusted Overdue filter to query `status IN (unpaid, partial, overdue)` with `due_date < today`.
4. **Type Update**: Extended `InvoiceWithRelations` with optional `totalPaid`, `remainingBalance`, and `isOverdue` fields.
5. **UI Update**: Rendered an additional red “Overdue” pill next to the existing payment-status badge in list and detail panels.
6. **Verification**: Ran `npm run lint`; manual testing pending for end-to-end confirmation once data refreshed.

## Decisions
1. **Computed Overdue Flag**  
   - Leave database status untouched.  
   - Compute `isOverdue` when `due_date < today` **and** remaining balance > 0 for statuses `unpaid`, `partial`, or `overdue`.

2. **Filtering Logic**  
   - “Overdue” filter now means: `status IN (unpaid, partial, overdue)` and `due_date < today`.  
   - Works without background jobs or schema changes.

3. **UI Updates**  
   - Invoice list and detail panels render payment-status badge plus a red “Overdue” pill when `isOverdue` is true.  
   - Once the invoice is fully paid, the overdue indicator disappears automatically.

## Implementation Notes
- `app/actions/invoices.ts` computes payment aggregates per fetch, attaches `totalPaid`, `remainingBalance`, and `isOverdue` to each record, and reuses the same logic for single-invoice fetches.
- `types/invoice.ts` now accommodates the optional computed fields on `InvoiceWithRelations`.
- Front-end components rely on the new flag rather than raw status for the indicator.
- Lint passes (`npm run lint`). No schema or migration changes required.

## Next Considerations
- Propagate `isOverdue` to dashboard quick peek and KPI widgets for consistent visuals.  
- Document numbering: future coordination docs should follow the pattern `docs/To my Claude002.md`, `003`, etc.

## Follow-Up Reminders
- Future docs (`To my Claude002`, `003`, …) should continue capturing: conversation summary, explicit issue statement, and step-by-step resolution or enhancement record.

---

Let me know if any of this needs clarification before we brief the wider team.
