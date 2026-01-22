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
  CreditCard,
  Pause,
  Archive,
  Trash2,
  Check,
  X,
  RefreshCw,
  ReceiptText,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  PanelActionBar,
  type ActionBarAction,
} from '@/components/panels/shared';
import type { RecordPaymentBlockedReason } from './hooks/use-invoice-panel-v3';

/**
 * Get tooltip message for blocked payment
 */
function getRecordPaymentTooltip(reason: RecordPaymentBlockedReason): string | undefined {
  switch (reason) {
    case 'pending_payment':
      return 'Payment pending approval. Please wait for the pending payment to be approved or rejected.';
    case 'pending_approval':
      return 'Invoice pending approval. Cannot record payment until invoice is approved.';
    case 'already_paid':
      return 'Invoice is fully paid.';
    case 'rejected':
      return 'Invoice is rejected. Cannot record payment.';
    default:
      return undefined;
  }
}

export interface PanelV3ActionBarProps {
  permissions: {
    canEdit: boolean;
    canRecordPayment: boolean;
    canAddCreditNote: boolean;
    canPutOnHold: boolean;
    canArchive: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canReject: boolean;
  };
  hasRemainingBalance: boolean;
  hasPendingPayment?: boolean;
  recordPaymentBlockedReason?: RecordPaymentBlockedReason;
  onEdit: () => void;
  onRecordPayment: () => void;
  onAddCreditNote: () => void;
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
  // hasPendingPayment is included in permissions.canRecordPayment
  recordPaymentBlockedReason,
  onEdit,
  onRecordPayment,
  onAddCreditNote,
  onPutOnHold,
  onArchive,
  onDelete,
  onApprove,
  onReject,
  isProcessing = false,
}: PanelV3ActionBarProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Sync button handler - invalidates all queries to refresh data
  const handleSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries();
      toast.success('Data synced', {
        description: 'All data has been refreshed',
        duration: 2000,
      });
    } catch {
      toast.error('Sync failed', {
        description: 'Please try again',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  // Determine if record payment should be shown but disabled (for tooltip)
  // Show the button if there's remaining balance, but disable if there's a blocking reason
  const showRecordPaymentButton = hasRemainingBalance;
  const recordPaymentTooltip = recordPaymentBlockedReason
    ? getRecordPaymentTooltip(recordPaymentBlockedReason)
    : undefined;

  const primaryActions: ActionBarAction[] = [
    {
      id: 'sync',
      icon: <RefreshCw className={cn(isSyncing && 'animate-spin')} />,
      label: 'Sync Data',
      onClick: handleSync,
      disabled: isSyncing,
    },
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
      icon: <CreditCard />,
      label: 'Record Payment',
      onClick: onRecordPayment,
      // Show if there's balance, but may be disabled due to blocking reason
      hidden: !showRecordPaymentButton,
      // Disabled if processing OR if there's a blocking reason
      disabled: isProcessing || !permissions.canRecordPayment,
      tooltip: recordPaymentTooltip,
    },
    {
      id: 'add-credit-note',
      icon: <ReceiptText />,
      label: 'Credit Note',
      onClick: onAddCreditNote,
      hidden: !permissions.canAddCreditNote,
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
