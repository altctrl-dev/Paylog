'use client';

/**
 * Panel Timeline Component
 *
 * A vertical activity timeline for use in sidepanels.
 * Displays chronological events with action icons, descriptions, and relative timestamps.
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Check,
  X,
  IndianRupee,
  Pause,
  Archive,
  MessageSquare,
  Paperclip,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TimelineItem {
  id: string;
  /** Action type - determines the icon displayed */
  action: string;
  /** Description of the activity */
  description: string;
  /** When the activity occurred */
  timestamp: Date | string;
  /** User who performed the action */
  user?: {
    name: string;
    avatar?: string;
  };
  /** Additional metadata for the activity */
  metadata?: Record<string, unknown>;
}

export interface PanelTimelineProps {
  /** List of timeline items to display */
  items: TimelineItem[];
  /** Message to display when timeline is empty */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Action Icon Mapping
// ============================================================================

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  approved: Check,
  rejected: X,
  payment_recorded: IndianRupee,
  on_hold: Pause,
  archived: Archive,
  comment: MessageSquare,
  attachment: Paperclip,
};

/**
 * Returns the icon component for a given action type.
 * Falls back to Circle for unknown actions.
 */
function getActionIcon(action: string): React.ComponentType<{ className?: string }> {
  return ACTION_ICONS[action.toLowerCase()] || Circle;
}

// ============================================================================
// Action Color Mapping
// ============================================================================

const ACTION_DOT_COLORS: Record<string, string> = {
  created: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  payment_recorded: 'bg-green-600',
  on_hold: 'bg-amber-500',
  archived: 'bg-gray-500',
  comment: 'bg-purple-500',
  attachment: 'bg-cyan-500',
};

/**
 * Returns the dot color class for a given action type.
 * Falls back to border color for unknown actions.
 */
function getActionDotColor(action: string): string {
  return ACTION_DOT_COLORS[action.toLowerCase()] || 'bg-border';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a timestamp as a relative time string (e.g., "2 hours ago").
 */
function formatRelativeTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return formatDistanceToNow(date, { addSuffix: true });
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TimelineEntryProps {
  item: TimelineItem;
  isLast: boolean;
}

function TimelineEntry({ item, isLast }: TimelineEntryProps) {
  const Icon = getActionIcon(item.action);
  const dotColor = getActionDotColor(item.action);
  const relativeTime = formatRelativeTime(item.timestamp);

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector and dot */}
      <div className="flex flex-col items-center">
        {/* Dot with icon */}
        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            dotColor
          )}
        >
          <Icon className="h-3 w-3 text-white" />
        </div>
        {/* Connector line */}
        {!isLast && <div className="w-0.5 flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className={cn('pb-6', isLast && 'pb-0')}>
        <p className="text-sm font-medium leading-tight">{item.description}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {item.user && (
            <>
              <span>{item.user.name}</span>
              <span>•</span>
            </>
          )}
          <time dateTime={new Date(item.timestamp).toISOString()}>{relativeTime}</time>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when timeline has no items.
 */
interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Circle className="h-8 w-8 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelTimeline({
  items,
  emptyMessage = 'No activity yet',
  className,
}: PanelTimelineProps) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, index) => (
        <TimelineEntry key={item.id} item={item} isLast={index === items.length - 1} />
      ))}
    </div>
  );
}

export default PanelTimeline;
