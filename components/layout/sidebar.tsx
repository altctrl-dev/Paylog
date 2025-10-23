'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Shield },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

function getInitials(label: string): string {
  const parts = label.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

function formatRole(role?: string | null): string | null {
  if (!role) return null;
  return role.replace(/_/g, ' ');
}

export function Sidebar({ collapsed, onToggle, user }: SidebarProps) {
  const pathname = usePathname();
  const displayName = user.name || user.email || 'User';
  const initials = getInitials(displayName);
  const formattedRole = formatRole(user.role);

  // Filter navigation items based on user role
  // Only show Admin menu item for admin and super_admin roles
  const filteredNavigation = React.useMemo(() => {
    return navigation.filter(item => {
      if (item.href.startsWith('/admin')) {
        return user.role === 'admin' || user.role === 'super_admin';
      }
      return true;
    });
  }, [user.role]);

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm transition-all duration-300',
        collapsed ? 'w-[88px]' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Navigation
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="h-9 w-9 rounded-lg border border-transparent bg-sidebar-muted/40 text-sidebar-foreground transition-colors hover:border-sidebar-border"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3 pt-5 pb-4">
        {filteredNavigation.map((item) => {
          // Check if current path matches or starts with the item's path (for nested routes)
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                collapsed
                  ? 'justify-center px-0'
                  : 'ml-0 pl-2.5 pr-3 mr-1.5',
                isActive
                  ? 'bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))] shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-hover-foreground))]'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive
                    ? 'text-[hsl(var(--sidebar-active-foreground))]'
                    : 'text-sidebar-foreground/65'
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar/80 px-3 py-3 text-sm transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-hover/70 text-sm font-semibold text-sidebar-foreground">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-1 flex-col leading-tight">
              <span className="font-semibold text-foreground">{displayName}</span>
              {formattedRole && (
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formattedRole}
                </span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={cn(
              'text-muted-foreground hover:text-destructive',
              collapsed ? 'h-9 w-9' : ''
            )}
            aria-label="Sign out"
          >
            {collapsed ? <LogOut className="h-4 w-4" /> : 'Sign Out'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
