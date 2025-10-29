/**
 * Invoice Volume Chart Component
 * Monthly invoice volume line chart
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { InvoiceVolumeItem } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceVolumeChartProps {
  data: InvoiceVolumeItem[];
  isLoading?: boolean;
}

export const InvoiceVolumeChart = React.memo(function InvoiceVolumeChart({
  data,
  isLoading = false,
}: InvoiceVolumeChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: InvoiceVolumeItem }> }) => {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload;
    const date = new Date(data.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });

    return (
      <div className="bg-popover border border-border rounded-md shadow-lg p-3">
        <p className="font-medium text-popover-foreground">{formattedDate}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {data.count} invoice{data.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  };

  // Format X-axis labels
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Invoice Volume</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No volume data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Invoice Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--info))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--info))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
