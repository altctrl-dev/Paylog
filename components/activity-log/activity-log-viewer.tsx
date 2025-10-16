/**
 * Activity Log Viewer Component
 *
 * Displays activity timeline for invoices with filters and expandable details.
 * Sprint 7 Phase 7: Activity Log Viewer
 *
 * Features:
 * - Reverse chronological timeline with icons
 * - Filter by action type and date range
 * - Expandable old/new data comparison
 * - Pagination for >20 entries
 * - RBAC: Admins see all logs, standard users see own only
 * - Auto-refresh every 30 seconds
 */

'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useActivityLog } from '@/hooks/use-activity-log';
import {
  ACTIVITY_ACTION,
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ACTION_ICONS,
  getActivityActionLabel,
  getActivityActionIcon,
  type ActivityAction,
} from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import type { ActivityLogWithRelations } from '@/types/activity-log';

// ============================================================================
// TYPES
// ============================================================================

interface ActivityLogViewerProps {
  invoiceId: number;
  currentUserId: number;
  currentUserRole: string;
}

interface DataDiffField {
  field: string;
  oldValue: any;
  newValue: any;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse JSON old_data/new_data safely
 * Returns null if parsing fails or data is null
 */
function parseLogData(jsonString: string | null): Record<string, any> | null {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[ActivityLogViewer] Failed to parse log data:', error);
    return null;
  }
}

/**
 * Format old vs new data comparison
 * Returns array of changed fields with old and new values
 */
function formatDataDiff(
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null
): DataDiffField[] {
  if (!oldData && !newData) return [];

  const diff: DataDiffField[] = [];

  // Collect all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    // Only include if values differ
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }

  return diff;
}

/**
 * Format relative timestamp
 * Examples: "2 hours ago", "just now", "3 days ago"
 */
function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format field name for display
 * Convert snake_case to Title Case
 */
function formatFieldName(field: string): string {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format value for display
 * Handle various data types (string, number, boolean, date, null)
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Get Lucide icon component by name
 * Fallback to Info icon if not found
 */
function getIconComponent(iconName: string): React.ComponentType<any> {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Info;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Activity log entry expandable card
 */
interface ActivityLogEntryProps {
  entry: ActivityLogWithRelations;
}

function ActivityLogEntry({ entry }: ActivityLogEntryProps) {
  const [expanded, setExpanded] = React.useState(false);

  const iconName = getActivityActionIcon(entry.action as ActivityAction);
  const IconComponent = getIconComponent(iconName);
  const label = getActivityActionLabel(entry.action as ActivityAction);
  const userName = entry.user?.full_name || 'System';

  // Parse old/new data
  const oldData = parseLogData(entry.old_data);
  const newData = parseLogData(entry.new_data);
  const dataDiff = formatDataDiff(oldData, newData);

  const hasDetails = dataDiff.length > 0 || entry.ip_address || entry.user_agent;

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline connector line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border" />

      {/* Icon */}
      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <Card className="p-4">
        <div className="space-y-2">
          {/* Header: Action label + User */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">
                by {userName}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(entry.created_at)}
            </span>
          </div>

          {/* Expandable details button */}
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-auto py-1 px-2 text-xs"
            >
              {expanded ? '▼ Hide details' : '▶ Show details'}
            </Button>
          )}

          {/* Expanded details */}
          {expanded && hasDetails && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              {/* Data diff */}
              {dataDiff.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Changes
                  </p>
                  {dataDiff.map((diff, idx) => (
                    <div key={idx} className="rounded-md border border-border p-2 text-xs">
                      <p className="font-semibold mb-1">{formatFieldName(diff.field)}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-muted-foreground mb-1">Old:</p>
                          <code className="block rounded bg-muted p-1 text-[10px] break-all">
                            {formatValue(diff.oldValue)}
                          </code>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">New:</p>
                          <code className="block rounded bg-primary/10 p-1 text-[10px] break-all">
                            {formatValue(diff.newValue)}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* IP address and user agent (collapsed by default) */}
              {(entry.ip_address || entry.user_agent) && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-muted-foreground uppercase">
                    Technical Details
                  </summary>
                  <div className="mt-2 space-y-1 rounded-md bg-muted p-2">
                    {entry.ip_address && (
                      <p>
                        <span className="font-medium">IP:</span> {entry.ip_address}
                      </p>
                    )}
                    {entry.user_agent && (
                      <p className="break-all">
                        <span className="font-medium">User Agent:</span> {entry.user_agent}
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Empty state when no activity logs exist
 */
function EmptyState() {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <Icons.Activity className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <p className="font-medium">No activity yet</p>
          <p className="text-sm text-muted-foreground">
            Actions on this invoice will appear here
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton during fetch
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative pl-8 pb-6">
          <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border" />
          <div className="absolute left-0 top-0 h-8 w-8 rounded-full border-2 border-border bg-muted animate-pulse" />
          <Card className="p-4">
            <div className="space-y-2">
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state with retry button
 */
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Card className="p-8 border-destructive">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <Icons.AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <p className="font-medium">Failed to load activity log</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Icons.RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityLogViewer({
  invoiceId,
  currentUserId,
  currentUserRole,
}: ActivityLogViewerProps) {
  // Filters state
  const [actionFilter, setActionFilter] = React.useState<ActivityAction | 'all'>('all');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const perPage = 20;

  // Build filters for query
  const filters = React.useMemo(() => {
    return {
      page,
      perPage,
      ...(actionFilter !== 'all' && { action: actionFilter }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    };
  }, [page, perPage, actionFilter, startDate, endDate]);

  // Fetch activity log
  const { data, isLoading, error, refetch } = useActivityLog(invoiceId, filters);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [actionFilter, startDate, endDate]);

  // Clear filters handler
  const handleClearFilters = React.useCallback(() => {
    setActionFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = actionFilter !== 'all' || startDate || endDate;

  // Pagination
  const totalPages = data?.pagination.totalPages || 0;
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Filters</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto py-1 px-2 text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Action type filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Action Type
              </label>
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as ActivityAction | 'all')}
              >
                <option value="all">All actions</option>
                {Object.entries(ACTIVITY_ACTION).map(([key, value]) => (
                  <option key={value} value={value}>
                    {ACTIVITY_ACTION_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>

            {/* Start date filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* End date filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Total count */}
          {data && (
            <p className="text-xs text-muted-foreground">
              Showing {data.entries.length} of {data.pagination.total} activities
            </p>
          )}
        </div>
      </Card>

      {/* Activity Timeline */}
      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState error={error as Error} onRetry={() => refetch()} />}
      {data && data.entries.length === 0 && <EmptyState />}
      {data && data.entries.length > 0 && (
        <div className="space-y-0">
          {data.entries.map((entry) => (
            <ActivityLogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!canGoPrevious}
            >
              <Icons.ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canGoNext}
            >
              Next
              <Icons.ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Auto-refresh indicator */}
      <p className="text-xs text-muted-foreground text-center">
        <Icons.RefreshCw className="inline h-3 w-3 mr-1" />
        Auto-refreshes every 30 seconds
      </p>
    </div>
  );
}
