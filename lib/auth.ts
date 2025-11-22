import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { z } from 'zod';
import { verifyPassword } from '@/lib/crypto';
import { loginRateLimiter } from '@/lib/rate-limit';

// Validate required environment variables (server-side only)
// This check should not run in client-side contexts
if (typeof window === 'undefined') {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error(
      'NEXTAUTH_SECRET is not set. Please add it to your environment variables.\n' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
    console.warn(
      'Warning: NEXTAUTH_URL is not set in production. This may cause issues with authentication.'
    );
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Trust Railway proxy headers
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const { email, password } = loginSchema.parse(credentials);

        // Rate limiting: 5 login attempts per minute per email
        const rateLimitResult = await loginRateLimiter.check(email, 5);
        if (!rateLimitResult.success) {
          throw new Error(
            `Too many login attempts. Please try again in ${Math.ceil((rateLimitResult.reset - Date.now()) / 1000)} seconds.`
          );
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password_hash) return null;

        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) return null;

        if (!user.is_active) throw new Error('Account is deactivated');

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.full_name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
});

// ============================================================================
// Permission Helper Functions (Sprint 11)
// ============================================================================

import type { UserRole } from '@/lib/types/user-management';

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'super_admin';
}

/**
 * Check if the current user is an admin or super admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
}

/**
 * Require super admin role or throw error
 */
export async function requireSuperAdmin(): Promise<void> {
  const isSuperAdminUser = await isSuperAdmin();
  if (!isSuperAdminUser) {
    throw new Error('Unauthorized: Super admin access required');
  }
}

/**
 * Require admin role (admin or super_admin) or throw error
 */
export async function requireAdmin(): Promise<void> {
  const isAdminUser = await isAdmin();
  if (!isAdminUser) {
    throw new Error('Unauthorized: Admin access required');
  }
}

/**
 * Get the current user's ID from session
 */
export async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  return session?.user?.id ? parseInt(session.user.id, 10) : null;
}

/**
 * Get the current user's role from session
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await auth();
  return (session?.user?.role as UserRole) || null;
}

/**
 * Check if a user ID is the last super admin
 * @param userId - User ID to check
 * @returns true if this is the last super admin
 */
export async function isLastSuperAdmin(userId: number): Promise<boolean> {
  const superAdminCount = await db.user.count({
    where: {
      role: 'super_admin',
      is_active: true,
    },
  });

  if (superAdminCount !== 1) {
    return false;
  }

  // Check if the single super admin is this user
  const superAdmin = await db.user.findFirst({
    where: {
      role: 'super_admin',
      is_active: true,
    },
  });

  return superAdmin?.id === userId;
}
