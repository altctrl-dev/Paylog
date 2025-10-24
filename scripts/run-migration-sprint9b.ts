/**
 * Sprint 9B Phase 1: InvoiceProfile Enhancement Migration Runner
 *
 * This script executes the migration step-by-step using Prisma Client.
 *
 * Usage:
 *   npx tsx scripts/run-migration-sprint9b.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting Sprint 9B Phase 1 Migration...\n');

  try {
    // ========================================================================
    // SAFETY CHECKS
    // ========================================================================
    console.log('✓ SAFETY CHECKS: Verifying required master data exists...\n');

    const entityCount = await prisma.entity.count({ where: { is_active: true } });
    if (entityCount === 0) {
      throw new Error('MIGRATION ABORTED: No active entities found. Create at least one active entity before running this migration.');
    }
    console.log(`  ✓ Active entities: ${entityCount}`);

    const vendorCount = await prisma.vendor.count({ where: { is_active: true } });
    if (vendorCount === 0) {
      throw new Error('MIGRATION ABORTED: No active vendors found. Create at least one active vendor before running this migration.');
    }
    console.log(`  ✓ Active vendors: ${vendorCount}`);

    const categoryCount = await prisma.category.count({ where: { is_active: true } });
    if (categoryCount === 0) {
      throw new Error('MIGRATION ABORTED: No active categories found. Create at least one active category before running this migration.');
    }
    console.log(`  ✓ Active categories: ${categoryCount}`);

    const currencyCount = await prisma.currency.count({ where: { is_active: true } });
    if (currencyCount === 0) {
      throw new Error('MIGRATION ABORTED: No active currencies found. Create at least one active currency before running this migration.');
    }
    console.log(`  ✓ Active currencies: ${currencyCount}\n`);

    // ========================================================================
    // STEP 1: Add columns (nullable initially)
    // ========================================================================
    console.log('STEP 1: Adding 7 new columns to invoice_profiles...');

    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS entity_id INTEGER`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS vendor_id INTEGER`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS category_id INTEGER`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS currency_id INTEGER`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS prepaid_postpaid VARCHAR(10)`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT false NOT NULL`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ADD COLUMN IF NOT EXISTS tds_percentage DOUBLE PRECISION`;

    console.log('  ✓ All 7 columns added\n');

    // ========================================================================
    // STEP 2: Backfill existing profiles
    // ========================================================================
    console.log('STEP 2: Backfilling existing profiles with safe defaults...');

    // Get first active IDs for each master data type
    const firstEntity = await prisma.entity.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    const firstVendor = await prisma.vendor.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    const firstCategory = await prisma.category.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    const firstCurrency = await prisma.currency.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });

    if (!firstEntity || !firstVendor || !firstCategory || !firstCurrency) {
      throw new Error('MIGRATION ABORTED: Could not find default values for backfilling');
    }

    // Backfill using raw SQL
    const result = await prisma.$executeRaw`
      UPDATE invoice_profiles
      SET
        entity_id = ${firstEntity.id},
        vendor_id = ${firstVendor.id},
        category_id = ${firstCategory.id},
        currency_id = ${firstCurrency.id},
        tds_applicable = false,
        tds_percentage = NULL,
        prepaid_postpaid = NULL
      WHERE entity_id IS NULL
    `;

    console.log(`  ✓ Backfilled ${result} profile(s) with defaults:`);
    console.log(`    - Entity: ${firstEntity.name} (ID: ${firstEntity.id})`);
    console.log(`    - Vendor: ${firstVendor.name} (ID: ${firstVendor.id})`);
    console.log(`    - Category: ${firstCategory.name} (ID: ${firstCategory.id})`);
    console.log(`    - Currency: ${firstCurrency.code} (ID: ${firstCurrency.id})`);
    console.log(`    - TDS Applicable: false`);
    console.log(`    - TDS Percentage: NULL`);
    console.log(`    - Prepaid/Postpaid: NULL\n`);

    // ========================================================================
    // STEP 3: Make FK columns NOT NULL
    // ========================================================================
    console.log('STEP 3: Making FK columns NOT NULL...');

    await prisma.$executeRaw`ALTER TABLE invoice_profiles ALTER COLUMN entity_id SET NOT NULL`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ALTER COLUMN vendor_id SET NOT NULL`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ALTER COLUMN category_id SET NOT NULL`;
    await prisma.$executeRaw`ALTER TABLE invoice_profiles ALTER COLUMN currency_id SET NOT NULL`;

    console.log('  ✓ All FK columns are now NOT NULL\n');

    // ========================================================================
    // STEP 4: Create foreign key constraints
    // ========================================================================
    console.log('STEP 4: Creating foreign key constraints...');

    await prisma.$executeRaw`
      ALTER TABLE invoice_profiles
      ADD CONSTRAINT fk_invoice_profiles_entity
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE RESTRICT
    `;

    await prisma.$executeRaw`
      ALTER TABLE invoice_profiles
      ADD CONSTRAINT fk_invoice_profiles_vendor
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
    `;

    await prisma.$executeRaw`
      ALTER TABLE invoice_profiles
      ADD CONSTRAINT fk_invoice_profiles_category
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    `;

    await prisma.$executeRaw`
      ALTER TABLE invoice_profiles
      ADD CONSTRAINT fk_invoice_profiles_currency
      FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT
    `;

    console.log('  ✓ Created 4 FK constraints with RESTRICT\n');

    // ========================================================================
    // STEP 5: Create indexes
    // ========================================================================
    console.log('STEP 5: Creating indexes for query performance...');

    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_invoice_profiles_entity ON invoice_profiles(entity_id)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_invoice_profiles_vendor ON invoice_profiles(vendor_id)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_invoice_profiles_category ON invoice_profiles(category_id)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_invoice_profiles_currency ON invoice_profiles(currency_id)`;

    console.log('  ✓ Created 4 indexes on FK columns\n');

    // ========================================================================
    // STEP 6: Add CHECK constraints
    // ========================================================================
    console.log('STEP 6: Adding CHECK constraints...');

    await prisma.$executeRaw`
      ALTER TABLE invoice_profiles
      ADD CONSTRAINT chk_invoice_profiles_prepaid_postpaid
      CHECK (prepaid_postpaid IS NULL OR prepaid_postpaid IN ('prepaid', 'postpaid'))
    `;

    await prisma.$executeRaw`
      ALTER TABLE invoice_profiles
      ADD CONSTRAINT chk_invoice_profiles_tds_percentage
      CHECK (tds_percentage IS NULL OR (tds_percentage >= 0 AND tds_percentage <= 100))
    `;

    console.log('  ✓ Added CHECK constraints\n');

    // ========================================================================
    // VERIFICATION
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE: Sprint 9B InvoiceProfile Enhancement');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const profiles = await prisma.$queryRaw<any[]>`
      SELECT
        ip.id,
        ip.name,
        e.name as entity_name,
        v.name as vendor_name,
        c.name as category_name,
        cur.code as currency_code,
        ip.prepaid_postpaid,
        ip.tds_applicable,
        ip.tds_percentage
      FROM invoice_profiles ip
      JOIN entities e ON ip.entity_id = e.id
      JOIN vendors v ON ip.vendor_id = v.id
      JOIN categories c ON ip.category_id = c.id
      JOIN currencies cur ON ip.currency_id = cur.id
      ORDER BY ip.id ASC
    `;

    console.log('📊 Current Invoice Profiles:');
    console.table(profiles);

    console.log('\n📝 Next steps:');
    console.log('  1. Run validation: npx tsx scripts/validate-migration-sprint9b.ts');
    console.log('  2. Regenerate Prisma Client: npx prisma generate');
    console.log('  3. Test Prisma Client with new fields\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
