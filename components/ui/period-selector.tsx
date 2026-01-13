'use client';

/**
 * Period Selector Component
 *
 * A reusable period selection component with:
 * - Quick preset buttons (This Month, Last Month, This FY, Last FY)
 * - Custom range selection with from/to month+year dropdowns
 * - Configurable presets
 * - Returns both date range and display label
 *
 * Can be used for reports, dashboards, analytics, etc.
 */

import * as React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getThisMonth,
  getLastMonth,
  getThisFinancialYear,
  getLastFinancialYear,
  getMonthRange,
  formatPeriodLabel,
} from '@/lib/utils/invoice-filters';

// ============================================================================
// Types
// ============================================================================

export type PeriodPreset = 'this-month' | 'last-month' | 'this-fy' | 'last-fy' | 'custom';

export interface PeriodSelection {
  /** Start date of period */
  startDate: Date;
  /** End date of period */
  endDate: Date;
  /** Preset type or 'custom' */
  type: PeriodPreset;
  /** Human-readable label for display */
  label: string;
}

export interface PeriodSelectorProps {
  /** Currently selected period */
  value: PeriodSelection;
  /** Callback when period changes */
  onChange: (period: PeriodSelection) => void;
  /** Which presets to show (default: all) */
  presets?: PeriodPreset[];
  /** Allow custom range selection (default: true) */
  allowCustomRange?: boolean;
  /** Trigger button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Trigger button size */
  size?: 'default' | 'sm' | 'lg';
  /** Additional className for trigger */
  className?: string;
  /** Minimum width for trigger button */
  minWidth?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Generate years from 2020 to current year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i);

const DEFAULT_PRESETS: PeriodPreset[] = ['this-month', 'last-month', 'this-fy', 'last-fy'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get period selection for a preset type
 */
function getPeriodForPreset(preset: Exclude<PeriodPreset, 'custom'>): PeriodSelection {
  switch (preset) {
    case 'this-month': {
      const { start, end } = getThisMonth();
      return {
        startDate: start,
        endDate: end,
        type: 'this-month',
        label: formatPeriodLabel(start, end),
      };
    }
    case 'last-month': {
      const { start, end } = getLastMonth();
      return {
        startDate: start,
        endDate: end,
        type: 'last-month',
        label: formatPeriodLabel(start, end),
      };
    }
    case 'this-fy': {
      const { start, end, label } = getThisFinancialYear();
      return {
        startDate: start,
        endDate: end,
        type: 'this-fy',
        label,
      };
    }
    case 'last-fy': {
      const { start, end, label } = getLastFinancialYear();
      return {
        startDate: start,
        endDate: end,
        type: 'last-fy',
        label,
      };
    }
  }
}

/**
 * Get default period selection (this month)
 */
export function getDefaultPeriod(): PeriodSelection {
  return getPeriodForPreset('this-month');
}

// ============================================================================
// Preset Button Labels
// ============================================================================

const PRESET_LABELS: Record<Exclude<PeriodPreset, 'custom'>, { label: string; getHint: () => string }> = {
  'this-month': {
    label: 'This Month',
    getHint: () => {
      const { start, end } = getThisMonth();
      return formatPeriodLabel(start, end);
    },
  },
  'last-month': {
    label: 'Last Month',
    getHint: () => {
      const { start, end } = getLastMonth();
      return formatPeriodLabel(start, end);
    },
  },
  'this-fy': {
    label: 'This FY',
    getHint: () => getThisFinancialYear().label,
  },
  'last-fy': {
    label: 'Last FY',
    getHint: () => getLastFinancialYear().label,
  },
};

// ============================================================================
// Component
// ============================================================================

export function PeriodSelector({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  allowCustomRange = true,
  variant = 'outline',
  size = 'default',
  className,
  minWidth = '180px',
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Temp state for custom range selection
  const [tempFromMonth, setTempFromMonth] = React.useState(value.startDate.getMonth());
  const [tempFromYear, setTempFromYear] = React.useState(value.startDate.getFullYear());
  const [tempToMonth, setTempToMonth] = React.useState(value.endDate.getMonth());
  const [tempToYear, setTempToYear] = React.useState(value.endDate.getFullYear());

  // Sync temp state when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setTempFromMonth(value.startDate.getMonth());
      setTempFromYear(value.startDate.getFullYear());
      setTempToMonth(value.endDate.getMonth());
      setTempToYear(value.endDate.getFullYear());
    }
  }, [isOpen, value]);

  // Handle preset button click
  const handlePresetClick = (preset: Exclude<PeriodPreset, 'custom'>) => {
    const period = getPeriodForPreset(preset);
    onChange(period);
    setIsOpen(false);
  };

  // Handle custom range apply
  const handleApplyCustomRange = () => {
    const { start: startDate } = getMonthRange(tempFromMonth, tempFromYear);
    const { end: endDate } = getMonthRange(tempToMonth, tempToYear);

    // Swap dates if end < start
    const finalStart = startDate <= endDate ? startDate : endDate;
    const finalEnd = startDate <= endDate ? endDate : startDate;

    onChange({
      startDate: finalStart,
      endDate: finalEnd,
      type: 'custom',
      label: formatPeriodLabel(finalStart, finalEnd),
    });
    setIsOpen(false);
  };

  // Filter out 'custom' from presets since it's handled separately
  const visiblePresets = presets.filter((p): p is Exclude<PeriodPreset, 'custom'> => p !== 'custom');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('justify-between gap-2', className)}
          style={{ minWidth }}
        >
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{value.label}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Quick Select Presets */}
          {visiblePresets.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-2">
                {visiblePresets.map((preset) => {
                  const config = PRESET_LABELS[preset];
                  const isActive = value.type === preset;
                  return (
                    <Button
                      key={preset}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => handlePresetClick(preset)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{config.label}</span>
                        <span className={cn(
                          'text-xs',
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {config.getHint()}
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Range */}
          {allowCustomRange && (
            <>
              {visiblePresets.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-popover px-2 text-muted-foreground">
                      Custom Range
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* From */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <div className="flex gap-1">
                    <Select
                      value={tempFromMonth.toString()}
                      onChange={(e) => setTempFromMonth(parseInt(e.target.value, 10))}
                      className="flex-1 text-sm h-9"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index.toString()}>
                          {month.slice(0, 3)}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={tempFromYear.toString()}
                      onChange={(e) => setTempFromYear(parseInt(e.target.value, 10))}
                      className="w-20 text-sm h-9"
                    >
                      {YEARS.map((year) => (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* To */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <div className="flex gap-1">
                    <Select
                      value={tempToMonth.toString()}
                      onChange={(e) => setTempToMonth(parseInt(e.target.value, 10))}
                      className="flex-1 text-sm h-9"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index.toString()}>
                          {month.slice(0, 3)}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={tempToYear.toString()}
                      onChange={(e) => setTempToYear(parseInt(e.target.value, 10))}
                      className="w-20 text-sm h-9"
                    >
                      {YEARS.map((year) => (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={handleApplyCustomRange}
              >
                Apply Selection
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PeriodSelector;
