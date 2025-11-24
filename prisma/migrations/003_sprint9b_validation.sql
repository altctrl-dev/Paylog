-- ============================================================================
-- Sprint 9B Phase 1: InvoiceProfile Enhancement Validation Queries
-- ============================================================================
-- Purpose: Verify successful migration and data integrity
-- Author: Database Modeler (DBM)
-- Date: 2025-10-24
-- Database: PostgreSQL 17
-- ============================================================================

-- ============================================================================
-- SECTION 1: Schema Validation (Column Existence)
-- ============================================================================

DO $$
DECLARE
  column_count INT;
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  expected_columns TEXT[] := ARRAY[
    'entity_id',
    'vendor_id',
    'category_id',
    'currency_id',
    'prepaid_postpaid',
    'tds_applicable',
    'tds_percentage'
  ];
  col TEXT;
  col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 1: Column Existence Check';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOREACH col IN ARRAY expected_columns LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'invoice_profiles'
        AND table_schema = 'public'
        AND column_name = col
    ) INTO col_exists;

    IF col_exists THEN
      RAISE NOTICE '  ✓ Column exists: %', col;
    ELSE
      RAISE WARNING '  ✗ MISSING COLUMN: %', col;
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Missing columns: %', missing_columns;
  ELSE
    RAISE NOTICE '  ✓ All 7 columns exist';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: Constraint Validation (Foreign Keys)
-- ============================================================================

DO $$
DECLARE
  constraint_count INT;
  missing_constraints TEXT[] := ARRAY[]::TEXT[];
  expected_constraints TEXT[] := ARRAY[
    'fk_invoice_profiles_entity',
    'fk_invoice_profiles_vendor',
    'fk_invoice_profiles_category',
    'fk_invoice_profiles_currency'
  ];
  constraint_name TEXT;
  constraint_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 2: Foreign Key Constraint Check';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOREACH constraint_name IN ARRAY expected_constraints LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'invoice_profiles'
        AND table_schema = 'public'
        AND constraint_name = constraint_name
        AND constraint_type = 'FOREIGN KEY'
    ) INTO constraint_exists;

    IF constraint_exists THEN
      RAISE NOTICE '  ✓ FK exists: %', constraint_name;
    ELSE
      RAISE WARNING '  ✗ MISSING FK: %', constraint_name;
      missing_constraints := array_append(missing_constraints, constraint_name);
    END IF;
  END LOOP;

  IF array_length(missing_constraints, 1) > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Missing FK constraints: %', missing_constraints;
  ELSE
    RAISE NOTICE '  ✓ All 4 FK constraints exist';
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: Check Constraint Validation
-- ============================================================================

DO $$
DECLARE
  constraint_count INT;
  missing_constraints TEXT[] := ARRAY[]::TEXT[];
  expected_constraints TEXT[] := ARRAY[
    'chk_invoice_profiles_prepaid_postpaid',
    'chk_invoice_profiles_tds_percentage'
  ];
  constraint_name TEXT;
  constraint_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 3: Check Constraint Validation';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOREACH constraint_name IN ARRAY expected_constraints LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'invoice_profiles'
        AND table_schema = 'public'
        AND constraint_name = constraint_name
        AND constraint_type = 'CHECK'
    ) INTO constraint_exists;

    IF constraint_exists THEN
      RAISE NOTICE '  ✓ CHECK exists: %', constraint_name;
    ELSE
      RAISE WARNING '  ✗ MISSING CHECK: %', constraint_name;
      missing_constraints := array_append(missing_constraints, constraint_name);
    END IF;
  END LOOP;

  IF array_length(missing_constraints, 1) > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Missing CHECK constraints: %', missing_constraints;
  ELSE
    RAISE NOTICE '  ✓ All 2 CHECK constraints exist';
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: Index Validation
-- ============================================================================

