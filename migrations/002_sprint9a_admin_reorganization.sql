-- ============================================================================
-- Migration: Sprint 9A - Admin Reorganization & Enhanced Master Data
-- Created: 2025-10-23
-- Description: Implements Sprint 9A schema changes
--   - Currency table with ISO 4217 support (50 currencies, all inactive)
--   - Entity table (NEW, separate from SubEntity for safe migration)
--   - Vendor enhancements (address, gst_exemption, bank_details)
--   - Category description field (required)
--   - Invoice foreign keys for currency and entity (nullable)
--   - Remove ArchiveRequest table (0 pending requests confirmed)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE CURRENCY TABLE
-- ============================================================================

CREATE TABLE currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT currencies_code_length CHECK (LENGTH(code) = 3),
  CONSTRAINT currencies_code_uppercase CHECK (code = UPPER(code)),
  CONSTRAINT currencies_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT currencies_symbol_not_empty CHECK (LENGTH(TRIM(symbol)) > 0)
);

-- Add indexes for currencies
CREATE INDEX idx_currencies_active ON currencies (is_active) WHERE is_active = true;
CREATE INDEX idx_currencies_code ON currencies (code);

-- Add comments
COMMENT ON TABLE currencies IS 'ISO 4217 currency codes for multi-currency invoice support. All currencies start inactive; admins activate as needed.';
COMMENT ON COLUMN currencies.code IS 'ISO 4217 currency code (3 uppercase letters): USD, EUR, INR, etc.';
COMMENT ON COLUMN currencies.name IS 'Full currency name: United States Dollar, Euro, Indian Rupee, etc.';
COMMENT ON COLUMN currencies.symbol IS 'Currency symbol: $, €, ₹, etc. (max 10 chars for multi-byte symbols)';
COMMENT ON COLUMN currencies.is_active IS 'Whether currency is available for use in invoices. Default: false (admin activates currencies).';

-- ============================================================================
-- 2. CREATE ENTITY TABLE (NEW, separate from SubEntity)
-- ============================================================================

CREATE TABLE entities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  country VARCHAR(2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT entities_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT entities_address_not_empty CHECK (LENGTH(TRIM(address)) > 0),
  CONSTRAINT entities_country_length CHECK (LENGTH(country) = 2),
  CONSTRAINT entities_country_uppercase CHECK (country = UPPER(country))
);

-- Add indexes for entities
CREATE INDEX idx_entities_active ON entities (is_active) WHERE is_active = true;
CREATE INDEX idx_entities_country ON entities (country);
CREATE INDEX idx_entities_name ON entities (name);

-- Add comments
COMMENT ON TABLE entities IS 'Organizational entities (legal entities, divisions, departments, branches) with full address and country. Created alongside SubEntity for safe migration path.';
COMMENT ON COLUMN entities.name IS 'Entity name (e.g., "Acme Corp - NYC Branch")';
COMMENT ON COLUMN entities.description IS 'Optional entity description';
COMMENT ON COLUMN entities.address IS 'Full entity address (free-form text, required, min 1 char)';
COMMENT ON COLUMN entities.country IS 'ISO 3166-1 alpha-2 country code (US, IN, GB, etc.)';

-- ============================================================================
-- 3. ENHANCE VENDOR TABLE
-- ============================================================================

-- Add new columns to vendors
ALTER TABLE vendors
  ADD COLUMN address TEXT,
  ADD COLUMN gst_exemption BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN bank_details TEXT;

-- Add constraint for bank_details length
ALTER TABLE vendors
  ADD CONSTRAINT vendors_bank_details_length
  CHECK (bank_details IS NULL OR LENGTH(bank_details) <= 1000);

-- Add comments
COMMENT ON COLUMN vendors.address IS 'Vendor physical or mailing address (optional, free-form text)';
COMMENT ON COLUMN vendors.gst_exemption IS 'Whether vendor is exempt from GST/VAT (default: false)';
COMMENT ON COLUMN vendors.bank_details IS 'Vendor bank account details for payment processing (optional, max 1000 chars)';

-- ============================================================================
-- 4. ENHANCE CATEGORY TABLE
-- ============================================================================

-- Step 1: Add description column as nullable
ALTER TABLE categories
  ADD COLUMN description TEXT;

