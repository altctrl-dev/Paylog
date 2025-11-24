#!/usr/bin/env tsx

/**
 * PAID STATUS SYNC MIGRATION
 * ===========================
 *
 * Purpose: Fix data inconsistency between is_paid and status fields for V2 invoices
 *
 * Problem:
 * - Invoices created with is_paid=true were not having status updated to "paid"
 * - Detail panel uses is_paid → showed PAID (correct)
 * - List view uses status → showed UNPAID (incorrect)
 * - Bug is now fixed for new invoices, but existing V2 invoices need backfill
 *
 * Target Records:
 * - V2 invoices (have currency_id OR entity_id OR payment_type_id)
 * - With is_paid = true
 * - But status != 'paid'
 *
 * Migration Operation:
 * - SET status = 'paid', updated_at = NOW()
 * - WHERE is_paid = true AND status != 'paid' AND (currency_id IS NOT NULL OR entity_id IS NOT NULL OR payment_type_id IS NOT NULL)
 *
 * Safety:
 * - Idempotent (safe to run multiple times)
 * - Transaction-based (all or nothing)
 * - Dry-run mode available
 * - Pre/post verification checks
 * - Affected records logged
 *
 * Usage:
 *   npx tsx scripts/backfill-paid-status-sync.ts --dry-run  # Preview changes
 *   npx tsx scripts/backfill-paid-status-sync.ts            # Run with confirmation
 *   npx tsx scripts/backfill-paid-status-sync.ts --yes      # Run without confirmation
 *   npx tsx scripts/backfill-paid-status-sync.ts --verbose  # Detailed logging
 *
 * ROLLBACK WARNING:
 * ================
 * True rollback is NOT possible because we don't store the original status values.
 * We only know they were NOT "paid", but can't determine if they were "unpaid",
 * "pending_approval", "on_hold", or "rejected".
 *
 * RECOMMENDED BEFORE RUNNING:
 * 1. Create database backup:
 *    pg_dump $DATABASE_URL > backup_before_paid_status_sync_$(date +%Y%m%d_%H%M%S).sql
 *
 * 2. Or export affected records:
 *    SELECT id, invoice_number, status, is_paid
 *    FROM invoices
 *    WHERE is_paid = true AND status != 'paid'
 *      AND (currency_id IS NOT NULL OR entity_id IS NOT NULL OR payment_type_id IS NOT NULL)
 *    INTO OUTFILE 'backup_affected_invoices.csv';
 *
 * 3. Run with --dry-run first to preview changes
 *
 * MANUAL ROLLBACK (if needed):
 * ============================
 * If you have the backup CSV:
 * UPDATE invoices
 * SET status = [original_status_from_backup]
 * WHERE id = [invoice_id];
 *
 * If you DON'T have backup:
 * You cannot accurately restore the original status values.
 * The best approximation is to set status = 'unpaid', but this may not be accurate
 * for invoices that were in other states (pending_approval, on_hold, rejected).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const autoConfirm = args.includes('--yes') || args.includes('-y');
const isVerbose = args.includes('--verbose') || args.includes('-v');

interface MigrationStats {
  totalInvoices: number;
  v2Invoices: number;
  inconsistentInvoices: number;
  updatedInvoices: number;
  remainingInconsistencies: number;
  duration: number;
}

interface InconsistentInvoice {
  id: number;
  invoice_number: string;
  status: string;
  is_paid: boolean;
  currency_id: number | null;
  entity_id: number | null;
  payment_type_id: number | null;
}

/**
 * Log with timestamp (verbose mode only)
 */
function verboseLog(...args: unknown[]) {
  if (isVerbose) {
    console.log(`[${new Date().toISOString()}]`, ...args);
  }
}

/**
 * Pre-flight checks: Count affected records and show samples
 */
