/**
 * Helper script to get SharePoint Site ID
 *
 * Usage:
 *   npx tsx scripts/get-sharepoint-site-id.ts
 *
 * Required environment variables:
 *   AZURE_TENANT_ID
 *   AZURE_CLIENT_ID
 *   AZURE_CLIENT_SECRET
 *
 * This script will:
 * 1. List all SharePoint sites you have access to
 * 2. Let you pick one or search by name
 * 3. Output the Site ID to use in SHAREPOINT_SITE_ID
 */

import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import * as readline from 'readline';

// Load environment variables
import 'dotenv/config';

interface Site {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

async function main() {
  console.log('\n🔍 SharePoint Site ID Finder\n');

  // Check required env vars
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.error('❌ Missing required environment variables:');
    if (!tenantId) console.error('   - AZURE_TENANT_ID');
    if (!clientId) console.error('   - AZURE_CLIENT_ID');
    if (!clientSecret) console.error('   - AZURE_CLIENT_SECRET');
    console.error('\nPlease set these in your .env file and try again.');
    process.exit(1);
  }

  console.log('✅ Azure credentials found\n');

  // Create Graph client
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });
  const client = Client.initWithMiddleware({ authProvider });

  try {
    // Option 1: Search by site name
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const searchTerm = await new Promise<string>((resolve) => {
      rl.question('Enter SharePoint site name to search (or press Enter to list all): ', resolve);
    });

    let sites: Site[] = [];

    if (searchTerm.trim()) {
      // Search for specific site
      console.log(`\n🔎 Searching for sites matching "${searchTerm}"...\n`);
      const response = await client
        .api('/sites')
        .query({ search: searchTerm })
        .select('id,name,displayName,webUrl')
        .get();
      sites = response.value;
    } else {
      // List all sites (root site + search for common names)
      console.log('\n📋 Fetching SharePoint sites...\n');

      // Get root site
      try {
        const rootSite = await client
          .api('/sites/root')
          .select('id,name,displayName,webUrl')
          .get();
        sites.push(rootSite);
      } catch {
        // Root site might not be accessible
      }

      // Search for all sites
      const response = await client
        .api('/sites')
        .query({ search: '*' })
        .select('id,name,displayName,webUrl')
        .top(50)
        .get();

      // Merge and dedupe
      for (const site of response.value) {
        if (!sites.find(s => s.id === site.id)) {
          sites.push(site);
        }
      }
    }

    if (sites.length === 0) {
      console.log('❌ No SharePoint sites found.');
      console.log('\nPossible reasons:');
      console.log('   - The app registration needs Sites.Read.All permission');
      console.log('   - Admin consent may not have been granted');
      console.log('   - No SharePoint sites exist in your tenant');
      rl.close();
      process.exit(1);
    }

    console.log(`Found ${sites.length} site(s):\n`);
    console.log('─'.repeat(80));

    sites.forEach((site, index) => {
      console.log(`\n[${index + 1}] ${site.displayName || site.name}`);
      console.log(`    URL: ${site.webUrl}`);
      console.log(`    ID:  ${site.id}`);
    });

    console.log('\n' + '─'.repeat(80));

    if (sites.length === 1) {
      console.log('\n✅ Use this Site ID in your .env file:\n');
      console.log(`   SHAREPOINT_SITE_ID=${sites[0].id}\n`);
    } else {
      const selection = await new Promise<string>((resolve) => {
        rl.question(`\nEnter number to select site (1-${sites.length}): `, resolve);
      });

      const index = parseInt(selection, 10) - 1;
      if (index >= 0 && index < sites.length) {
        const selected = sites[index];
        console.log(`\n✅ Selected: ${selected.displayName || selected.name}`);
        console.log('\nAdd this to your .env file:\n');
        console.log(`   SHAREPOINT_SITE_ID=${selected.id}\n`);
      } else {
        console.log('\n❌ Invalid selection');
      }
    }

    rl.close();
  } catch (error: unknown) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      if (statusCode === 403) {
        console.error('\n⚠️  Permission denied. Make sure:');
        console.error('   1. The app has Sites.Read.All or Sites.ReadWrite.All permission');
        console.error('   2. Admin consent has been granted');
      }
    }

    process.exit(1);
  }
}

main();