-- Step 2: Set default value for existing NULL records
UPDATE categories
SET description = 'No description provided'
WHERE description IS NULL;

-- Step 3: Make description NOT NULL
ALTER TABLE categories
  ALTER COLUMN description SET NOT NULL;

-- Add constraint and comment
ALTER TABLE categories
  ADD CONSTRAINT categories_description_not_empty
  CHECK (LENGTH(TRIM(description)) > 0);

COMMENT ON COLUMN categories.description IS 'Category description explaining its purpose and use cases (required)';

-- ============================================================================
-- 5. ADD INVOICE FOREIGN KEYS (Currency and Entity)
-- ============================================================================

-- Add currency_id foreign key (nullable for Sprint 9A)
ALTER TABLE invoices
  ADD COLUMN currency_id INTEGER REFERENCES currencies(id) ON DELETE SET NULL;

-- Add entity_id foreign key (nullable, migration path from sub_entity_id)
ALTER TABLE invoices
  ADD COLUMN entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_invoices_currency ON invoices (currency_id);
CREATE INDEX idx_invoices_entity ON invoices (entity_id);

-- Add comments
COMMENT ON COLUMN invoices.currency_id IS 'Currency for invoice amount (Sprint 9A: nullable; Sprint 9C: will become required). References currencies table.';
COMMENT ON COLUMN invoices.entity_id IS 'Organizational entity (migration path from sub_entity_id in Sprint 9B). References entities table. Nullable during migration.';

-- ============================================================================
-- 6. REMOVE ARCHIVE REQUEST TABLE
-- ============================================================================

-- Verify no pending requests (safety check)
DO $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM archive_requests
  WHERE status = 'pending';

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop archive_requests table: % pending requests exist. Resolve pending requests before migration.', pending_count;
  END IF;
END $$;

-- Drop foreign key constraints first
ALTER TABLE archive_requests
  DROP CONSTRAINT IF EXISTS archive_requests_requested_by_fkey,
  DROP CONSTRAINT IF EXISTS archive_requests_reviewed_by_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_archive_requests_status;
DROP INDEX IF EXISTS idx_archive_requests_entity;
DROP INDEX IF EXISTS idx_archive_requests_requested_by;
DROP INDEX IF EXISTS idx_archive_requests_pending;

-- Drop table
DROP TABLE IF EXISTS archive_requests;

-- ============================================================================
-- 7. SEED CURRENCY DATA (50 ISO 4217 currencies)
-- ============================================================================

-- Top 20 Global Currencies
INSERT INTO currencies (code, name, symbol, is_active) VALUES
  ('USD', 'United States Dollar', '$', false),
  ('EUR', 'Euro', '€', false),
  ('GBP', 'British Pound Sterling', '£', false),
  ('JPY', 'Japanese Yen', '¥', false),
  ('CNY', 'Chinese Yuan', '¥', false),
  ('INR', 'Indian Rupee', '₹', false),
  ('AUD', 'Australian Dollar', 'A$', false),
  ('CAD', 'Canadian Dollar', 'C$', false),
  ('CHF', 'Swiss Franc', 'CHF', false),
  ('BRL', 'Brazilian Real', 'R$', false),
  ('KRW', 'South Korean Won', '₩', false),
  ('MXN', 'Mexican Peso', '$', false),
  ('RUB', 'Russian Ruble', '₽', false),
  ('SGD', 'Singapore Dollar', 'S$', false),
  ('HKD', 'Hong Kong Dollar', 'HK$', false),
  ('SEK', 'Swedish Krona', 'kr', false),
  ('NOK', 'Norwegian Krone', 'kr', false),
  ('ZAR', 'South African Rand', 'R', false),
  ('TRY', 'Turkish Lira', '₺', false),
  ('NZD', 'New Zealand Dollar', 'NZ$', false);

