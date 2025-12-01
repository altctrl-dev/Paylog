'use client';

/**
 * Modern Theme Layout Wrapper (v3)
 *
 * Main layout structure:
 * - Sidebar (256px expanded / 64px collapsed)
 * - Main content area with sticky navbar
 * - Passes badge counts to sidebar
 * - Handles command palette state
 */

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { GlobalSearch } from '@/components/layout-v2/global-search';
import { getCachedSidebarBadgeCounts } from '@/app/actions/dashboard';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface LayoutWrapperProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

// ============================================================================
// Component
// ============================================================================

export function LayoutWrapper({ children, user }: LayoutWrapperProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [badgeCounts, setBadgeCounts] = React.useState<Record<string, number>>({});
  const { getCurrentSidebarCollapsed } = useUIVersion();
  const isCollapsed = getCurrentSidebarCollapsed();

  // Fetch badge counts on mount and refresh periodically
  React.useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        const result = await getCachedSidebarBadgeCounts();
        if (result.success && result.data) {
          setBadgeCounts({
            '/invoices': result.data.invoiceCount,
          });
        }
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <Sidebar userRole={user?.role} badgeCounts={badgeCounts} />

      {/* Main Content Area - offset by sidebar width */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out',
          // Desktop: offset by sidebar width
          'md:ml-64',
          isCollapsed && 'md:ml-16'
        )}
      >
        {/* Sticky Navbar */}
        <Navbar
          user={user}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Command Palette (Global Search) */}
      <GlobalSearch
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
}

export default LayoutWrapper;
