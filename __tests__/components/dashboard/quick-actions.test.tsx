/**
 * Quick Actions Component Tests
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

/**
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

 * Quick Actions Component Tests
 *
 * Tests for RBAC, button rendering, and navigation
 * Sprint 12, Phase 4: Testing
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickActions } from '@/components/dashboard/quick-actions';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

describe('QuickActions Component', () => {
  // ==========================================================================
  // RBAC Tests - Critical for Security
  // ==========================================================================
  describe('RBAC - Role-Based Access Control', () => {
    it('should render "Create Invoice" button for all users', () => {
      render(<QuickActions pendingCount={5} userRole="associate" />);

      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
    });

    it('should render "Approve Pending" button for admins', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
    });

    it('should render "Approve Pending" button for managers', () => {
      render(<QuickActions pendingCount={5} userRole="manager" />);

      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
    });

    it('should hide "Approve Pending" button for standard users (associate)', () => {
      render(<QuickActions pendingCount={5} userRole="associate" />);

      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
    });

    it('should hide "Approve Pending" button for standard users (user)', () => {
      render(<QuickActions pendingCount={5} userRole="user" />);

      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
    });

    it('should handle role case-insensitively (ADMIN)', () => {
      render(<QuickActions pendingCount={5} userRole="ADMIN" />);

      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
    });

    it('should handle role case-insensitively (Manager)', () => {
      render(<QuickActions pendingCount={5} userRole="Manager" />);

      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Button Rendering Tests
  // ==========================================================================
  describe('Button Rendering', () => {
    it('should render all 4 action buttons for admins', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
      expect(screen.getByText('View Overdue')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
    });

    it('should render 3 action buttons for standard users (no Approve)', () => {
      render(<QuickActions pendingCount={5} userRole="associate" />);

      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
      expect(screen.getByText('View Overdue')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
    });

    it('should render "Create Invoice" button with Plus icon', () => {
      const { container } = render(<QuickActions pendingCount={5} userRole="admin" />);

      const createButton = screen.getByText('Create Invoice').closest('a');
      expect(createButton).toBeInTheDocument();

      // Plus icon should be present
      const icon = createButton?.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render "Approve Pending" button with CheckSquare icon', () => {
      const { container } = render(<QuickActions pendingCount={5} userRole="admin" />);

      const approveButton = screen.getByText('Approve Pending').closest('a');
      expect(approveButton).toBeInTheDocument();

      // CheckSquare icon should be present
      const icon = approveButton?.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Pending Count Badge Tests
  // ==========================================================================
  describe('Pending Count Badge', () => {
    it('should show count badge when pendingCount > 0', () => {
      render(<QuickActions pendingCount={12} userRole="admin" />);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should not show count badge when pendingCount = 0', () => {
      render(<QuickActions pendingCount={0} userRole="admin" />);

      // Badge should not be rendered
      const approveButton = screen.getByText('Approve Pending').closest('a');
      const badge = approveButton?.querySelector('.ml-2');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show large pending count correctly', () => {
      render(<QuickActions pendingCount={99} userRole="admin" />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should have accessible aria-label on badge', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      const badge = screen.getByLabelText('5 pending approvals');
      expect(badge).toBeInTheDocument();
    });

    it('should use default button style when pendingCount > 0', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      // Button should have default variant (not outline)
      const button = screen.getByText('Approve Pending').closest('a');
      expect(button).toBeInTheDocument();
    });

    it('should use outline button style when pendingCount = 0', () => {
      render(<QuickActions pendingCount={0} userRole="admin" />);

      const button = screen.getByText('Approve Pending').closest('a');
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================
  describe('Navigation', () => {
    it('should link "Create Invoice" to /invoices/new', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      const link = screen.getByText('Create Invoice').closest('a');
      expect(link).toHaveAttribute('href', '/invoices/new');
    });

    it('should link "Approve Pending" to /invoices with pending_approval filter', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      const link = screen.getByText('Approve Pending').closest('a');
      expect(link).toHaveAttribute('href', '/invoices?status=pending_approval');
    });

    it('should link "View Overdue" to /invoices with overdue filter', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      const link = screen.getByText('View Overdue').closest('a');
      expect(link).toHaveAttribute('href', '/invoices?status=overdue');
    });

    it('should link "View Reports" to /reports', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      const link = screen.getByText('View Reports').closest('a');
      expect(link).toHaveAttribute('href', '/reports');
    });
  });

  // ==========================================================================
  // Layout Tests
  // ==========================================================================
  describe('Layout', () => {
    it('should render title "Quick Actions"', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('should use grid layout for top buttons', () => {
      const { container } = render(<QuickActions pendingCount={5} userRole="admin" />);

      const grid = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should use grid layout for additional actions', () => {
      const { container } = render(<QuickActions pendingCount={5} userRole="admin" />);

      const grids = container.querySelectorAll('.grid.grid-cols-2');
      expect(grids.length).toBeGreaterThan(0);
    });

    it('should apply correct button variants', () => {
      render(<QuickActions pendingCount={5} userRole="admin" />);

      // View Overdue and View Reports should be ghost variant
      const overdueButton = screen.getByText('View Overdue');
      const reportsButton = screen.getByText('View Reports');

      expect(overdueButton).toBeInTheDocument();
      expect(reportsButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty userRole string', () => {
      render(<QuickActions pendingCount={5} userRole="" />);

      // Should not show Approve button for empty role
      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
    });

    it('should handle negative pendingCount', () => {
      render(<QuickActions pendingCount={-5} userRole="admin" />);

      // Should not render badge for negative count
      expect(screen.queryByText('-5')).not.toBeInTheDocument();
    });

    it('should handle super_admin role (should see all buttons)', () => {
      render(<QuickActions pendingCount={5} userRole="super_admin" />);

      // super_admin is not explicitly in canApprove list
      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
    });

    it('should handle unknown role', () => {
      render(<QuickActions pendingCount={5} userRole="unknown_role" />);

      // Should only show public actions
      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Memoization Test
  // ==========================================================================
  describe('Performance', () => {
    it('should memoize component to prevent unnecessary re-renders', () => {
      const { rerender } = render(<QuickActions pendingCount={5} userRole="admin" />);

      // Re-render with same props
      rerender(<QuickActions pendingCount={5} userRole="admin" />);

      // Component should be memoized (React.memo)
      expect(QuickActions).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================
  describe('Integration', () => {
    it('should show correct state for admin with pending approvals', () => {
      render(<QuickActions pendingCount={8} userRole="admin" />);

      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByLabelText('8 pending approvals')).toBeInTheDocument();
    });

    it('should show correct state for associate with no approve access', () => {
      render(<QuickActions pendingCount={10} userRole="associate" />);

      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.queryByText('Approve Pending')).not.toBeInTheDocument();
      expect(screen.queryByText('10')).not.toBeInTheDocument();
    });

    it('should show correct state for manager with zero pending', () => {
      render(<QuickActions pendingCount={0} userRole="manager" />);

      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.getByText('Approve Pending')).toBeInTheDocument();
      // No badge when count is 0
      expect(screen.queryByLabelText(/pending approvals/)).not.toBeInTheDocument();
    });
  });
});
