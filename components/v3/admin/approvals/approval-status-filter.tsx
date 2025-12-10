'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';
import type { ApprovalStatusFilter } from '@/hooks/use-approvals';

interface ApprovalStatusFilterSelectProps {
  value: ApprovalStatusFilter;
  onChange: (value: ApprovalStatusFilter) => void;
}

const STATUS_OPTIONS: Array<{ value: ApprovalStatusFilter; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function ApprovalStatusFilterSelect({
  value,
  onChange,
}: ApprovalStatusFilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Status:</span>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as ApprovalStatusFilter)}
        className="w-[140px]"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
