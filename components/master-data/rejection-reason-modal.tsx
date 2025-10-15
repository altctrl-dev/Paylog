/**
 * Rejection Reason Modal
 *
 * Level 3 modal for admins to provide rejection reason when rejecting a request.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { rejectRequest } from '@/app/actions/admin/master-data-approval';
import type { PanelConfig } from '@/types/panel';
import { useToast } from '@/hooks/use-toast';
import { usePanel } from '@/hooks/use-panel';

interface RejectionReasonModalProps {
  config: PanelConfig;
  onClose: () => void;
  requestId: number;
}

export function RejectionReasonModal({ config, onClose, requestId }: RejectionReasonModalProps) {
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const { closePanel } = usePanel();

  const handleSubmit = async () => {
    // Validate reason length
    if (!reason.trim() || reason.trim().length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Rejection reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await rejectRequest(requestId, reason.trim());

      if (result.success) {
        toast({
          title: 'Request Rejected',
          description: 'The request has been rejected successfully',
        });

        // Dispatch event to refresh admin list
        window.dispatchEvent(new CustomEvent('admin-request-reviewed'));

        // Close this modal (Level 3) and the review panel (Level 2)
        closePanel(config.id); // Close rejection modal

        // Find and close the review panel
        // We need to close all panels after rejection
        setTimeout(() => {
          // This will close any remaining panels
          const panels = document.querySelectorAll('[data-panel-level]');
          if (panels.length > 0) {
            window.dispatchEvent(new CustomEvent('close-all-panels'));
          }
        }, 100);

        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = reason.trim().length;
  const isValid = characterCount >= 10 && characterCount <= 500;
  const minCharsRemaining = Math.max(0, 10 - characterCount);

  return (
    <PanelLevel
      config={config}
      title="Reject Request"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting || characterCount > 500}
          >
            {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-700 mb-4">
            Please provide a clear reason for rejecting this request. The requester will see this message and can use it to improve their resubmission.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Rejection Reason *
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this request is being rejected..."
            rows={6}
            className={`w-full ${!isValid && characterCount > 0 ? 'border-red-300' : ''}`}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              {minCharsRemaining > 0 ? (
                <span className="text-red-600">{minCharsRemaining} more characters required</span>
              ) : (
                <span className="text-green-600">Minimum length met</span>
              )}
            </div>
            <div className={`text-xs ${characterCount > 500 ? 'text-red-600' : 'text-gray-500'}`}>
              {characterCount} / 500 characters
            </div>
          </div>
        </div>

        {characterCount > 500 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">Rejection reason cannot exceed 500 characters</p>
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <p className="text-xs text-amber-900">
            <strong>Note:</strong> After rejection, the requester can resubmit up to 3 times with improved data. Be specific about what needs to be changed.
          </p>
        </div>
      </div>
    </PanelLevel>
  );
}
