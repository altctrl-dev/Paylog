/**
 * Create User Script
 *
 * Creates a user in the database with a hashed password.
 * Run with: npx tsx scripts/create-user.ts
 */

import { db } from '../lib/db';
import { hashPassword } from '../lib/crypto';
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

async function createUser() {
  console.log('\n🔐 PayLog - Create New User\n');

  try {
    // Get user details
    const email = await question('Email address: ');
    const fullName = await question('Full name: ');
    const password = await question('Password (min 8 chars): ');
    const roleInput = await question(
      'Role (super_admin/admin/manager/associate) [super_admin]: '
    );

    const role = roleInput.trim() || 'super_admin';

    // Validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    if (!fullName) {
      throw new Error('Full name is required');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const validRoles = ['super_admin', 'admin', 'manager', 'associate'];
    if (!validRoles.includes(role)) {
      throw new Error(
        `Invalid role. Must be one of: ${validRoles.join(', ')}`
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error(`User with email ${email} already exists`);
    }

    console.log('\n⏳ Hashing password...');
    const passwordHash = await hashPassword(password);

    console.log('⏳ Creating user...');
    const user = await db.user.create({
      data: {
        email,
        full_name: fullName,
        role,
        password_hash: passwordHash,
        is_active: true,
      },
    });

    console.log('\n✅ User created successfully!\n');
    console.log('User Details:');
    console.log('─────────────');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.is_active}`);
    console.log('\n🎉 You can now login at:');
    console.log('https://paylog-production.up.railway.app/login\n');
  } catch (error) {
    console.error('\n❌ Error creating user:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

createUser();
