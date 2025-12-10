'use client';

/**
 * Panel V3 Action Bar
 *
 * Invoice-specific action bar wrapper that configures PanelActionBar
 * with invoice actions based on permissions and state.
 */

import * as React from 'react';
import {
  Pencil,
  IndianRupee,
  Pause,
  Archive,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  PanelActionBar,
  type ActionBarAction,
} from '@/components/panels/shared';

export interface PanelV3ActionBarProps {
  permissions: {
    canEdit: boolean;
    canRecordPayment: boolean;
    canPutOnHold: boolean;
    canArchive: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canReject: boolean;
  };
  hasRemainingBalance: boolean;
  onEdit: () => void;
  onRecordPayment: () => void;
  onPutOnHold: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export function PanelV3ActionBar({
  permissions,
  hasRemainingBalance,
  onEdit,
  onRecordPayment,
  onPutOnHold,
  onArchive,
  onDelete,
  onApprove,
  onReject,
  isProcessing = false,
}: PanelV3ActionBarProps) {
  const primaryActions: ActionBarAction[] = [
    {
      id: 'edit',
      icon: <Pencil />,
      label: 'Edit',
      onClick: onEdit,
      hidden: !permissions.canEdit,
      disabled: isProcessing,
    },
    {
      id: 'record-payment',
      icon: <IndianRupee />,
      label: 'Record Payment',
      onClick: onRecordPayment,
      hidden: !permissions.canRecordPayment || !hasRemainingBalance,
      disabled: isProcessing,
    },
    {
      id: 'put-on-hold',
      icon: <Pause />,
      label: 'Put On Hold',
      onClick: onPutOnHold,
      hidden: !permissions.canPutOnHold,
      disabled: isProcessing,
    },
    {
      id: 'approve',
      icon: <Check className="text-green-600" />,
      label: 'Approve',
      onClick: onApprove,
      hidden: !permissions.canApprove,
      disabled: isProcessing,
    },
    {
      id: 'reject',
      icon: <X />,
      label: 'Reject',
      onClick: onReject,
      hidden: !permissions.canReject,
      disabled: isProcessing,
      destructive: true,
    },
  ];

  const secondaryActions: ActionBarAction[] = [
    {
      id: 'archive',
      icon: <Archive />,
      label: 'Archive',
      onClick: onArchive,
      hidden: !permissions.canArchive,
      disabled: isProcessing,
    },
    {
      id: 'delete',
      icon: <Trash2 />,
      label: 'Delete',
      onClick: onDelete,
      hidden: !permissions.canDelete,
      disabled: isProcessing,
      destructive: true,
    },
  ];

  return (
    <PanelActionBar
      primaryActions={primaryActions}
      secondaryActions={secondaryActions}
    />
  );
}
