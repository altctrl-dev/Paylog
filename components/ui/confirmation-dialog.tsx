/**
 * Confirmation Dialog Component
 *
 * A reusable, styled confirmation dialog for use across the application.
 * Supports single-step and multi-step confirmations with optional step indicators.
 *
 * Features:
 * - Consistent styling matching the app's design system
 * - Variant support (default, warning, destructive)
 * - Optional step indicators (dots)
 * - Loading states for async operations
 * - Customizable button labels
 * - Optional content card for displaying details
 */

'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ============================================================================
// TYPES
// ============================================================================

export type ConfirmationVariant = 'default' | 'warning' | 'destructive';

export interface ConfirmationDialogProps {
  /** Controls dialog visibility */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description text */
  description?: string;
  /** Visual variant - affects button and icon colors */
  variant?: ConfirmationVariant;
  /** Text for cancel button */
  cancelLabel?: string;
  /** Text for confirm button */
  confirmLabel?: string;
  /** Callback when confirm is clicked */
  onConfirm: () => void;
  /** Callback when cancel is clicked (defaults to closing dialog) */
  onCancel?: () => void;
  /** Shows loading state on confirm button */
  isLoading?: boolean;
  /** Disables both buttons */
  disabled?: boolean;
  /** Optional content to display in a card-style box */
  children?: React.ReactNode;
  /** Current step (1-indexed) for multi-step dialogs */
  currentStep?: number;
  /** Total steps for multi-step dialogs */
  totalSteps?: number;
  /** Hide the close (X) button */
  hideCloseButton?: boolean;
  /** Additional class for the dialog content */
  className?: string;
}

// ============================================================================
// SHARED STYLES
// ============================================================================

/**
 * Standard border styling for confirmation dialog content cards
 * Use this constant or ConfirmationContentCard component for consistent styling
 */
export const CONFIRMATION_CARD_STYLES = 'rounded-lg border border-muted p-5 bg-background';

// ============================================================================
// VARIANT CONFIG
// ============================================================================

const variantConfig: Record<
  ConfirmationVariant,
  {
    confirmButtonVariant: 'default' | 'destructive';
    titleClass: string;
  }
