/**
 * Panel Action Bar Component
 *
 * A vertical icon button bar positioned on the right side of panels.
 * Provides primary and secondary action buttons with tooltips.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ActionBarAction {
  /** Unique identifier for the action */
  id: string;
  /** Icon to display in the button */
  icon: React.ReactNode;
  /** Label shown in tooltip */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Shows icon in destructive color */
  destructive?: boolean;
  /** Completely hide the action */
  hidden?: boolean;
  /** Custom tooltip message (overrides label when provided, useful for showing why action is disabled) */
  tooltip?: string;
}

export interface PanelActionBarProps {
  /** Top section actions */
  primaryActions: ActionBarAction[];
  /** Bottom section actions (after separator) */
  secondaryActions?: ActionBarAction[];
  /** Additional CSS classes */
  className?: string;
}

export function PanelActionBar({
  primaryActions,
  secondaryActions,
  className,
}: PanelActionBarProps) {
  const visiblePrimaryActions = primaryActions.filter((action) => !action.hidden);
  const visibleSecondaryActions = secondaryActions?.filter((action) => !action.hidden) ?? [];

  // Don't render if no visible actions
  if (visiblePrimaryActions.length === 0 && visibleSecondaryActions.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={500}>
      <div
        className={cn(
          'flex w-12 flex-col items-center py-2',
          className
        )}
      >
        {/* Primary Actions */}
        <div className="flex flex-col items-center gap-1">
          {visiblePrimaryActions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>

        {/* Separator - only show if both sections have visible actions */}
        {visiblePrimaryActions.length > 0 && visibleSecondaryActions.length > 0 && (
          <div className="my-2 w-8 border-t border-border/50" />
        )}

        {/* Secondary Actions */}
        {visibleSecondaryActions.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            {visibleSecondaryActions.map((action) => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function ActionButton({ action }: { action: ActionBarAction }) {
  // Use custom tooltip if provided (e.g., to explain why action is disabled)
  // Otherwise fall back to the label
  const tooltipContent = action.tooltip || action.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="subtle"
          size="icon"
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.label}
          className={cn(
            'h-9 w-9',
            action.destructive && 'text-destructive hover:text-destructive'
          )}
        >
          <span className={cn('h-5 w-5', '[&>svg]:h-5 [&>svg]:w-5')}>
            {action.icon}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
