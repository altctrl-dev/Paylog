/**
 * Reports Charts Component
 * Sprint 13 Phase 2: Performance Optimization
 *
 * Extracted Recharts components from Reports page for lazy loading
 * Reduces initial bundle size by loading charts on-demand
 */

'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { PieLabelRenderProps, DefaultTooltipContentProps } from 'recharts';
import { INVOICE_STATUS_CONFIG } from '@/types/invoice';

// Chart colors for status breakdown
const CHART_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

interface StatusChartProps {
  data: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  formatCurrency: (amount: number) => string;
}

interface VendorChartProps {
  data: Array<{
    vendor_name: string;
    total_amount: number;
    count: number;
  }>;
  formatCurrency: (amount: number) => string;
}

/**
 * Status Breakdown Pie Chart
 */
export function StatusBreakdownChart({ data, formatCurrency }: StatusChartProps) {
  type StatusTooltipPayload = {
    count: number;
  };

  type TooltipFormatterFn = NonNullable<
    DefaultTooltipContentProps<number, string>['formatter']
  >;

  const statusTooltipFormatter: TooltipFormatterFn = (value, name, item) => {
    const count =
      (item.payload as StatusTooltipPayload | undefined)?.count ?? 0;
    return [`${formatCurrency(Number(value))} (${count} invoices)`, name];
  };

  const renderPieLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

    if (
      cx === undefined ||
      cy === undefined ||
      midAngle === undefined ||
      innerRadius === undefined ||
      outerRadius === undefined ||
      percent === undefined
    ) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > Number(cx) ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: 'bold' }}
      >
        {`${(Number(percent) * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={renderPieLabel}
          labelLine={false}
        >
          {data.map((entry, index) => {
            const statusKey = entry.status as keyof typeof INVOICE_STATUS_CONFIG;
            const statusLabel =
              INVOICE_STATUS_CONFIG[statusKey]?.label || entry.status;
            return (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                name={statusLabel}
              />
            );
          })}
        </Pie>
        <Tooltip formatter={statusTooltipFormatter} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Vendor Spending Bar Chart
 */
export function VendorSpendingChart({ data, formatCurrency }: VendorChartProps) {
  type TooltipFormatterFn = NonNullable<
    DefaultTooltipContentProps<number, string>['formatter']
  >;

  const vendorTooltipFormatter: TooltipFormatterFn = (value, _name, item) => {
    const count =
      (item.payload as { count?: number } | undefined)?.count ?? 0;
    return [formatCurrency(Number(value)), `Total (${count} invoices)`];
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="vendor_name"
          angle={-45}
          textAnchor="end"
          height={100}
          style={{ fontSize: '12px' }}
        />
        <YAxis tickFormatter={(value) => formatCurrency(value)} />
        <Tooltip formatter={vendorTooltipFormatter} />
        <Bar dataKey="total_amount" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
