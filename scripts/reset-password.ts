/**
 * Reset User Password Script
 *
 * Resets a user's password in the database.
 * Run with: npx tsx scripts/reset-password.ts
 */

import { db } from '../lib/db';
import { hashPassword } from './crypto-utils';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function resetPassword() {
  console.log('\n🔐 PayLog - Reset User Password\n');

  try {
    // Get user email
    const email = await question('Email address: ');

    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`User with email ${email} does not exist`);
    }

    console.log(`\nFound user: ${user.full_name} (${user.role})\n`);

    // Get new password
    const password = await question('New password (min 8 chars): ');

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    console.log('\n⏳ Hashing password...');
    const passwordHash = await hashPassword(password);

    console.log('⏳ Updating password...');
    await db.user.update({
      where: { email },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    });

    console.log('\n✅ Password updated successfully!\n');
    console.log('User Details:');
    console.log('─────────────');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name}`);
    console.log(`Role: ${user.role}`);
    console.log('\n🎉 You can now login at:');
    console.log('https://paylog-production.up.railway.app/login\n');
  } catch (error) {
    console.error('\n❌ Error resetting password:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

resetPassword();
