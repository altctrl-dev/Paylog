/**
 * Profile Access Manager Component (Sprint 11 Phase 5)
 *
 * Manages granular user access to restricted invoice profiles.
 * Displays access grants and allows super admins to grant/revoke access.
 */

'use client';

import * as React from 'react';
import { Trash2, UserPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { UserSelector } from '@/components/users/user-selector';
import {
  listProfileAccess,
  grantProfileAccess,
  revokeProfileAccess,
} from '@/app/actions/profile-access';
import { listUsers } from '@/lib/actions/user-management';

interface ProfileAccessManagerProps {
  profileId: number;
  profileName: string;
  visibleToAll: boolean;
}

type Grant = {
  id: number;
  user_id: number;
  profile_id: number;
  granted_by: number;
  granted_at: Date;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  };
  granter: {
    id: number;
    full_name: string;
  };
  profile: {
    id: number;
    name: string;
  };
};

type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export function ProfileAccessManager({
  profileId,
  profileName,
  visibleToAll,
}: ProfileAccessManagerProps) {
  const { toast } = useToast();
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGranting, setIsGranting] = React.useState(false);
  const [showUserSelector, setShowUserSelector] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<number>();
  const [userToRevoke, setUserToRevoke] = React.useState<Grant | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [grantsResult, usersResult] = await Promise.all([
        listProfileAccess(profileId),
        listUsers({ pageSize: 1000 }),
      ]);

      if (grantsResult.success) {
        setGrants(grantsResult.data);
      } else {
        console.error('Failed to load grants:', grantsResult.error);
        toast({
          title: 'Error',
          description: 'Failed to load access grants',
          variant: 'destructive',
        });
      }

      if (usersResult.success) {
        // Filter to active users only
        const activeUsers = usersResult.data.users.filter((u) => u.is_active);
        setUsers(activeUsers);
      } else {
        console.error('Failed to load users:', usersResult.error);
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load access management data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [profileId, toast]);

  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]); // Only re-fetch when profileId changes

  const handleGrantAccess = async () => {
    if (!selectedUserId) return;

    setIsGranting(true);
    try {
      const result = await grantProfileAccess(profileId, selectedUserId);

      if (result.success) {
        toast({
          title: 'Access Granted',
          description: `${result.data.user.full_name} can now access this profile`,
        });
        setShowUserSelector(false);
        setSelectedUserId(undefined);
        await loadData(); // Refresh the list
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to grant access:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant access',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (grant: Grant) => {
    try {
      const result = await revokeProfileAccess(profileId, grant.user_id);

      if (result.success) {
        toast({
          title: 'Access Revoked',
          description: `${grant.user.full_name} can no longer access this profile`,
        });
        setUserToRevoke(null);
        await loadData(); // Refresh the list
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to revoke access:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke access',
        variant: 'destructive',
      });
    }
  };

  // Get user IDs that already have access
  const excludeUserIds = grants.map((grant) => grant.user_id);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleToAll) {
    return (
      <Card>
        <CardContent className="py-4">
          <Badge variant="outline" className="text-xs">
            Visible to All Users
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            This profile is accessible to all users. No granular access control
            is needed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Granted Access ({grants.length})
            </CardTitle>
            {!showUserSelector && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserSelector(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Grant Access
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showUserSelector && (
            <div className="space-y-3 mb-4 p-3 border rounded-md bg-muted/50">
              <div>
                <label className="text-xs font-medium">Select User</label>
                <div className="mt-1">
                  <UserSelector
                    users={users}
                    selectedUserId={selectedUserId}
                    onSelect={setSelectedUserId}
                    placeholder="Select user to grant access..."
                    excludeUserIds={excludeUserIds}
                    disabled={isGranting}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleGrantAccess}
                  disabled={!selectedUserId || isGranting}
                >
                  {isGranting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    'Grant Access'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowUserSelector(false);
                    setSelectedUserId(undefined);
                  }}
                  disabled={isGranting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {grants.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>No users have been granted access yet.</p>
              <p className="text-xs mt-1">
                This profile is restricted and not visible to standard users.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {grants.map((grant) => (
                <div
                  key={grant.id}
                  className="flex items-start justify-between p-3 border rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {grant.user.full_name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0"
                      >
                        {grant.user.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {grant.user.email}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>Granted by {grant.granter.full_name}</span>
                      <span className="mx-1">•</span>
                      <span>
                        {format(new Date(grant.granted_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUserToRevoke(grant)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!userToRevoke}
        onOpenChange={(open) => !open && setUserToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for{' '}
              <span className="font-medium">{userToRevoke?.user.full_name}</span>?
              They will no longer be able to see or use the profile &quot;
              {profileName}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRevoke && handleRevokeAccess(userToRevoke)}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
