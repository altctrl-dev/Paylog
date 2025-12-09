-- Migration: Add invoice_name field to Invoice
-- Purpose: Separate invoice name from description field
-- For non-recurring: stores user-entered invoice name
-- For recurring: auto-populated from invoice_profile.name

-- Step 1: Add the new column
ALTER TABLE "invoices" ADD COLUMN "invoice_name" TEXT;

-- Step 2: Backfill data from existing records
-- For non-recurring invoices: copy description to invoice_name (description was being used as invoice name)
UPDATE "invoices"
SET "invoice_name" = "description"
WHERE "is_recurring" = false AND "description" IS NOT NULL;

-- For recurring invoices: populate from invoice_profile.name
UPDATE "invoices" i
SET "invoice_name" = ip."name"
FROM "invoice_profiles" ip
WHERE i."invoice_profile_id" = ip."id"
  AND i."is_recurring" = true;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN "invoices"."invoice_name" IS 'For non-recurring: user-entered name; For recurring: auto-populated from invoice_profile.name';
