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
import { GlobalSearch } from './global-search';
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

  // Prevent hydration mismatch by using default state until mounted
  const [mounted, setMounted] = React.useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Enable transitions after a brief delay to prevent initial flash animation
    const timer = setTimeout(() => setTransitionsEnabled(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Use false (expanded) during SSR, then switch to actual state after hydration
  const isCollapsed = mounted ? getCurrentSidebarCollapsed() : false;

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
    <div
      data-layout-wrapper
      className={cn("min-h-screen bg-background", mounted && "hydrated")}
    >
      {/* Fixed Sidebar */}
      <Sidebar userRole={user?.role} badgeCounts={badgeCounts} />

      {/* Main Content Area - offset by sidebar width */}
      {/* Pass isCollapsed to Navbar for consistent state */}
      <div
        data-main-content
        className={cn(
          'flex flex-col min-h-screen',
          // Only enable transitions after initial mount to prevent flash
          transitionsEnabled && 'transition-[margin] duration-300 ease-in-out',
          // Desktop: offset by sidebar width
          'md:ml-60',
          isCollapsed && 'md:ml-16'
        )}
      >
        {/* Sticky Navbar - pass isCollapsed for consistent state */}
        <Navbar
          user={user}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          isCollapsed={isCollapsed}
        />

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className={cn(
            "mx-auto",
            transitionsEnabled && "transition-[max-width] duration-300",
            isCollapsed ? "max-w-[1500px]" : "max-w-[1350px]"
          )}>
            {children}
          </div>
        </main>
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
