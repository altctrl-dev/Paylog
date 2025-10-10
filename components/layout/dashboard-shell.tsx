'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PanelProvider } from '@/components/panels/panel-provider';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1280px)');
    setCollapsed(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setCollapsed(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        user={user}
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <main className="flex-1 overflow-y-auto border-l border-sidebar-border bg-surface/85 px-6 pb-10 pt-12 md:pt-12">
          <div
            className={cn(
              'w-full transition-all duration-200',
              collapsed ? 'ml-auto max-w-none' : 'mx-auto max-w-6xl'
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <PanelProvider />
    </div>
  );
}
