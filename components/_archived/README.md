# Archived Components

This folder contains components that are no longer actively used but are kept for reference.

**Do not import from this folder** unless you explicitly need to restore functionality.

## Archived Items

### `/invoices/`
- `invoice-detail-panel.tsx` - Legacy invoice detail view (replaced by `invoice-detail-panel-v2.tsx`)
- `invoice-form-panel.tsx` - Legacy create/edit form (replaced by `recurring-invoice-form-panel.tsx` and `non-recurring-invoice-form-panel.tsx`)

## How to Restore

If you need to use an archived component:
1. Move it back to its original location
2. Update imports in the relevant renderer (e.g., `invoice-panel-renderer.tsx`)
3. Uncomment the corresponding case in the switch statement
