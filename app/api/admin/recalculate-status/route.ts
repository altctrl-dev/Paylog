/**
 * API Route: Recalculate Invoice Status
 *
 * POST /api/admin/recalculate-status
 * Body: { invoiceId: number }
 *
 * Recalculates and updates the invoice status based on actual payments and TDS.
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { recalculateInvoiceStatus } from '@/app/actions/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId || typeof invoiceId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid invoiceId' },
        { status: 400 }
      );
    }

    const result = await recalculateInvoiceStatus(invoiceId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('recalculate-status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
