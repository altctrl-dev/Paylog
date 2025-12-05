/**
 * Ledger React Query Hooks
 *
 * Provides hooks for fetching ledger data per invoice profile.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getLedgerProfiles,
  getLedgerByProfile,
  getLedgerSummary,
} from '@/app/actions/ledger';
import type {
  LedgerFilters,
  LedgerResponse,
  LedgerSummary,
  LedgerProfileOption,
} from '@/types/ledger';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const ledgerKeys = {
  all: ['ledger'] as const,
  profiles: () => [...ledgerKeys.all, 'profiles'] as const,
  ledger: (profileId: number) => [...ledgerKeys.all, 'data', profileId] as const,
  ledgerWithFilters: (filters: LedgerFilters) =>
    [...ledgerKeys.all, 'data', filters] as const,
  summary: (profileId: number) => [...ledgerKeys.all, 'summary', profileId] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch all invoice profiles for ledger dropdown
 */
export function useLedgerProfiles() {
  return useQuery<LedgerProfileOption[], Error>({
    queryKey: ledgerKeys.profiles(),
    queryFn: async () => {
      const result = await getLedgerProfiles();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch ledger entries for a specific profile
 *
 * @param filters - Ledger filters including profileId
 * @param enabled - Whether to enable the query (default: true when profileId > 0)
 */
export function useLedger(
  filters: LedgerFilters,
  enabled: boolean = filters.profileId > 0
) {
  return useQuery<LedgerResponse, Error>({
    queryKey: ledgerKeys.ledgerWithFilters(filters),
    queryFn: async () => {
      const result = await getLedgerByProfile(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch ledger summary only (for quick stats)
 *
 * @param profileId - Invoice profile ID
 * @param enabled - Whether to enable the query
 */
export function useLedgerSummary(profileId: number, enabled: boolean = profileId > 0) {
  return useQuery<LedgerSummary, Error>({
    queryKey: ledgerKeys.summary(profileId),
    queryFn: async () => {
      const result = await getLedgerSummary(profileId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}
