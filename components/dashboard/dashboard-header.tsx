/**
 * Dashboard Header Component
 * Header with title, date range selector, and refresh controls
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { DateRangeSelector } from './date-range-selector';
import { DateRange } from '@/types/dashboard';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardHeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  dateRange,
  onDateRangeChange,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  const lastUpdatedText = formatDistanceToNow(new Date(lastUpdated), {
    addSuffix: true,
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      {/* Title Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your invoice activity
        </p>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Last Updated Indicator */}
        <div className="text-xs text-muted-foreground">
          <span>Last updated </span>
          <time dateTime={lastUpdated.toISOString()}>{lastUpdatedText}</time>
        </div>

        {/* Date Range Selector */}
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>
    </div>
  );
}
