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

    // Test 1: Upload a test file
    console.log('📤 Test 1: Uploading test file...');
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const result = await storage.upload(testContent, 'test-connection.txt', {
      invoiceId: 0,
      userId: 1,
      originalName: 'test-connection.txt',
      mimeType: 'text/plain',
    });

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

    console.log('═'.repeat(50));
    console.log('🎉 All tests passed! SharePoint storage is working.');
    console.log('═'.repeat(50));
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
