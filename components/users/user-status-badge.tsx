/**
 * User Status Badge Component
 * Displays user status with semantic colors
 *
 * Sprint 11: Updated to support unified status system
 * - pending: Yellow - Invited but not yet accepted
 * - active: Green - Active user
 * - deactivated: Gray - Deactivated by admin
 * - deleted: Red - Soft deleted (can be restored)
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, UserX, Trash2 } from 'lucide-react';
import type { UserStatus } from '@/lib/types/user-management';
import { USER_STATUSES } from '@/lib/types/user-management';

export interface UserStatusBadgeProps {
  status: UserStatus;
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<UserStatus, {
  variant: 'success' | 'warning' | 'destructive' | 'secondary';
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: { variant: 'warning', icon: Clock },
  active: { variant: 'success', icon: Check },
  deactivated: { variant: 'secondary', icon: UserX },
  deleted: { variant: 'destructive', icon: Trash2 },
};

/**
 * UserStatusBadge
 *
 * Renders a badge indicating the user's status.
 * Uses semantic color variants from the design system:
 * - Pending: warning variant (yellow)
 * - Active: success variant (green)
 * - Deactivated: secondary variant (gray)
 * - Deleted: destructive variant (red)
 *
 * @param status - The user's status ('pending' | 'active' | 'deactivated' | 'deleted')
 * @param showIcon - Whether to show an icon alongside the label
 * @param className - Optional additional CSS classes
 *
 * @example
 * ```tsx
 * <UserStatusBadge status="active" />
 * <UserStatusBadge status="pending" showIcon />
 * <UserStatusBadge status="deleted" />
 * ```
 */
export default function UserStatusBadge({
  status,
  showIcon = false,
  className
}: UserStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  const label = USER_STATUSES[status] || status;

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
