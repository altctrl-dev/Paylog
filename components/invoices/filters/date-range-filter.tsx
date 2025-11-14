/**
 * Date Range Filter Component
 *
 * Separate Start and End date inputs with calendar pickers and Apply button.
 * Features:
 * - Individual date inputs for Start and End dates
 * - Calendar picker for each date field
 * - Quick preset buttons (This Month, Last Month, This Year, Last Year)
 * - Apply button to confirm selection
 * - Clear button to remove date filter
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
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
 * Renders a date range filter with separate start/end inputs and Apply button.
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const DateRangeFilter = React.memo(function DateRangeFilter({
  startDate,
  endDate,
  onDateChange,
}: DateRangeFilterProps) {
  // Local state for temporary date selection (before Apply is clicked)
  const [tempStartDate, setTempStartDate] = React.useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = React.useState<Date | null>(endDate);

  // Popover state for start date picker
  const [startOpen, setStartOpen] = React.useState(false);

  // Popover state for end date picker
  const [endOpen, setEndOpen] = React.useState(false);

  // Sync temp state with props when they change externally
  React.useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
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
      setTempStartDate(range.start);
      setTempEndDate(range.end);
    },
    []
  );

  // Handle start date selection
  const handleStartDateSelect = React.useCallback((date: Date | undefined) => {
    if (date) {
      setTempStartDate(date);
      setStartOpen(false);
    }
  }, []);

  // Handle end date selection
  const handleEndDateSelect = React.useCallback((date: Date | undefined) => {
    if (date) {
      setTempEndDate(date);
      setEndOpen(false);
    }
  }, []);

  // Handle Apply button - commit the temporary dates
  const handleApply = React.useCallback(() => {
    // Validate: swap dates if end < start
    let finalStart = tempStartDate;
    let finalEnd = tempEndDate;

    if (finalStart && finalEnd && finalEnd < finalStart) {
      [finalStart, finalEnd] = [finalEnd, finalStart];
    }

    onDateChange(finalStart, finalEnd);
  }, [tempStartDate, tempEndDate, onDateChange]);

  // Handle Clear button - reset everything
  const handleClear = React.useCallback(() => {
    setTempStartDate(null);
    setTempEndDate(null);
    onDateChange(null, null);
  }, [onDateChange]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Start Date Input */}
        <div className="space-y-2">
          <label htmlFor="start-date" className="text-sm font-medium">
            Start
          </label>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !tempStartDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tempStartDate ? format(tempStartDate, 'MM/dd/yyyy') : 'MM/DD/YYYY'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={tempStartDate || undefined}
                onSelect={handleStartDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Input */}
        <div className="space-y-2">
          <label htmlFor="end-date" className="text-sm font-medium">
            End
          </label>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                id="end-date"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !tempEndDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tempEndDate ? format(tempEndDate, 'MM/dd/yyyy') : 'MM/DD/YYYY'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={tempEndDate || undefined}
                onSelect={handleEndDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-2">
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

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleApply}
          className="flex-1"
          disabled={!tempStartDate && !tempEndDate}
        >
          Apply
        </Button>
        {(tempStartDate || tempEndDate) && (
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
});
