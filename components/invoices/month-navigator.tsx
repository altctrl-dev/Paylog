/**
 * Month Navigator Component
 *
 * Allows navigation through months with prev/next buttons.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MonthNavigatorProps {
  selectedDate: Date;
  onDateChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export function MonthNavigator({
  selectedDate,
  onDateChange,
  className,
}: MonthNavigatorProps) {
  const handlePreviousMonth = () => {
    const newDate = subMonths(selectedDate, 1);
    const start = startOfMonth(newDate);
    const end = endOfMonth(newDate);
    onDateChange(start, end);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(selectedDate, 1);
    const start = startOfMonth(newDate);
    const end = endOfMonth(newDate);
    onDateChange(start, end);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    onDateChange(start, end);
  };

  const isCurrentMonth = React.useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousMonth}
        title="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {format(selectedDate, 'MMMM yyyy')}
        </span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        title="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCurrentMonth}
          className="ml-2 text-xs"
        >
          Today
        </Button>
      )}
    </div>
  );
}
