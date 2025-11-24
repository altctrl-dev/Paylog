/**
 * Verify Vendor Migration
 *
 * Checks that vendor approval workflow migration completed successfully.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying vendor approval workflow migration...\n');

  let hasErrors = false;

  // Check 1: All vendors have a valid status
  console.log('[Check 1] Verifying all vendors have a valid status...');
  const vendorsWithoutStatus = await prisma.vendor.findMany({
    where: {
      OR: [
        { status: { notIn: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] } },
      ],
    },
  });

  if (vendorsWithoutStatus.length > 0) {
    console.error(`  ✗ FAIL: ${vendorsWithoutStatus.length} vendor(s) have invalid status:`);
    vendorsWithoutStatus.forEach((v) => {
      console.error(`    - ID ${v.id}: ${v.name} (status: ${v.status})`);
    });
    hasErrors = true;
  } else {
    console.log('  ✓ PASS: All vendors have valid status\n');
  }

  // Check 2: All APPROVED vendors have approved_at timestamp
  console.log('[Check 2] Verifying APPROVED vendors have approved_at timestamp...');
  const approvedWithoutTimestamp = await prisma.vendor.findMany({
    where: {
      status: 'APPROVED',
      approved_at: null,
    },
  });

  if (approvedWithoutTimestamp.length > 0) {
    console.error(`  ✗ FAIL: ${approvedWithoutTimestamp.length} APPROVED vendor(s) missing approved_at:`);
    approvedWithoutTimestamp.forEach((v) => {
      console.error(`    - ID ${v.id}: ${v.name}`);
    });
    hasErrors = true;
  } else {
    console.log('  ✓ PASS: All APPROVED vendors have approved_at timestamp\n');
  }

  // Check 3: Check for pending vendors
  console.log('[Check 3] Checking for pending vendors...');
  const pendingVendors = await prisma.vendor.findMany({
    where: {
      status: 'PENDING_APPROVAL',
    },
  });

  if (pendingVendors.length > 0) {
    console.warn(`  ⚠ WARNING: ${pendingVendors.length} vendor(s) are PENDING_APPROVAL:`);
    pendingVendors.forEach((v) => {
      console.warn(`    - ID ${v.id}: ${v.name} (created: ${v.created_at})`);
    });
    console.warn('  (This is OK if these were created after migration)\n');
  } else {
    console.log('  ✓ PASS: No pending vendors found\n');
  }

  // Check 4: Verify query performance on status index
  console.log('[Check 4] Verifying index performance...');
  const startTime = Date.now();
  await prisma.vendor.findMany({
    where: { status: 'APPROVED' },
    take: 1,
  });
  const elapsed = Date.now() - startTime;
  console.log(`  Query on status index took ${elapsed}ms`);
  if (elapsed > 100) {
    console.warn('  ⚠ WARNING: Query seems slow, index may be missing\n');
  } else {
    console.log('  ✓ PASS: Index query performance is good\n');
  }

  // Summary
  console.log('═══════════════════════════════════════');
  if (hasErrors) {
    console.error('✗ VERIFICATION FAILED');
    console.error('Please fix errors and re-run verification.');
    process.exit(1);
  } else {
    console.log('✓ VERIFICATION PASSED');
    console.log('Vendor approval workflow migration is complete and verified.');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('Verification script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