-- Additional 30 Regional Currencies
INSERT INTO currencies (code, name, symbol, is_active) VALUES
  ('AED', 'United Arab Emirates Dirham', 'د.إ', false),
  ('ARS', 'Argentine Peso', '$', false),
  ('BDT', 'Bangladeshi Taka', '৳', false),
  ('BGN', 'Bulgarian Lev', 'лв', false),
  ('CLP', 'Chilean Peso', '$', false),
  ('COP', 'Colombian Peso', '$', false),
  ('CZK', 'Czech Koruna', 'Kč', false),
  ('DKK', 'Danish Krone', 'kr', false),
  ('EGP', 'Egyptian Pound', '£', false),
  ('HUF', 'Hungarian Forint', 'Ft', false),
  ('IDR', 'Indonesian Rupiah', 'Rp', false),
  ('ILS', 'Israeli New Shekel', '₪', false),
  ('ISK', 'Icelandic Króna', 'kr', false),
  ('KES', 'Kenyan Shilling', 'KSh', false),
  ('KWD', 'Kuwaiti Dinar', 'د.ك', false),
  ('LKR', 'Sri Lankan Rupee', 'Rs', false),
  ('MAD', 'Moroccan Dirham', 'د.م.', false),
  ('MYR', 'Malaysian Ringgit', 'RM', false),
  ('NGN', 'Nigerian Naira', '₦', false),
  ('PHP', 'Philippine Peso', '₱', false),
  ('PKR', 'Pakistani Rupee', 'Rs', false),
  ('PLN', 'Polish Zloty', 'zł', false),
  ('QAR', 'Qatari Riyal', 'ر.ق', false),
  ('RON', 'Romanian Leu', 'lei', false),
  ('SAR', 'Saudi Riyal', 'ر.س', false),
  ('THB', 'Thai Baht', '฿', false),
  ('TWD', 'Taiwan Dollar', 'NT$', false),
  ('UAH', 'Ukrainian Hryvnia', '₴', false),
  ('VND', 'Vietnamese Dong', '₫', false),
  ('XAF', 'Central African CFA Franc', 'FCFA', false);

-- ============================================================================
-- 8. MIGRATE SUBENTITY DATA TO ENTITY TABLE
-- ============================================================================

-- Copy all SubEntity records to Entity table
-- Note: Addresses default to placeholder; admins must update post-migration
INSERT INTO entities (name, description, address, country, is_active, created_at, updated_at)
SELECT
  name,
  description,
  'Migration: Address pending - Admin must update' AS address,
  'US' AS country,  -- Default country (admins must update for non-US entities)
  is_active,
  created_at,
  updated_at
FROM sub_entities;

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM entities;
  RAISE NOTICE 'Migrated % records from sub_entities to entities table', migrated_count;
END $$;

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Record this migration
INSERT INTO schema_migrations (migration_name, description)
VALUES (
  '002_sprint9a_admin_reorganization',
  'Sprint 9A: Currency table (50 ISO 4217 currencies), Entity table (migrated from SubEntity), Vendor enhancements, Category description, Invoice FKs, ArchiveRequest removal'
);

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify success:

-- 1. Verify currencies table
-- SELECT COUNT(*) AS currency_count FROM currencies;
-- Expected: 50

-- 2. Verify all currencies are inactive
-- SELECT COUNT(*) AS active_currencies FROM currencies WHERE is_active = true;
-- Expected: 0

-- 3. Verify entities table
-- SELECT COUNT(*) AS entity_count FROM entities;
-- Expected: Same as sub_entities count

-- 4. Verify vendor enhancements
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'vendors' AND column_name IN ('address', 'gst_exemption', 'bank_details');

-- 5. Verify category description
-- SELECT COUNT(*) AS categories_with_description
-- FROM categories
-- WHERE description IS NOT NULL AND LENGTH(TRIM(description)) > 0;
-- Expected: All categories

-- 6. Verify invoice foreign keys
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'invoices' AND column_name IN ('currency_id', 'entity_id');
-- Expected: Both nullable

-- 7. Verify ArchiveRequest table dropped
-- SELECT COUNT(*)
-- FROM information_schema.tables
-- WHERE table_name = 'archive_requests';
-- Expected: 0

-- ============================================================================
-- ADMIN POST-MIGRATION ACTIONS REQUIRED
-- ============================================================================

-- 1. Activate required currencies:
--    UPDATE currencies SET is_active = true WHERE code IN ('USD', 'EUR', 'INR');
--
-- 2. Update Entity addresses and countries:
--    UPDATE entities SET address = 'correct address', country = 'IN' WHERE id = 1;
--
-- 3. Review and update Vendor fields (address, gst_exemption, bank_details)
--
-- 4. Verify Category descriptions are accurate

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
