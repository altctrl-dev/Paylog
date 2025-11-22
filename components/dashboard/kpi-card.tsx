/**
 * KPI Card Component
 * Reusable component for displaying dashboard KPI metrics
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/format';

interface KPICardProps {
  title: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percentage';
  currencyCode?: string;
  icon?: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  isLoading?: boolean;
}

export const KPICard = React.memo(function KPICard({
  title,
  value,
  format = 'number',
  currencyCode = 'USD',
  icon,
  trend,
  isLoading = false,
}: KPICardProps) {
  // Format value based on type
  const formattedValue = React.useMemo(() => {
    if (isLoading) return null;

    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return formatCurrency(value, currencyCode);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  }, [value, format, currencyCode, isLoading]);

  // Determine trend color
  const trendColor = trend?.direction === 'up'
    ? 'text-success'
    : 'text-destructive';

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          {icon && <Skeleton className="h-4 w-4 rounded" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground" aria-hidden="true">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground" role="status" aria-live="polite">
          {formattedValue}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            <span>
              {trend.value > 0 ? '+' : ''}
              {trend.value.toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
