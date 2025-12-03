/**
 * Invoice Attachment API Route
 *
 * Secure file serving endpoint with:
 * - Authentication verification
 * - Authorization checks (invoice access)
 * - Content-Type headers
 * - Cache-Control headers
 * - Range request support (for large files/videos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createStorageService } from '@/lib/storage/factory';
import { StorageError, StorageErrorType } from '@/lib/storage/interface';

// ============================================================================
// GET /api/attachments/[id]
// ============================================================================

/**
 * GET endpoint to serve attachment files
 *
 * Security:
 * - Requires authentication
 * - Checks user has access to invoice
 * - Validates attachment exists and is not soft-deleted
 *
 * Headers:
 * - Content-Type: File MIME type
 * - Content-Disposition: inline (display in browser)
 * - Content-Length: File size
 * - Cache-Control: Private cache, 1 hour
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    // 2. Get attachment from database
    const attachment = await db.invoiceAttachment.findUnique({
      where: { id: params.id },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            created_by: true,
            is_hidden: true,
          },
        },
        uploader: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // 3. Validate attachment exists and is not deleted
    if (!attachment || attachment.deleted_at) {
      return new NextResponse('Attachment not found', { status: 404 });
    }

    // 4. Check authorization (user can access invoice)
    // For now, we allow access if:
    // - User created the invoice
    // - User uploaded the attachment
    // - User is admin/super_admin
    // - Invoice is not hidden
    //
    // TODO: Expand this based on invoice profile visibility rules
    const isCreator = attachment.invoice.created_by === userId;
    const isUploader = attachment.uploaded_by === userId;
    const isAdmin = ['admin', 'super_admin'].includes(session.user.role || '');
    const isHidden = attachment.invoice.is_hidden;

    if (!isCreator && !isUploader && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Hidden invoices - only creator/uploader/admin can access
    if (isHidden && !isCreator && !isUploader && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 5. Get file from storage
    const storage = createStorageService();
    let fileBuffer: Buffer;

    try {
      fileBuffer = await storage.download(attachment.storage_path);
    } catch (error) {
      console.error('[Attachments API] Storage error:', error);

      if (error instanceof StorageError) {
        if (error.type === StorageErrorType.FILE_NOT_FOUND) {
          return new NextResponse('File not found in storage', { status: 404 });
        }
        if (error.type === StorageErrorType.PERMISSION_DENIED) {
          return new NextResponse('Storage permission denied', { status: 500 });
        }
      }

      return new NextResponse('Failed to retrieve file', { status: 500 });
    }

    // 6. Handle Range requests (for partial content)
    const range = request.headers.get('range');
    if (range) {
      return handleRangeRequest(fileBuffer, range, attachment.mime_type);
    }

    // 7. Check if download is requested (vs inline viewing)
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';

    // 8. Return file with proper headers
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(
          attachment.original_name
        )}"`,
        'Content-Length': attachment.file_size.toString(),
        'Cache-Control': 'private, max-age=3600', // 1 hour cache
        'X-Content-Type-Options': 'nosniff', // Security header
        'X-Frame-Options': 'SAMEORIGIN', // Prevent embedding in iframes
      },
    });
  } catch (error) {
    console.error('[Attachments API] Unexpected error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// ============================================================================
// RANGE REQUEST HANDLER
// ============================================================================

/**
 * Handle HTTP Range requests (for partial content)
 *
 * Used for:
 * - Large files
 * - Video streaming
 * - Resume downloads
 *
 * Example Range header: "bytes=0-1023" (first 1024 bytes)
 *
 * @param fileBuffer - Complete file buffer
 * @param rangeHeader - Range header value
 * @param mimeType - File MIME type
 * @returns NextResponse with partial content
 */
function handleRangeRequest(
  fileBuffer: Buffer,
  rangeHeader: string,
  mimeType: string
): NextResponse {
  const fileSize = fileBuffer.length;

  // Parse range header (format: "bytes=start-end")
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!rangeMatch) {
    return new NextResponse('Invalid Range header', { status: 416 });
  }

  const start = parseInt(rangeMatch[1], 10);
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;

  // Validate range
  if (start >= fileSize || end >= fileSize || start > end) {
    return new NextResponse('Range Not Satisfiable', {
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });
  }

  // Extract requested range
  const chunk = fileBuffer.subarray(start, end + 1);
  const chunkSize = chunk.length;

  // Return 206 Partial Content
  return new NextResponse(chunk as unknown as BodyInit, {
    status: 206,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': chunkSize.toString(),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// ============================================================================
// DELETE /api/attachments/[id]
// ============================================================================

/**
 * DELETE endpoint to soft-delete an attachment
 *
 * Note: This performs a soft delete (sets deleted_at timestamp).
 * Physical file deletion happens via a background job or admin action.
 *
 * Authorization:
 * - User must be the uploader, invoice creator, or admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    // 2. Get attachment
    const attachment = await db.invoiceAttachment.findUnique({
      where: { id: params.id },
      include: {
        invoice: {
          select: {
            id: true,
            created_by: true,
          },
        },
      },
    });

    if (!attachment || attachment.deleted_at) {
      return new NextResponse('Attachment not found', { status: 404 });
    }

    // 3. Check authorization
    const isUploader = attachment.uploaded_by === userId;
    const isCreator = attachment.invoice.created_by === userId;
    const isAdmin = ['admin', 'super_admin'].includes(session.user.role || '');

    if (!isUploader && !isCreator && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 4. Soft delete attachment
    await db.invoiceAttachment.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    // 5. Return success
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Attachments API] Delete error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
