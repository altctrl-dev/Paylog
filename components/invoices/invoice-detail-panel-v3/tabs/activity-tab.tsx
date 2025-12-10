'use client';

/**
 * Activity Tab Component
 *
 * Displays the activity timeline for an invoice using the shared PanelTimeline component.
 * Fetches activity logs via server action and transforms them to timeline items.
 */

import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { PanelTimeline, type TimelineItem } from '@/components/panels/shared';
import { getActivityLog } from '@/app/actions/activity-log';
import {
  ACTIVITY_ACTION_LABELS,
  type ActivityAction,
} from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import type { ActivityLogWithRelations } from '@/types/activity-log';

// ============================================================================
// Types
// ============================================================================

export interface ActivityTabProps {
  invoiceId: number;
  userRole?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps activity action to PanelTimeline action type for icon/color mapping.
 * The PanelTimeline uses simplified action names (created, approved, etc.)
 */
function mapToTimelineAction(action: ActivityAction): string {
  const actionMap: Record<string, string> = {
    invoice_created: 'created',
    invoice_approved: 'approved',
    invoice_rejected: 'rejected',
    invoice_hold_placed: 'on_hold',
    invoice_hold_released: 'created', // Use 'created' (plus icon) for positive actions
    invoice_archived: 'archived',
    invoice_updated: 'created',
    invoice_duplicated: 'created',
    invoice_deleted: 'archived',
    payment_added: 'payment_recorded',
    payment_approved: 'approved',
    payment_rejected: 'rejected',
    payment_updated: 'payment_recorded',
    payment_deleted: 'rejected',
    comment_added: 'comment',
    comment_edited: 'comment',
    comment_deleted: 'comment',
    attachment_uploaded: 'attachment',
    attachment_deleted: 'attachment',
    bulk_approve: 'approved',
    bulk_reject: 'rejected',
    bulk_export: 'created',
    bulk_delete: 'archived',
  };

  return actionMap[action] || 'created';
}

/**
 * Gets human-readable description for an activity log entry.
 * Includes additional context from metadata when available.
 */
function getActionDescription(log: ActivityLogWithRelations): string {
  const baseLabel =
    ACTIVITY_ACTION_LABELS[log.action as ActivityAction] || log.action;

  // Parse new_data for additional context
  if (log.new_data) {
    try {
      const metadata = JSON.parse(log.new_data);

      // Add rejection reason if available
      if (
        (log.action === 'invoice_rejected' ||
          log.action === 'payment_rejected') &&
        metadata.reason
      ) {
        return `${baseLabel}: ${metadata.reason}`;
      }

      // Add payment amount if available
      if (
        (log.action === 'payment_added' || log.action === 'payment_updated') &&
        metadata.amount
      ) {
        const formattedAmount = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(metadata.amount);
        return `${baseLabel} (${formattedAmount})`;
      }

      // Add new status for status changes
      if (log.action === 'invoice_updated' && metadata.status) {
        return `Status changed to ${metadata.status.replace(/_/g, ' ')}`;
      }
    } catch {
      // Ignore JSON parse errors, use base label
    }
  }

  return baseLabel;
}

/**
 * Transforms ActivityLogWithRelations to TimelineItem format.
 */
function transformToTimelineItem(log: ActivityLogWithRelations): TimelineItem {
  return {
    id: log.id,
    action: mapToTimelineAction(log.action as ActivityAction),
    description: getActionDescription(log),
    timestamp: log.created_at,
    user: log.user ? { name: log.user.full_name } : undefined,
    metadata: log.new_data ? JSON.parse(log.new_data) : undefined,
  };
}

// ============================================================================
// Component
// ============================================================================

export function ActivityTab({ invoiceId }: ActivityTabProps) {
  const {
    data: result,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['activityLog', invoiceId],
    queryFn: async () => {
      const response = await getActivityLog(invoiceId, { perPage: 50 });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 30_000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : 'Failed to load activity log'}
        </p>
      </div>
    );
  }

  // Transform activity logs to timeline items
  const timelineItems: TimelineItem[] =
    result?.entries.map(transformToTimelineItem) || [];

  return (
    <PanelTimeline items={timelineItems} emptyMessage="No activity recorded" />
  );
}

export default ActivityTab;
