/**
 * Status Pie Chart Component
 * Invoice status breakdown visualization
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { StatusBreakdownItem } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface StatusPieChartProps {
  data: StatusBreakdownItem[];
  isLoading?: boolean;
}

// Status colors matching invoice status badges
const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(var(--muted))',
  pending_submission: 'hsl(var(--warning))',
  pending_approval: 'hsl(var(--info))',
  approved: 'hsl(var(--success))',
  rejected: 'hsl(var(--destructive))',
  paid: 'hsl(var(--success))',
  on_hold: 'hsl(var(--warning))',
};

export const StatusPieChart = React.memo(function StatusPieChart({
  data,
  isLoading = false,
}: StatusPieChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: StatusBreakdownItem }> }) => {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload;
    const percentage = ((data.count / data.value) * 100).toFixed(1);

    return (
      <div className="bg-popover border border-border rounded-md shadow-lg p-3">
        <p className="font-medium text-popover-foreground capitalize">
          {data.status.replace(/_/g, ' ')}
        </p>
        <p className="text-sm text-muted-foreground">
          {data.count} invoices ({percentage}%)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          ${data.value.toLocaleString()}
        </p>
      </div>
    );
  };

  // Custom label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = (entry: any) => {
    const percentage = parseFloat(((entry.count / entry.value) * 100).toFixed(0));
    return percentage > 5 ? `${percentage}%` : '';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Invoice Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Invoice Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={data as any}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={renderCustomLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status] || 'hsl(var(--primary))'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => value.replace(/_/g, ' ')}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
