import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Super Admin user (skip if already exists)
  const hashedPassword = await hashPassword('admin123');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@paylog.com' },
  });

  if (!existingAdmin) {
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@paylog.com',
        full_name: 'System Administrator',
        role: 'super_admin',
        password_hash: hashedPassword,
        is_active: true,
      },
    });
    console.log('✅ Created Super Admin:', adminUser.email);
  } else {
    console.log('⏭️  Super Admin already exists:', existingAdmin.email);
  }

  // Create sample vendors (skip duplicates)
  const vendorCount = await prisma.vendor.count();
  if (vendorCount === 0) {
    const vendors = await prisma.vendor.createMany({
      data: [
        { name: 'Acme Corp' },
        { name: 'Tech Solutions Inc' },
        { name: 'Office Supplies Ltd' },
      ],
    });
    console.log('✅ Created', vendors.count, 'vendors');
  } else {
    console.log('⏭️  Vendors already exist (', vendorCount, 'vendors)');
  }

  // Create sample categories (skip duplicates)
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const categories = await prisma.category.createMany({
      data: [
        { name: 'Software & Licenses', description: 'Software subscriptions, licenses, and SaaS products' },
        { name: 'Office Supplies', description: 'General office supplies and equipment' },
        { name: 'Marketing & Advertising', description: 'Marketing campaigns, advertising costs, and promotional materials' },
        { name: 'Professional Services', description: 'Consulting, legal, accounting, and other professional services' },
      ],
    });
    console.log('✅ Created', categories.count, 'categories');
  } else {
    console.log('⏭️  Categories already exist (', categoryCount, 'categories)');
  }

  // Create sample invoice profile (skip if exists)
  const existingProfile = await prisma.invoiceProfile.findFirst({
    where: { name: 'Standard Invoice' },
  });
  if (!existingProfile) {
    // Get first active entity, vendor, category, currency for profile
    const firstEntity = await prisma.entity.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    const firstVendor = await prisma.vendor.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    const firstCategory = await prisma.category.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    const firstCurrency = await prisma.currency.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });

    if (firstEntity && firstVendor && firstCategory && firstCurrency) {
      const profile = await prisma.invoiceProfile.create({
        data: {
          name: 'Standard Invoice',
          description: 'Default invoice profile for standard purchases',
          visible_to_all: true,
          entity_id: firstEntity.id,
          vendor_id: firstVendor.id,
          category_id: firstCategory.id,
          currency_id: firstCurrency.id,
          tds_applicable: false,
        },
      });
      console.log('✅ Created invoice profile:', profile.name);
    } else {
      console.log('⚠️  Skipping invoice profile creation (missing required master data)');
    }
  } else {
    console.log('⏭️  Invoice profile already exists:', existingProfile.name);
  }

  // Create payment types (skip if exist)
  const paymentTypeCount = await prisma.paymentType.count();
  if (paymentTypeCount === 0) {
    const paymentTypes = await prisma.paymentType.createMany({
      data: [
        {
          name: 'Cash',
          description: 'Cash payment',
          requires_reference: false,
        },
        {
          name: 'Check',
          description: 'Check payment',
          requires_reference: true,
        },
        {
          name: 'Bank Transfer',
          description: 'Wire transfer or bank transfer',
          requires_reference: true,
        },
        {
          name: 'Credit Card',
          description: 'Credit card payment',
          requires_reference: false,
        },
        {
          name: 'UPI',
          description: 'UPI payment',
          requires_reference: true,
        },
      ],
    });
    console.log('✅ Created', paymentTypes.count, 'payment types');
  } else {
    console.log('⏭️  Payment types already exist (', paymentTypeCount, 'types)');
  }

  // Create sub entities (skip if exist)
  const subEntityCount = await prisma.subEntity.count();
  if (subEntityCount === 0) {
    const subEntities = await prisma.subEntity.createMany({
      data: [
        {
          name: 'Head Office',
          description: 'Main office operations',
        },
        {
          name: 'Branch A',
          description: 'Branch A division',
        },
        {
          name: 'Branch B',
          description: 'Branch B division',
        },
      ],
    });
    console.log('✅ Created', subEntities.count, 'sub entities');
  } else {
    console.log('⏭️  Sub entities already exist (', subEntityCount, 'entities)');
  }

  console.log('\n✨ Database seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('Email: admin@paylog.com');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
