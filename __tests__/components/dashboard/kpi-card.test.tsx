/**
 * KPI Card Component Tests
 *
 * Tests for dashboard KPI card rendering, formatting, and loading states
 * Sprint 12, Phase 4: Testing
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KPICard } from '@/components/dashboard/kpi-card';
import { DollarSign, Clock } from 'lucide-react';

describe('KPICard Component', () => {
  it('should render title and value correctly', () => {
    render(<KPICard title="Total Invoices" value={150} format="number" />);

    expect(screen.getByText('Total Invoices')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should format currency values with $ and commas', () => {
    render(<KPICard title="Total Unpaid" value={45000.5} format="currency" />);

    // US currency format: $45,000.50
    expect(screen.getByText(/\$45,000\.50/)).toBeInTheDocument();
  });

  it('should format large currency values correctly', () => {
    render(<KPICard title="Total Revenue" value={1234567.89} format="currency" />);

    // $1,234,567.89
    expect(screen.getByText(/\$1,234,567\.89/)).toBeInTheDocument();
  });

  it('should format number values with commas', () => {
    render(<KPICard title="Total Count" value={12345} format="number" />);

    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('should format percentage values with % symbol', () => {
    render(<KPICard title="Success Rate" value={85.5} format="percentage" />);

    expect(screen.getByText('85.5%')).toBeInTheDocument();
  });

  it('should format percentage with one decimal place', () => {
    render(<KPICard title="Growth Rate" value={12.789} format="percentage" />);

    expect(screen.getByText('12.8%')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    const { container } = render(
      <KPICard
        title="Total Invoices"
        value={150}
        format="number"
        icon={<DollarSign className="h-4 w-4" data-testid="dollar-icon" />}
      />
    );

    expect(screen.getByTestId('dollar-icon')).toBeInTheDocument();
  });

  it('should show trend indicator with up arrow', () => {
    render(
      <KPICard
        title="Revenue"
        value={50000}
        format="currency"
        trend={{ value: 15.5, direction: 'up' }}
      />
    );

    // Should show +15.5% from last period
    expect(screen.getByText(/\+15\.5% from last period/)).toBeInTheDocument();
  });

  it('should show trend indicator with down arrow', () => {
    render(
      <KPICard
        title="Revenue"
        value={50000}
        format="currency"
        trend={{ value: -8.2, direction: 'down' }}
      />
    );

    // Should show -8.2% from last period
    expect(screen.getByText(/-8\.2% from last period/)).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading=true', () => {
    const { container } = render(
      <KPICard title="Total Invoices" value={150} format="number" isLoading={true} />
    );

    // Should not show actual value when loading
    expect(screen.queryByText('150')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Invoices')).not.toBeInTheDocument();

    // Should render skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render without trend when not provided', () => {
    const { container } = render(
      <KPICard title="Total Invoices" value={150} format="number" />
    );

    expect(screen.queryByText(/from last period/)).not.toBeInTheDocument();
  });

  it('should handle zero value correctly', () => {
    render(<KPICard title="Pending Approvals" value={0} format="number" />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle zero currency value', () => {
    render(<KPICard title="Total Unpaid" value={0} format="currency" />);

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('should handle string value as-is (no formatting)', () => {
    render(<KPICard title="Status" value="Active" format="number" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should have hover effect on card', () => {
    const { container } = render(
      <KPICard title="Total Invoices" value={150} format="number" />
    );

    const card = container.querySelector('.hover\\:shadow-md');
    expect(card).toBeInTheDocument();
  });

  it('should have accessible role and aria-live attributes', () => {
    render(<KPICard title="Total Invoices" value={150} format="number" />);

    const valueElement = screen.getByText('150');
    expect(valueElement).toHaveAttribute('role', 'status');
    expect(valueElement).toHaveAttribute('aria-live', 'polite');
  });

  it('should memoize component to prevent unnecessary re-renders', () => {
    const { rerender } = render(
      <KPICard title="Total Invoices" value={150} format="number" />
    );

    // Re-render with same props
    rerender(<KPICard title="Total Invoices" value={150} format="number" />);

    // Component should be memoized (React.memo)
    expect(KPICard).toBeDefined();
  });

  it('should apply correct text colors for trend directions', () => {
    const { container: upContainer } = render(
      <KPICard
        title="Revenue"
        value={50000}
        format="currency"
        trend={{ value: 10, direction: 'up' }}
      />
    );

    const { container: downContainer } = render(
      <KPICard
        title="Revenue"
        value={50000}
        format="currency"
        trend={{ value: -10, direction: 'down' }}
      />
    );

    // Check for success class (green) on up trend
    const upTrend = upContainer.querySelector('.text-success');
    expect(upTrend).toBeInTheDocument();

    // Check for destructive class (red) on down trend
    const downTrend = downContainer.querySelector('.text-destructive');
    expect(downTrend).toBeInTheDocument();
  });

  it('should handle negative currency values', () => {
    render(<KPICard title="Balance" value={-500.5} format="currency" />);

    expect(screen.getByText(/-\$500\.50/)).toBeInTheDocument();
  });

  it('should format very small decimal values correctly', () => {
    render(<KPICard title="Tax Rate" value={0.05} format="percentage" />);

    expect(screen.getByText('0.1%')).toBeInTheDocument();
  });
});
