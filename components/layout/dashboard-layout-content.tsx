'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useUIVersionContext } from '@/components/providers/ui-version-provider';
import { LayoutWrapperV2 } from '@/components/layout-v2/layout-wrapper';
import { PanelProvider } from '@/components/panels/panel-provider';

interface DashboardLayoutContentProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function DashboardLayoutContent({ children, user }: DashboardLayoutContentProps) {
  const { version } = useUIVersionContext();

  if (version === 'v2') {
    return (
      <>
        <LayoutWrapperV2 user={user}>{children}</LayoutWrapperV2>
        <PanelProvider />
      </>
    );
  }

  // Return existing v1 layout
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
