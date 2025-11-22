/**
 * Toast Hook using Sonner
 *
 * Provides toast notifications with proper UI using Sonner library.
 */

'use client';

import { toast as sonnerToast } from 'sonner';

type ToastVariant = 'default' | 'destructive';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

/**
 * Toast hook using Sonner for actual UI toasts
 */
export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    if (variant === 'destructive') {
      sonnerToast.error(title, description ? { description } : undefined);
    } else {
      sonnerToast.success(title, description ? { description } : undefined);
    }
  };

  return { toast };
}
