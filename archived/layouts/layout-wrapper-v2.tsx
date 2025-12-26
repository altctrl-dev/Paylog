'use client';

import React from 'react';
import { SidebarV2 } from './sidebar-v2';
import { HeaderV2 } from './header-v2';
import { useUIVersion } from '@/lib/stores/ui-version-store';

interface LayoutWrapperProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function LayoutWrapperV2({ children, user }: LayoutWrapperProps) {
  const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIVersion();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <SidebarV2 />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Navbar */}
          <HeaderV2 sidebarCollapsed={sidebarCollapsed} user={user} />

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
