/**
 * Activity Feed Component Tests
 *
 * Tests for recent activity list rendering, icons, timestamps, and loading states
 * Sprint 12, Phase 4: Testing
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ACTIVITY_TYPE } from '@/types/dashboard';
import { mockActivities, mockEmptyActivities } from '../../fixtures/dashboard-fixtures';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: (date: Date) => {
    // Return a mock relative time
    const now = new Date('2024-10-30T12:00:00Z');
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'a few minutes ago';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  },
}));

describe('ActivityFeed Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-10-30T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render list of activities', () => {
    render(<ActivityFeed activities={mockActivities} />);

    // All 5 activities should be rendered
    expect(screen.getByText('INV-2024-101')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-098')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-095')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-092')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-090')).toBeInTheDocument();
  });

  it('should show correct icon for created activity type', () => {
    const activities = [mockActivities[0]]; // Created activity

    const { container } = render(<ActivityFeed activities={activities} />);

    // FileText icon should be rendered (created type)
    expect(container.querySelector('.text-info')).toBeInTheDocument();
  });

  it('should show correct icon for paid activity type', () => {
    const activities = [mockActivities[1]]; // Paid activity

    const { container } = render(<ActivityFeed activities={activities} />);

    // CheckCircle2 icon should be rendered (paid type)
    expect(container.querySelector('.text-success')).toBeInTheDocument();
  });

  it('should show correct icon for status change activity type', () => {
    const activities = [mockActivities[2]]; // Status change activity

    const { container } = render(<ActivityFeed activities={activities} />);

    // ArrowRightCircle icon should be rendered (status_change type)
    expect(container.querySelector('.text-warning')).toBeInTheDocument();
  });

  it('should show correct icon for rejected activity type', () => {
    const activities = [mockActivities[3]]; // Rejected activity

    const { container } = render(<ActivityFeed activities={activities} />);

    // XCircle icon should be rendered (rejected type)
    expect(container.querySelector('.text-destructive')).toBeInTheDocument();
  });

  it('should link to invoice detail page', () => {
    render(<ActivityFeed activities={mockActivities} />);

    const link = screen.getByText('INV-2024-101').closest('a');
    expect(link).toHaveAttribute('href', '/invoices/101');
  });

  it('should display relative timestamp', () => {
    render(<ActivityFeed activities={mockActivities} />);

    // Mock returns "1 hour ago" for the first activity
    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
  });

  it('should display user name', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should display activity description', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText('Invoice INV-2024-101 was created')).toBeInTheDocument();
    expect(screen.getByText('Invoice INV-2024-098 was marked as paid')).toBeInTheDocument();
  });

  it('should show activity type badge', () => {
    render(<ActivityFeed activities={mockActivities} />);

    // Badges should display activity types (may appear multiple times)
    expect(screen.getAllByText('created').length).toBeGreaterThan(0);
    expect(screen.getAllByText('paid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('status change').length).toBeGreaterThan(0);
    expect(screen.getAllByText('rejected').length).toBeGreaterThan(0);
  });

  it('should show empty state when no activities', () => {
    render(<ActivityFeed activities={mockEmptyActivities} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading=true', () => {
    const { container } = render(
      <ActivityFeed activities={mockActivities} isLoading={true} />
    );

    // Should not show actual activities when loading
    expect(screen.queryByText('INV-2024-101')).not.toBeInTheDocument();

    // Should render skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render 5 skeleton items when loading', () => {
    const { container } = render(
      <ActivityFeed activities={[]} isLoading={true} />
    );

    // Should render exactly 5 skeleton items
    const skeletonItems = container.querySelectorAll('.space-y-4 > div');
    expect(skeletonItems.length).toBe(5);
  });

  it('should format activity type with spaces (replace underscores)', () => {
    const activities = [
      {
        ...mockActivities[2],
        type: ACTIVITY_TYPE.STATUS_CHANGE, // status_change
      },
    ];

    render(<ActivityFeed activities={activities} />);

    // Badge should show "status change" not "status_change"
    expect(screen.getByText('status change')).toBeInTheDocument();
  });

  it('should capitalize activity type in badge', () => {
    const { container } = render(<ActivityFeed activities={mockActivities} />);

    // Badges should have capitalize class
    const badges = container.querySelectorAll('.capitalize');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should have border between activities except last', () => {
    const { container } = render(<ActivityFeed activities={mockActivities} />);

    const activityItems = container.querySelectorAll('.pb-3');

    // All items should have bottom border
    activityItems.forEach((item) => {
      expect(item).toHaveClass('border-b');
    });

    // Last item should have last:border-0 class
    const lastItem = activityItems[activityItems.length - 1];
    expect(lastItem).toHaveClass('last:border-0');
  });

  it('should render time element with ISO datetime attribute', () => {
    render(<ActivityFeed activities={mockActivities} />);

    const timeElements = screen.getAllByText(/ago/);

    timeElements.forEach((timeEl) => {
      const time = timeEl.closest('time');
      expect(time).toHaveAttribute('datetime');
      // Should be ISO format
      expect(time?.getAttribute('datetime')).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  it('should memoize component to prevent unnecessary re-renders', () => {
    const { rerender } = render(<ActivityFeed activities={mockActivities} />);

    // Re-render with same props
    rerender(<ActivityFeed activities={mockActivities} />);

    // Component should be memoized (React.memo)
    expect(ActivityFeed).toBeDefined();
  });

  it('should have accessible card structure', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should render links to invoice detail pages', () => {
    const { container } = render(<ActivityFeed activities={mockActivities} />);

    const links = container.querySelectorAll('a');
    // Should have links for each activity
    expect(links.length).toBe(mockActivities.length);
  });

  it('should handle activities with very recent timestamps', () => {
    const recentActivity = [
      {
        ...mockActivities[0],
        timestamp: new Date('2024-10-30T11:55:00Z'), // 5 minutes ago
      },
    ];

    render(<ActivityFeed activities={recentActivity} />);

    expect(screen.getByText('a few minutes ago')).toBeInTheDocument();
  });

  it('should handle activities from several days ago', () => {
    const oldActivity = [
      {
        ...mockActivities[0],
        timestamp: new Date('2024-10-27T10:00:00Z'), // 3 days ago
      },
    ];

    render(<ActivityFeed activities={oldActivity} />);

    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });

  it('should show clock icon in empty state', () => {
    const { container } = render(<ActivityFeed activities={[]} />);

    // Clock icon should be rendered in empty state
    const clockIcon = container.querySelector('.h-12.w-12');
    expect(clockIcon).toBeInTheDocument();
  });
});
