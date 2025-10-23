/**
 * API Route: GET /api/admin/currencies
 *
 * Fetches all currencies (no pagination needed - only 50 records).
 * Accessible to all authenticated users.
 *
 * Created as part of Sprint 9A Phase 5-8.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currencies = await db.currency.findMany({
      orderBy: [
        { is_active: 'desc' }, // Active currencies first
        { code: 'asc' },       // Then alphabetical by code
      ],
    });

    return NextResponse.json({
      success: true,
      data: currencies,
    });
  } catch (error) {
    console.error('GET /api/admin/currencies error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch currencies',
      },
      { status: 500 }
    );
  }
}
