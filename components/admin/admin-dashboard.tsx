/**
 * Admin Dashboard Component
 *
 * Displays admin statistics, pending approvals count, and recent actions.
 * Placeholder for Sprint 9A Phase 4 - to be enhanced in future sprints.
 */

'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { getPendingRequestCount } from '@/app/actions/admin/master-data-approval';

export default function AdminDashboard() {
  const [pendingCount, setPendingCount] = React.useState(0);

  const loadPendingCount = React.useCallback(async () => {
    try {
      const result = await getPendingRequestCount();
      if (result.success) {
        setPendingCount(result.data);
      }
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  }, []);

  React.useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  return (
    <div className="space-y-6">
      {/* Coming Soon Notice */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-xl font-semibold text-blue-900">Admin Dashboard - Coming Soon</h2>
        <p className="mt-2 text-sm text-blue-700">
          This dashboard will display comprehensive admin statistics, pending approvals, and recent actions.
        </p>
      </Card>

      {/* Stats Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700 font-medium">Pending Requests</p>
          <p className="text-4xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-xs text-amber-600 mt-1">Awaiting admin review</p>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <p className="text-sm text-green-700 font-medium">Approved Today</p>
          <p className="text-4xl font-bold text-green-600 mt-2">-</p>
          <p className="text-xs text-green-600 mt-1">Coming soon</p>
        </Card>

        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-700 font-medium">Rejected Today</p>
          <p className="text-4xl font-bold text-red-600 mt-2">-</p>
          <p className="text-xs text-red-600 mt-1">Coming soon</p>
        </Card>
      </div>

      {/* Recent Actions Placeholder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Actions</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>Recent admin actions will be displayed here</p>
          <p className="text-sm mt-2">Coming in future sprint</p>
        </div>
      </Card>

      {/* Quick Links */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            View All Requests
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            Manage Vendors
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            Manage Categories
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            System Settings
          </button>
        </div>
      </Card>
    </div>
  );
}
