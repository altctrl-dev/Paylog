'use client';

/**
 * Modern Theme Sidebar (v3)
 *
 * A collapsible sidebar navigation component built with:
 * - Radix UI Tooltip for collapsed state labels
 * - Lucide icons
 * - Tailwind CSS with CSS custom properties
 *
 * Features:
 * - 256px expanded / 64px collapsed widths
 * - Per-nav-item tooltips when collapsed
 * - Badge counts with dot indicators when collapsed
 * - AI Assistant promo card with gradient
 * - Mobile overlay with backdrop
 * - Smooth 300ms transitions
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  BarChart3,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
  adminOnly?: boolean;
}

interface SidebarProps {
  /** User role for filtering admin-only items */
  userRole?: string | null;
  /** Badge counts object keyed by href */
  badgeCounts?: Record<string, number>;
}

// ============================================================================
// Navigation Configuration
// ============================================================================

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Invoices', href: '/invoices' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Shield, label: 'Admin', href: '/admin', adminOnly: true },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

// ============================================================================
// Sub-components
// ============================================================================

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  badgeCount?: number;
}

function NavLink({ item, isActive, isCollapsed, badgeCount }: NavLinkProps) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        // Base styles - always left-aligned, icons stay in place
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
        'transition-all duration-300 ease-in-out',
        'w-full overflow-hidden',
        // Active vs inactive states
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <div className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-5 w-5 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        {/* Badge dot indicator for collapsed state */}
        {badgeCount && badgeCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500',
              'transition-opacity duration-300',
              isCollapsed ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
      </div>

      {/* Label and badge - fade in/out with transition */}
      <span
        className={cn(
          'flex-1 whitespace-nowrap transition-all duration-300',
          isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}
      >
        {item.label}
      </span>
      {badgeCount && badgeCount > 0 && (
        <span
          className={cn(
            'flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500/20 px-1.5 text-xs font-medium text-blue-400',
            'transition-all duration-300',
            isCollapsed ? 'opacity-0 w-0 min-w-0 px-0' : 'opacity-100'
          )}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  );

  // Wrap with tooltip only when collapsed
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={1500}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {badgeCount && badgeCount > 0 && (
            <span className="rounded-full bg-blue-500/20 px-1.5 text-xs text-blue-400">
              {badgeCount}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function AIAssistantCard({ isCollapsed }: { isCollapsed: boolean }) {
  const handleClick = () => {
    toast.info('This feature is work in progress');
  };

  const button = (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left',
        'transition-all duration-300 overflow-hidden',
        'text-purple-400',
        // Background styling - transitions smoothly
        isCollapsed
          ? 'hover:bg-muted'
          : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 hover:from-blue-500/15 hover:to-purple-500/15'
      )}
    >
      <Sparkles className="h-5 w-5 flex-shrink-0" />
      <span
        className={cn(
          'font-medium text-sm whitespace-nowrap transition-all duration-300',
          isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}
      >
        AI Assistant
      </span>
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={1500}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">AI Assistant</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function HelpButton({ isCollapsed }: { isCollapsed: boolean }) {
  const button = (
    <Button
      variant="subtle"
      className={cn(
        'flex items-center gap-3 px-3 py-2 text-sm h-auto',
        'text-muted-foreground w-full justify-start overflow-hidden',
        'transition-all duration-300'
      )}
    >
      <HelpCircle className="h-5 w-5 flex-shrink-0" />
      <span
        className={cn(
          'whitespace-nowrap transition-all duration-300',
          isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}
      >
        Help & Support
      </span>
    </Button>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={1500}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">Help & Support</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ============================================================================
// Main Component
// ============================================================================

export function Sidebar({ userRole, badgeCounts = {} }: SidebarProps) {
  const pathname = usePathname();
  const {
    getCurrentSidebarCollapsed,
    setCurrentSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUIVersion();

  const isCollapsed = getCurrentSidebarCollapsed();

  // Close mobile menu on navigation
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return userRole === 'admin' || userRole === 'super_admin';
    }
    return true;
  });

  const toggleCollapsed = () => {
    setCurrentSidebarCollapsed(!isCollapsed);
  };

  return (
    <TooltipProvider>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-border bg-card',
          'transition-all duration-300 ease-in-out',
          // Desktop: fixed positioning with variable width
          'hidden md:flex fixed left-0 top-0 z-40',
          isCollapsed ? 'w-16' : 'w-64',
          // Mobile: fixed overlay with higher z-index
          mobileMenuOpen && 'flex z-50 w-64'
        )}
      >
        {/* Header: Logo + Collapse Toggle */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-border',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {/* Logo - hidden when collapsed */}
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight pl-2">PAYLOG</span>
          )}

          <Button
            variant="subtle"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden md:flex h-8 w-8"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive}
                isCollapsed={isCollapsed}
                badgeCount={badgeCounts[item.href]}
              />
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border p-2 space-y-2">
          <AIAssistantCard isCollapsed={isCollapsed} />
          <HelpButton isCollapsed={isCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
