'use client';

/**
 * Unified Entries React Query Hooks
 *
 * Provides data fetching and mutation hooks for the unified entries view
 * (Invoices, Credit Notes, and Advance Payments).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUnifiedEntries } from '@/app/actions/unified-entries';
import { approveCreditNote, rejectCreditNote } from '@/app/actions/credit-notes';
import {
  approveAdvancePayment,
  rejectAdvancePayment,
} from '@/app/actions/advance-payments';
import type {
  UnifiedEntryFilters,
  UnifiedEntryListResponse,
} from '@/types/unified-entry';
import { toast } from 'sonner';

/**
 * Fetch unified entries (invoices, credit notes, advance payments)
 */
export function useUnifiedEntries(filters: UnifiedEntryFilters) {
  return useQuery<UnifiedEntryListResponse, Error>({
    queryKey: ['unified-entries', filters],
    queryFn: async () => {
      const result = await getUnifiedEntries(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Approve a credit note
 */
export function useApproveCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await approveCreditNote(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-entries'] });
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success('Credit note approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve credit note');
    },
  });
}

/**
 * Reject a credit note
 */
export function useRejectCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const result = await rejectCreditNote(id, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-entries'] });
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success('Credit note rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject credit note');
    },
  });
}

/**
 * Approve an advance payment
 */
export function useApproveAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await approveAdvancePayment(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-entries'] });
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      toast.success('Advance payment approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve advance payment');
    },
  });
}

/**
 * Reject an advance payment
 */
export function useRejectAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const result = await rejectAdvancePayment(id, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-entries'] });
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      toast.success('Advance payment rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject advance payment');
    },
  });
}
