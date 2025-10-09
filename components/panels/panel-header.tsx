/**
 * Panel Header Component
 *
 * Displays panel title with close button.
 * Sticky positioned at the top of the panel.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PanelHeaderProps {
  /** Panel title */
  title: string;

  /** Callback when close button is clicked */
  onClose?: () => void;

  /** Optional action buttons to show before close button */
  actions?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function PanelHeader({
  title,
  onClose,
  actions,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center justify-between gap-3',
        'border-b border-border bg-background px-6 py-4',
        className
      )}
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close panel"
            className="h-8 w-8"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
