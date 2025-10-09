/**
 * Simple Toast Hook
 *
 * Basic toast notification system. Can be replaced with a more sophisticated
 * toast library (like sonner or react-hot-toast) later.
 */

'use client';

type ToastVariant = 'default' | 'destructive';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

/**
 * Simple toast hook using browser alerts for now
 * TODO: Implement proper toast UI component
 */
export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    // For now, use console logging (will be replaced with actual toast UI)
    const prefix = variant === 'destructive' ? '❌' : '✅';
    const message = `${prefix} ${title}${description ? `: ${description}` : ''}`;

    if (variant === 'destructive') {
      console.error(message);
    } else {
      console.log(message);
    }

    // In production, this would trigger a proper toast notification
    // For now, we'll just log to console to avoid blocking UX
  };

  return { toast };
}
