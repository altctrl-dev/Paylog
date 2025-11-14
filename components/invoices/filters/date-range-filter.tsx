/**
 * Date Range Filter Component
 *
 * Popover with date range picker and preset buttons.
 * Features:
 * - Date range selection via Calendar component
 * - Quick preset buttons (This Month, Last Month, This Year, Last Year)
 * - Clear button to remove date filter
 * - Formatted display of selected range
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getThisMonth,
  getLastMonth,
  getThisYear,
  getLastYear,
} from '@/lib/utils/invoice-filters';

export interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
}

/**
 * Renders a date range filter with popover calendar and preset buttons.
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const DateRangeFilter = React.memo(function DateRangeFilter({
  startDate,
  endDate,
  onDateChange,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Local state to track intermediate range selection (before both dates are picked)
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(undefined);

  // Format the display text for the trigger button
  const displayText = React.useMemo(() => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    }
    if (endDate) {
      return `Until ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'Date Range';
  }, [startDate, endDate]);

  // Handle preset button clicks
  const handlePreset = React.useCallback(
    (preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear') => {
      let range: { start: Date; end: Date };
      switch (preset) {
        case 'thisMonth':
          range = getThisMonth();
          break;
        case 'lastMonth':
          range = getLastMonth();
          break;
        case 'thisYear':
          range = getThisYear();
          break;
        case 'lastYear':
          range = getLastYear();
          break;
      }
      onDateChange(range.start, range.end);
      setIsOpen(false);
    },
    [onDateChange]
  );

  // Handle calendar date selection (range mode)
  const handleCalendarSelect = React.useCallback(
    (range: DateRange | undefined) => {
      // Update local state to show selection in calendar (only if 'from' is set)
      if (range?.from) {
        setTempRange(range);
      } else {
        setTempRange(undefined);
      }

      // Only update parent and close when both dates are selected
      if (range?.from && range?.to) {
        let startDate = range.from;
        let endDate = range.to;

        // Validate: swap dates if end < start
        if (endDate < startDate) {
          [startDate, endDate] = [endDate, startDate];
        }

        onDateChange(startDate, endDate);
        setTempRange(undefined); // Reset temp state
        setIsOpen(false);
      }
      // If only 'from' is selected, tempRange is updated and calendar stays open
    },
    [onDateChange]
  );

  // Handle clear button
  const handleClear = React.useCallback(() => {
    onDateChange(null, null);
    setTempRange(undefined); // Reset temp state
    setIsOpen(false);
  }, [onDateChange]);

  // Reset temp range when popover closes without completing selection
  React.useEffect(() => {
    if (!isOpen) {
      setTempRange(undefined);
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[260px] justify-start text-left font-normal',
            !startDate && !endDate && 'text-muted-foreground'
          )}
          aria-label="Select date range"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="space-y-2 p-3">
          {/* Preset buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('thisMonth')}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('lastMonth')}
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('thisYear')}
            >
              This Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('lastYear')}
            >
              Last Year
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Calendar component */}
          <Calendar
            mode="range"
            selected={
              tempRange || (startDate ? { from: startDate, to: endDate || undefined } : undefined)
            }
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            className="rounded-md"
          />

          {/* Clear button */}
          {(startDate || endDate) && (
            <>
              <div className="border-t" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Clear Dates
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
