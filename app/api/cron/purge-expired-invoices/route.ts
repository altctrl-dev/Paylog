/**
 * CRON Endpoint: Purge Expired Deleted Invoices
 *
 * This endpoint is called by a scheduled job (e.g., Vercel Cron, Railway Cron)
 * to permanently delete invoices that have exceeded their 30-day recovery window.
 *
 * Security: Protected by CRON_SECRET environment variable
 * Schedule: Recommended to run daily at midnight
 *
 * Example cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/purge-expired-invoices",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 100; // Process invoices in batches to avoid timeouts

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Validate CRON secret from request headers
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, reject all requests
  if (!cronSecret) {
    console.warn('[CRON] CRON_SECRET not configured - rejecting request');
    return false;
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === cronSecret) {
      return true;
    }
  }

  // Check x-cron-secret header (alternative)
  const cronHeader = request.headers.get('x-cron-secret');
  if (cronHeader === cronSecret) {
    return true;
  }

  return false;
}

// ============================================================================
// INTERNAL PURGE FUNCTION
// ============================================================================

/**
 * Permanently delete an invoice and all related records
 * This is an internal function that bypasses user authentication checks
 * Used only by the CRON job after proper authorization
 */
async function purgeInvoiceInternal(invoiceId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the invoice exists and is soft-deleted
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoice_number: true,
        deleted_at: true,
        recovery_deadline: true,
      },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (!invoice.deleted_at) {
      return { success: false, error: 'Invoice is not soft-deleted' };
    }

    // Delete related records in correct order (respecting foreign keys)
    // 1. Delete activity logs
    await db.activityLog.deleteMany({
      where: { invoice_id: invoiceId },
    });

    // 2. Delete comments
    await db.invoiceComment.deleteMany({
      where: { invoice_id: invoiceId },
    });

    // 3. Delete attachments
    await db.invoiceAttachment.deleteMany({
      where: { invoice_id: invoiceId },
    });

    // 4. Delete payments
    await db.payment.deleteMany({
      where: { invoice_id: invoiceId },
    });

    // 5. Delete the invoice itself
    await db.invoice.delete({
      where: { id: invoiceId },
    });

    return { success: true };
  } catch (error) {
    console.error(`[CRON] Error purging invoice ${invoiceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Validate CRON secret
  if (!validateCronSecret(request)) {
    console.warn('[CRON] Unauthorized purge attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[CRON] Starting expired invoice purge job');

  try {
    // Find all invoices with expired recovery deadlines
    const expiredInvoices = await db.invoice.findMany({
      where: {
        deleted_at: { not: null },
        recovery_deadline: { lt: new Date() },
      },
      select: {
        id: true,
        invoice_number: true,
        deleted_at: true,
        recovery_deadline: true,
      },
      take: BATCH_SIZE,
      orderBy: { recovery_deadline: 'asc' }, // Purge oldest first
    });

    if (expiredInvoices.length === 0) {
      console.log('[CRON] No expired invoices to purge');
      return NextResponse.json({
        success: true,
        message: 'No expired invoices to purge',
        purged: 0,
        failed: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[CRON] Found ${expiredInvoices.length} expired invoices to purge`);

    // Process each invoice
    const results = {
      purged: 0,
      failed: 0,
      errors: [] as { invoice_number: string; error: string }[],
    };

    for (const invoice of expiredInvoices) {
      const result = await purgeInvoiceInternal(invoice.id);

      if (result.success) {
        results.purged++;
        console.log(`[CRON] Purged invoice ${invoice.invoice_number}`);
      } else {
        results.failed++;
        results.errors.push({
          invoice_number: invoice.invoice_number,
          error: result.error || 'Unknown error',
        });
        console.error(`[CRON] Failed to purge invoice ${invoice.invoice_number}: ${result.error}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CRON] Purge job completed: ${results.purged} purged, ${results.failed} failed, ${duration}ms`);

    // Check if there are more invoices to process
    const remainingCount = await db.invoice.count({
      where: {
        deleted_at: { not: null },
        recovery_deadline: { lt: new Date() },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Purged ${results.purged} expired invoices`,
      purged: results.purged,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      remaining: remainingCount > 0 ? remainingCount : undefined,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[CRON] Purge job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different CRON providers
export async function POST(request: NextRequest) {
  return GET(request);
}
