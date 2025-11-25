/**
 * AmountInput Component
 *
 * Smart amount input with placeholder behavior that avoids leading zeros.
 * When empty and unfocused: shows placeholder "0.00"
 * When focused: empty field for direct typing
 * When blurred with value: displays the value
 * When blurred without value: shows placeholder again
 *
 * Integrates with React Hook Form Controller pattern.
 */

'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Props interface for AmountInput
 */
interface AmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  /** Current numeric value (from React Hook Form or controlled state) */
  value?: number | string | null;
  /** Callback when value changes - receives parsed number or null */
  onChange?: (value: number | null) => void;
  /** Placeholder text shown when empty (default: "0.00") */
  placeholder?: string;
  /** Step increment for number input (default: "0.01") */
  step?: string;
  /** Minimum value (default: "0") */
  min?: string;
  /** Whether to show error styling */
  hasError?: boolean;
}

/**
 * AmountInput Component
 *
 * Features:
 * - No leading zero issue when typing
 * - Smart placeholder behavior (shows 0.00 when empty)
 * - Direct typing without pre-filled zeros
 * - Proper React Hook Form integration
 * - Scroll-to-change disabled
 */
export function AmountInput({
  value,
  onChange,
  className,
  placeholder = '0.00',
  step = '0.01',
  min = '0',
  hasError,
  onFocus,
  onBlur,
  ...props
}: AmountInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState('');

  // Sync display value with external value when not focused
  React.useEffect(() => {
    if (!isFocused) {
      // Convert external value to display string
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (numValue !== null && numValue !== undefined && !isNaN(numValue) && numValue > 0) {
        setDisplayValue(numValue.toString());
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Select all text on focus for easy replacement
    e.target.select();
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    // Parse and format the value on blur
    const numValue = parseFloat(displayValue);
    if (!isNaN(numValue) && numValue > 0) {
      onChange?.(numValue);
      setDisplayValue(numValue.toString());
    } else {
      onChange?.(null);
      setDisplayValue('');
    }

    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    // Update parent immediately for real-time validation
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange?.(numValue);
    } else if (newValue === '' || newValue === null) {
      onChange?.(null);
    }
  };

  // Disable scroll-to-change behavior
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={displayValue}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onWheel={handleWheel}
      className={cn(hasError && 'border-destructive', className)}
      {...props}
    />
  );
}
