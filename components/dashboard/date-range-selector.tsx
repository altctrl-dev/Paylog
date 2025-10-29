/**
 * Date Range Selector Component
 * Dropdown for selecting time range on dashboard
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Select } from '@/components/ui/select';
import { DateRange, DATE_RANGE } from '@/types/dashboard';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  [DATE_RANGE.ONE_MONTH]: 'Last 1 Month',
  [DATE_RANGE.THREE_MONTHS]: 'Last 3 Months',
  [DATE_RANGE.SIX_MONTHS]: 'Last 6 Months',
  [DATE_RANGE.ONE_YEAR]: 'Last 1 Year',
  [DATE_RANGE.ALL_TIME]: 'All Time',
};

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="relative flex items-center">
      <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRange)}
        className="w-[180px] pl-9"
        aria-label="Select date range"
      >
        {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}
