/**
 * Quick Actions Component
 * Action buttons for common dashboard tasks
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckSquare } from 'lucide-react';
import Link from 'next/link';

interface QuickActionsProps {
  pendingCount: number;
  userRole: string;
}

export const QuickActions = React.memo(function QuickActions({
  pendingCount,
  userRole,
}: QuickActionsProps) {
  // Role-based access control
  const canApprove = ['admin', 'manager'].includes(userRole.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Create Invoice Button */}
          <Button asChild className="w-full">
            <Link href="/invoices/new" className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Invoice</span>
            </Link>
          </Button>

          {/* Approve Pending Button (RBAC) */}
          {canApprove && (
            <Button
              asChild
              variant={pendingCount > 0 ? 'default' : 'outline'}
              className="w-full relative"
            >
              <Link
                href="/invoices?status=pending_approval"
                className="flex items-center justify-center gap-2"
              >
                <CheckSquare className="h-4 w-4" aria-hidden="true" />
                <span>Approve Pending</span>
                {pendingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 px-2 py-0.5 text-xs"
                    aria-label={`${pendingCount} pending approvals`}
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            </Button>
          )}
        </div>

        {/* Additional Actions (Future Enhancement) */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/invoices?status=overdue" className="text-sm">
              View Overdue
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/reports" className="text-sm">
              View Reports
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
