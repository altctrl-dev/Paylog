/**
 * Verify User Script
 *
 * Checks if a user exists and verifies password hash.
 * Run with: npx tsx scripts/verify-user.ts
 */

import { db } from '../lib/db';
import { verifyPassword } from './crypto-utils';
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

async function verifyUser() {
  console.log('\n🔍 PayLog - Verify User & Password\n');

  try {
    // Get user email
    const email = await question('Email address: ');
    const password = await question('Password to test: ');

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('\n❌ User not found\n');
      process.exit(1);
    }

    console.log('\n✅ User found:');
    console.log('─────────────');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.is_active}`);
    console.log(`Password Hash: ${user.password_hash?.substring(0, 20)}...`);
    console.log(`Created: ${user.created_at}`);
    console.log(`Updated: ${user.updated_at}`);

    if (!user.password_hash) {
      console.log('\n❌ No password hash set for this user\n');
      process.exit(1);
    }

    // Verify password
    console.log('\n⏳ Verifying password...');
    const isValid = await verifyPassword(password, user.password_hash);

    if (isValid) {
      console.log('\n✅ Password is CORRECT!\n');
      console.log('This password should work for login.\n');
    } else {
      console.log('\n❌ Password is INCORRECT!\n');
      console.log('The password you entered does not match the hash in database.\n');
    }
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

verifyUser();
