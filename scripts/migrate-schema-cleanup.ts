/**
 * Data Migration Script: Schema Cleanup
 *
 * This script migrates:
 * 1. Inline payments from Invoice fields to Payment table
 * 2. payment_method strings to payment_type_id FK
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('=== Starting Data Migration ===\n');

    // 1. Migrate inline payments from Invoice to Payment table
    console.log('1. Migrating inline payments from Invoice to Payment table...');

    const invoicesWithPayment = await prisma.invoice.findMany({
      where: {
        is_paid: true,
        paid_amount: { not: null, gt: 0 }
      },
      select: {
        id: true,
        paid_amount: true,
        paid_date: true,
        payment_type_id: true,
        payment_reference: true,
        created_at: true
      }
    });

    console.log('  Found', invoicesWithPayment.length, 'invoices with inline payments');

    for (const inv of invoicesWithPayment) {
      // Check if payment already exists for this invoice
      const existingPayment = await prisma.payment.findFirst({
        where: { invoice_id: inv.id }
      });

      if (existingPayment === null) {
        await prisma.payment.create({
          data: {
            invoice_id: inv.id,
            amount_paid: inv.paid_amount!,
            payment_date: inv.paid_date || inv.created_at,
            payment_type_id: inv.payment_type_id,
            payment_reference: inv.payment_reference,
            status: 'approved'
          }
        });
        console.log('    Created payment for invoice', inv.id);
      } else {
        console.log('    Payment already exists for invoice', inv.id, '- skipping');
      }
    }

    // 2. Map payment_method strings to payment_type_id
    console.log('\n2. Mapping payment_method strings to payment_type_id...');

    const paymentTypes = await prisma.paymentType.findMany();
    console.log('  Available payment types:', paymentTypes.map(pt => pt.name).join(', '));

    const paymentsToUpdate = await prisma.payment.findMany({
      where: {
        payment_method: { not: null },
        payment_type_id: null
      }
    });

    console.log('  Found', paymentsToUpdate.length, 'payments to update');

    for (const payment of paymentsToUpdate) {
      const matchingType = paymentTypes.find(
        pt => pt.name.toLowerCase() === payment.payment_method?.toLowerCase()
      );

      if (matchingType) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { payment_type_id: matchingType.id }
        });
        console.log('    Updated payment', payment.id, ':', payment.payment_method, '->', matchingType.name);
      } else {
        console.log('    No match for payment', payment.id, ':', payment.payment_method);
      }
    }

    // 3. Verify migration
    console.log('\n=== Migration Verification ===');

    const totalPayments = await prisma.payment.count();
    const paymentsWithType = await prisma.payment.count({ where: { payment_type_id: { not: null } } });
    const paymentsWithoutType = await prisma.payment.count({ where: { payment_type_id: null } });

    console.log('Total payments:', totalPayments);
    console.log('Payments with payment_type_id:', paymentsWithType);
    console.log('Payments without payment_type_id:', paymentsWithoutType);

    console.log('\n=== Migration Complete ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
