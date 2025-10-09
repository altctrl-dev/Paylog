import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage users, roles, and permissions.
        </p>
      </div>
    </div>
  );
}
