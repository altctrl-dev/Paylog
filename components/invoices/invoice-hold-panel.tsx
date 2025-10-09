/**
 * Invoice Hold Confirmation Panel (Level 3)
 *
 * Confirmation dialog for putting an invoice on hold.
 * Requires a reason (minimum 10 characters).
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
import { usePutInvoiceOnHold, useInvoice } from '@/hooks/use-invoices';
import { type HoldInvoiceData } from '@/types/invoice';
import { holdInvoiceSchema } from '@/lib/validations/invoice';
import type { PanelConfig } from '@/types/panel';

interface InvoiceHoldPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
}

export function InvoiceHoldPanel({
  config,
  onClose,
  invoiceId,
}: InvoiceHoldPanelProps) {
  const { closeAllPanels } = usePanel();
  const { data: invoice } = useInvoice(invoiceId);
  const holdMutation = usePutInvoiceOnHold();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HoldInvoiceData>({
    resolver: zodResolver(holdInvoiceSchema),
    defaultValues: {
      hold_reason: '',
    },
  });

  const onSubmit = async (data: HoldInvoiceData) => {
    try {
      await holdMutation.mutateAsync({
        id: invoiceId,
        reason: data.hold_reason,
      });
      closeAllPanels(); // Close all panels on success
    } catch (error) {
      // Error handling is done in mutation hook
      console.error('Hold submission error:', error);
    }
  };

  return (
    <PanelLevel
      config={config}
      title="Put Invoice On Hold"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            variant="secondary"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Hold'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Warning Card */}
        <Card className="border-secondary p-4">
          <h3 className="mb-2 font-semibold text-secondary">
            Confirm Hold Action
          </h3>
          <p className="text-sm text-muted-foreground">
            You are about to put invoice{' '}
            <span className="font-medium text-foreground">
              {invoice?.invoice_number}
            </span>{' '}
            on hold. This will prevent further processing until the hold is
            released.
          </p>
        </Card>

        {/* Hold Reason */}
        <Card className="p-4">
          <div className="space-y-2">
            <Label htmlFor="hold_reason">
              Hold Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="hold_reason"
              {...register('hold_reason')}
              placeholder="Explain why this invoice is being put on hold..."
              rows={5}
              className="resize-none"
            />
            {errors.hold_reason && (
              <p className="text-xs text-destructive">
                {errors.hold_reason.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>
        </Card>

        {/* Examples */}
        <Card className="bg-muted p-4">
          <h4 className="mb-2 text-sm font-semibold">Example Reasons:</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Waiting for vendor clarification on billing details</li>
            <li>• Pending approval from department manager</li>
            <li>• Discrepancy in invoice amount needs investigation</li>
            <li>• Missing purchase order number</li>
          </ul>
        </Card>

        {/* Info */}
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">What Happens Next:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Invoice status will change to &quot;On Hold&quot;</li>
            <li>• Your name and timestamp will be recorded</li>
            <li>• Invoice can be released later by an admin</li>
            <li>• All panels will close upon confirmation</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}
