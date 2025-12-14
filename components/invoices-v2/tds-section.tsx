/**
 * TDS Section Component
 *
 * Toggle-based TDS (Tax Deducted at Source) configuration.
 * Shows/hides TDS percentage input based on toggle state.
 * Supports default values from invoice profiles for recurring invoices.
 * Includes TDS rounding option when TDS amount has decimals.
 */

'use client';

import * as React from 'react';
import { Controller, Control } from 'react-hook-form';
import { ArrowUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AmountInput } from './amount-input';
import { calculateTds } from '@/lib/utils/tds';

/**
 * Props interface for TDSSection
 */
interface TDSSectionProps {
  /** Whether TDS is applicable */
  tdsApplicable: boolean;
  /** Callback when TDS applicable toggle changes */
  onTdsApplicableChange: (applicable: boolean) => void;
  /** TDS percentage (0-100, 2 decimal places) */
  tdsPercentage: number | null;
  /** Callback when TDS percentage changes */
  onTdsPercentageChange: (percentage: number | null) => void;
  /** Default TDS applicable value (from invoice profile) */
  defaultTdsApplicable?: boolean;
  /** Default TDS percentage value (from invoice profile) */
  defaultTdsPercentage?: number | null;
  /** Form errors keyed by field name */
  errors?: Record<string, { message?: string }>;
  /** React Hook Form control for Controller components */
  control?: Control<Record<string, unknown>>;
  /** Whether to show defaults info text */
  showDefaultsInfo?: boolean;
  /** Invoice amount for TDS calculation preview */
  invoiceAmount?: number;
  /** Whether TDS rounding is enabled */
  tdsRounded?: boolean;
  /** Callback when TDS rounding changes */
  onTdsRoundedChange?: (rounded: boolean) => void;
}

/**
 * TDS Section Component
 *
 * Features:
 * - Toggle to enable/disable TDS
 * - Percentage input (0-100, 2 decimals) shown when enabled
 * - Auto-load defaults from invoice profile (for recurring invoices)
 * - For non-recurring: Default toggle = No
 * - Validation: TDS % must be 0-100 if applicable
 */
/**
 * Format currency for display (INR)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function TDSSection({
  tdsApplicable,
  onTdsApplicableChange,
  tdsPercentage,
  onTdsPercentageChange,
  defaultTdsApplicable,
  defaultTdsPercentage,
  errors = {},
  control,
  showDefaultsInfo = false,
  invoiceAmount = 0,
  tdsRounded = false,
  onTdsRoundedChange,
}: TDSSectionProps) {
  // Auto-fill defaults when component mounts (for recurring invoices)
  React.useEffect(() => {
    if (
      defaultTdsApplicable !== undefined &&
      defaultTdsPercentage !== undefined &&
      showDefaultsInfo
    ) {
      // Only apply defaults if current values are unset
      if (tdsApplicable === false && tdsPercentage === null) {
        onTdsApplicableChange(defaultTdsApplicable);
        if (defaultTdsApplicable && defaultTdsPercentage !== null) {
          onTdsPercentageChange(defaultTdsPercentage);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Clear percentage when TDS is disabled
  const handleTdsApplicableChange = (applicable: boolean) => {
    onTdsApplicableChange(applicable);
    if (!applicable) {
      onTdsPercentageChange(null);
    }
  };

  // Calculate TDS amounts (exact and rounded) for preview
  const tdsCalculation = React.useMemo(() => {
    if (!tdsApplicable || !tdsPercentage || !invoiceAmount) {
      return { exactTds: 0, roundedTds: 0, activeTds: 0, netPayable: invoiceAmount };
    }

    const exactResult = calculateTds(invoiceAmount, tdsPercentage, false);
    const roundedResult = calculateTds(invoiceAmount, tdsPercentage, true);

    return {
      exactTds: exactResult.tdsAmount,
      roundedTds: roundedResult.tdsAmount,
      activeTds: tdsRounded ? roundedResult.tdsAmount : exactResult.tdsAmount,
      netPayable: tdsRounded ? roundedResult.payableAmount : exactResult.payableAmount,
    };
  }, [tdsApplicable, tdsPercentage, invoiceAmount, tdsRounded]);

  // Only show TDS rounding toggle when TDS amount has decimal places
  const showTdsRounding =
    tdsApplicable &&
    tdsPercentage &&
    tdsPercentage > 0 &&
    invoiceAmount > 0 &&
    tdsCalculation.exactTds !== tdsCalculation.roundedTds;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Toggle: TDS Applicable */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="tds_applicable" className="text-base font-semibold">
            TDS Applicable?
          </Label>
          {showDefaultsInfo && defaultTdsApplicable !== undefined && (
            <p className="text-xs text-muted-foreground">
              Default from profile:{' '}
              {defaultTdsApplicable ? `Yes (${defaultTdsPercentage}%)` : 'No'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-sm', !tdsApplicable && 'text-muted-foreground')}>
            {tdsApplicable ? 'Yes' : 'No'}
          </span>
          <Switch
            id="tds_applicable"
            checked={tdsApplicable}
            onCheckedChange={handleTdsApplicableChange}
          />
        </div>
      </div>

      {/* TDS Percentage Field (Conditional) */}
      {tdsApplicable && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Label htmlFor="tds_percentage">
            TDS Percentage (%) <span className="text-destructive">*</span>
          </Label>
          {control ? (
            <Controller
              name="tds_percentage"
              control={control}
              render={({ field }) => (
                <AmountInput
                  id="tds_percentage"
                  step="0.01"
                  min="0"
                  placeholder="10.00"
                  value={field.value as number | null}
                  onChange={field.onChange}
                  hasError={!!errors.tds_percentage}
                />
              )}
            />
          ) : (
            <AmountInput
              id="tds_percentage"
              step="0.01"
              min="0"
              placeholder="10.00"
              value={tdsPercentage}
              onChange={onTdsPercentageChange}
              hasError={!!errors.tds_percentage}
            />
          )}
          {errors.tds_percentage && (
            <p className="text-xs text-destructive">{errors.tds_percentage.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter TDS percentage (0-100). Example: 10 for 10% TDS.
          </p>

          {/* TDS Rounding Toggle - Only show when TDS amount has decimals */}
          {showTdsRounding && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="tds_rounded" className="text-base font-semibold flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-amber-600" />
                    Round Off TDS
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Round up TDS to the next integer (ceiling)
                  </p>
                </div>
                <Switch
                  id="tds_rounded"
                  checked={tdsRounded}
                  onCheckedChange={(checked) => onTdsRoundedChange?.(checked)}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Exact TDS:</span>
                  <span>{formatCurrency(tdsCalculation.exactTds)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Rounded TDS:</span>
                  <span>{formatCurrency(tdsCalculation.roundedTds)}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 font-semibold">
                  <span>Applied TDS:</span>
                  <span className={tdsRounded ? 'text-amber-600' : ''}>
                    {formatCurrency(tdsCalculation.activeTds)}
                    {tdsRounded && <span className="ml-1 text-xs">(rounded)</span>}
                  </span>
                </div>
                <div className="flex justify-between mt-1 font-semibold text-green-600 dark:text-green-400">
                  <span>Net Payable:</span>
                  <span>{formatCurrency(tdsCalculation.netPayable)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!tdsApplicable && (
        <p className="text-sm text-muted-foreground pt-2 border-t border-border">
          TDS is not applicable for this invoice.
        </p>
      )}
    </div>
  );
}
