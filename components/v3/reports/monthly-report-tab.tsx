'use client';

/**
 * Monthly Report Tab Component
 *
 * Payment-centric report view that groups invoices by payment type.
 * Features:
 * - Three views: Live (current), Submitted (frozen snapshot), Invoice-Date (pure)
 * - Sections: Cash Payments, Bank Transfer, Credit Card, Unpaid
 * - Advance payment support
 * - Report finalization and submission
 * - Export to Excel
 */

import * as React from 'react';
import { useState } from 'react';
import {
  Download,
  Lock,
  Unlock,
  Send,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { MonthNavigator } from '../invoices/month-navigator';
import { formatCurrency } from '@/lib/utils/format';
import {
  useMonthlyReport,
  useReportPeriod,
  useFinalizeReport,
  useSubmitReport,
  useUnfinalizeReport,
} from '@/hooks/use-monthly-reports';
import {
  type ReportEntry,
  type ReportSection,
  REPORT_STATUS,
  REPORT_STATUS_CONFIG,
  formatReportPeriod,
} from '@/types/monthly-report';
import {
  InputDialog,
} from '@/components/ui/confirmation-dialog';

// ============================================================================
// Entry Status Badge
// ============================================================================

function EntryStatusBadge({ entry }: { entry: ReportEntry }) {
  const { status, status_percentage } = entry;

  const variants: Record<string, string> = {
    PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
    PAID_PARTIAL: 'bg-green-500/20 text-green-400 border-green-500/30',
    PARTIALLY_PAID: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    UNPAID: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    ADVANCE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  let label: string = status;
  if (status === 'PAID_PARTIAL' && status_percentage) {
    label = `PAID (${status_percentage}%)`;
  } else if (status === 'PARTIALLY_PAID' && status_percentage) {
    label = `PARTIALLY PAID (${status_percentage}%)`;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        variants[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      )}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Report Section Component
// ============================================================================

interface ReportSectionProps {
  section: ReportSection;
  defaultOpen?: boolean;
  onViewInvoice?: (invoiceId: number) => void;
}

function ReportSectionView({ section, defaultOpen = true, onViewInvoice }: ReportSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors mb-2"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-semibold text-sm">{section.payment_type_name}</span>
        <Badge variant="outline" className="ml-2 text-xs">
          {section.entry_count} {section.entry_count === 1 ? 'entry' : 'entries'}
        </Badge>
        <span className="ml-auto text-sm font-medium text-muted-foreground">
          Subtotal: {formatCurrency(section.subtotal)}
        </span>
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                <TableHead className="w-12 text-xs font-medium text-muted-foreground uppercase">#</TableHead>
                <TableHead className="w-[28%] text-xs font-medium text-muted-foreground uppercase">Invoice Details</TableHead>
                <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase">Inv Number</TableHead>
                <TableHead className="w-[12%] text-xs font-medium text-muted-foreground uppercase">Date</TableHead>
                <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase text-right">Amount</TableHead>
                <TableHead className="w-[16%] text-xs font-medium text-muted-foreground uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.entries.map((entry) => (
                <TableRow
                  key={`${entry.invoice_id || entry.advance_payment_id}-${entry.serial}`}
                  className={cn(
                    'border-b border-border/50 hover:bg-muted/30 transition-colors',
                    entry.invoice_id && 'cursor-pointer'
                  )}
                  onClick={() => entry.invoice_id && onViewInvoice?.(entry.invoice_id)}
                >
                  <TableCell className="text-muted-foreground text-sm">{entry.serial}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{entry.invoice_name}</div>
                      <div className="text-xs text-muted-foreground">{entry.vendor_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-sm">{entry.invoice_number || '-'}</div>
                      {entry.is_advance_payment && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-500/50 text-purple-500">
                          Advance
                        </Badge>
                      )}
                      {entry.entry_type === 'late_invoice' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-500">
                          Late Entry
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {entry.invoice_date
                      ? new Date(entry.invoice_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">
                        {formatCurrency(entry.payment_amount ?? entry.invoice_amount, entry.currency_code)}
                      </div>
                      {entry.payment_amount && entry.payment_amount !== entry.invoice_amount && (
                        <div className="text-[10px] text-muted-foreground">
                          of {formatCurrency(entry.invoice_amount, entry.currency_code)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <EntryStatusBadge entry={entry} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MonthlyReportTab() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const { openPanel } = usePanel();

  // Period selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // View selection: 'live' | 'submitted' | 'invoice_date'
  const [view, setView] = useState<'live' | 'submitted' | 'invoice_date'>('live');

  // Dialog states
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [submitDialog, setSubmitDialog] = useState(false);

  // Fetch data
  const { data: reportData, isLoading: isLoadingReport } = useMonthlyReport(
    selectedMonth,
    selectedYear,
    view
  );
  const { data: reportPeriod, isLoading: isLoadingPeriod } = useReportPeriod(
    selectedMonth,
    selectedYear
  );

  // Mutations
  const finalizeReportMutation = useFinalizeReport();
  const submitReportMutation = useSubmitReport();
  const unfinalizeReportMutation = useUnfinalizeReport();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Derived state
  const reportStatus = reportPeriod?.status || REPORT_STATUS.DRAFT;
  const isFinalized = reportStatus === REPORT_STATUS.FINALIZED || reportStatus === REPORT_STATUS.SUBMITTED;
  const isSubmitted = reportStatus === REPORT_STATUS.SUBMITTED;
  const hasSnapshot = !!reportPeriod?.snapshot_data;

  // Handlers
  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month + 1); // MonthNavigator uses 0-11, we use 1-12
    setSelectedYear(year);
  };

  const handleViewInvoice = (invoiceId: number) => {
    openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
  };

  const handleAddAdvancePayment = () => {
    openPanel('advance-payment-create', {
      defaultMonth: selectedMonth,
      defaultYear: selectedYear,
    });
  };

  const handleExport = () => {
    if (!reportData?.report_data) {
      toast.error('No report data to export');
      return;
    }

    const { report_data } = reportData;

    // Flatten sections into rows
    const exportData: Record<string, unknown>[] = [];

    for (const section of report_data.sections) {
      // Add section header
      exportData.push({
        'Payment Type': section.payment_type_name,
        '#': '',
        'Invoice Name': '',
        'Invoice Number': '',
        'Vendor': '',
        'Date': '',
        'Amount': '',
        'Status': '',
      });

      // Add entries
      for (const entry of section.entries) {
        let statusLabel: string = entry.status;
        if (entry.status === 'PAID_PARTIAL' && entry.status_percentage) {
          statusLabel = `PAID (${entry.status_percentage}%)`;
        } else if (entry.status === 'PARTIALLY_PAID' && entry.status_percentage) {
          statusLabel = `PARTIALLY PAID (${entry.status_percentage}%)`;
        }

        exportData.push({
          'Payment Type': '',
          '#': entry.serial,
          'Invoice Name': entry.invoice_name,
          'Invoice Number': entry.invoice_number || (entry.is_advance_payment ? 'Advance Payment' : ''),
          'Vendor': entry.vendor_name,
          'Date': entry.invoice_date
            ? new Date(entry.invoice_date).toLocaleDateString('en-IN')
            : '',
          'Amount': entry.payment_amount ?? entry.invoice_amount,
          'Status': statusLabel,
        });
      }

      // Add subtotal row
      exportData.push({
        'Payment Type': '',
        '#': '',
        'Invoice Name': '',
        'Invoice Number': '',
        'Vendor': '',
        'Date': 'Subtotal:',
        'Amount': section.subtotal,
        'Status': '',
      });

      // Add empty row
      exportData.push({});
    }

    // Add grand total
    exportData.push({
      'Payment Type': 'GRAND TOTAL',
      '#': '',
      'Invoice Name': '',
      'Invoice Number': '',
      'Vendor': '',
      'Date': '',
      'Amount': report_data.grand_total,
      'Status': '',
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

    const filename = `monthly_report_${report_data.label.replace(/\s+/g, '_')}_${view}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Report exported successfully');
  };

  const handleFinalize = async (notes: string) => {
    try {
      await finalizeReportMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
        notes: notes || undefined,
      });
      toast.success('Report finalized successfully');
      setFinalizeDialog(false);
      setView('submitted'); // Switch to submitted view
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to finalize report');
    }
  };

  const handleSubmit = async (submittedTo: string) => {
    try {
      await submitReportMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
        submittedTo,
      });
      toast.success('Report marked as submitted');
      setSubmitDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit report');
    }
  };

  const handleUnfinalize = async () => {
    try {
      await unfinalizeReportMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
      });
      toast.success('Report reverted to draft');
      setView('live');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unfinalize report');
    }
  };

  const reportLabel = formatReportPeriod(selectedMonth, selectedYear);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="pl-1">
          <h2 className="text-lg font-semibold">
            Monthly Report - {reportLabel}
          </h2>
          {reportPeriod && (
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={REPORT_STATUS_CONFIG[reportStatus as keyof typeof REPORT_STATUS_CONFIG]?.variant || 'outline'}
              >
                {REPORT_STATUS_CONFIG[reportStatus as keyof typeof REPORT_STATUS_CONFIG]?.label || reportStatus}
              </Badge>
              {reportPeriod.submitted_to && (
                <span className="text-xs text-muted-foreground">
                  Submitted to: {reportPeriod.submitted_to}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Month Navigator */}
        <MonthNavigator
          month={selectedMonth - 1} // Convert to 0-11
          year={selectedYear}
          onChange={handleMonthChange}
        />

        {/* View Selector */}
        <Select
          value={view}
          onChange={(e) => setView(e.target.value as typeof view)}
          className="w-[160px]"
        >
          <option value="live">Live View</option>
          <option value="submitted" disabled={!hasSnapshot}>Submitted View</option>
          <option value="invoice_date">Invoice-Date View</option>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add Advance Payment */}
        {isAdmin && view === 'live' && (
          <Button
            variant="outline"
            size={isMobile ? 'icon' : 'default'}
            className={cn(isMobile ? 'shrink-0' : 'gap-2')}
            onClick={handleAddAdvancePayment}
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span>Advance Payment</span>}
          </Button>
        )}

        {/* Export */}
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'default'}
          className={cn(isMobile ? 'shrink-0' : 'gap-2')}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          {!isMobile && <span>Export</span>}
        </Button>

        {/* Admin Actions */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2">
                Actions
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isFinalized && (
                <DropdownMenuItem onClick={() => setFinalizeDialog(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Finalize Report
                </DropdownMenuItem>
              )}
              {isFinalized && !isSubmitted && (
                <DropdownMenuItem onClick={() => setSubmitDialog(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Submitted
                </DropdownMenuItem>
              )}
              {isSuperAdmin && isFinalized && (
                <DropdownMenuItem
                  onClick={handleUnfinalize}
                  className="text-destructive"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Unfinalize Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {isLoadingReport ? (
            <span className="animate-pulse">Loading...</span>
          ) : reportData?.report_data ? (
            <>
              {reportData.report_data.total_entries} entries | Grand Total:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(reportData.report_data.grand_total)}
              </span>
            </>
          ) : (
            'No data'
          )}
        </p>
        {view === 'submitted' && reportPeriod?.finalized_at && (
          <Badge variant="outline" className="text-xs">
            Frozen on {new Date(reportPeriod.finalized_at).toLocaleDateString('en-IN')}
          </Badge>
        )}
      </div>

      {/* Report Content */}
      {isLoadingReport || isLoadingPeriod ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : reportData?.report_data?.sections.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No entries for {reportLabel}</p>
          {isAdmin && view === 'live' && (
            <Button
              variant="link"
              className="mt-2"
              onClick={handleAddAdvancePayment}
            >
              Add an advance payment
            </Button>
          )}
        </div>
      ) : (
        <div>
          {reportData?.report_data?.sections.map((section) => (
            <ReportSectionView
              key={section.payment_type_id ?? 'unpaid'}
              section={section}
              defaultOpen
              onViewInvoice={handleViewInvoice}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <InputDialog
        open={finalizeDialog}
        onOpenChange={setFinalizeDialog}
        title="Finalize Report"
        description={`Finalize the report for ${reportLabel}? This will create a frozen snapshot that can be viewed later.`}
        inputLabel="Notes (Optional)"
        inputPlaceholder="Add any notes about this report..."
        required={false}
        variant="default"
        confirmLabel={finalizeReportMutation.isPending ? 'Finalizing...' : 'Finalize'}
        onConfirm={handleFinalize}
        isLoading={finalizeReportMutation.isPending}
      />

      <InputDialog
        open={submitDialog}
        onOpenChange={setSubmitDialog}
        title="Mark as Submitted"
        description={`Mark the ${reportLabel} report as submitted to your accountant.`}
        inputLabel="Submitted To"
        inputPlaceholder="Enter accountant name or email..."
        required
        minLength={2}
        variant="default"
        confirmLabel={submitReportMutation.isPending ? 'Saving...' : 'Mark Submitted'}
        onConfirm={handleSubmit}
        isLoading={submitReportMutation.isPending}
      />
    </div>
  );
}

export default MonthlyReportTab;
