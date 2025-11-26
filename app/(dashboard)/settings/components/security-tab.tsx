/**
 * Security Tab Component
 *
 * User security settings including email, password, and session info.
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Shield, Mail, Key, Clock, AlertCircle } from 'lucide-react';

export function SecurityTab() {
  const { data: session } = useSession();

  // For now, these are placeholder states
  // Full implementation would require password change API, 2FA setup, etc.
  const lastPasswordChange = null; // Would come from user record
  const twoFactorEnabled = false; // Would come from user record

  return (
    <div className="space-y-6">
      {/* Email Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Email Address</h3>
              <p className="text-sm text-muted-foreground">
                Your email is used for login and notifications
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">{session?.user?.email}</p>
              <p className="text-sm text-muted-foreground">Primary email</p>
            </div>
            <Badge variant="secondary">Verified</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Contact your administrator to change your email address.
          </p>
        </div>
      </Card>

      {/* Password Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Password</h3>
              <p className="text-sm text-muted-foreground">
                Keep your account secure with a strong password
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">••••••••••••</p>
              <p className="text-sm text-muted-foreground">
                {lastPasswordChange
                  ? `Last changed ${format(lastPasswordChange, 'MMM d, yyyy')}`
                  : 'Password set at account creation'}
              </p>
            </div>
            <Button variant="outline" disabled>
              Change Password
            </Button>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Password change functionality coming soon. Contact your administrator if you need to reset your password.
            </p>
          </div>
        </div>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">
                {twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {twoFactorEnabled
                  ? 'Your account is protected with 2FA'
                  : 'Protect your account with an authenticator app'}
              </p>
            </div>
            <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
              {twoFactorEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Two-factor authentication setup coming soon.
            </p>
          </div>
        </div>
      </Card>

      {/* Active Sessions Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Active Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Devices where you are currently logged in
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-muted-foreground">
                  This device • Active now
                </p>
              </div>
              <Badge variant="default">Current</Badge>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Session management coming soon. You will be able to see all active sessions and sign out from other devices.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
