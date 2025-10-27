'use client';

import { useState, useEffect } from 'react';
import { getUserById, deactivateUser, reactivateUser } from '@/lib/actions/user-management';
import type { UserDetailed } from '@/lib/types/user-management';
import { UserStatusBadge, LastSuperAdminWarningDialog } from '@/components/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, KeyRound, Ban, CheckCircle, X, Loader2 } from 'lucide-react';

interface UserDetailPanelProps {
  userId: number;
  onClose: () => void;
  onEdit: () => void;
  onPasswordReset: () => void;
  onRefresh?: () => void;
}

export function UserDetailPanel({
  userId,
  onClose,
  onEdit,
  onPasswordReset,
  onRefresh,
}: UserDetailPanelProps) {
  const [user, setUser] = useState<UserDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isLastSuperAdmin, setIsLastSuperAdmin] = useState(false);
  const [showLastSuperAdminWarning, setShowLastSuperAdminWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUser() {
      setIsLoading(true);
      setError(null);

      const result = await getUserById(userId);

      if (result.success) {
        setUser(result.data);
        // Check if last super admin
        if (result.data.role === 'super_admin') {
          const { isLastSuperAdmin: checkIsLast } = await import('@/lib/auth');
          const isLast = await checkIsLast(userId);
          setIsLastSuperAdmin(isLast);
        }
      } else {
        setError(result.error);
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }

      setIsLoading(false);
    }

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleToggleStatus() {
    if (!user) return;

    // Show warning dialog if trying to deactivate last super admin
    if (user.is_active && isLastSuperAdmin) {
      setShowLastSuperAdminWarning(true);
      return;
    }

    setIsDeactivating(true);

    const result = user.is_active
      ? await deactivateUser(userId)
      : await reactivateUser(userId);

    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      });
      setUser({ ...user, is_active: !user.is_active });
      onRefresh?.();
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }

    setIsDeactivating(false);
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[350px] border-l bg-background shadow-lg z-40">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">User Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto h-[calc(100vh-64px)] p-4 space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-sm text-destructive p-4 rounded-md bg-destructive/10">
            {error}
          </div>
        )}

        {/* User Data */}
        {user && (
          <>
            {/* Info Card */}
            <Card className="p-4 space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="font-medium">{user.full_name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p>{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Role</label>
                <p className="capitalize">{getRoleLabel(user.role)}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <div className="mt-1">
                  <UserStatusBadge status={user.is_active ? 'active' : 'inactive'} />
                </div>
              </div>
            </Card>

            {/* Statistics Card */}
            <Card className="p-4 space-y-2">
              <h3 className="font-medium mb-2">Statistics</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoices Created</span>
                <span className="font-medium">{user.created_invoices_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comments</span>
                <span className="font-medium">{user.comments_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Attachments</span>
                <span className="font-medium">{user.attachments_count}</span>
              </div>
            </Card>

            {/* Recent Activity Card */}
            <Card className="p-4">
              <h3 className="font-medium mb-2">Recent Activity</h3>
              {user.audit_history && user.audit_history.length > 0 ? (
                <div className="space-y-2">
                  {user.audit_history.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="text-sm pb-2 border-b last:border-0">
                      <p className="text-muted-foreground">
                        {getEventLabel(event.event_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onEdit}
                disabled={isDeactivating}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit User
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onPasswordReset}
                disabled={!user.is_active || isDeactivating}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </Button>

              <Button
                variant={user.is_active ? 'destructive' : 'default'}
                className="w-full justify-start"
                onClick={handleToggleStatus}
                disabled={isDeactivating}
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {user.is_active ? 'Deactivating...' : 'Reactivating...'}
                  </>
                ) : (
                  <>
                    {user.is_active ? (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Deactivate User
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Reactivate User
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Last Super Admin Warning Dialog */}
      {user && (
        <LastSuperAdminWarningDialog
          open={showLastSuperAdminWarning}
          onClose={() => setShowLastSuperAdminWarning(false)}
          action="deactivate"
          userName={user.full_name}
        />
      )}
    </div>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    standard_user: 'Standard User',
  };
  return labels[role] || role;
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    user_created: 'User created',
    user_updated: 'User updated',
    user_deactivated: 'User deactivated',
    user_reactivated: 'User reactivated',
    user_role_changed: 'Role changed',
    user_password_reset: 'Password reset',
    user_email_changed: 'Email changed',
  };
  return labels[eventType] || eventType;
}

function formatRelativeTime(dateString: Date | string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
