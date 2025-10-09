'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
  subtitle?: string;
}

export function Logo({
  collapsed = false,
  className,
  subtitle = 'Invoice Console',
}: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 font-semibold tracking-tight text-foreground',
        collapsed && 'justify-center',
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <span className="text-lg font-bold leading-none">PL</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-foreground">PayLog</span>
          <span className="text-xs font-medium text-muted-foreground">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
