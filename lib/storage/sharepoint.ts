/**
 * SharePoint/OneDrive Storage Service
 *
 * Stores files in SharePoint Document Library using Microsoft Graph API.
 * Uses Azure AD App Registration with client credentials flow (app-only auth).
 *
 * Benefits:
 * - Uses existing MS365 Business storage allocation
 * - Built-in versioning
 * - Enterprise-grade security
 * - No additional storage costs
 *
 * Required Environment Variables:
 * - AZURE_TENANT_ID: Azure AD tenant ID
 * - AZURE_CLIENT_ID: App registration client ID
 * - AZURE_CLIENT_SECRET: App registration client secret
 * - SHAREPOINT_SITE_ID: SharePoint site ID (or use site URL to get ID)
 * - SHAREPOINT_DRIVE_ID: Document library drive ID (optional, defaults to root)
 * - SHAREPOINT_BASE_FOLDER: Base folder path (default: 'Paylog')
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import {
  StorageService,
  StorageResult,
  UploadMetadata,
  StorageError,
  StorageErrorType,
} from './interface';

// ============================================================================
// TYPES
// ============================================================================

interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteId: string;
  driveId?: string;
  baseFolder: string;
}

interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  file?: {
    mimeType: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

// ============================================================================
// SHAREPOINT STORAGE SERVICE
// ============================================================================

export class SharePointStorageService implements StorageService {
  private client: Client;
  private config: SharePointConfig;
  private driveEndpoint: string;

  constructor(config: SharePointConfig) {
    this.config = config;

    // Create Azure AD credential
    const credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    // Create auth provider for Graph client
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    // Initialize Graph client
    this.client = Client.initWithMiddleware({
      authProvider,
    });

    // Set drive endpoint (site drive or specific drive)
    this.driveEndpoint = config.driveId
      ? `/drives/${config.driveId}`
      : `/sites/${config.siteId}/drive`;
  }

  /**
   * Upload a file to SharePoint
   */
  async upload(
    file: Buffer,
    fileName: string,
    metadata: UploadMetadata
  ): Promise<StorageResult> {
    try {
      // Build folder path: Paylog/Invoices/{year}/{month}/{invoiceId}
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const folderPath = `${this.config.baseFolder}/Invoices/${year}/${month}/${metadata.invoiceId}`;
      const fullPath = `${folderPath}/${fileName}`;

      // Ensure folder structure exists
      await this.ensureFolderPath(folderPath);

      // Upload file
      // For files > 4MB, use upload session; for smaller files, use simple upload
      const MAX_SIMPLE_UPLOAD_SIZE = 4 * 1024 * 1024; // 4MB

      let driveItem: DriveItem;

      if (file.length > MAX_SIMPLE_UPLOAD_SIZE) {
        driveItem = await this.uploadLargeFile(file, fullPath);
      } else {
        driveItem = await this.uploadSmallFile(file, fullPath);
      }

      return {
        success: true,
        path: fullPath,
        size: driveItem.size,
      };
    } catch (error) {
      console.error('[SharePoint] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Download a file from SharePoint
   */
  async download(path: string): Promise<Buffer> {
    try {
      // Get file content using Graph API with responseType blob
      const response = await this.client
        .api(`${this.driveEndpoint}/root:/${path}:/content`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .responseType('arraybuffer' as any)
        .get();

      // Response is already a Buffer or ArrayBuffer
      if (response instanceof ArrayBuffer) {
        return Buffer.from(response);
      }
      if (Buffer.isBuffer(response)) {
        return response;
      }

      // If response is a ReadableStream (Node.js)
      if (response && typeof response.pipe === 'function') {
        return await this.streamToBuffer(response);
      }

      // Try to convert if it's a Blob-like object
      if (response && typeof response.arrayBuffer === 'function') {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // Last resort: if it's an object with data property (some SDK versions)
      if (response && response.data) {
        if (Buffer.isBuffer(response.data)) {
          return response.data;
        }
        if (response.data instanceof ArrayBuffer) {
          return Buffer.from(response.data);
        }
      }

      throw new Error(`Unexpected response type from Graph API: ${typeof response}`);
    } catch (error) {
      console.error('[SharePoint] Download error:', error);
      throw new StorageError(
        StorageErrorType.DOWNLOAD_FAILED,
        `Failed to download file: ${path}`,
        error
      );
    }
  }

  /**
   * Delete a file from SharePoint
   */
  async delete(path: string): Promise<void> {
    try {
      await this.client.api(`${this.driveEndpoint}/root:/${path}`).delete();
    } catch (error: unknown) {
      // Ignore 404 errors (file already deleted)
      if (this.isNotFoundError(error)) {
        return;
      }
      console.error('[SharePoint] Delete error:', error);
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        `Failed to delete file: ${path}`,
        error
      );
    }
  }

  /**
   * Check if a file exists in SharePoint
   */
  async exists(path: string): Promise<boolean> {
    try {
      await this.client.api(`${this.driveEndpoint}/root:/${path}`).get();
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get a shareable URL for the file
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPublicUrl(path: string): string | undefined {
    // SharePoint files aren't publicly accessible by default
    // Return undefined - files should be served through our API
    // which handles authentication
    return undefined;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Upload small file (< 4MB) using simple PUT
   */
  private async uploadSmallFile(file: Buffer, path: string): Promise<DriveItem> {
    const response = await this.client
      .api(`${this.driveEndpoint}/root:/${path}:/content`)
      .put(file);

    return response as DriveItem;
  }

  /**
   * Upload large file (> 4MB) using upload session
   */
  private async uploadLargeFile(file: Buffer, path: string): Promise<DriveItem> {
    // Create upload session
    const uploadSession = await this.client
      .api(`${this.driveEndpoint}/root:/${path}:/createUploadSession`)
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'replace',
        },
      });

    const uploadUrl = uploadSession.uploadUrl;
    const fileSize = file.length;
    const chunkSize = 320 * 1024 * 10; // 3.2MB chunks (must be multiple of 320KB)

    let offset = 0;
    let driveItem: DriveItem | null = null;

    while (offset < fileSize) {
      const end = Math.min(offset + chunkSize, fileSize);
      const chunk = file.slice(offset, end);
      const contentRange = `bytes ${offset}-${end - 1}/${fileSize}`;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.length.toString(),
          'Content-Range': contentRange,
        },
        body: chunk,
      });

      if (!response.ok) {
        throw new Error(`Upload chunk failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Last chunk returns the completed item
      if (result.id) {
        driveItem = result as DriveItem;
      }

      offset = end;
    }

    if (!driveItem) {
      throw new Error('Upload completed but no item returned');
    }

    return driveItem;
  }

  /**
   * Ensure folder path exists, creating folders as needed
   */
  private async ensureFolderPath(folderPath: string): Promise<void> {
    const parts = folderPath.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      try {
        await this.client.api(`${this.driveEndpoint}/root:/${currentPath}`).get();
      } catch (error) {
        if (this.isNotFoundError(error)) {
          // Create folder
          const parentPath = currentPath.includes('/')
            ? currentPath.substring(0, currentPath.lastIndexOf('/'))
            : '';

          const parentEndpoint = parentPath
            ? `${this.driveEndpoint}/root:/${parentPath}:/children`
            : `${this.driveEndpoint}/root/children`;

          await this.client.api(parentEndpoint).post({
            name: part,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          });
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Convert readable stream to buffer
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Check if error is a 404 Not Found error
   */
  private isNotFoundError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode === 404;
    }
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: string }).code === 'itemNotFound';
    }
    return false;
  }
}

// ============================================================================
// FACTORY HELPER
// ============================================================================

/**
 * Create SharePoint storage service from environment variables
 */
export function createSharePointStorage(): SharePointStorageService {
  const config: SharePointConfig = {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    siteId: process.env.SHAREPOINT_SITE_ID || '',
    driveId: process.env.SHAREPOINT_DRIVE_ID,
    baseFolder: process.env.SHAREPOINT_BASE_FOLDER || 'Paylog',
  };

  // Validate required config
  const missing: string[] = [];
  if (!config.tenantId) missing.push('AZURE_TENANT_ID');
  if (!config.clientId) missing.push('AZURE_CLIENT_ID');
  if (!config.clientSecret) missing.push('AZURE_CLIENT_SECRET');
  if (!config.siteId) missing.push('SHAREPOINT_SITE_ID');

  if (missing.length > 0) {
    throw new Error(
      `SharePoint storage requires the following environment variables: ${missing.join(', ')}`
    );
  }

  return new SharePointStorageService(config);
}
