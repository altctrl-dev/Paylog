/**
 * User Status Badge Component
 * Displays active/inactive status with semantic colors
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';

export interface UserStatusBadgeProps {
  status: 'active' | 'inactive';
  className?: string;
}

/**
 * UserStatusBadge
 *
 * Renders a badge indicating whether a user is active or inactive.
 * Uses semantic color variants from the design system:
 * - Active: success variant (green semantic color)
 * - Inactive: destructive variant (red semantic color)
 *
 * @param status - The user's status ('active' or 'inactive')
 * @param className - Optional additional CSS classes
 *
 * @example
 * ```tsx
 * <UserStatusBadge status="active" />
 * <UserStatusBadge status="inactive" />
 * ```
 */
export default function UserStatusBadge({
  status,
  className
}: UserStatusBadgeProps) {
  const variant = status === 'active' ? 'success' : 'destructive';
  const label = status === 'active' ? 'Active' : 'Inactive';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
