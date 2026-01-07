'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingInvites, revokeInvite, resendInvite } from '@/app/actions/invites';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Trash2, Clock, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires_at: Date;
  created_at: Date;
  invited_by: string;
}

interface PendingInvitesTableProps {
  onInviteAccepted?: () => void;
}

export function PendingInvitesTable({ onInviteAccepted }: PendingInvitesTableProps) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadInvites = useCallback(async () => {
    setIsLoading(true);
    const data = await getPendingInvites();
    setInvites(data as PendingInvite[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  // Refresh when onInviteAccepted is called
  useEffect(() => {
    if (onInviteAccepted) {
      loadInvites();
    }
  }, [onInviteAccepted, loadInvites]);

  async function handleResend(inviteId: string) {
    setActionInProgress(inviteId);
    const result = await resendInvite(inviteId);

    if (result.success) {
      toast({
        title: 'Invite Resent',
        description: 'The invitation email has been resent.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }

    setActionInProgress(null);
  }

  async function handleRevoke(inviteId: string) {
    setActionInProgress(inviteId);
    setRevokeConfirmId(null);

    const result = await revokeInvite(inviteId);

    if (result.success) {
      toast({
        title: 'Invite Revoked',
        description: 'The invitation has been cancelled.',
      });
      // Remove from local state
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }

    setActionInProgress(null);
  }

  function formatRole(role: string) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Standard User';
    }
  }

  function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  }

  function formatTimeRemaining(expiresAt: Date) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return 'Expired';
    if (diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `${diffHours} hours`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No pending invitations</p>
        <p className="text-sm text-muted-foreground mt-1">
          Invitations you send will appear here until they are accepted or expire.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {invites.length} pending invitation{invites.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={loadInvites}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Expires In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(invite.role)}>
                    {formatRole(invite.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{invite.invited_by}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatTimeRemaining(invite.expires_at)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionInProgress === invite.id}
                      onClick={() => handleResend(invite.id)}
                    >
                      {actionInProgress === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={actionInProgress === invite.id}
                      onClick={() => setRevokeConfirmId(invite.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeConfirmId} onOpenChange={() => setRevokeConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation. The user will no longer be able to use the invite
              link to create their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeConfirmId && handleRevoke(revokeConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
