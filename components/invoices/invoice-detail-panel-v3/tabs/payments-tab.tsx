'use client';

import { PaymentHistoryList } from '@/components/payments/payment-history-list';

interface PaymentsTabProps {
  invoiceId: number;
  isAdmin: boolean;
}

/**
 * Payments tab for Invoice Detail Panel V3.
 *
 * Wraps the PaymentHistoryList component which handles:
 * - Fetching payments via usePayments hook
 * - Payment summary display (total paid, remaining, count)
 * - Payment table with date, amount, method, status, balance after
 * - Admin approve/reject actions on pending payments
 * - Empty state when no payments exist
 *
 * Note: isAdmin prop is accepted for interface consistency but PaymentHistoryList
 * determines admin status internally from session.
 */
export function PaymentsTab({ invoiceId }: PaymentsTabProps) {
  return (
    <div className="space-y-4">
      <PaymentHistoryList invoiceId={invoiceId} />
    </div>
  );
}
