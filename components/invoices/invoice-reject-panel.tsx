/**
 * Invoice Reject Confirmation Panel (Level 3)
 *
 * Confirmation dialog for rejecting an invoice.
 * Requires a rejection reason (minimum 10 characters).
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useRejectInvoice } from '@/hooks/use-invoices';
import { type RejectInvoiceData } from '@/types/invoice';
import { rejectInvoiceSchema } from '@/lib/validations/invoice';
import type { PanelConfig } from '@/types/panel';

interface InvoiceRejectPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
}

export function InvoiceRejectPanel({
  config,
  onClose,
  invoiceId,
  invoiceNumber,
}: InvoiceRejectPanelProps) {
  const { closeAllPanels } = usePanel();
  const rejectMutation = useRejectInvoice();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RejectInvoiceData>({
    resolver: zodResolver(rejectInvoiceSchema),
    defaultValues: {
      rejection_reason: '',
    },
  });

  // Watch rejection_reason for character counter
  const rejectionReason = watch('rejection_reason');
  const charCount = rejectionReason?.length || 0;

  const onSubmit = async (data: RejectInvoiceData) => {
    try {
      await rejectMutation.mutateAsync({
        id: invoiceId,
        reason: data.rejection_reason,
      });
      closeAllPanels(); // Close all panels on success
    } catch (error) {
      // Error handling is done in mutation hook
      console.error('Reject submission error:', error);
    }
  };

  return (
    <PanelLevel
      config={config}
      title="Reject Invoice"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Warning Card */}
        <Card className="border-destructive p-4">
          <h3 className="mb-2 font-semibold text-destructive">
            Confirm Rejection Action
          </h3>
          <p className="text-sm text-muted-foreground">
            You are about to reject invoice{' '}
            <span className="font-medium text-foreground">
              {invoiceNumber}
            </span>
            . This action will prevent this invoice from being processed or paid.
          </p>
        </Card>

        {/* Rejection Reason */}
        <Card className="p-4">
          <div className="space-y-2">
            <Label htmlFor="rejection_reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection_reason"
              {...register('rejection_reason')}
              placeholder="Explain why this invoice is being rejected..."
              rows={5}
              className="resize-none"
            />
            {errors.rejection_reason && (
              <p className="text-xs text-destructive">
                {errors.rejection_reason.message}
              </p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimum 10 characters required</span>
              <span className={charCount > 500 ? 'text-destructive' : ''}>
                {charCount}/500
              </span>
            </div>
          </div>
        </Card>

        {/* Examples */}
        <Card className="bg-muted p-4">
          <h4 className="mb-2 text-sm font-semibold">Example Reasons:</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Invoice amount does not match purchase order</li>
            <li>• Services/goods not received or not as specified</li>
            <li>• Duplicate invoice already processed</li>
            <li>• Incorrect vendor information or unauthorized vendor</li>
            <li>• Missing or invalid supporting documentation</li>
          </ul>
        </Card>

        {/* Info */}
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">What Happens Next:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Invoice status will change to &quot;Rejected&quot;</li>
            <li>• Your name and timestamp will be recorded</li>
            <li>• Invoice creator will be notified</li>
            <li>• All panels will close upon confirmation</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}
