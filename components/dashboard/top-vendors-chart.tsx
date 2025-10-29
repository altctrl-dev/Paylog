/**
 * Top Vendors Chart Component
 * Top 10 vendors by spending horizontal bar chart
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { VendorSpendingItem } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface TopVendorsChartProps {
  data: VendorSpendingItem[];
  isLoading?: boolean;
}

export const TopVendorsChart = React.memo(function TopVendorsChart({
  data,
  isLoading = false,
}: TopVendorsChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: VendorSpendingItem }> }) => {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-popover border border-border rounded-md shadow-lg p-3 max-w-[250px]">
        <p className="font-medium text-popover-foreground truncate">{data.vendor_name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Total: ${data.total_amount.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {data.invoice_count} invoice{data.invoice_count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  };

  // Format X-axis labels
  const formatXAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  // Truncate long vendor names
  const formatYAxis = (value: string) => {
    return value.length > 20 ? `${value.substring(0, 20)}...` : value;
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="h-[400px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Top Vendors by Spending</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No vendor data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Vendors by Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              type="number"
              tickFormatter={formatXAxis}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="vendor_name"
              tickFormatter={formatYAxis}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="total_amount"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
