/**
 * Role Selector Component
 * Dropdown selector for user roles with proper type safety
 */

import * as React from 'react';
import { Select } from '@/components/ui/select';
import { UserRole, USER_ROLES } from '@/lib/types/user-management';

export interface RoleSelectorProps {
  value: UserRole;
  onChange: (value: UserRole) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * RoleSelector
 *
 * A type-safe dropdown selector for user roles.
 * Displays human-readable labels while maintaining type safety.
 *
 * Supported roles:
 * - super_admin → "Super Admin"
 * - admin → "Admin"
 * - standard_user → "Standard User"
 *
 * @param value - Currently selected role
 * @param onChange - Callback when role changes
 * @param disabled - Whether the selector is disabled (e.g., last super admin)
 * @param className - Optional additional CSS classes
 *
 * @example
 * ```tsx
 * <RoleSelector
 *   value="admin"
 *   onChange={(role) => updateUser({ role })}
 *   disabled={isLastSuperAdmin}
 * />
 * ```
 */
export default function RoleSelector({
  value,
  onChange,
  disabled = false,
  className,
}: RoleSelectorProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as UserRole);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={className}
    >
      {(Object.entries(USER_ROLES) as [UserRole, string][]).map(([roleKey, roleLabel]) => (
        <option key={roleKey} value={roleKey}>
          {roleLabel}
        </option>
      ))}
    </Select>
  );
}
