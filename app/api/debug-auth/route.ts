import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcryptjs from 'bcryptjs';

/**
 * Debug endpoint to test authentication flow
 * DELETE THIS FILE AFTER DEBUGGING
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        email,
      });
    }

    if (!user.password_hash) {
      return NextResponse.json({
        success: false,
        error: 'No password hash',
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          is_active: user.is_active,
        },
      });
    }

    // Test password
    const isValid = await bcryptjs.compare(password, user.password_hash);

    return NextResponse.json({
      success: isValid,
      message: isValid ? 'Password is correct' : 'Password is incorrect',
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        hash_prefix: user.password_hash.substring(0, 20),
      },
      password_length: password.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
