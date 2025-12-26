'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center border-b border-navbar-border bg-[var(--navbar-bg)] px-6 backdrop-blur-md shadow-md">
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
            <span className="text-overline">
              PayLog
            </span>
            <span className="heading-5">
              Invoice Management Console
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
