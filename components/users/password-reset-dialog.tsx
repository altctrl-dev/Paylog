'use client';

/**
 * Password Reset Dialog Component
 * Sprint 11 Phase 3: User Management UI (Sub-Phase 2)
 *
 * Modal dialog for resetting user passwords.
 * - Generates temporary password via resetUserPassword server action
 * - Displays password with copy-to-clipboard functionality
 * - Auto-closes after 10 seconds on success
 * - Toast notifications for user feedback
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Loader2 } from 'lucide-react';
import { resetUserPassword } from '@/lib/actions/user-management';

// ============================================================================
// Types
// ============================================================================

interface PasswordResetDialogProps {
  userId: number;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PasswordResetDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: PasswordResetDialogProps) {
  // Hooks
  const { toast } = useToast();

  // State management
  const [isResetting, setIsResetting] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPassword(null);
      setError(null);
      setCopied(false);
      setIsResetting(false);
    }
  }, [open]);

  // Auto-close after 10 seconds on success
  useEffect(() => {
    if (password) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [password, onOpenChange]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError(null);

      const result = await resetUserPassword(userId);

      if (result.success) {
        // Success: Extract password from PasswordResetResult
        const temporaryPassword = result.data.temporary_password;

        if (!temporaryPassword) {
          throw new Error('No temporary password returned');
        }

        setPassword(temporaryPassword);
        toast({
          title: 'Password Reset',
          description: `Password reset for ${userName}`,
        });

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Error from server action
        const errorMessage = result.error || 'Failed to reset password';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (err) {
      // Unexpected error
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopy = async () => {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Password copied to clipboard',
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy password',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // ============================================================================
  // Render States
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {!password ? (
              <>
                Are you sure you want to reset the password for{' '}
                <strong className="font-semibold text-foreground">{userName}</strong>?
              </>
            ) : (
              'Password has been reset successfully'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Initial State: Confirmation */}
        {!password && !error && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A new temporary password will be generated. The user will need to use this password
              to log in.
            </p>
          </div>
        )}

        {/* Success State: Display Password */}
        {password && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Temporary Password
              </label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={password}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">{copied ? 'Copied' : 'Copy to clipboard'}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This dialog will close automatically in 10 seconds
              </p>
            </div>
          </div>
        )}

        {/* Error State: Display Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Footer Buttons */}
        <DialogFooter className="sm:justify-between">
          {!password ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={handleCancel} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
