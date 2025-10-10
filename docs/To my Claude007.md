# To my Claude007

**Date**: 2025-10-09  
**Participants**: Althaf, Codex agent  
**Scope**: Invoice search fix & navbar transparency control

---

## Issue
1. Invoice search threw a Prisma error whenever text was entered (`Unknown argument 'mode'`).  
2. Header opacity tweaks via Tailwind (`/80`, `/60`, etc.) had no visible effect, making it hard to tune translucency.

## Resolution Steps
1. Removed the unsupported `mode: 'insensitive'` flag from the SQLite `contains` filters so search works again (`app/actions/invoices.ts`).  
2. Introduced a CSS variable-based approach for header transparency:
   - Defined `--navbar-alpha` and derived `--navbar-bg` in `app/globals.css`.  
   - Updated `components/layout/header.tsx` to use `bg-[var(--navbar-bg)]`.  
   - Now changing `--navbar-alpha` (0.0–1.0) adjusts opacity for both themes in one place.

## Verification
- Invoice search now returns results for invoice numbers and vendor names.
- `npm run lint` passes.
- Header translucency responds immediately when `--navbar-alpha` changes.

## Notes
- For lighter/darker header, edit `--navbar-alpha` in `app/globals.css` (e.g., `0.9` for more solid, `0.6` for more transparent).
- Consider adding a user preference later if runtime toggling is desirable.

---

Ready for the next feature whenever you are. !*** End Patch
