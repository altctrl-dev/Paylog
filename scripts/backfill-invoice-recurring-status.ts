#!/usr/bin/env tsx

/**
 * Sprint 13 Phase 1: Backfill Script for Invoice Recurring Status
 *
 * Purpose: Verify and backfill is_recurring and is_paid fields for existing invoices
 *
 * This script is IDEMPOTENT - safe to run multiple times without side effects.
 *
 * Usage:
 *   npm run backfill:recurring-status
 *   or
 *   npx tsx scripts/backfill-invoice-recurring-status.ts
 *
 * Options:
 *   --dry-run: Show what would be updated without making changes
 *   --batch-size=N: Process N records at a time (default: 1000)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

interface BackfillStats {
  totalInvoices: number;
  recurringUpdated: number;
  paidUpdated: number;
  skipped: number;
  errors: number;
}

const stats: BackfillStats = {
  totalInvoices: 0,
  recurringUpdated: 0,
  paidUpdated: 0,
  skipped: 0,
  errors: 0,
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 1000;

/**
 * Main backfill function
 */
async function backfillInvoices() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Sprint 13 Invoice Workflow Backfill Script');
  console.log('═════════════════════════════════════════════════════════════');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('═════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Count total invoices
    stats.totalInvoices = await prisma.invoice.count();
    console.log(`📊 Total invoices in database: ${stats.totalInvoices}`);

    if (stats.totalInvoices === 0) {
      console.log('✅ No invoices found. Nothing to backfill.');
      return;
    }

    // Step 2: Backfill is_recurring field
    console.log('\n🔄 Checking is_recurring field...');
    await backfillRecurringStatus();

    // Step 3: Backfill is_paid field
    console.log('\n🔄 Checking is_paid field...');
    await backfillPaidStatus();

    // Step 4: Print summary
    printSummary();

  } catch (error) {
    console.error('\n❌ Backfill failed with error:', error);
    throw error;
  }
}

/**
 * Backfill is_recurring field for existing invoices
 */
async function backfillRecurringStatus() {
  try {
    // Find invoices where is_recurring might need updating
    // For backward compatibility, set all existing invoices to non-recurring
    const invoicesToUpdate = await prisma.invoice.findMany({
      where: {
        OR: [
          { is_recurring: null as boolean | null }, // TypeScript workaround for migration period
          // If invoice has invoice_profile_id but is_recurring is false, it should be true
          {
            AND: [
              { invoice_profile_id: { not: null } },
              { is_recurring: false }
            ]
          }
        ]
      },
      select: {
        id: true,
        invoice_number: true,
        invoice_profile_id: true,
        is_recurring: true,
      },
    });

    console.log(`   Found ${invoicesToUpdate.length} invoice(s) to check`);

    if (invoicesToUpdate.length === 0) {
      console.log('   ✅ All invoices have correct is_recurring status');
      return;
    }

    // Process in batches
    for (let i = 0; i < invoicesToUpdate.length; i += BATCH_SIZE) {
      const batch = invoicesToUpdate.slice(i, i + BATCH_SIZE);

      for (const invoice of batch) {
        try {
          // Determine correct is_recurring value
          const shouldBeRecurring = invoice.invoice_profile_id !== null;

          if (invoice.is_recurring === shouldBeRecurring) {
            stats.skipped++;
            continue;
          }

          if (!isDryRun) {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { is_recurring: shouldBeRecurring },
            });
          }

          stats.recurringUpdated++;
          console.log(`   ✓ Invoice ${invoice.invoice_number}: is_recurring → ${shouldBeRecurring}`);

        } catch (error) {
          stats.errors++;
          console.error(`   ✗ Failed to update invoice ${invoice.invoice_number}:`, error);
        }
      }

      // Progress update for large datasets
      if (invoicesToUpdate.length > BATCH_SIZE) {
        const processed = Math.min(i + BATCH_SIZE, invoicesToUpdate.length);
        console.log(`   Progress: ${processed}/${invoicesToUpdate.length} invoices processed`);
      }
    }

    console.log(`   ✅ Recurring status backfill complete`);

  } catch (error) {
    console.error('   ❌ Failed to backfill is_recurring:', error);
    throw error;
  }
}

/**
 * Backfill is_paid field based on existing Payment records
 */
async function backfillPaidStatus() {
  try {
    // Find invoices with payments but is_paid = false
    const invoicesWithPayments = await prisma.invoice.findMany({
      where: {
        AND: [
          { is_paid: false },
          {
            payments: {
              some: {
                status: 'completed', // Assuming completed payments
              }
            }
          }
        ]
      },
      include: {
        payments: {
          where: { status: 'completed' },
          orderBy: { payment_date: 'desc' },
          take: 1, // Get most recent payment
        }
      },
      select: {
        id: true,
        invoice_number: true,
        is_paid: true,
        payments: true,
      },
    });

    console.log(`   Found ${invoicesWithPayments.length} invoice(s) with completed payments but is_paid = false`);

    if (invoicesWithPayments.length === 0) {
      console.log('   ✅ All invoices have correct is_paid status');
      return;
    }

    // Process in batches
    for (let i = 0; i < invoicesWithPayments.length; i += BATCH_SIZE) {
      const batch = invoicesWithPayments.slice(i, i + BATCH_SIZE);

      for (const invoice of batch) {
        try {
          const latestPayment = invoice.payments[0];

          if (!latestPayment) {
            stats.skipped++;
            continue;
          }

          if (!isDryRun) {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                is_paid: true,
                paid_date: latestPayment.payment_date,
                paid_amount: latestPayment.amount_paid,
                payment_type_id: latestPayment.payment_type_id,
                // Note: paid_currency and payment_reference not in original Payment schema
              },
            });
          }

          stats.paidUpdated++;
          console.log(`   ✓ Invoice ${invoice.invoice_number}: is_paid → true (${latestPayment.amount_paid} on ${latestPayment.payment_date.toISOString().split('T')[0]})`);

        } catch (error) {
          stats.errors++;
          console.error(`   ✗ Failed to update invoice ${invoice.invoice_number}:`, error);
        }
      }

      // Progress update for large datasets
      if (invoicesWithPayments.length > BATCH_SIZE) {
        const processed = Math.min(i + BATCH_SIZE, invoicesWithPayments.length);
        console.log(`   Progress: ${processed}/${invoicesWithPayments.length} invoices processed`);
      }
    }

    console.log(`   ✅ Paid status backfill complete`);

  } catch (error) {
    console.error('   ❌ Failed to backfill is_paid:', error);
    throw error;
  }
}

/**
 * Print summary of backfill operation
 */
function printSummary() {
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('BACKFILL SUMMARY');
  console.log('═════════════════════════════════════════════════════════════');
  console.log(`Total invoices: ${stats.totalInvoices}`);
  console.log(`Recurring status updated: ${stats.recurringUpdated}`);
  console.log(`Paid status updated: ${stats.paidUpdated}`);
  console.log(`Skipped (already correct): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('═════════════════════════════════════════════════════════════');

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
    console.log('Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Backfill completed successfully!');
  }

  if (stats.errors > 0) {
    console.log('\n⚠️  Some errors occurred. Please review the log above.');
  }
}

/**
 * Script entry point
 */
async function main() {
  try {
    await backfillInvoices();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
main();
