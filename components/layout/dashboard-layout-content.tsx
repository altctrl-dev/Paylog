'use client';

/**
 * Dashboard Layout Content
 *
 * Now always uses Modern (v3) layout.
 * Legacy v1/v2 layouts archived Dec 2024.
 */

import React from 'react';
import { LayoutWrapper } from '@/components/v3/layout';
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
  return (
    <>
      <LayoutWrapper user={user}>{children}</LayoutWrapper>
      <PanelProvider />
    </>
  );
}
