-- Rollback Migration: 005_add_invoice_received_date
-- Purpose: Remove invoice_received_date field if migration needs to be rolled back
-- Author: Database Modeler (DBM)
-- Date: 2025-11-20

-- WARNING: This rollback is SAFE because:
-- 1. The field is nullable, so removing it won't violate constraints
-- 2. This is an additive change with no dependencies
-- 3. No data transformation was performed

-- Remove the invoice_received_date column
ALTER TABLE "invoices"
DROP COLUMN IF EXISTS "invoice_received_date";

-- Verification query (run after rollback to confirm)
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'invoices'
--   AND column_name = 'invoice_received_date';
-- Expected result: 0 rows (column should not exist)