DO $$
DECLARE
  missing_indexes TEXT[] := ARRAY[]::TEXT[];
  expected_indexes TEXT[] := ARRAY[
    'idx_invoice_profiles_entity',
    'idx_invoice_profiles_vendor',
    'idx_invoice_profiles_category',
    'idx_invoice_profiles_currency'
  ];
  index_name TEXT;
  index_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 4: Index Existence Check';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOREACH index_name IN ARRAY expected_indexes LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'invoice_profiles'
        AND schemaname = 'public'
        AND indexname = index_name
    ) INTO index_exists;

    IF index_exists THEN
      RAISE NOTICE '  ✓ Index exists: %', index_name;
    ELSE
      RAISE WARNING '  ✗ MISSING INDEX: %', index_name;
      missing_indexes := array_append(missing_indexes, index_name);
    END IF;
  END LOOP;

  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Missing indexes: %', missing_indexes;
  ELSE
    RAISE NOTICE '  ✓ All 4 indexes exist';
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: Data Integrity Validation
-- ============================================================================

DO $$
DECLARE
  total_profiles INT;
  profiles_with_nulls INT;
  invalid_prepaid_postpaid INT;
  invalid_tds_percentage INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 5: Data Integrity Check';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  -- Count total profiles
  SELECT COUNT(*) INTO total_profiles FROM invoice_profiles;
  RAISE NOTICE '  Total profiles: %', total_profiles;

  -- Check for NULL foreign keys (should be 0)
  SELECT COUNT(*) INTO profiles_with_nulls
  FROM invoice_profiles
  WHERE entity_id IS NULL
     OR vendor_id IS NULL
     OR category_id IS NULL
     OR currency_id IS NULL;

  IF profiles_with_nulls > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) have NULL foreign keys', profiles_with_nulls;
  ELSE
    RAISE NOTICE '  ✓ All profiles have valid foreign keys (no NULLs)';
  END IF;

  -- Check for invalid prepaid_postpaid values
  SELECT COUNT(*) INTO invalid_prepaid_postpaid
  FROM invoice_profiles
  WHERE prepaid_postpaid IS NOT NULL
    AND prepaid_postpaid NOT IN ('prepaid', 'postpaid');

  IF invalid_prepaid_postpaid > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) have invalid prepaid_postpaid values', invalid_prepaid_postpaid;
  ELSE
    RAISE NOTICE '  ✓ All prepaid_postpaid values are valid';
  END IF;

  -- Check for invalid tds_percentage values
  SELECT COUNT(*) INTO invalid_tds_percentage
  FROM invoice_profiles
  WHERE tds_percentage IS NOT NULL
    AND (tds_percentage < 0 OR tds_percentage > 100);

  IF invalid_tds_percentage > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) have tds_percentage outside 0-100 range', invalid_tds_percentage;
  ELSE
    RAISE NOTICE '  ✓ All tds_percentage values are within valid range (0-100)';
  END IF;
END $$;

-- ============================================================================
-- SECTION 6: Referential Integrity Validation
-- ============================================================================

DO $$
DECLARE
  orphaned_entities INT;
  orphaned_vendors INT;
  orphaned_categories INT;
  orphaned_currencies INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 6: Referential Integrity Check';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  -- Check for profiles referencing non-existent entities
  SELECT COUNT(*) INTO orphaned_entities
  FROM invoice_profiles ip
  LEFT JOIN entities e ON ip.entity_id = e.id
  WHERE e.id IS NULL;

  IF orphaned_entities > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) reference non-existent entities', orphaned_entities;
  ELSE
    RAISE NOTICE '  ✓ All entity_id references are valid';
  END IF;

  -- Check for profiles referencing non-existent vendors
  SELECT COUNT(*) INTO orphaned_vendors
  FROM invoice_profiles ip
  LEFT JOIN vendors v ON ip.vendor_id = v.id
  WHERE v.id IS NULL;

  IF orphaned_vendors > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) reference non-existent vendors', orphaned_vendors;
  ELSE
    RAISE NOTICE '  ✓ All vendor_id references are valid';
  END IF;

  -- Check for profiles referencing non-existent categories
  SELECT COUNT(*) INTO orphaned_categories
  FROM invoice_profiles ip
  LEFT JOIN categories c ON ip.category_id = c.id
  WHERE c.id IS NULL;

  IF orphaned_categories > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) reference non-existent categories', orphaned_categories;
  ELSE
    RAISE NOTICE '  ✓ All category_id references are valid';
  END IF;

  -- Check for profiles referencing non-existent currencies
  SELECT COUNT(*) INTO orphaned_currencies
  FROM invoice_profiles ip
  LEFT JOIN currencies cur ON ip.currency_id = cur.id
  WHERE cur.id IS NULL;

  IF orphaned_currencies > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % profile(s) reference non-existent currencies', orphaned_currencies;
  ELSE
    RAISE NOTICE '  ✓ All currency_id references are valid';
  END IF;
