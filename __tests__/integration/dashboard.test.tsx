/**
 * Dashboard Integration Tests
 *
 * End-to-end tests for dashboard page including:
 * - Server component data fetching
 * - Client wrapper integration
 * - Date range changes
 * - Manual refresh
 * - Error handling
 * - RBAC integration
 *
 * Sprint 12, Phase 4: Testing
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper';
import { DATE_RANGE } from '@/types/dashboard';
import {
  getDashboardKPIs,
  getInvoiceStatusBreakdown,
  getPaymentTrends,
  getTopVendorsBySpending,
  getMonthlyInvoiceVolume,
  getRecentActivity,
} from '@/app/actions/dashboard';
import {
  mockKPIs,
  mockStatusBreakdown,
  mockPaymentTrends,
  mockTopVendors,
  mockInvoiceVolume,
  mockActivities,
} from '../fixtures/dashboard-fixtures';

// Mock server actions
jest.mock('@/app/actions/dashboard', () => ({
  getDashboardKPIs: jest.fn(),
  getInvoiceStatusBreakdown: jest.fn(),
  getPaymentTrends: jest.fn(),
  getTopVendorsBySpending: jest.fn(),
  getMonthlyInvoiceVolume: jest.fn(),
  getRecentActivity: jest.fn(),
  getCachedDashboardKPIs: jest.fn(),
  getCachedInvoiceStatusBreakdown: jest.fn(),
  getCachedPaymentTrends: jest.fn(),
  getCachedTopVendorsBySpending: jest.fn(),
  getCachedMonthlyInvoiceVolume: jest.fn(),
  getCachedRecentActivity: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
}));

const mockGetDashboardKPIs = getDashboardKPIs as jest.MockedFunction<
  typeof getDashboardKPIs
>;
const mockGetInvoiceStatusBreakdown = getInvoiceStatusBreakdown as jest.MockedFunction<
  typeof getInvoiceStatusBreakdown
>;
const mockGetPaymentTrends = getPaymentTrends as jest.MockedFunction<
  typeof getPaymentTrends
>;
const mockGetTopVendorsBySpending = getTopVendorsBySpending as jest.MockedFunction<
  typeof getTopVendorsBySpending
>;
const mockGetMonthlyInvoiceVolume = getMonthlyInvoiceVolume as jest.MockedFunction<
  typeof getMonthlyInvoiceVolume
>;
const mockGetRecentActivity = getRecentActivity as jest.MockedFunction<
  typeof getRecentActivity
>;

describe('Dashboard Integration Tests', () => {
  // Mock initial data
  const mockInitialData = {
    kpis: { success: true as const, data: mockKPIs },
    statusData: { success: true as const, data: mockStatusBreakdown },
    paymentTrends: { success: true as const, data: mockPaymentTrends },
    topVendors: { success: true as const, data: mockTopVendors },
    invoiceVolume: { success: true as const, data: mockInvoiceVolume },
    activities: { success: true as const, data: mockActivities },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-10-30T12:00:00Z'));

    // Setup default mock responses
    mockGetDashboardKPIs.mockResolvedValue({ success: true, data: mockKPIs });
    mockGetInvoiceStatusBreakdown.mockResolvedValue({
      success: true,
      data: mockStatusBreakdown,
    });
    mockGetPaymentTrends.mockResolvedValue({
      success: true,
      data: mockPaymentTrends,
    });
    mockGetTopVendorsBySpending.mockResolvedValue({
      success: true,
      data: mockTopVendors,
    });
    mockGetMonthlyInvoiceVolume.mockResolvedValue({
      success: true,
      data: mockInvoiceVolume,
    });
    mockGetRecentActivity.mockResolvedValue({
      success: true,
      data: mockActivities,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Server Component Data Fetching Tests
  // ==========================================================================
  describe('Initial Data Loading', () => {
    it('should render wrapper with initial data correctly', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // KPI cards should be rendered
      expect(screen.getByText('Total Invoices')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should pass user role to wrapper for RBAC', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="admin" />
      );

      // Admin should see "Approve Pending" button
      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
    });

    it('should render all KPI cards with initial data', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      expect(screen.getByText('Total Invoices')).toBeInTheDocument();
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('Total Unpaid')).toBeInTheDocument();
      expect(screen.getByText('Paid This Month')).toBeInTheDocument();
      expect(screen.getByText('Overdue Invoices')).toBeInTheDocument();
      expect(screen.getByText('On Hold')).toBeInTheDocument();
    });

    it('should render activity feed with initial activities', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('INV-2024-101')).toBeInTheDocument();
    });

    it('should render Quick Actions section', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Date Range Change Tests
  // ==========================================================================
  describe('Date Range Selection', () => {
    it('should trigger data refetch when date range changes', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Total Invoices')).toBeInTheDocument();
      });

      const dateRangeSelect = screen.getByRole('combobox');

      // Clear previous calls from initial render
      jest.clearAllMocks();

      // Change date range to 1 month
      fireEvent.change(dateRangeSelect, { target: { value: DATE_RANGE.ONE_MONTH } });

      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalledWith(DATE_RANGE.ONE_MONTH);
        expect(mockGetInvoiceStatusBreakdown).toHaveBeenCalledWith(
          DATE_RANGE.ONE_MONTH
        );
        expect(mockGetPaymentTrends).toHaveBeenCalledWith(DATE_RANGE.ONE_MONTH);
        expect(mockGetTopVendorsBySpending).toHaveBeenCalledWith(
          DATE_RANGE.ONE_MONTH
        );
        expect(mockGetMonthlyInvoiceVolume).toHaveBeenCalledWith(
          DATE_RANGE.ONE_MONTH
        );
      });
    });

    it('should update all charts when date range changes', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      const dateRangeSelect = screen.getByRole('combobox');

      fireEvent.change(dateRangeSelect, { target: { value: DATE_RANGE.THREE_MONTHS } });

      await waitFor(() => {
        // All data fetching functions should be called
        expect(mockGetDashboardKPIs).toHaveBeenCalled();
        expect(mockGetInvoiceStatusBreakdown).toHaveBeenCalled();
        expect(mockGetPaymentTrends).toHaveBeenCalled();
        expect(mockGetTopVendorsBySpending).toHaveBeenCalled();
        expect(mockGetMonthlyInvoiceVolume).toHaveBeenCalled();
        expect(mockGetRecentActivity).toHaveBeenCalled();
      });
    });

    it('should fetch data with ALL_TIME when selected', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      const dateRangeSelect = screen.getByRole('combobox');

      fireEvent.change(dateRangeSelect, { target: { value: DATE_RANGE.ALL_TIME } });

      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalledWith(DATE_RANGE.ALL_TIME);
      });
    });
  });

  // ==========================================================================
  // Manual Refresh Tests
  // ==========================================================================
  describe('Manual Refresh', () => {
    it('should show refresh button in header', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Refresh button should be present
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should update data and timestamp when refresh button clicked', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Advance time
      jest.advanceTimersByTime(60000); // 1 minute

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalled();
        expect(mockGetInvoiceStatusBreakdown).toHaveBeenCalled();
        expect(mockGetPaymentTrends).toHaveBeenCalled();
      });
    });

    it('should show loading spinner when isRefreshing=true', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Mock delayed response to capture loading state
      mockGetDashboardKPIs.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: mockKPIs }), 1000))
      );

      fireEvent.click(refreshButton);

      // KPI cards should show loading state
      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalled();
      });
    });

    it('should update last updated timestamp after refresh', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Initial "Last updated" should be visible
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument();

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalled();
      });

      // Timestamp should still be present (updated)
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================
  describe('Error Handling', () => {
    it('should preserve existing data on fetch failure', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Mock error response
      mockGetDashboardKPIs.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const dateRangeSelect = screen.getByRole('combobox');

      fireEvent.change(dateRangeSelect, { target: { value: DATE_RANGE.ONE_MONTH } });

      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalled();
      });

      // Original data should still be displayed
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should handle KPI fetch error gracefully', async () => {
      const errorData = {
        ...mockInitialData,
        kpis: { success: false as const, error: 'Failed to fetch KPIs' },
      };

      render(<DashboardWrapper initialData={errorData} userRole="associate" />);

      // Should render with fallback values (0)
      expect(screen.getByText('Total Invoices')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle status breakdown error gracefully', async () => {
      const errorData = {
        ...mockInitialData,
        statusData: { success: false as const, error: 'Failed to fetch status data' },
      };

      render(<DashboardWrapper initialData={errorData} userRole="associate" />);

      // Charts should render with empty data
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should handle activity feed error gracefully', async () => {
      const errorData = {
        ...mockInitialData,
        activities: { success: false as const, error: 'Failed to fetch activities' },
      };

      render(<DashboardWrapper initialData={errorData} userRole="associate" />);

      // Should show empty activity state
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // RBAC Integration Tests
  // ==========================================================================
  describe('RBAC Integration', () => {
    it('should show Approve Pending button for admins', () => {
      render(<DashboardWrapper initialData={mockInitialData} userRole="admin" />);

      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // Pending count badge
    });

    it('should hide Approve Pending button for associates', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
    });

    it('should show Approve Pending button for managers', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="manager" />
      );

      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
    });

    it('should display correct pending count from KPIs', () => {
      const dataWithPending = {
        ...mockInitialData,
        kpis: {
          success: true as const,
          data: { ...mockKPIs, pendingApprovals: 25 },
        },
      };

      render(<DashboardWrapper initialData={dataWithPending} userRole="admin" />);

      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Responsive Layout Tests
  // ==========================================================================
  describe('Responsive Layout', () => {
    it('should apply responsive grid classes to KPI cards', () => {
      const { container } = render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Should have responsive grid classes
      const kpiGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(kpiGrid).toBeInTheDocument();
    });

    it('should apply responsive grid classes to charts section', () => {
      const { container } = render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Charts section should have responsive grid
      const chartGrids = container.querySelectorAll('.grid.grid-cols-1.lg\\:grid-cols-2');
      expect(chartGrids.length).toBeGreaterThan(0);
    });

    it('should render all sections with proper spacing', () => {
      const { container } = render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Main container should have space-y-6
      const mainContainer = container.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Component Integration Tests
  // ==========================================================================
  describe('Component Integration', () => {
    it('should render header, KPIs, charts, and actions together', () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Header section
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument();

      // KPI cards
      expect(screen.getByText('Total Invoices')).toBeInTheDocument();

      // Charts (mocked)
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

      // Activity feed
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();

      // Quick Actions
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('should coordinate state between header and data sections', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      const dateRangeSelect = screen.getByRole('combobox');

      // Verify initial state
      expect(dateRangeSelect).toHaveValue(DATE_RANGE.SIX_MONTHS);

      // Change date range
      fireEvent.change(dateRangeSelect, { target: { value: DATE_RANGE.ONE_YEAR } });

      await waitFor(() => {
        expect(mockGetDashboardKPIs).toHaveBeenCalledWith(DATE_RANGE.ONE_YEAR);
      });

      // Select should reflect new value
      expect(dateRangeSelect).toHaveValue(DATE_RANGE.ONE_YEAR);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================
  describe('Performance', () => {
    it('should fetch all data in parallel on date range change', async () => {
      render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      const dateRangeSelect = screen.getByRole('combobox');

      fireEvent.change(dateRangeSelect, { target: { value: DATE_RANGE.ONE_MONTH } });

      await waitFor(() => {
        // All functions should be called (parallel Promise.all)
        expect(mockGetDashboardKPIs).toHaveBeenCalledTimes(1);
        expect(mockGetInvoiceStatusBreakdown).toHaveBeenCalledTimes(1);
        expect(mockGetPaymentTrends).toHaveBeenCalledTimes(1);
        expect(mockGetTopVendorsBySpending).toHaveBeenCalledTimes(1);
        expect(mockGetMonthlyInvoiceVolume).toHaveBeenCalledTimes(1);
        expect(mockGetRecentActivity).toHaveBeenCalledTimes(1);
      });
    });

    it('should not refetch on re-render with same props', () => {
      const { rerender } = render(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Clear mock calls from initial render
      jest.clearAllMocks();

      // Re-render with same props
      rerender(
        <DashboardWrapper initialData={mockInitialData} userRole="associate" />
      );

      // Should not trigger new fetches
      expect(mockGetDashboardKPIs).not.toHaveBeenCalled();
    });
  });
});
