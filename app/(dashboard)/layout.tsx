import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PanelProvider } from '@/components/panels/panel-provider';
import { QueryProvider } from '@/components/providers/query-provider';

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
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <PanelProvider />
      </div>
    </QueryProvider>
  );
}
