-- Migration: 005_add_invoice_received_date
-- Purpose: Add invoice_received_date field to track when invoices are physically/digitally received
-- Author: Database Modeler (DBM)
-- Date: 2025-11-20
-- Sprint: 13 Phase 5

-- Description:
-- Adds a new nullable DateTime column to track when an invoice document was received
-- by the organization. This is distinct from:
-- - invoice_date: The date printed on the invoice itself
-- - created_at: When the record was created in the system
--
-- The field is nullable to maintain backward compatibility with existing records.

-- Add invoice_received_date column to invoices table
ALTER TABLE "invoices"
ADD COLUMN "invoice_received_date" TIMESTAMP(3);

-- Add comment to document the field's purpose
COMMENT ON COLUMN "invoices"."invoice_received_date" IS
'Date when the physical or digital invoice document was received by the organization (distinct from invoice_date which is the date on the invoice itself)';

-- No index added initially - can be added later if filtering/sorting by this field becomes common
-- Potential future optimization:
-- CREATE INDEX "idx_invoices_received_date" ON "invoices"("invoice_received_date");
