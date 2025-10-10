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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

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
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm transition-all duration-300',
        collapsed ? 'w-[88px]' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
        <Logo collapsed={collapsed} className="shrink-0" />
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

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
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
            'rounded-xl border border-dashed border-sidebar-border/70 bg-sidebar/70 p-3 text-xs text-muted-foreground',
            collapsed && 'text-center'
          )}
        >
          {!collapsed ? (
            <>
              <p className="font-semibold text-foreground">PayLog</p>
              <p className="mt-1 text-muted-foreground">
                Streamline approvals and payments with confidence.
              </p>
            </>
          ) : (
            <p className="font-semibold text-foreground">PayLog</p>
          )}
        </div>
      </div>
    </aside>
  );
}
