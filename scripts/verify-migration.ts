import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Sprint 13 Phase 1 Migration...\n');

  // Check if new columns exist by attempting to select them
  try {
    const invoice = await prisma.invoice.findFirst({
      select: {
        id: true,
        invoice_number: true,
        is_recurring: true,
        invoice_profile_id: true,
        is_paid: true,
        paid_date: true,
        paid_amount: true,
        paid_currency: true,
        payment_type_id: true,
        payment_reference: true,
      },
    });

    console.log('✅ Invoice table: All new columns exist');
    console.log(`   Sample invoice: ${invoice?.invoice_number || 'No invoices yet'}`);
    console.log(`   - is_recurring: ${invoice?.is_recurring ?? 'null'}`);
    console.log(`   - invoice_profile_id: ${invoice?.invoice_profile_id ?? 'null'}`);
    console.log(`   - is_paid: ${invoice?.is_paid ?? 'null'}`);

    // Count invoices by type
    const recurringCount = await prisma.invoice.count({
      where: { is_recurring: true },
    });
    const nonRecurringCount = await prisma.invoice.count({
      where: { is_recurring: false },
    });

    console.log(`\n📊 Invoice Statistics:`);
    console.log(`   - Recurring invoices: ${recurringCount}`);
    console.log(`   - Non-recurring invoices: ${nonRecurringCount}`);
    console.log(`   - Total: ${recurringCount + nonRecurringCount}`);

    // Check invoice_profiles
    const profile = await prisma.invoiceProfile.findFirst({
      select: {
        id: true,
        name: true,
        billing_frequency: true,
        tds_applicable: true,
        tds_percentage: true,
      },
    });

    console.log(`\n✅ InvoiceProfile table: All fields accessible`);
    console.log(`   Sample profile: ${profile?.name || 'No profiles yet'}`);
    console.log(`   - billing_frequency: ${profile?.billing_frequency ?? 'null'}`);
    console.log(`   - tds_applicable: ${profile?.tds_applicable ?? 'null'}`);

    console.log('\n✅ Migration verification complete!');
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
