/**
 * User Created Confirmation Dialog
 *
 * Displays the temporary password after successfully creating a new user.
 * Requires user acknowledgment before closing to ensure they save the password.
 *
 * Sprint 11 Phase 4: User Management UI Enhancement
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UserCreatedConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  temporaryPassword: string;
}

export function UserCreatedConfirmationDialog({
  open,
  onClose,
  userName,
  userEmail,
  temporaryPassword,
}: UserCreatedConfirmationDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Password copied to clipboard',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy password',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-success/10 p-3">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <DialogTitle className="text-lg">User Created Successfully</DialogTitle>
            </div>
          </div>
          <DialogDescription className="space-y-4 text-left">
            <p className="text-sm">
              User <strong>{userName}</strong> ({userEmail}) has been created successfully.
            </p>

            <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Important:</p>
                <p className="mt-1 text-muted-foreground">
                  Save this temporary password now. It won&apos;t be shown again.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Temporary Password:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted p-3 font-mono text-lg font-semibold">
                  {temporaryPassword}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-success">✓ Password copied to clipboard</p>
              )}
            </div>

            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Next Steps:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Share this password with the user securely (email, chat, etc.)</li>
                <li>User will be prompted to change password on first login</li>
                <li>Temporary password expires in 15 days if not used</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            I&apos;ve Saved the Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
