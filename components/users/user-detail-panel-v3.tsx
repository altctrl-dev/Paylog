/**
 * User Detail Panel V3 (Template B - Simple Detail)
 *
 * V3 redesign with:
 * - PanelSummaryHeader with status badge
 * - Vertical action bar (right side)
 * - PanelSection for grouped content
 * - PanelStatGroup for statistics
 * - Clean footer with only Close button
 *
 * Width: MEDIUM (650px)
 */

'use client';

import * as React from 'react';
import { getUserById, deactivateUser, reactivateUser } from '@/lib/actions/user-management';
import type { UserDetailed } from '@/lib/types/user-management';
import { UserStatusBadge, LastSuperAdminWarningDialog } from '@/components/users';
import { PanelLevel } from '@/components/panels/panel-level';
import {
  PanelSummaryHeader,
  PanelActionBar,
  PanelSection,
  PanelStatGroup,
  type ActionBarAction,
  type StatItem,
} from '@/components/panels/shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Pencil, KeyRound, Ban, CheckCircle, Loader2, AlertCircle, Mail, Trash2, RotateCcw } from 'lucide-react';
import type { PanelConfig } from '@/types/panel';

interface UserDetailPanelV3Props {
  config: PanelConfig;
  userId: number;
  onClose: () => void;
  onEdit: () => void;
  onPasswordReset: () => void;
  onResendInvite?: () => void;
  onDeleteUser?: () => void;
  onRestoreUser?: () => void;
  onRefresh?: () => void;
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

export function UserDetailPanelV3({
  config,
  userId,
  onClose,
  onEdit,
  onPasswordReset,
  onResendInvite,
  onDeleteUser,
  onRestoreUser,
  onRefresh,
}: UserDetailPanelV3Props) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<UserDetailed | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [isLastSuperAdmin, setIsLastSuperAdmin] = React.useState(false);
  const [showLastSuperAdminWarning, setShowLastSuperAdminWarning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchUser() {
      setIsLoading(true);
      setError(null);

      const result = await getUserById(userId);

      if (result.success) {
        setUser(result.data);
        // Check if last super admin
        if (result.data.role === 'super_admin') {
          const { checkIsLastSuperAdmin } = await import('@/lib/actions/user-management');
          const checkResult = await checkIsLastSuperAdmin(userId);
          if (checkResult.success) {
            setIsLastSuperAdmin(checkResult.data);
          }
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

  // ============================================================================
  // ACTION BAR CONFIG (Status-aware)
  // ============================================================================

  const primaryActions: ActionBarAction[] = React.useMemo(() => {
    if (!user) return [];

    // Pending users: Resend Invite
    if (user.status === 'pending') {
      const actions: ActionBarAction[] = [];
      if (onResendInvite) {
        actions.push({
          id: 'resend-invite',
          icon: <Mail />,
          label: 'Resend Invite',
          onClick: onResendInvite,
          disabled: isDeactivating,
        });
      }
      return actions;
    }

    // Active users: Edit + Password Reset (super_admin only)
    if (user.status === 'active') {
      const actions: ActionBarAction[] = [
        {
          id: 'edit',
          icon: <Pencil />,
          label: 'Edit User',
          onClick: onEdit,
          disabled: isDeactivating,
        },
      ];

      // Password reset only for super_admin (emergency access feature)
      if (user.role === 'super_admin') {
        actions.push({
          id: 'password-reset',
          icon: <KeyRound />,
          label: 'Reset Password',
          onClick: onPasswordReset,
          disabled: isDeactivating,
        });
      }

      return actions;
    }

    // Deactivated users: Edit only
    if (user.status === 'deactivated') {
      return [
        {
          id: 'edit',
          icon: <Pencil />,
          label: 'Edit User',
          onClick: onEdit,
          disabled: isDeactivating,
        },
      ];
    }

    // Deleted users: Restore
    if (user.status === 'deleted' && onRestoreUser) {
      return [
        {
          id: 'restore',
          icon: <RotateCcw />,
          label: 'Restore User',
          onClick: onRestoreUser,
          disabled: isDeactivating,
        },
      ];
    }

    return [];
  }, [user, isDeactivating, onEdit, onPasswordReset, onResendInvite, onRestoreUser]);

  const secondaryActions: ActionBarAction[] = React.useMemo(() => {
    if (!user) return [];

    // Pending users: Delete/Revoke invite
    if (user.status === 'pending' && onDeleteUser) {
      return [
        {
          id: 'revoke-invite',
          icon: <Trash2 />,
          label: 'Revoke Invite',
          onClick: onDeleteUser,
          disabled: isDeactivating,
          destructive: true,
        },
      ];
    }

    // Active users: Deactivate
    if (user.status === 'active') {
      return [
        {
          id: 'deactivate',
          icon: <Ban />,
          label: 'Deactivate User',
          onClick: handleToggleStatus,
          disabled: isDeactivating,
          destructive: true,
        },
      ];
    }

    // Deactivated users: Reactivate
    if (user.status === 'deactivated') {
      return [
        {
          id: 'reactivate',
          icon: <CheckCircle />,
          label: 'Reactivate User',
          onClick: handleToggleStatus,
          disabled: isDeactivating,
        },
      ];
    }

    return [];
  }, [user, isDeactivating, onDeleteUser, handleToggleStatus]);

  // ============================================================================
  // STATS CONFIG
  // ============================================================================

  const stats: StatItem[] = user
    ? [
        {
          label: 'Invoices Created',
          value: user.created_invoices_count.toString(),
        },
        {
          label: 'Comments',
          value: user.comments_count.toString(),
        },
        {
          label: 'Attachments',
          value: user.attachments_count.toString(),
        },
      ]
    : [];

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <div className="flex w-full justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PanelLevel>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error || !user) {
    return (
      <PanelLevel
        config={config}
        title="User Not Found"
        onClose={onClose}
        footer={
          <div className="flex w-full justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {error || 'Could not find the user.'}
          </p>
        </div>
      </PanelLevel>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PanelLevel
      config={config}
      title={user.full_name}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex h-full">
        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <PanelSummaryHeader
              title={user.full_name}
              subtitle={user.email}
              badges={[
                {
                  label: getRoleLabel(user.role),
                  variant: user.role === 'super_admin' ? 'default' : 'secondary',
                },
              ]}
            />
            <div className="mt-2">
              <UserStatusBadge status={user.status} />
            </div>
          </div>

          {/* Stats Section */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <PanelStatGroup stats={stats} columns={3} />
          </div>

          {/* Content Sections */}
          <div className="p-6 space-y-6">
            {/* User Details */}
            <PanelSection title="Details">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email
                  </label>
                  <p className="mt-1 text-sm font-medium">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Role
                  </label>
                  <p className="mt-1 text-sm font-medium">{getRoleLabel(user.role)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </label>
                  <div className="mt-1">
                    <UserStatusBadge status={user.status} />
                  </div>
                </div>
              </div>
            </PanelSection>

            {/* Recent Activity */}
            <PanelSection title="Recent Activity">
              {user.audit_history && user.audit_history.length > 0 ? (
                <div className="space-y-3">
                  {user.audit_history.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="pb-3 border-b last:border-0 last:pb-0">
                      <p className="text-sm text-foreground">
                        {getEventLabel(event.event_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </PanelSection>
          </div>
        </div>

        {/* Action Bar (right side) */}
        <div className="border-l bg-muted/20">
          <PanelActionBar
            primaryActions={primaryActions}
            secondaryActions={secondaryActions}
          />
        </div>
      </div>

      {/* Last Super Admin Warning Dialog */}
      <LastSuperAdminWarningDialog
        open={showLastSuperAdminWarning}
        onClose={() => setShowLastSuperAdminWarning(false)}
        action="deactivate"
        userName={user.full_name}
      />
    </PanelLevel>
  );
}

export default UserDetailPanelV3;
