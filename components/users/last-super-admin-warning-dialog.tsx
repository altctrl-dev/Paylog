/**
 * Last Super Admin Warning Dialog
 *
 * Displays a warning when attempting to deactivate or demote the last super admin user.
 * This dialog is non-dismissible (no action can be taken) and explains why the operation
 * is blocked to prevent system lockout.
 *
 * Sprint 11 Phase 4: Role & Permission Guards
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
import { Shield, AlertTriangle } from 'lucide-react';

interface LastSuperAdminWarningDialogProps {
  open: boolean;
  onClose: () => void;
  action: 'deactivate' | 'demote';
  userName: string;
}

export function LastSuperAdminWarningDialog({
  open,
  onClose,
  action,
  userName,
}: LastSuperAdminWarningDialogProps) {
  const title = action === 'deactivate' ? 'Cannot Deactivate User' : 'Cannot Change Role';
  const actionText = action === 'deactivate' ? 'deactivate' : 'demote';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-warning/10 p-3">
              <Shield className="h-6 w-6 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="space-y-3 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <p>
                <strong>{userName}</strong> is the last active Super Admin in the system.
              </p>
            </div>

            <p className="text-sm">
              {action === 'deactivate' ? (
                <>
                  Deactivating this user would leave the system without any Super Admin,
                  preventing critical system management tasks and potentially locking everyone
                  out of administrative functions.
                </>
              ) : (
                <>
                  Demoting this user would leave the system without any Super Admin,
                  preventing critical system management tasks including user management,
                  role assignments, and system configuration.
                </>
              )}
            </p>

            <div className="rounded-md border border-warning/20 bg-warning/5 p-3">
              <p className="text-sm font-medium text-foreground">Required Action:</p>
              <p className="mt-1 text-sm text-muted-foreground">
                To {actionText} this user, you must first promote another user to Super Admin
                role. This ensures continuous administrative access to the system.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="default" className="w-full sm:w-auto">
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
