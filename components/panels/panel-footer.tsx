/**
 * Panel Footer Component
 *
 * Optional footer for action buttons and controls.
 * Sticky positioned at the bottom of the panel.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PanelFooterProps {
  /** Footer content (typically buttons) */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function PanelFooter({ children, className }: PanelFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2',
        'border-t border-border bg-background px-6 py-3',
        'shrink-0', // Prevent footer from shrinking in flex layout
        className
      )}
    >
      {children}
    </div>
  );
}
