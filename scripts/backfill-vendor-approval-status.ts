/**
 * Backfill Vendor Approval Status
 *
 * Marks all existing vendors as APPROVED with approved_at = created_at.
 * Safe to run multiple times (idempotent).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting vendor approval status backfill...\n');

  // Find all vendors that need backfilling
  const vendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { approved_at: null },
      ],
    },
    select: {
      id: true,
      name: true,
      status: true,
      created_at: true,
      approved_at: true,
    },
  });

  if (vendors.length === 0) {
    console.log('✓ No vendors need backfilling. All vendors are already approved.');
    return;
  }

  console.log(`Found ${vendors.length} vendor(s) to backfill:\n`);

  for (const vendor of vendors) {
    console.log(`Processing vendor ID ${vendor.id}: ${vendor.name}`);
    console.log(`  Current status: ${vendor.status || 'NULL'}`);
    console.log(`  Current approved_at: ${vendor.approved_at || 'NULL'}`);

    // Update vendor
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        status: 'APPROVED',
        approved_at: vendor.approved_at || vendor.created_at,
      },
    });

    console.log(`  ✓ Updated to APPROVED\n`);
  }

  console.log(`\n✓ Backfill complete. Updated ${vendors.length} vendor(s).`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
