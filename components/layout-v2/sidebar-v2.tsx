'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import {
  Home,
  FileText,
  BarChart3,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCachedSidebarBadgeCounts } from '@/app/actions/dashboard';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badgeKey?: 'invoiceCount';
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Invoices', href: '/invoices', badgeKey: 'invoiceCount' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Shield, label: 'Admin', href: '/admin' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function SidebarV2() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIVersion();
  const pathname = usePathname();
  const [badgeCounts, setBadgeCounts] = useState<{ invoiceCount: number }>({
    invoiceCount: 0,
  });

  // Fetch badge counts on mount and refresh every 60 seconds
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        const result = await getCachedSidebarBadgeCounts();
        if (result.success && result.data) {
          setBadgeCounts(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      }
    };

    // Initial fetch
    fetchBadgeCounts();

    // Refresh every 60 seconds
    const interval = setInterval(fetchBadgeCounts, 60000);

    return () => clearInterval(interval);
  }, []);

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  return (
    <motion.aside
      initial={false}
      animate={{
        // Desktop: animate width based on collapsed state
        // Mobile: always full width (240px)
        width: sidebarCollapsed ? 60 : 240,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-card",
        // Desktop: normal inline sidebar
        "hidden md:flex",
        // Mobile: fixed overlay sidebar
        "md:relative md:translate-x-0",
        mobileMenuOpen ? "flex fixed left-0 top-0 z-50 w-60 translate-x-0" : "md:flex translate-x-[-100%]"
      )}
      style={{
        // Mobile: override motion width, use transform for slide animation
        ...(typeof window !== 'undefined' && window.innerWidth < 768 ? {
          width: 240,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease-in-out'
        } : {})
      }}
    >
      {/* Logo Area with Toggle - ALWAYS show */}
      <div className="flex h-16 items-center border-b border-border px-3 overflow-hidden">
        {/* Toggle Button - fixed position on left */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Logo text - animates in/out smoothly */}
        <motion.span
          initial={false}
          animate={{
            opacity: sidebarCollapsed ? 0 : 1,
            width: sidebarCollapsed ? 0 : 'auto',
            marginLeft: sidebarCollapsed ? 0 : 8,
          }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="text-xl font-bold whitespace-nowrap overflow-hidden"
        >
          PAYLOG
        </motion.span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
          // On mobile, always show full width; on desktop, respect sidebarCollapsed
          const isCollapsedDesktop = sidebarCollapsed && !mobileMenuOpen;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg py-2 text-sm transition-colors relative overflow-hidden',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                // Use consistent padding - icons will stay centered via fixed width container
                'px-3'
              )}
              title={isCollapsedDesktop ? item.label : undefined}
            >
              {/* Fixed-width icon container for smooth transitions */}
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon className="h-5 w-5" />
                {/* Badge for collapsed sidebar - positioned on icon */}
                {isCollapsedDesktop && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              {/* Text and badge container with smooth opacity/width transition */}
              <motion.div
                initial={false}
                animate={{
                  opacity: isCollapsedDesktop ? 0 : 1,
                  width: isCollapsedDesktop ? 0 : 'auto',
                  marginLeft: isCollapsedDesktop ? 0 : 12,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="flex items-center overflow-hidden whitespace-nowrap"
              >
                <span className="flex-1">{item.label}</span>
                {/* Badge for expanded sidebar - positioned at end */}
                {badgeCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border p-2 space-y-1">
        {/* AI Assistant */}
        <button
          className="w-full flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground overflow-hidden"
          title={sidebarCollapsed && !mobileMenuOpen ? 'AI Assistant' : undefined}
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <motion.div
            initial={false}
            animate={{
              opacity: sidebarCollapsed && !mobileMenuOpen ? 0 : 1,
              width: sidebarCollapsed && !mobileMenuOpen ? 0 : 'auto',
              marginLeft: sidebarCollapsed && !mobileMenuOpen ? 0 : 12,
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="flex-1 text-left overflow-hidden whitespace-nowrap"
          >
            <div className="font-medium">AI Assistant</div>
            <div className="text-xs text-muted-foreground">
              Ask me anything about your invoices
            </div>
          </motion.div>
        </button>

        {/* Help & Support */}
        <button
          className="w-full flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground overflow-hidden"
          title={sidebarCollapsed && !mobileMenuOpen ? 'Help & Support' : undefined}
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <HelpCircle className="h-5 w-5" />
          </div>
          <motion.span
            initial={false}
            animate={{
              opacity: sidebarCollapsed && !mobileMenuOpen ? 0 : 1,
              width: sidebarCollapsed && !mobileMenuOpen ? 0 : 'auto',
              marginLeft: sidebarCollapsed && !mobileMenuOpen ? 0 : 12,
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="flex-1 text-left overflow-hidden whitespace-nowrap"
          >
            Help & Support
          </motion.span>
        </button>
      </div>
    </motion.aside>
  );
}
