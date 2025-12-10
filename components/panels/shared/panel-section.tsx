'use client';

/**
 * Panel Section Component
 *
 * A labeled content block with optional action button for use in sidepanels.
 * Provides consistent spacing and styling for panel content sections.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PanelSectionProps {
  /** Section title displayed as a small label */
  title: string;

  /** Optional action button shown on the right side of the header */
  action?: {
    label: string;
    onClick: () => void;
  };

  /** Section content */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function PanelSection({
  title,
  action,
  children,
  className,
}: PanelSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        {action && (
          <Button
            variant="link"
            size="sm"
            onClick={action.onClick}
            className="h-auto p-0 text-xs"
          >
            {action.label}
          </Button>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}
