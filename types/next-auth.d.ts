import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
    /** Error from JWT callback when user is deleted/deactivated */
    error?: string;
  }

  interface User {
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    /** Error flag when user is deleted/deactivated */
    error?: string;
  }
}
