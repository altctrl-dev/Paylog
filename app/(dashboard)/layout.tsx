import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { QueryProvider } from '@/components/providers/query-provider';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <QueryProvider>
      <DashboardShell user={session.user}>{children}</DashboardShell>
    </QueryProvider>
  );
}
