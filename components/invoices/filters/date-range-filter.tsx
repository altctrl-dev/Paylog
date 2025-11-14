/**
 * Date Range Filter Component
 *
 * Popover with preset buttons, separate Start/End date inputs, and Apply button.
 * Features:
 * - Quick preset buttons (This Month, Last Month, This Year, Last Year)
 * - Separate Start and End date inputs with calendar pickers
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
 * Renders a date range filter with popover containing preset buttons,
 * separate date inputs, and Apply button.
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const DateRangeFilter = React.memo(function DateRangeFilter({
  startDate,
  endDate,
  onDateChange,
}: DateRangeFilterProps) {
  // Main popover state
  const [isOpen, setIsOpen] = React.useState(false);

  // Local state for temporary date selection (before Apply is clicked)
  const [tempStartDate, setTempStartDate] = React.useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = React.useState<Date | null>(endDate);

  // Nested popover state for start date calendar
  const [startCalendarOpen, setStartCalendarOpen] = React.useState(false);

  // Nested popover state for end date calendar
  const [endCalendarOpen, setEndCalendarOpen] = React.useState(false);

  // Sync temp state with props when they change externally
  React.useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  // Format the display text for the main trigger button
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
      setTempStartDate(range.start);
      setTempEndDate(range.end);
    },
    []
  );

  // Handle start date selection
  const handleStartDateSelect = React.useCallback((date: Date | undefined) => {
    if (date) {
      setTempStartDate(date);
      setStartCalendarOpen(false);
    }
  }, []);

  // Handle end date selection
  const handleEndDateSelect = React.useCallback((date: Date | undefined) => {
    if (date) {
      setTempEndDate(date);
      setEndCalendarOpen(false);
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
    setIsOpen(false);
  }, [tempStartDate, tempEndDate, onDateChange]);

  // Handle Clear button - reset everything
  const handleClear = React.useCallback(() => {
    setTempStartDate(null);
    setTempEndDate(null);
    onDateChange(null, null);
    setIsOpen(false);
  }, [onDateChange]);

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
        <div className="space-y-3 p-3">
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

          {/* Custom date inputs */}
          <div className="space-y-3">
            {/* Start Date Input */}
            <div className="space-y-2">
              <label htmlFor="start-date" className="text-sm font-medium">
                Start
              </label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
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
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
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

          {/* Divider */}
          <div className="border-t" />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              className="flex-1"
              size="sm"
              disabled={!tempStartDate && !tempEndDate}
            >
              Apply
            </Button>
            {(tempStartDate || tempEndDate) && (
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
