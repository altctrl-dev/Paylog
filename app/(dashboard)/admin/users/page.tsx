import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listUsers } from '@/lib/actions/user-management';
import { UsersPageClient } from './users-page-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management | PayLog',
  description: 'Manage users, roles, and permissions',
};

/**
 * Users Management Page (Server Component)
 * Sprint 11 Phase 3 Sub-Phase 6: Admin Users Page
 *
 * Purpose:
 * - Route protection: Super admin only
 * - Server-side data fetching for initial load
 * - Delegates interactive UI to client component
 *
 * Security:
 * - Redirects to /forbidden if not super admin
 * - All data fetching happens server-side with proper auth
 */
export default async function UsersPage() {
  // 1. Route Protection: Super admin only
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/forbidden');
  }

  // 2. Fetch initial users data
  const result = await listUsers({
    page: 1,
    pageSize: 50,
  });

  // 3. Handle error state (shouldn't happen with super admin)
  if (!result.success) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Error Loading Users</h2>
          <p className="text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  // 4. Pass data to client component
  return <UsersPageClient initialUsers={result.data.users} />;
}
