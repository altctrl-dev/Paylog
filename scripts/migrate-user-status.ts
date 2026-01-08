/**
 * Data Migration: User Status Migration
 * 
 * This script migrates existing users and invites to the new unified status system:
 * 1. Sets status='active' for users where is_active=true
 * 2. Sets status='deactivated' for users where is_active=false
 * 3. Migrates UserInvite records to User records with status='pending'
 * 
 * Run with: npx tsx scripts/migrate-user-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting user status migration...\n');

  // Step 1: Update existing active users
  const activeUpdated = await prisma.user.updateMany({
    where: {
      is_active: true,
      status: 'active', // Only update if not already set
    },
    data: {
      status: 'active',
    },
  });
  console.log(`✓ Confirmed ${activeUpdated.count} active users`);

  // Step 2: Update deactivated users
  const deactivatedUpdated = await prisma.user.updateMany({
    where: {
      is_active: false,
    },
    data: {
      status: 'deactivated',
    },
  });
  console.log(`✓ Updated ${deactivatedUpdated.count} deactivated users`);

  // Step 3: Migrate UserInvite records to User records with status='pending'
  const pendingInvites = await prisma.userInvite.findMany({
    where: {
      used_at: null, // Only unused invites
    },
    include: {
      inviter: true,
    },
  });

  console.log(`\nFound ${pendingInvites.length} pending invites to migrate...`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const invite of pendingInvites) {
    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      console.log(`  - Skipping ${invite.email}: User already exists`);
      skippedCount++;
      continue;
    }

    // Create a new user with pending status
    await prisma.user.create({
      data: {
        email: invite.email,
        full_name: invite.email.split('@')[0], // Temporary name from email
        role: invite.role,
        status: 'pending',
        is_active: false, // Not active until invite accepted
        invite_token: invite.token,
        invite_expires_at: invite.expires_at,
        invited_by_id: invite.invited_by,
      },
    });
    console.log(`  ✓ Migrated invite for ${invite.email}`);
    migratedCount++;
  }

  console.log(`\n✓ Migrated ${migratedCount} invites, skipped ${skippedCount}`);

  // Summary
  const summary = await prisma.user.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  console.log('\n--- User Status Summary ---');
  for (const item of summary) {
    console.log(`  ${item.status}: ${item._count.id} users`);
  }

  console.log('\n✓ Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
