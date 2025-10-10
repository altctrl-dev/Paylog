'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({ user, onToggleSidebar }: HeaderProps) {
  const displayName = user.name || user.email || 'User';

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center border-b border-navbar-border bg-[var(--navbar-bg)] px-6 backdrop-blur-md shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
            className={cn(
              'h-9 w-9 rounded-lg border border-transparent bg-background/60 text-foreground hover:border-border',
              'lg:hidden'
            )}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Welcome back
            </span>
            <span className="text-xl font-semibold text-foreground">
              {displayName}
            </span>
          </div>
          {user.role && (
            <span className="rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-xs font-medium uppercase text-secondary-foreground">
              {user.role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="border-border/60 bg-background/60 backdrop-blur-sm"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
