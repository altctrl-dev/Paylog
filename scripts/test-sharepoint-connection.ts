/**
 * Test SharePoint connection
 *
 * Usage: npx tsx scripts/test-sharepoint-connection.ts
 */

import 'dotenv/config';
import { createSharePointStorage } from '../lib/storage/sharepoint';

async function main() {
  console.log('\n🔗 Testing SharePoint Connection...\n');

  try {
    // Create storage service
    const storage = createSharePointStorage();
    console.log('✅ Storage service created\n');

    // Test 1: Upload a test file (one-time invoice)
    console.log('📤 Test 1: Uploading test file (one-time invoice)...');
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const result = await storage.upload(testContent, 'test-connection.txt', {
      invoiceId: 999,
      userId: 1,
      originalName: 'test-connection.txt',
      mimeType: 'text/plain',
      invoiceDate: new Date(),
      isRecurring: false,
    });
    // Expected path: Invoices/2025/12/one-time/999/test-connection.txt

    if (result.success) {
      console.log(`   ✅ Upload successful!`);
      console.log(`   📁 Path: ${result.path}`);
      console.log(`   📊 Size: ${result.size} bytes\n`);
    } else {
      console.log(`   ❌ Upload failed: ${result.error}\n`);
      process.exit(1);
    }

    // Test 2: Check file exists
    console.log('🔍 Test 2: Checking file exists...');
    const exists = await storage.exists(result.path!);
    console.log(`   ${exists ? '✅ File exists' : '❌ File not found'}\n`);

    // Test 3: Download the file
    console.log('📥 Test 3: Downloading file...');
    const downloaded = await storage.download(result.path!);
    console.log(`   ✅ Downloaded ${downloaded.length} bytes`);
    console.log(`   📄 Content: "${downloaded.toString()}"\n`);

    // Test 4: Delete the file
    console.log('🗑️  Test 4: Deleting test file...');
    await storage.delete(result.path!);
    console.log('   ✅ File deleted\n');

    // Verify deletion
    const existsAfterDelete = await storage.exists(result.path!);
    console.log(`   ${!existsAfterDelete ? '✅ Verified: File no longer exists' : '⚠️ File still exists'}\n`);

    // Test 5: Upload recurring invoice with profile name
    console.log('📤 Test 5: Uploading test file (recurring invoice with profile)...');
    const recurringContent = Buffer.from(`Recurring invoice test at ${new Date().toISOString()}`);
    const recurringResult = await storage.upload(recurringContent, 'recurring-test.txt', {
      invoiceId: 888,
      userId: 1,
      originalName: 'recurring-test.txt',
      mimeType: 'text/plain',
      invoiceDate: new Date(),
      isRecurring: true,
      profileName: 'Monthly Rent',
    });
    // Expected path: Invoices/2025/12/recurring/Monthly Rent/888/recurring-test.txt

    if (recurringResult.success) {
      console.log(`   ✅ Upload successful!`);
      console.log(`   📁 Path: ${recurringResult.path}`);
      console.log(`   📊 Size: ${recurringResult.size} bytes\n`);

      // Clean up
      console.log('🗑️  Cleaning up recurring test file...');
      await storage.delete(recurringResult.path!);
      console.log('   ✅ File deleted\n');
    } else {
      console.log(`   ❌ Upload failed: ${recurringResult.error}\n`);
    }

    console.log('═'.repeat(50));
    console.log('🎉 All tests passed! SharePoint storage is working.');
    console.log('═'.repeat(50));
    console.log('\nFolder structure:');
    console.log('  - One-time: {baseFolder}/{year}/{month}/one-time/{invoiceId}/');
    console.log('  - Recurring: {baseFolder}/{year}/{month}/recurring/{profileName}/{invoiceId}/');
    console.log('\nYou can now use STORAGE_PROVIDER=sharepoint in production.\n');

  } catch (error) {
    console.error('\n❌ Connection test failed:\n');
    console.error(error);

    if (error instanceof Error && error.message.includes('unauthorized')) {
      console.error('\n⚠️  Authentication failed. Please check:');
      console.error('   1. AZURE_CLIENT_SECRET is the secret VALUE (not the ID)');
      console.error('   2. The secret has not expired');
      console.error('   3. Admin consent has been granted for API permissions');
    }

    process.exit(1);
  }
}

main();