END $$;

-- ============================================================================
-- SECTION 7: Sample Data Queries (Informational)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 7: Sample Data Queries';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- Show first 5 profiles with all new fields
SELECT
  ip.id,
  ip.name,
  e.name AS entity_name,
  v.name AS vendor_name,
  c.name AS category_name,
  cur.code AS currency_code,
  ip.prepaid_postpaid,
  ip.tds_applicable,
  ip.tds_percentage
FROM invoice_profiles ip
JOIN entities e ON ip.entity_id = e.id
JOIN vendors v ON ip.vendor_id = v.id
JOIN categories c ON ip.category_id = c.id
JOIN currencies cur ON ip.currency_id = cur.id
ORDER BY ip.id ASC
LIMIT 5;

-- ============================================================================
-- SECTION 8: Summary Statistics
-- ============================================================================

DO $$
DECLARE
  total_profiles INT;
  profiles_with_prepaid INT;
  profiles_with_postpaid INT;
  profiles_with_tds INT;
  unique_entities INT;
  unique_vendors INT;
  unique_categories INT;
  unique_currencies INT;
  avg_tds_percentage NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VALIDATION 8: Summary Statistics';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  SELECT COUNT(*) INTO total_profiles FROM invoice_profiles;
  SELECT COUNT(*) INTO profiles_with_prepaid FROM invoice_profiles WHERE prepaid_postpaid = 'prepaid';
  SELECT COUNT(*) INTO profiles_with_postpaid FROM invoice_profiles WHERE prepaid_postpaid = 'postpaid';
  SELECT COUNT(*) INTO profiles_with_tds FROM invoice_profiles WHERE tds_applicable = true;
  SELECT COUNT(DISTINCT entity_id) INTO unique_entities FROM invoice_profiles;
  SELECT COUNT(DISTINCT vendor_id) INTO unique_vendors FROM invoice_profiles;
  SELECT COUNT(DISTINCT category_id) INTO unique_categories FROM invoice_profiles;
  SELECT COUNT(DISTINCT currency_id) INTO unique_currencies FROM invoice_profiles;
  SELECT ROUND(AVG(tds_percentage)::numeric, 2) INTO avg_tds_percentage FROM invoice_profiles WHERE tds_percentage IS NOT NULL;

  RAISE NOTICE '  Total Profiles: %', total_profiles;
  RAISE NOTICE '  Prepaid Profiles: %', profiles_with_prepaid;
  RAISE NOTICE '  Postpaid Profiles: %', profiles_with_postpaid;
  RAISE NOTICE '  Profiles with TDS: %', profiles_with_tds;
  RAISE NOTICE '  Unique Entities: %', unique_entities;
  RAISE NOTICE '  Unique Vendors: %', unique_vendors;
  RAISE NOTICE '  Unique Categories: %', unique_categories;
  RAISE NOTICE '  Unique Currencies: %', unique_currencies;
  RAISE NOTICE '  Average TDS Percentage: %', COALESCE(avg_tds_percentage::TEXT, 'N/A');
END $$;

-- ============================================================================
-- VALIDATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ ALL VALIDATIONS PASSED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Migration Sprint 9B Phase 1 completed successfully.';
  RAISE NOTICE 'InvoiceProfile table enhanced with 7 new fields.';
  RAISE NOTICE 'All constraints, indexes, and data integrity checks passed.';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
