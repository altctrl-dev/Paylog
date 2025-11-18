import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { QueryProvider } from '@/components/providers/query-provider';
import { UIVersionProvider } from '@/components/providers/ui-version-provider';
import { DashboardLayoutContent } from '@/components/layout/dashboard-layout-content';

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
      <UIVersionProvider>
        <DashboardLayoutContent user={session.user}>
          {children}
        </DashboardLayoutContent>
      </UIVersionProvider>
    </QueryProvider>
  );
}
