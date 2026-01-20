/**
 * React Query Hooks for Monthly Report System
 *
 * Provides data fetching and mutation hooks for:
 * - Monthly reports (live, submitted, invoice-date views)
 * - Report period status
 * - Report finalization and submission
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMonthlyReport,
  getReportPeriod,
  getReportPeriods,
  finalizeReport,
  submitReport,
  unfinalizeReport,
  setInvoiceReportingMonth,
  getConsolidatedReport,
  finalizeConsolidatedReport,
} from '@/app/actions/monthly-reports';
import type {
  MonthlyReportResponse,
  ConsolidatedReportResponse,
  ReportPeriodWithRelations,
} from '@/types/monthly-report';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const monthlyReportKeys = {
  all: ['monthly-reports'] as const,
  report: (month: number, year: number, view: 'live' | 'submitted' | 'invoice_date') =>
    [...monthlyReportKeys.all, 'report', month, year, view] as const,
  period: (month: number, year: number) =>
    [...monthlyReportKeys.all, 'period', month, year] as const,
  periods: (year?: number) =>
    [...monthlyReportKeys.all, 'periods', year] as const,
};

// Consolidated report keys (experimental)
export const consolidatedReportKeys = {
  all: ['consolidated-reports'] as const,
  report: (month: number, year: number, view: 'live' | 'reported') =>
    [...consolidatedReportKeys.all, 'report', month, year, view] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch monthly report data
 *
 * @param month - Month (1-12)
 * @param year - Year
 * @param view - 'live' | 'submitted' | 'invoice_date'
 */
export function useMonthlyReport(
  month: number,
  year: number,
  view: 'live' | 'submitted' | 'invoice_date' = 'live'
) {
  return useQuery<MonthlyReportResponse | null, Error>({
    queryKey: monthlyReportKeys.report(month, year, view),
    queryFn: async () => {
      const result = await getMonthlyReport(month, year, view);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch report period status
 *
 * @param month - Month (1-12)
 * @param year - Year
 */
export function useReportPeriod(month: number, year: number) {
  return useQuery<ReportPeriodWithRelations | null, Error>({
    queryKey: monthlyReportKeys.period(month, year),
    queryFn: async () => {
      const result = await getReportPeriod(month, year);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch list of report periods
 *
 * @param year - Optional year filter
 */
export function useReportPeriods(year?: number) {
  return useQuery<ReportPeriodWithRelations[], Error>({
    queryKey: monthlyReportKeys.periods(year),
    queryFn: async () => {
      const result = await getReportPeriods(year);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to finalize a report
 */
export function useFinalizeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      month,
      year,
      notes,
    }: {
      month: number;
      year: number;
      notes?: string;
    }) => {
      const result = await finalizeReport(month, year, notes);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.report(variables.month, variables.year, 'live'),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.report(variables.month, variables.year, 'submitted'),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.period(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.periods(),
      });
    },
  });
}

/**
 * Hook to submit a report
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      month,
      year,
      submittedTo,
    }: {
      month: number;
      year: number;
      submittedTo: string;
    }) => {
      const result = await submitReport(month, year, submittedTo);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.period(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.periods(),
      });
    },
  });
}

/**
 * Hook to unfinalize a report (super admin only)
 */
export function useUnfinalizeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const result = await unfinalizeReport(month, year);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.report(variables.month, variables.year, 'live'),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.report(variables.month, variables.year, 'submitted'),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.period(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.periods(),
      });
    },
  });
}

/**
 * Hook to set invoice reporting month
 */
export function useSetInvoiceReportingMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      month,
      year,
    }: {
      invoiceId: number;
      month: number;
      year: number;
    }) => {
      const result = await setInvoiceReportingMonth(invoiceId, month, year);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate all monthly reports since we don't know which ones are affected
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.all,
      });
    },
  });
}

// ============================================================================
// CONSOLIDATED REPORT HOOKS (EXPERIMENTAL)
// ============================================================================

/**
 * Hook to fetch consolidated report data
 * Uses combined view: invoices FROM month + payments MADE in month
 *
 * @param month - Month (1-12)
 * @param year - Year
 * @param view - 'live' | 'reported'
 */
export function useConsolidatedReport(
  month: number,
  year: number,
  view: 'live' | 'reported' = 'live'
) {
  return useQuery<ConsolidatedReportResponse | null, Error>({
    queryKey: consolidatedReportKeys.report(month, year, view),
    queryFn: async () => {
      const result = await getConsolidatedReport(month, year, view);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to finalize a consolidated report
 */
export function useFinalizeConsolidatedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      month,
      year,
      notes,
    }: {
      month: number;
      year: number;
      notes?: string;
    }) => {
      const result = await finalizeConsolidatedReport(month, year, notes);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate consolidated and monthly report queries
      queryClient.invalidateQueries({
        queryKey: consolidatedReportKeys.report(variables.month, variables.year, 'live'),
      });
      queryClient.invalidateQueries({
        queryKey: consolidatedReportKeys.report(variables.month, variables.year, 'reported'),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.period(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: monthlyReportKeys.periods(),
      });
    },
  });
}
