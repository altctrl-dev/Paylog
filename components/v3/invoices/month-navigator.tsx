'use client';

/**
 * Month Navigator Component
 *
 * Provides month/year navigation with:
 * - Previous/Next buttons
 * - Calendar icon that opens a month/year picker
 * - Displays current month and year
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface MonthNavigatorProps {
  /** Currently selected month (0-11) */
  month: number;
  /** Currently selected year */
  year: number;
  /** Callback when month/year changes */
  onChange: (month: number, year: number) => void;
  /** Optional className for styling */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Generate years from 2020 to current year + 1
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

// ============================================================================
// Component
// ============================================================================

export function MonthNavigator({
  month,
  year,
  onChange,
  className,
}: MonthNavigatorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempMonth, setTempMonth] = React.useState(month);
  const [tempYear, setTempYear] = React.useState(year);

  // Reset temp values when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setTempMonth(month);
      setTempYear(year);
    }
  }, [isOpen, month, year]);

  const handlePrevMonth = () => {
    if (month === 0) {
      onChange(11, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onChange(0, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  const handleApply = () => {
    onChange(tempMonth, tempYear);
    setIsOpen(false);
  };

  const handleGoToToday = () => {
    const now = new Date();
    onChange(now.getMonth(), now.getFullYear());
    setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Previous Month Button */}
      <Button
        variant="subtle"
        size="icon"
        className="h-8 w-8"
        onClick={handlePrevMonth}
        title="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Calendar Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 min-w-[160px] justify-center"
          >
            <Calendar className="h-4 w-4" />
            <span className="font-medium">
              {SHORT_MONTHS[month]} {year}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="center">
          <div className="space-y-4">
            {/* Month Select */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Month
              </label>
              <Select
                value={tempMonth.toString()}
                onChange={(e) => setTempMonth(parseInt(e.target.value, 10))}
              >
                {MONTHS.map((monthName, index) => (
                  <option key={index} value={index.toString()}>
                    {monthName}
                  </option>
                ))}
              </Select>
            </div>

            {/* Year Select */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Year
              </label>
              <Select
                value={tempYear.toString()}
                onChange={(e) => setTempYear(parseInt(e.target.value, 10))}
              >
                {YEARS.map((yr) => (
                  <option key={yr} value={yr.toString()}>
                    {yr}
                  </option>
                ))}
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleGoToToday}
              >
                Today
              </Button>
              <Button size="sm" className="flex-1" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Next Month Button */}
      <Button
        variant="subtle"
        size="icon"
        className="h-8 w-8"
        onClick={handleNextMonth}
        title="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default MonthNavigator;
