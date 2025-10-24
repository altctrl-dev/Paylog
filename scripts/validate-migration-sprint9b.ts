/**
 * Sprint 9B Phase 1: InvoiceProfile Enhancement Validation Script
 *
 * This script runs validation queries to verify the migration succeeded.
 *
 * Usage:
 *   npx tsx scripts/validate-migration-sprint9b.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function validateMigration() {
  console.log('🔍 Starting Sprint 9B Phase 1 Validation...\n');

  try {
    // Read the validation SQL file
    const validationPath = join(process.cwd(), 'prisma', 'migrations', '003_sprint9b_validation.sql');
    const validationSQL = readFileSync(validationPath, 'utf-8');

    console.log('📄 Validation file loaded:', validationPath);
    console.log('📏 Validation size:', validationSQL.length, 'bytes\n');

    // Execute the validation queries
    console.log('⚙️  Running validation queries...\n');
    await prisma.$executeRawUnsafe(validationSQL);

    console.log('\n✅ All validations passed!\n');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

validateMigration()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
