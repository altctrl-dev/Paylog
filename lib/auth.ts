import 'server-only';

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { z } from 'zod';
import { verifyPassword } from '@/lib/crypto';

// Validate required environment variables
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
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