> = {
  default: {
    confirmButtonVariant: 'default',
    titleClass: '',
  },
  warning: {
    confirmButtonVariant: 'default',
    titleClass: 'text-primary',
  },
  destructive: {
    confirmButtonVariant: 'destructive',
    titleClass: 'text-destructive',
  },
};

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 w-3 rounded-full transition-colors',
            i + 1 === currentStep
              ? 'bg-foreground'
              : i + 1 < currentStep
                ? 'bg-foreground/60'
                : 'border-2 border-muted-foreground/40 bg-transparent'
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  isLoading = false,
  disabled = false,
  children,
  currentStep,
  totalSteps,
  hideCloseButton = false,
  className,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant];
  // Only show step indicator when explicitly provided for multi-step dialogs
  const showStepIndicator = currentStep !== undefined && totalSteps !== undefined && totalSteps > 1;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isLoading && !disabled && onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative z-[10010] bg-background border border-border rounded-2xl shadow-xl p-8 w-full max-w-lg',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        {/* Close button */}
        {!hideCloseButton && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 focus-visible:border-primary disabled:pointer-events-none"
            disabled={isLoading || disabled}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        )}

        {/* Step indicator */}
        {showStepIndicator && (
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        )}

        {/* Header */}
        <div className="space-y-3 mb-6 pr-8">
          <h2 className={cn('text-2xl font-bold', config.titleClass)}>
            {title}
          </h2>
          {description && (
            <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>

        {/* Content */}
        {children && (
          <div className={cn(CONFIRMATION_CARD_STYLES, 'mb-6')}>
            {children}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={handleCancel}
            disabled={isLoading || disabled}
            className="px-6 text-base font-medium"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            size="lg"
            onClick={handleConfirm}
            disabled={isLoading || disabled}
            className="px-6 text-base font-medium"
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTENT HELPER COMPONENTS
// ============================================================================

/**
 * Content card wrapper with standard confirmation dialog styling
 */
export interface ConfirmationContentCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ConfirmationContentCard({
  children,
  className,
}: ConfirmationContentCardProps) {
  return (
    <div className={cn(CONFIRMATION_CARD_STYLES, className)}>
      {children}
    </div>
  );
}

/**
 * Content row for displaying key-value pairs in the dialog
 */
export interface ConfirmationContentRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function ConfirmationContentRow({
  label,
  value,
  className,
}: ConfirmationContentRowProps) {
  return (
    <div className={cn('flex justify-between items-center py-1 text-base', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * Numbered step item for multi-step confirmation summaries
 */
export interface ConfirmationStepItemProps {
  stepNumber: number;
  title: string;
  description: string;
  variant?: 'default' | 'warning';
}

export function ConfirmationStepItem({
  stepNumber,
  title,
  description,
  variant = 'default',
}: ConfirmationStepItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-sm font-medium',
          variant === 'warning' ? 'bg-amber-600' : 'bg-primary'
        )}
      >
        {stepNumber}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * Warning banner for displaying important notices in the dialog
 */
export interface ConfirmationWarningProps {
  children: React.ReactNode;
  className?: string;
}

export function ConfirmationWarning({
  children,
  className,
}: ConfirmationWarningProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 mb-4',
        className
      )}
    >
      <span className="text-amber-600 font-bold">!</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

// ============================================================================
// HOOK FOR MANAGING DIALOG STATE
// ============================================================================

/**
 * Hook for managing confirmation dialog state
 * Useful for inline dialogs that don't need complex state management
 */
export function useConfirmationDialog<T = void>() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const open = React.useCallback((confirmData?: T) => {
    setData(confirmData ?? null);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setData(null);
    setIsLoading(false);
  }, []);

  const confirm = React.useCallback(
    async (onConfirm: (data: T | null) => Promise<void> | void) => {
      setIsLoading(true);
      try {
        await onConfirm(data);
        close();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [data, close]
  );

  return {
    isOpen,
    data,
    isLoading,
    open,
    close,
    confirm,
    setIsOpen,
    setIsLoading,
  };
}

// ============================================================================
// INPUT DIALOG COMPONENT
// ============================================================================

/**
 * Dialog for entering text input (e.g., rejection reason, deletion reason)
 * Follows the same styling as ConfirmationDialog
 */
export interface InputDialogProps {
  /** Controls dialog visibility */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description text */
  description?: string;
  /** Input field label */
  inputLabel: string;
  /** Input field placeholder */
  inputPlaceholder?: string;
  /** Whether input is required */
  required?: boolean;
  /** Minimum character length */
  minLength?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Visual variant */
  variant?: ConfirmationVariant;
  /** Text for cancel button */
  cancelLabel?: string;
  /** Text for confirm button */
  confirmLabel?: string;
  /** Callback when confirm is clicked with the input value */
  onConfirm: (value: string) => void;
  /** Shows loading state on confirm button */
  isLoading?: boolean;
  /** Use textarea instead of input */
  multiline?: boolean;
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  inputLabel,
  inputPlaceholder = '',
  required = false,
  minLength = 0,
  maxLength = 500,
  variant = 'default',
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  onConfirm,
  isLoading = false,
  multiline = false,
}: InputDialogProps) {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const config = variantConfig[variant];

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setValue('');
      setError(null);
    }
  }, [open]);

  // Validate input
  React.useEffect(() => {
    const trimmed = value.trim();
    if (value.length === 0) {
      setError(null);
    } else if (required && trimmed.length < minLength) {
      setError(`Must be at least ${minLength} characters`);
    } else if (value.length > maxLength) {
      setError(`Must be less than ${maxLength} characters`);
    } else {
      setError(null);
    }
  }, [value, required, minLength, maxLength]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (required && trimmed.length < minLength) {
      setError(`Must be at least ${minLength} characters`);
      return;
    }
    if (value.length > maxLength) {
      setError(`Must be less than ${maxLength} characters`);
      return;
    }
    onConfirm(trimmed);
  };

  const isValid = !required || value.trim().length >= minLength;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isLoading && onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative z-[10010] bg-background border border-border rounded-2xl shadow-xl p-8 w-full max-w-lg',
          'animate-in fade-in-0 zoom-in-95'
        )}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 focus-visible:border-primary disabled:pointer-events-none"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="space-y-3 mb-6 pr-8">
          <h2 className={cn('text-2xl font-bold', config.titleClass)}>
            {title}
          </h2>
          {description && (
            <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>

        {/* Input */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium">
            {inputLabel}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              rows={4}
              className={cn(
                'w-full px-3 py-2 rounded-lg border bg-background text-base',
                'focus:outline-none focus:ring-0 focus-visible:border-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error ? 'border-destructive' : 'border-muted'
              )}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              className={cn(
                'w-full px-3 py-2 rounded-lg border bg-background text-base h-11',
                'focus:outline-none focus:ring-0 focus-visible:border-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error ? 'border-destructive' : 'border-muted'
              )}
            />
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {maxLength && (
            <p className="text-xs text-muted-foreground text-right">
              {value.length} / {maxLength}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="px-6 text-base font-medium"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            size="lg"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="px-6 text-base font-medium"
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
