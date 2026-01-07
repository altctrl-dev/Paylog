'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, Mail } from 'lucide-react';

interface InviteCreatedDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
  role: string;
  inviteUrl: string;
}

export function InviteCreatedDialog({
  open,
  onClose,
  email,
  role,
  inviteUrl,
}: InviteCreatedDialogProps) {
  const [copied, setCopied] = useState(false);

  const roleName = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Standard User';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invitation Sent
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Invitation sent successfully
          </AlertDialogDescription>
          <div className="space-y-4 text-sm">
            <p>
              An invitation has been sent to <strong>{email}</strong> to join as a <strong>{roleName}</strong>.
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Invite Link</p>
              <p className="text-xs text-muted-foreground">
                If the email doesn&apos;t arrive, you can share this link directly:
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-xs"
                />
                <Button
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
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              This invitation expires in 48 hours.
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose}>Done</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
