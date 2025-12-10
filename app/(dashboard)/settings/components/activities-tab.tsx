/**
 * Activities Tab Component
 *
 * Shows user's activity history across all their invoices.
 * Timeline view with filtering and pagination.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePanel } from '@/hooks/use-panel';
import { getUserActivities } from '@/app/actions/activity-log';
import type { ActivityLogWithRelations, ActivityLogFilters } from '@/types/activity-log';
import type { ActivityAction } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import {
  getActivityActionLabel,
  getActivityActionIcon,
} from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import { PANEL_WIDTH } from '@/types/panel';
import { formatDistanceToNow, format } from 'date-fns';
import {
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  EyeOff,
  Eye,
  Copy,
  Trash2,
  DollarSign,
  MessageSquare,
  Paperclip,
  CheckSquare,
  XSquare,
  Download,
  Trash,
  Info,
  RefreshCw,
  Filter,
} from 'lucide-react';

// Icon mapping for activity actions
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  EyeOff,
  Eye,
  Copy,
  Trash2,
  DollarSign,
  MessageSquare,
  Paperclip,
  CheckSquare,
  XSquare,
  Download,
  Trash,
  Info,
};

// Activity type categories for filtering
const ACTIVITY_CATEGORIES = [
  { value: 'all', label: 'All Activities' },
  { value: 'invoice', label: 'Invoice Actions' },
  { value: 'payment', label: 'Payment Actions' },
  { value: 'comment', label: 'Comment Actions' },
  { value: 'attachment', label: 'Attachment Actions' },
] as const;

// Map category to action prefixes
const CATEGORY_TO_ACTIONS: Record<string, string[]> = {
  invoice: ['invoice_'],
  payment: ['payment_'],
  comment: ['comment_'],
  attachment: ['attachment_'],
};

export function ActivitiesTab() {
  const { openPanel } = usePanel();
  const [activities, setActivities] = React.useState<ActivityLogWithRelations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  // Load activities
  const loadActivities = React.useCallback(async (pageNum: number, category: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: ActivityLogFilters = {
        page: pageNum,
        perPage: 20,
      };

      // Apply category filter by fetching and filtering client-side
      // (Server action filters by specific action, not category)
      const result = await getUserActivities(filters);

      if (result.success) {
        let filteredEntries = result.data.entries;

        // Filter by category if not 'all'
        if (category !== 'all' && CATEGORY_TO_ACTIONS[category]) {
          const prefixes = CATEGORY_TO_ACTIONS[category];
          filteredEntries = filteredEntries.filter((entry) =>
            prefixes.some((prefix) => entry.action.startsWith(prefix))
          );
        }

        setActivities(filteredEntries);
        setTotalPages(result.data.pagination.totalPages);
        setTotal(result.data.pagination.total);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and refresh when filters change
  React.useEffect(() => {
    loadActivities(page, categoryFilter);
  }, [loadActivities, page, categoryFilter]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleRefresh = () => {
    loadActivities(page, categoryFilter);
  };

  const handleInvoiceClick = (invoiceId: number) => {
    openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
  };

  const getIcon = (action: string) => {
    const iconName = getActivityActionIcon(action as ActivityAction);
    const IconComponent = ICON_MAP[iconName] || Info;
    return IconComponent;
  };

  const getActionColor = (action: string): string => {
    if (action.includes('approved') || action.includes('added') || action.includes('created')) {
      return 'text-green-600';
    }
    if (action.includes('rejected') || action.includes('deleted') || action.includes('hidden')) {
      return 'text-red-600';
    }
    if (action.includes('hold') || action.includes('updated') || action.includes('edited')) {
      return 'text-amber-600';
    }
    return 'text-blue-600';
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
              <Select
                value={categoryFilter}
                onChange={handleCategoryChange}
                className="w-[180px]"
              >
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {total} activit{total !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading activities...</p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && activities.length === 0 && (
        <Card className="p-12 text-center">
          <Info className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No activities yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your activity history will appear here as you interact with invoices.
          </p>
        </Card>
      )}

      {/* Activity Timeline */}
      {!isLoading && !error && activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity) => {
            const IconComponent = getIcon(activity.action);
            const actionColor = getActionColor(activity.action);

            return (
              <Card
                key={activity.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleInvoiceClick(activity.invoice.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-full bg-muted ${actionColor}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {activity.user?.full_name || 'System'}
                      </span>
                      <span className="text-muted-foreground">
                        {getActivityActionLabel(activity.action as ActivityAction).toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono">
                        {activity.invoice.invoice_number}
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground text-right">
                    {format(new Date(activity.created_at), 'dd MMM yyyy')}
                    <br />
                    {format(new Date(activity.created_at), 'HH:mm')}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
