/**
 * Healthcheck API Route
 *
 * Returns deployment status and environment variable configuration
 * (without exposing sensitive values)
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    config: {
      nextauthSecretConfigured: !!process.env.NEXTAUTH_SECRET,
      nextauthUrlConfigured: !!process.env.NEXTAUTH_URL,
      nextauthUrl: process.env.NEXTAUTH_URL || 'not set',
      databaseUrlConfigured: !!process.env.DATABASE_URL,
    },
  };

  return NextResponse.json(healthcheck);
}
