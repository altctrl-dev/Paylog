#!/usr/bin/env tsx

/**
 * Sprint 13 Phase 1: Seed Data for Invoice Profiles
 *
 * Purpose: Generate test InvoiceProfile records with varied configurations
 *
 * This script creates:
 * - 5 test InvoiceProfile records with different billing frequencies
 * - Sample recurring and non-recurring invoices
 * - Payment type configurations
 *
 * Usage:
 *   npm run seed:profiles
 *   or
 *   npx tsx prisma/seed-invoice-profiles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Sprint 13 Invoice Profile Seed Script');
  console.log('═════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Ensure master data exists
    console.log('🔍 Checking for required master data...');

    const entity = await prisma.entity.findFirst({ where: { is_active: true } });
    const vendor1 = await prisma.vendor.findFirst({ where: { is_active: true, name: { contains: 'AWS' } } });
    const vendor2 = await prisma.vendor.findFirst({ where: { is_active: true, name: { contains: 'Google' } } });
    const vendor3 = await prisma.vendor.findFirst({ where: { is_active: true } });

    const category1 = await prisma.category.findFirst({ where: { is_active: true, name: { contains: 'Cloud' } } });
    const category2 = await prisma.category.findFirst({ where: { is_active: true, name: { contains: 'Software' } } });
    const category3 = await prisma.category.findFirst({ where: { is_active: true } });

    const currency = await prisma.currency.findFirst({ where: { is_active: true, code: 'USD' } });
    const currencyINR = await prisma.currency.findFirst({ where: { is_active: true, code: 'INR' } });

    if (!entity || !vendor1 || !vendor2 || !vendor3 || !category1 || !category2 || !category3 || !currency) {
      console.error('❌ Missing required master data. Please run main seed first.');
      process.exit(1);
    }

    console.log('✅ Required master data found\n');

    // Step 2: Create test Invoice Profiles
    console.log('📝 Creating test Invoice Profiles...\n');

    // Profile 1: Monthly billing, TDS applicable (2%)
    const profile1 = await prisma.invoiceProfile.upsert({
      where: { id: 9001 }, // Use high IDs to avoid conflicts
      create: {
        id: 9001,
        name: 'AWS Monthly Hosting - Production',
        description: 'Monthly recurring charges for AWS cloud infrastructure (production environment)',
        billing_frequency: '1 month',
        visible_to_all: true,
        entity_id: entity.id,
        vendor_id: vendor1!.id,
        category_id: category1!.id,
        currency_id: currency.id,
        prepaid_postpaid: 'postpaid',
        tds_applicable: true,
        tds_percentage: 2.0,
      },
      update: {
        name: 'AWS Monthly Hosting - Production',
        billing_frequency: '1 month',
        tds_applicable: true,
        tds_percentage: 2.0,
      },
    });
    console.log(`✓ Created Profile: ${profile1.name}`);
    console.log(`  - Billing: ${profile1.billing_frequency}`);
    console.log(`  - TDS: ${profile1.tds_percentage}%\n`);

    // Profile 2: Quarterly billing (90 days), no TDS
    const profile2 = await prisma.invoiceProfile.upsert({
      where: { id: 9002 },
      create: {
        id: 9002,
        name: 'Google Workspace Enterprise - Quarterly',
        description: 'Quarterly subscription for Google Workspace enterprise licenses',
        billing_frequency: '90 days',
        visible_to_all: true,
        entity_id: entity.id,
        vendor_id: vendor2!.id,
        category_id: category2!.id,
        currency_id: currency.id,
        prepaid_postpaid: 'prepaid',
        tds_applicable: false,
        tds_percentage: null,
      },
      update: {
        name: 'Google Workspace Enterprise - Quarterly',
        billing_frequency: '90 days',
        tds_applicable: false,
      },
    });
    console.log(`✓ Created Profile: ${profile2.name}`);
    console.log(`  - Billing: ${profile2.billing_frequency}`);
    console.log(`  - TDS: None\n`);

    // Profile 3: Annual billing (1 year), TDS applicable (10%)
    const profile3 = await prisma.invoiceProfile.upsert({
      where: { id: 9003 },
      create: {
        id: 9003,
        name: 'Microsoft Office 365 - Annual License',
        description: 'Annual subscription for Microsoft Office 365 enterprise suite',
        billing_frequency: '1 year',
        visible_to_all: true,
        entity_id: entity.id,
        vendor_id: vendor3!.id,
        category_id: category2!.id,
        currency_id: currency.id,
        prepaid_postpaid: 'prepaid',
        tds_applicable: true,
        tds_percentage: 10.0,
      },
      update: {
        name: 'Microsoft Office 365 - Annual License',
        billing_frequency: '1 year',
        tds_applicable: true,
        tds_percentage: 10.0,
      },
    });
    console.log(`✓ Created Profile: ${profile3.name}`);
    console.log(`  - Billing: ${profile3.billing_frequency}`);
    console.log(`  - TDS: ${profile3.tds_percentage}%\n`);

    // Profile 4: Bi-weekly billing (14 days), no TDS
    const profile4 = await prisma.invoiceProfile.upsert({
      where: { id: 9004 },
      create: {
        id: 9004,
        name: 'Contractor Services - Bi-Weekly',
        description: 'Bi-weekly payments for contractor development services',
        billing_frequency: '14 days',
        visible_to_all: false, // Limited visibility example
        entity_id: entity.id,
        vendor_id: vendor3!.id,
        category_id: category3!.id,
        currency_id: currencyINR?.id || currency.id,
        prepaid_postpaid: 'postpaid',
        tds_applicable: false,
        tds_percentage: null,
      },
      update: {
        name: 'Contractor Services - Bi-Weekly',
        billing_frequency: '14 days',
        tds_applicable: false,
      },
    });
    console.log(`✓ Created Profile: ${profile4.name}`);
    console.log(`  - Billing: ${profile4.billing_frequency}`);
    console.log(`  - TDS: None`);
    console.log(`  - Visibility: Limited\n`);

    // Profile 5: Semi-annual billing (6 months), TDS applicable (5%)
    const profile5 = await prisma.invoiceProfile.upsert({
      where: { id: 9005 },
      create: {
        id: 9005,
        name: 'SaaS Platform - Semi-Annual',
        description: 'Semi-annual subscription for enterprise SaaS platform',
        billing_frequency: '6 months',
        visible_to_all: true,
        entity_id: entity.id,
        vendor_id: vendor1!.id,
        category_id: category2!.id,
        currency_id: currency.id,
        prepaid_postpaid: 'prepaid',
        tds_applicable: true,
        tds_percentage: 5.0,
      },
      update: {
        name: 'SaaS Platform - Semi-Annual',
        billing_frequency: '6 months',
        tds_applicable: true,
        tds_percentage: 5.0,
      },
    });
    console.log(`✓ Created Profile: ${profile5.name}`);
    console.log(`  - Billing: ${profile5.billing_frequency}`);
    console.log(`  - TDS: ${profile5.tds_percentage}%\n`);

    // Step 3: Create sample invoices (optional - comment out if not needed)
    console.log('📄 Creating sample invoices...\n');

    // Get a test user for created_by
    const testUser = await prisma.user.findFirst({ where: { is_active: true } });
    if (!testUser) {
      console.log('⚠️  No active user found. Skipping invoice creation.');
    } else {
      // Sample recurring invoice
      const recurringInvoice = await prisma.invoice.upsert({
        where: { invoice_number: 'TEST-REC-001' },
        create: {
          invoice_number: 'TEST-REC-001',
          vendor_id: vendor1!.id,
          category_id: category1!.id,
          profile_id: profile1.id, // Legacy profile link
          invoice_profile_id: profile1.id, // New profile link
          is_recurring: true,
          invoice_amount: 5000.00,
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          period_start: new Date(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          tds_applicable: profile1.tds_applicable,
          tds_percentage: profile1.tds_percentage,
          currency_id: currency.id,
          entity_id: entity.id,
          created_by: testUser.id,
          status: 'pending_approval',
          is_paid: false,
          notes: 'Test recurring invoice from seed script',
        },
        update: {
          is_recurring: true,
          invoice_profile_id: profile1.id,
        },
      });
      console.log(`✓ Created recurring invoice: ${recurringInvoice.invoice_number}`);

      // Sample non-recurring invoice
      const nonRecurringInvoice = await prisma.invoice.upsert({
        where: { invoice_number: 'TEST-NR-001' },
        create: {
          invoice_number: 'TEST-NR-001',
          vendor_id: vendor2!.id,
          category_id: category2!.id,
          is_recurring: false,
          invoice_amount: 1500.00,
          invoice_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
          tds_applicable: false,
          currency_id: currency.id,
          entity_id: entity.id,
          created_by: testUser.id,
          status: 'approved',
          is_paid: true,
          paid_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Paid 3 days ago
          paid_amount: 1500.00,
          paid_currency: 'USD',
          notes: 'Test non-recurring invoice from seed script',
        },
        update: {
          is_recurring: false,
          is_paid: true,
        },
      });
      console.log(`✓ Created non-recurring invoice: ${nonRecurringInvoice.invoice_number}`);
    }

    // Step 4: Print summary
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('SEED SUMMARY');
    console.log('═════════════════════════════════════════════════════════════');
    console.log('Invoice Profiles Created: 5');
    console.log('  - Monthly billing: 1');
    console.log('  - Quarterly billing: 1');
    console.log('  - Semi-annual billing: 1');
    console.log('  - Annual billing: 1');
    console.log('  - Bi-weekly billing: 1');
    console.log('\nTDS Configuration:');
    console.log('  - With TDS: 3 profiles');
    console.log('  - Without TDS: 2 profiles');
    console.log('\nSample Invoices:');
    console.log('  - Recurring: 1');
    console.log('  - Non-recurring: 1');
    console.log('═════════════════════════════════════════════════════════════');
    console.log('\n✅ Seed script completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
