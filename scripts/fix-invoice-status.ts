/**
 * Fix Invoice Status Script
 *
 * Run with: npx tsx scripts/fix-invoice-status.ts <invoice_number>
 * Example: npx tsx scripts/fix-invoice-status.ts "PH2/DG/49/25-26"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calculateTds(
  invoiceAmount: number,
  tdsPercentage: number,
  roundUp: boolean = false
): { tdsAmount: number; payableAmount: number } {
  const exactTds = (invoiceAmount * tdsPercentage) / 100;
  const tdsAmount = roundUp ? Math.ceil(exactTds) : exactTds;
  const payableAmount = invoiceAmount - tdsAmount;
  return { tdsAmount, payableAmount };
}

async function fixInvoiceStatus(invoiceNumber: string) {
  console.log(`\nLooking for invoice: ${invoiceNumber}`);

  // Find the invoice
  const invoice = await prisma.invoice.findFirst({
    where: { invoice_number: invoiceNumber },
    select: {
      id: true,
      invoice_number: true,
      status: true,
      invoice_amount: true,
      tds_applicable: true,
      tds_percentage: true,
      tds_rounded: true,
    },
  });

  if (!invoice) {
    console.error(`Invoice not found: ${invoiceNumber}`);
    process.exit(1);
  }

  console.log(`Found invoice ID: ${invoice.id}`);
  console.log(`Current status: ${invoice.status}`);
  console.log(`Invoice amount: ₹${invoice.invoice_amount}`);
  console.log(`TDS applicable: ${invoice.tds_applicable}`);
  console.log(`TDS percentage: ${invoice.tds_percentage}%`);
  console.log(`TDS rounded: ${invoice.tds_rounded}`);

  // Sum approved payments
  const paymentsSum = await prisma.payment.aggregate({
    where: {
      invoice_id: invoice.id,
      status: 'approved',
    },
    _sum: {
      amount_paid: true,
    },
  });

  const totalPaid = paymentsSum._sum.amount_paid || 0;
  console.log(`Total paid: ₹${totalPaid}`);

  // Calculate net payable
  const tdsCalc = invoice.tds_applicable && invoice.tds_percentage
    ? calculateTds(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
    : { payableAmount: invoice.invoice_amount, tdsAmount: 0 };

  console.log(`TDS amount: ₹${tdsCalc.tdsAmount}`);
  console.log(`Net payable: ₹${tdsCalc.payableAmount}`);

  const remainingBalance = tdsCalc.payableAmount - totalPaid;
  console.log(`Remaining balance: ₹${remainingBalance}`);

  // Determine new status
  let newStatus = 'unpaid';
  if (remainingBalance <= 0.01) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = 'partial';
  }

  console.log(`\nCalculated status: ${newStatus}`);

  if (invoice.status === newStatus) {
    console.log('Status is already correct. No update needed.');
    return;
  }

  // Update status
  console.log(`\nUpdating status from "${invoice.status}" to "${newStatus}"...`);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: newStatus },
  });

  console.log('✅ Invoice status updated successfully!');
}

async function main() {
  const invoiceNumber = process.argv[2];

  if (!invoiceNumber) {
    console.error('Usage: npx tsx scripts/fix-invoice-status.ts <invoice_number>');
    console.error('Example: npx tsx scripts/fix-invoice-status.ts "PH2/DG/49/25-26"');
    process.exit(1);
  }

  try {
    await fixInvoiceStatus(invoiceNumber);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