async function preflightChecks(): Promise<InconsistentInvoice[]> {
  verboseLog('Running pre-flight checks...');

  // Find all inconsistent V2 invoices
  const inconsistentInvoices = await prisma.invoice.findMany({
    where: {
      is_paid: true,
      status: {
        not: 'paid',
      },
      OR: [
        { currency_id: { not: null } },
        { entity_id: { not: null } },
        { payment_type_id: { not: null } },
      ],
    },
    select: {
      id: true,
      invoice_number: true,
      status: true,
      is_paid: true,
      currency_id: true,
      entity_id: true,
      payment_type_id: true,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  verboseLog(`Found ${inconsistentInvoices.length} inconsistent invoices`);

  return inconsistentInvoices;
}

/**
 * Display sample records
 */
function displaySamples(invoices: InconsistentInvoice[], limit = 5) {
  console.log('\nSample Records (first 5):');
  console.log('─────────────────────────────────────────────────────────');

  const samples = invoices.slice(0, limit);
  if (samples.length === 0) {
    console.log('  (no records to display)');
    return;
  }

  samples.forEach((invoice) => {
    const v2Indicators = [];
    if (invoice.currency_id) v2Indicators.push('currency');
    if (invoice.entity_id) v2Indicators.push('entity');
    if (invoice.payment_type_id) v2Indicators.push('payment_type');

    console.log(
      `  Invoice #${invoice.invoice_number} (ID: ${invoice.id}): ` +
        `status='${invoice.status}' → 'paid' (V2: ${v2Indicators.join(', ')})`
    );
  });

  if (invoices.length > limit) {
    console.log(`  ... and ${invoices.length - limit} more`);
  }
}

/**
 * Display migration plan
 */
function displayMigrationPlan(count: number) {
  console.log('\nSQL to Execute:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`UPDATE "invoices"`);
  console.log(`SET status = 'paid', updated_at = NOW()`);
  console.log(`WHERE is_paid = true`);
  console.log(`  AND status != 'paid'`);
  console.log(`  AND (currency_id IS NOT NULL`);
  console.log(`       OR entity_id IS NOT NULL`);
  console.log(`       OR payment_type_id IS NOT NULL);`);
  console.log(`\nExpected affected rows: ${count}`);
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(): Promise<boolean> {
  if (autoConfirm) {
    console.log('\nAuto-confirm enabled (--yes flag). Proceeding...\n');
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\nConfirm migration? (yes/no): ', (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Execute the migration
 */
async function executeMigration(
  invoices: InconsistentInvoice[]
): Promise<number> {
  verboseLog('Starting migration execution...');

  if (invoices.length === 0) {
    return 0;
  }

  // Extract invoice IDs
  const invoiceIds = invoices.map((inv) => inv.id);

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    verboseLog(`Updating ${invoiceIds.length} invoices in transaction...`);

    const updateResult = await tx.invoice.updateMany({
      where: {
        id: {
          in: invoiceIds,
        },
        // Additional safety checks (should already match, but belt-and-suspenders)
        is_paid: true,
        status: {
          not: 'paid',
        },
      },
      data: {
        status: 'paid',
        updated_at: new Date(),
      },
    });

    verboseLog(`Transaction complete. Updated ${updateResult.count} records.`);

    return updateResult.count;
  });

  return result;
}

/**
 * Post-migration verification
 */
async function verifyMigration(): Promise<number> {
  verboseLog('Running post-migration verification...');

  // Check if any inconsistencies remain
  const remainingInconsistencies = await prisma.invoice.count({
    where: {
      is_paid: true,
      status: {
        not: 'paid',
      },
      OR: [
        { currency_id: { not: null } },
        { entity_id: { not: null } },
        { payment_type_id: { not: null } },
      ],
    },
  });

  verboseLog(`Remaining inconsistencies: ${remainingInconsistencies}`);

  return remainingInconsistencies;
}

/**
 * Display summary report
 */
function displaySummary(stats: MigrationStats) {
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('MIGRATION SUMMARY');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`Total invoices in database: ${stats.totalInvoices}`);
  console.log(`V2 invoices: ${stats.v2Invoices}`);
  console.log(`Inconsistent invoices (before): ${stats.inconsistentInvoices}`);
  console.log(`Updated invoices: ${stats.updatedInvoices}`);
  console.log(`Remaining inconsistencies (after): ${stats.remainingInconsistencies}`);
  console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);
  console.log('═════════════════════════════════════════════════════════');

  if (stats.remainingInconsistencies === 0) {
    console.log('\n✅ Migration completed successfully! No inconsistencies remain.');
  } else {
    console.log(
      `\n⚠️  Warning: ${stats.remainingInconsistencies} inconsistencies still exist.`
    );
    console.log('This should not happen. Please investigate manually.');
  }
}

/**
 * Main migration function
 */
async function main() {
  const startTime = Date.now();

  console.log('═════════════════════════════════════════════════════════');
  console.log('PAID STATUS SYNC MIGRATION');
  console.log('═════════════════════════════════════════════════════════');
  console.log(
    `Mode: ${isDryRun ? '[DRY RUN] Preview only - no changes' : '[LIVE] Will modify database'}`
  );
  console.log(`Verbose: ${isVerbose ? 'Enabled' : 'Disabled'}`);
  console.log(`Auto-confirm: ${autoConfirm ? 'Enabled' : 'Disabled'}`);
  console.log('═════════════════════════════════════════════════════════');

  try {
    // Pre-flight checks
    console.log('\n📋 Pre-flight Check');
    console.log('─────────────────────────────────────────────────────────');

    const totalInvoices = await prisma.invoice.count();
    console.log(`Total invoices: ${totalInvoices}`);

    const v2Invoices = await prisma.invoice.count({
      where: {
        OR: [
          { currency_id: { not: null } },
          { entity_id: { not: null } },
          { payment_type_id: { not: null } },
        ],
      },
    });
    console.log(`V2 invoices (with V2 fields): ${v2Invoices}`);

    const inconsistentInvoices = await preflightChecks();
    console.log(
      `Inconsistent invoices (is_paid=true but status!='paid'): ${inconsistentInvoices.length}`
    );

    if (inconsistentInvoices.length === 0) {
      console.log('\n✅ No inconsistencies found. All invoices are in sync!');
      console.log('No migration needed.');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Display samples
    displaySamples(inconsistentInvoices);

    // Display migration plan
    displayMigrationPlan(inconsistentInvoices.length);

    if (isDryRun) {
      console.log(
        '\n[DRY RUN] No changes made. Run without --dry-run to apply.'
      );
      await prisma.$disconnect();
      process.exit(0);
    }

    // Confirm before proceeding
    const confirmed = await promptConfirmation();
    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user.');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Execute migration
    console.log('\n🔧 Executing Migration...');
    console.log('─────────────────────────────────────────────────────────');

    const updatedCount = await executeMigration(inconsistentInvoices);
    console.log(`✅ Updated ${updatedCount} invoices`);

    // Post-migration verification
    console.log('\n🔍 Post-migration Verification');
    console.log('─────────────────────────────────────────────────────────');

    const remainingInconsistencies = await verifyMigration();
    console.log(`Total updated: ${updatedCount}`);
    console.log(`Remaining inconsistencies: ${remainingInconsistencies}`);

    if (remainingInconsistencies === 0) {
      console.log('✅ All inconsistencies resolved!');
    } else {
      console.log(
        `⚠️  Warning: ${remainingInconsistencies} inconsistencies still exist`
      );
    }

    // Display summary
    const endTime = Date.now();
    const stats: MigrationStats = {
      totalInvoices,
      v2Invoices,
      inconsistentInvoices: inconsistentInvoices.length,
      updatedInvoices: updatedCount,
      remainingInconsistencies,
      duration: endTime - startTime,
    };

    displaySummary(stats);

    await prisma.$disconnect();
    process.exit(remainingInconsistencies === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

// Script entry point
main();
