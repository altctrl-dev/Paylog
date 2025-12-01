'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useUIVersionContext } from '@/components/providers/ui-version-provider';
import { LayoutWrapperV2 } from '@/components/layout-v2/layout-wrapper';
import { LayoutWrapper as LayoutWrapperV3 } from '@/components/v3/layout';
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

  // Modern theme (v3)
  if (version === 'v3') {
    return (
      <>
        <LayoutWrapperV3 user={user}>{children}</LayoutWrapperV3>
        <PanelProvider />
      </>
    );
  }

  // Classic theme (v2)
  if (version === 'v2') {
    return (
      <>
        <LayoutWrapperV2 user={user}>{children}</LayoutWrapperV2>
        <PanelProvider />
      </>
    );
  }

  // Old theme (v1) - default
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
