/**
 * Reset Admin User Password
 *
 * Updates the password for a user by email.
 * Hashes the password with bcrypt before storing.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  console.log(`\n🔐 Resetting password for user: ${email}`);

  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
    },
  });

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  console.log(`\n✅ Found user:`, {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
  });

  // 2. Hash new password
  console.log(`\n🔒 Hashing new password...`);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 3. Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: hashedPassword },
  });

  console.log(`\n✅ Password updated successfully!`);
  console.log(`\nYou can now login with:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${newPassword}`);
  console.log(`\n⚠️  Make sure to change this password after logging in!`);
}

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error(`
❌ Usage: pnpm tsx scripts/reset-admin-password.ts <email> <new-password>

Example:
  pnpm tsx scripts/reset-admin-password.ts admin@example.com NewSecurePass123
  `);
  process.exit(1);
}

resetPassword(email, newPassword)
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
