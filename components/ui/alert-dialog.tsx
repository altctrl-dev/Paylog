/**
 * AlertDialog Component
 *
 * Simplified alert dialog for confirmations.
 * Based on Radix UI patterns with Tailwind CSS styling.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-[10010]">
        {children}
      </div>
    </div>
  );
}

interface AlertDialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogContent({ className, children }: AlertDialogContentProps) {
  return (
    <div
      className={cn(
        'bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-md',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>
  );
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
  return <div className={cn('space-y-2 mb-4', className)}>{children}</div>;
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>;
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogFooter({ children, className }: AlertDialogFooterProps) {
  return <div className={cn('flex justify-end gap-2 mt-6', className)}>{children}</div>;
}

interface AlertDialogActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AlertDialogAction({ children, onClick, disabled, className }: AlertDialogActionProps) {
  return (
    <Button onClick={onClick} variant="destructive" disabled={disabled} className={className}>
      {children}
    </Button>
  );
}

interface AlertDialogCancelProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AlertDialogCancel({ children, onClick, disabled, className }: AlertDialogCancelProps) {
  return (
    <Button onClick={onClick} variant="outline" disabled={disabled} className={className}>
      {children}
    </Button>
  );
}
