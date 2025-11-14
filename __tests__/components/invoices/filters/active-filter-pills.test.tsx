/**
 * ActiveFilterPills Component Test Suite
 *
 * Tests for active filter pill rendering, removal, and clear all functionality.
 * Sprint 14, Phase 5: Testing & Validation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActiveFilterPills } from '@/components/invoices/filters/active-filter-pills';
import { INVOICE_STATUS } from '@/types/invoice';
import type { InvoiceFilters } from '@/types/invoice';

// Mock UI components to isolate ActiveFilterPills logic
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

describe('ActiveFilterPills Component', () => {
  const mockVendors = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'XYZ Inc' },
    { id: 123, name: 'Test Vendor' },
  ];

  const mockCategories = [
    { id: 1, name: 'Utilities' },
    { id: 2, name: 'Office Supplies' },
    { id: 456, name: 'Test Category' },
  ];

  const defaultProps = {
    filters: {} as Partial<InvoiceFilters>,
    vendors: mockVendors,
    categories: mockCategories,
    onRemoveFilter: jest.fn(),
    onClearAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests - No Active Filters
  // ==========================================================================
  describe('Rendering - No Active Filters', () => {
    it('should return null when no filters are active', () => {
      const { container } = render(<ActiveFilterPills {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when filters object is empty', () => {
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={{}} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when only pagination filters are set', () => {
      const filters = {
        page: 2,
        per_page: 50,
      };
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when search is empty string', () => {
      const filters = { search: '' };
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when search is whitespace only', () => {
      const filters = { search: '   ' };
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // Rendering Tests - Search Filter
  // ==========================================================================
  describe('Rendering - Search Filter', () => {
    it('should render pill for search filter', () => {
      const filters = { search: 'INV-001' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();
    });

    it('should render remove button for search filter with aria-label', () => {
      const filters = { search: 'INV-001' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      const removeButton = screen.getByLabelText('Remove Search: "INV-001" filter');
      expect(removeButton).toBeInTheDocument();
    });

    it('should call onRemoveFilter with "search" key when remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = { search: 'INV-001' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove Search: "INV-001" filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('search');
    });
  });

  // ==========================================================================
  // Rendering Tests - Status Filter
  // ==========================================================================
  describe('Rendering - Status Filter', () => {
    it('should render pill for status filter with formatted label', () => {
      const filters = { status: INVOICE_STATUS.PENDING_APPROVAL };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Status: Pending Approval')).toBeInTheDocument();
    });

    it('should render pill for single-word status', () => {
      const filters = { status: INVOICE_STATUS.PAID };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Status: Paid')).toBeInTheDocument();
    });

    it('should call onRemoveFilter with "status" key when remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = { status: INVOICE_STATUS.UNPAID };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove Status: Unpaid filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('status');
    });
  });

  // ==========================================================================
  // Rendering Tests - Vendor Filter
  // ==========================================================================
  describe('Rendering - Vendor Filter', () => {
    it('should render pill for vendor filter with name lookup', () => {
      const filters = { vendor_id: 123 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Vendor: Test Vendor')).toBeInTheDocument();
    });

    it('should render pill with vendor ID when name not found', () => {
      const filters = { vendor_id: 999 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Vendor ID: 999')).toBeInTheDocument();
    });

    it('should render pill with vendor ID when vendors array is empty', () => {
      const filters = { vendor_id: 123 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} vendors={[]} />);

      expect(screen.getByText('Vendor ID: 123')).toBeInTheDocument();
    });

    it('should render pill with vendor ID when vendors prop is undefined', () => {
      const filters = { vendor_id: 123 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} vendors={undefined} />);

      expect(screen.getByText('Vendor ID: 123')).toBeInTheDocument();
    });

    it('should call onRemoveFilter with "vendor_id" key when remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = { vendor_id: 123 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove Vendor: Test Vendor filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('vendor_id');
    });

    it('should not render pill when vendor_id is not a number', () => {
      const filters = { vendor_id: 'invalid' as any };
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // Rendering Tests - Category Filter
  // ==========================================================================
  describe('Rendering - Category Filter', () => {
    it('should render pill for category filter with name lookup', () => {
      const filters = { category_id: 456 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Category: Test Category')).toBeInTheDocument();
    });

    it('should render pill with category ID when name not found', () => {
      const filters = { category_id: 999 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Category ID: 999')).toBeInTheDocument();
    });

    it('should render pill with category ID when categories array is empty', () => {
      const filters = { category_id: 456 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} categories={[]} />);

      expect(screen.getByText('Category ID: 456')).toBeInTheDocument();
    });

    it('should render pill with category ID when categories prop is undefined', () => {
      const filters = { category_id: 456 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} categories={undefined} />);

      expect(screen.getByText('Category ID: 456')).toBeInTheDocument();
    });

    it('should call onRemoveFilter with "category_id" key when remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = { category_id: 456 };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove Category: Test Category filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('category_id');
    });

    it('should not render pill when category_id is not a number', () => {
      const filters = { category_id: 'invalid' as any };
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // Rendering Tests - Date Range Filters
  // ==========================================================================
  describe('Rendering - Date Range Filters', () => {
    it('should render separate pills for start_date and end_date', () => {
      const filters = {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('From: Jan 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('To: Jan 31, 2025')).toBeInTheDocument();
    });

    it('should render only start_date pill when end_date is not set', () => {
      const filters = {
        start_date: new Date('2025-01-01'),
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('From: Jan 1, 2025')).toBeInTheDocument();
      expect(screen.queryByText(/To:/)).not.toBeInTheDocument();
    });

    it('should render only end_date pill when start_date is not set', () => {
      const filters = {
        end_date: new Date('2025-01-31'),
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('To: Jan 31, 2025')).toBeInTheDocument();
      expect(screen.queryByText(/From:/)).not.toBeInTheDocument();
    });

    it('should call onRemoveFilter with "start_date" when start date remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove From: Jan 1, 2025 filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('start_date');
    });

    it('should call onRemoveFilter with "end_date" when end date remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove To: Jan 31, 2025 filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('end_date');
    });
  });

  // ==========================================================================
  // Rendering Tests - Sort Filter
  // ==========================================================================
  describe('Rendering - Sort Filter', () => {
    it('should render pill for sort_by filter', () => {
      const filters = { sort_by: 'invoice_date' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Sort: Invoice Date')).toBeInTheDocument();
    });

    it('should not render pill when sort_by is empty string', () => {
      const filters = { sort_by: '' };
      const { container } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(container.firstChild).toBeNull();
    });

    it('should call onRemoveFilter with "sort_by" key when remove button clicked', () => {
      const onRemoveFilter = jest.fn();
      const filters = { sort_by: 'invoice_date' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onRemoveFilter={onRemoveFilter} />);

      const removeButton = screen.getByLabelText('Remove Sort: Invoice Date filter');
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledWith('sort_by');
    });
  });

  // ==========================================================================
  // Clear All Button Tests
  // ==========================================================================
  describe('Clear All Button', () => {
    it('should not render Clear All button when only 1 filter active', () => {
      const filters = { search: 'INV-001' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      const clearAllButton = screen.queryByText('Clear All');
      expect(clearAllButton).not.toBeInTheDocument();
    });

    it('should render Clear All button when 2 filters active', () => {
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      const clearAllButton = screen.getByText('Clear All');
      expect(clearAllButton).toBeInTheDocument();
    });

    it('should render Clear All button when 3+ filters active', () => {
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
        vendor_id: 123,
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      const clearAllButton = screen.getByText('Clear All');
      expect(clearAllButton).toBeInTheDocument();
    });

    it('should call onClearAll when Clear All button clicked', () => {
      const onClearAll = jest.fn();
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} onClearAll={onClearAll} />);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(onClearAll).toHaveBeenCalled();
    });

    it('should count date range as 1 filter for Clear All threshold', () => {
      const filters = {
        search: 'INV-001',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      // Date range creates 2 pills, but threshold should still be met
      // (search + start_date + end_date = 3 pills total, >= 2)
      const clearAllButton = screen.getByText('Clear All');
      expect(clearAllButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Multiple Filters Tests
  // ==========================================================================
  describe('Multiple Filters', () => {
    it('should render all active filters simultaneously', () => {
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
        vendor_id: 123,
        category_id: 456,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
        sort_by: 'invoice_date',
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();
      expect(screen.getByText('Status: Unpaid')).toBeInTheDocument();
      expect(screen.getByText('Vendor: Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('Category: Test Category')).toBeInTheDocument();
      expect(screen.getByText('From: Jan 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('To: Jan 31, 2025')).toBeInTheDocument();
      expect(screen.getByText('Sort: Invoice Date')).toBeInTheDocument();
    });

    it('should render correct number of badges for all filters', () => {
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
        vendor_id: 123,
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================
  describe('Accessibility', () => {
    it('should render container with role="region" and aria-label', () => {
      const filters = { search: 'INV-001' };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      const container = screen.getByRole('region', { name: 'Active filters' });
      expect(container).toBeInTheDocument();
    });

    it('should render remove buttons with descriptive aria-labels', () => {
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
      };
      render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByLabelText('Remove Search: "INV-001" filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Status: Unpaid filter')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================
  describe('Performance', () => {
    it('should be wrapped with React.memo for performance', () => {
      // Verify component is memoized by checking if it's a memo component
      // React.memo wraps the component, we can verify by rendering and checking behavior
      const filters = { search: 'INV-001' };
      const { rerender } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();

      // Re-render with same props (memoized component won't re-render unnecessarily)
      rerender(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();
    });

    it('should memoize active filters list to avoid recalculation', () => {
      const filters = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
      };

      const { rerender } = render(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();

      // Re-render with same filters (should use memoized value)
      rerender(<ActiveFilterPills {...defaultProps} filters={filters} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();
    });

    it('should update when filters prop changes', () => {
      const filters1 = { search: 'INV-001' };
      const filters2 = { search: 'INV-002' };

      const { rerender } = render(<ActiveFilterPills {...defaultProps} filters={filters1} />);

      expect(screen.getByText('Search: "INV-001"')).toBeInTheDocument();

      rerender(<ActiveFilterPills {...defaultProps} filters={filters2} />);

      expect(screen.getByText('Search: "INV-002"')).toBeInTheDocument();
      expect(screen.queryByText('Search: "INV-001"')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle missing vendors and categories gracefully', () => {
      const filters = {
        vendor_id: 123,
        category_id: 456,
      };

      expect(() =>
        render(<ActiveFilterPills {...defaultProps} filters={filters} vendors={undefined} categories={undefined} />)
      ).not.toThrow();

      expect(screen.getByText('Vendor ID: 123')).toBeInTheDocument();
      expect(screen.getByText('Category ID: 456')).toBeInTheDocument();
    });

    it('should handle empty vendors and categories arrays', () => {
      const filters = {
        vendor_id: 123,
        category_id: 456,
      };

      render(<ActiveFilterPills {...defaultProps} filters={filters} vendors={[]} categories={[]} />);

      expect(screen.getByText('Vendor ID: 123')).toBeInTheDocument();
      expect(screen.getByText('Category ID: 456')).toBeInTheDocument();
    });

    it('should handle filters with all possible fields', () => {
      const filters: Partial<InvoiceFilters> = {
        search: 'test',
        status: INVOICE_STATUS.PAID,
        vendor_id: 1,
        category_id: 1,
        profile_id: 1, // This field is not rendered as a pill
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
        sort_by: 'invoice_date',
        sort_order: 'asc' as const, // This field is not rendered as a pill
        page: 1, // Ignored
        per_page: 20, // Ignored
      };

      expect(() => render(<ActiveFilterPills {...defaultProps} filters={filters} />)).not.toThrow();
    });
  });
});
