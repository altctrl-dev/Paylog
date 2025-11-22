/**
 * TDS Section Component
 *
 * Toggle-based TDS (Tax Deducted at Source) configuration.
 * Shows/hides TDS percentage input based on toggle state.
 * Supports default values from invoice profiles for recurring invoices.
 */

'use client';

import * as React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
  errors?: Record<string, string>;
  /** React Hook Form control for Controller components */
  control?: Control<Record<string, unknown>>;
  /** Whether to show defaults info text */
  showDefaultsInfo?: boolean;
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
                <Input
                  id="tds_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="10.00"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? null : parseFloat(value));
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={errors.tds_percentage ? 'border-destructive' : ''}
                />
              )}
            />
          ) : (
            <Input
              id="tds_percentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="10.00"
              value={tdsPercentage ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                onTdsPercentageChange(value === '' ? null : parseFloat(value));
              }}
              onWheel={(e) => e.currentTarget.blur()}
              className={errors.tds_percentage ? 'border-destructive' : ''}
            />
          )}
          {errors.tds_percentage && (
            <p className="text-xs text-destructive">{errors.tds_percentage}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter TDS percentage (0-100). Example: 10 for 10% TDS.
          </p>
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
