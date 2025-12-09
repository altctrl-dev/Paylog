#!/usr/bin/env npx tsx
/**
 * Backfill script for invoice_name field
 *
 * - For non-recurring invoices: copies description to invoice_name
 * - For recurring invoices: populates from invoice_profile.name
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting invoice_name backfill...\n');

  // Step 1: Backfill non-recurring invoices
  console.log('1. Backfilling non-recurring invoices...');
  const nonRecurringResult = await prisma.$executeRaw`
    UPDATE "invoices"
    SET "invoice_name" = "description"
    WHERE "is_recurring" = false
      AND "description" IS NOT NULL
      AND "invoice_name" IS NULL
  `;
  console.log(`   Updated ${nonRecurringResult} non-recurring invoices\n`);

  // Step 2: Backfill recurring invoices from profile name
  console.log('2. Backfilling recurring invoices from profile names...');
  const recurringResult = await prisma.$executeRaw`
    UPDATE "invoices" i
    SET "invoice_name" = ip."name"
    FROM "invoice_profiles" ip
    WHERE i."invoice_profile_id" = ip."id"
      AND i."is_recurring" = true
      AND i."invoice_name" IS NULL
  `;
  console.log(`   Updated ${recurringResult} recurring invoices\n`);

  // Step 3: Verify results
  console.log('3. Verification:');
  const stats = await prisma.$queryRaw<Array<{
    is_recurring: boolean;
    total: bigint;
    with_name: bigint;
    without_name: bigint;
  }>>`
    SELECT
      is_recurring,
      COUNT(*) as total,
      COUNT(invoice_name) as with_name,
      COUNT(*) - COUNT(invoice_name) as without_name
    FROM invoices
    GROUP BY is_recurring
  `;

  for (const row of stats) {
    const type = row.is_recurring ? 'Recurring' : 'Non-recurring';
    console.log(`   ${type}: ${row.total} total, ${row.with_name} with name, ${row.without_name} without name`);
  }

  console.log('\n✅ Backfill complete!');
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
