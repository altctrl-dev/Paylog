import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoices.findMany({
    where: { status: 'pending_approval' },
    select: {
      id: true,
      invoice_number: true,
      status: true,
      invoice_amount: true,
      invoice_date: true,
    },
    orderBy: { created_at: 'desc' },
    take: 5,
  });
  
  console.log('\nPending Approval Invoices:');
  console.table(invoices);
  
  if (invoices.length > 0) {
    console.log(`\nFound ${invoices.length} pending approval invoice(s).`);
    console.log(`We'll update invoice #${invoices[0].invoice_number} (ID: ${invoices[0].id}) to UNPAID status.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
