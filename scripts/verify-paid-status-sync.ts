#!/usr/bin/env tsx

/**
 * VERIFICATION SCRIPT FOR PAID STATUS SYNC
 * =========================================
 *
 * Purpose: Verify data consistency between is_paid and status fields
 *
 * Usage:
 *   npx tsx scripts/verify-paid-status-sync.ts
 *   npx tsx scripts/verify-paid-status-sync.ts --detailed  # Show all inconsistencies
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const args = process.argv.slice(2);
const showDetailed = args.includes('--detailed');

interface VerificationResult {
  totalInvoices: number;
  v2Invoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  inconsistentPaidStatus: number;
  inconsistentUnpaidStatus: number;
  allConsistent: boolean;
}

async function main() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('PAID STATUS VERIFICATION');
  console.log('═════════════════════════════════════════════════════════\n');

  try {
    // Count totals
    const totalInvoices = await prisma.invoice.count();
    console.log(`📊 Total invoices: ${totalInvoices}`);

    const v2Invoices = await prisma.invoice.count({
      where: {
        OR: [
          { currency_id: { not: null } },
          { entity_id: { not: null } },
          { payment_type_id: { not: null } },
        ],
      },
    });
    console.log(`📊 V2 invoices: ${v2Invoices}`);

    const paidInvoices = await prisma.invoice.count({
      where: { is_paid: true },
    });
    console.log(`📊 Paid invoices (is_paid=true): ${paidInvoices}`);

    const unpaidInvoices = await prisma.invoice.count({
      where: { is_paid: false },
    });
    console.log(`📊 Unpaid invoices (is_paid=false): ${unpaidInvoices}\n`);

    // Check inconsistencies: is_paid=true but status!='paid'
    console.log('🔍 Checking Inconsistency #1: is_paid=true but status!="paid"');
    console.log('─────────────────────────────────────────────────────────');

    const inconsistentPaid = await prisma.invoice.findMany({
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
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log(`Found: ${inconsistentPaid.length} invoices\n`);

    if (inconsistentPaid.length > 0) {
      console.log('⚠️  INCONSISTENCY DETECTED!');
      console.log(
        `   ${inconsistentPaid.length} V2 invoices have is_paid=true but status!='paid'\n`
      );

      if (showDetailed) {
        console.log('Details:');
        inconsistentPaid.forEach((invoice) => {
          console.log(
            `  - Invoice #${invoice.invoice_number} (ID: ${invoice.id}): ` +
              `status='${invoice.status}', is_paid=${invoice.is_paid}, ` +
              `created=${invoice.created_at.toISOString().split('T')[0]}`
          );
        });
        console.log();
      } else {
        console.log('Sample (first 5):');
        inconsistentPaid.slice(0, 5).forEach((invoice) => {
          console.log(
            `  - Invoice #${invoice.invoice_number} (ID: ${invoice.id}): ` +
              `status='${invoice.status}', is_paid=${invoice.is_paid}`
          );
        });
        if (inconsistentPaid.length > 5) {
          console.log(`  ... and ${inconsistentPaid.length - 5} more`);
        }
        console.log('\nUse --detailed flag to see all inconsistencies\n');
      }
    } else {
      console.log('✅ No inconsistencies found!\n');
    }

    // Check reverse inconsistency: status='paid' but is_paid=false
    console.log('🔍 Checking Inconsistency #2: status="paid" but is_paid=false');
    console.log('─────────────────────────────────────────────────────────');

    const inconsistentUnpaid = await prisma.invoice.findMany({
      where: {
        status: 'paid',
        is_paid: false,
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
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log(`Found: ${inconsistentUnpaid.length} invoices\n`);

    if (inconsistentUnpaid.length > 0) {
      console.log('⚠️  REVERSE INCONSISTENCY DETECTED!');
      console.log(
        `   ${inconsistentUnpaid.length} V2 invoices have status='paid' but is_paid=false\n`
      );

      if (showDetailed) {
        console.log('Details:');
        inconsistentUnpaid.forEach((invoice) => {
          console.log(
            `  - Invoice #${invoice.invoice_number} (ID: ${invoice.id}): ` +
              `status='${invoice.status}', is_paid=${invoice.is_paid}, ` +
              `created=${invoice.created_at.toISOString().split('T')[0]}`
          );
        });
        console.log();
      } else {
        console.log('Sample (first 5):');
        inconsistentUnpaid.slice(0, 5).forEach((invoice) => {
          console.log(
            `  - Invoice #${invoice.invoice_number} (ID: ${invoice.id}): ` +
              `status='${invoice.status}', is_paid=${invoice.is_paid}`
          );
        });
        if (inconsistentUnpaid.length > 5) {
          console.log(`  ... and ${inconsistentUnpaid.length - 5} more`);
        }
        console.log('\nUse --detailed flag to see all inconsistencies\n');
      }
    } else {
      console.log('✅ No reverse inconsistencies found!\n');
    }

    // Summary
    console.log('═════════════════════════════════════════════════════════');
    console.log('VERIFICATION SUMMARY');
    console.log('═════════════════════════════════════════════════════════');

    const result: VerificationResult = {
      totalInvoices,
      v2Invoices,
      paidInvoices,
      unpaidInvoices,
      inconsistentPaidStatus: inconsistentPaid.length,
      inconsistentUnpaidStatus: inconsistentUnpaid.length,
      allConsistent:
        inconsistentPaid.length === 0 && inconsistentUnpaid.length === 0,
    };

    console.log(`Total invoices: ${result.totalInvoices}`);
    console.log(`V2 invoices: ${result.v2Invoices}`);
    console.log(`Paid invoices: ${result.paidInvoices}`);
    console.log(`Unpaid invoices: ${result.unpaidInvoices}`);
    console.log(
      `Inconsistent (is_paid=true, status!='paid'): ${result.inconsistentPaidStatus}`
    );
    console.log(
      `Inconsistent (status='paid', is_paid=false): ${result.inconsistentUnpaidStatus}`
    );
    console.log('─────────────────────────────────────────────────────────');

    if (result.allConsistent) {
      console.log('✅ ALL INVOICES CONSISTENT! Data integrity verified.');
    } else {
      console.log('⚠️  INCONSISTENCIES DETECTED! Run migration script to fix.');
      console.log('\nTo fix inconsistencies:');
      console.log('  1. Backup database first');
      console.log('  2. Run: npx tsx scripts/backfill-paid-status-sync.ts --dry-run');
      console.log('  3. Review changes');
      console.log('  4. Run: npx tsx scripts/backfill-paid-status-sync.ts');
    }

    console.log('═════════════════════════════════════════════════════════\n');

    await prisma.$disconnect();
    process.exit(result.allConsistent ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Verification failed with error:');
    console.error(error);

    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
