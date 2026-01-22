'use client';

import { PaymentHistoryList } from '@/components/payments/payment-history-list';
import { CreditNoteHistoryList } from '@/components/credit-notes/credit-note-history-list';

interface PaymentsTabProps {
  invoiceId: number;
  isAdmin: boolean;
  /** Currency code (ISO 4217) for proper currency formatting */
  currencyCode?: string;
}

/**
 * Payments tab for Invoice Detail Panel V3.
 *
 * Wraps the PaymentHistoryList and CreditNoteHistoryList components:
 * - Payment summary display (total paid, remaining, count)
 * - Payment table with date, amount, method, status, balance after
 * - Credit note summary and list
 * - Admin approve/reject actions on pending payments
 * - Empty states when no records exist
 *
 * Note: isAdmin prop is accepted for interface consistency but PaymentHistoryList
 * determines admin status internally from session.
 */
export function PaymentsTab({ invoiceId, currencyCode }: PaymentsTabProps) {
  return (
    <div className="space-y-8">
      {/* Payments Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Payments
        </h3>
        <PaymentHistoryList invoiceId={invoiceId} currencyCode={currencyCode} />
      </div>

      {/* Credit Notes Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Credit Notes
        </h3>
        <CreditNoteHistoryList invoiceId={invoiceId} currencyCode={currencyCode} />
      </div>
    </div>
  );
}
