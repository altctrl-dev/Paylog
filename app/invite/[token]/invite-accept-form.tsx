'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { startInviteAcceptance } from '@/app/actions/invites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MicrosoftIcon } from '@/components/icons/microsoft';
import { Loader2 } from 'lucide-react';

interface InviteAcceptFormProps {
  token: string;
  email: string;
  role: string;
}

export function InviteAcceptForm({ token, email, role }: InviteAcceptFormProps) {
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const roleName =
    role === 'super_admin'
      ? 'Super Admin'
      : role === 'admin'
        ? 'Admin'
        : 'Standard User';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);

    try {
      // Start invite acceptance - this sets the cookie server-side
      const result = await startInviteAcceptance(token, fullName);

      if (!result.success) {
        setError(result.error || 'Failed to start invitation process');
        setIsLoading(false);
        return;
      }

      // Redirect to Microsoft OAuth
      // The auth.ts signIn callback will check for the pending_invite cookie
      await signIn('microsoft-entra-id', {
        callbackUrl: '/dashboard',
      });
    } catch (err) {
      console.error('Failed to start OAuth flow:', err);
      setError('Failed to start sign-in. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email (readonly) */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Sign in with this Microsoft account to accept the invitation
        </p>
      </div>

      {/* Full Name */}
      <div>
        <Label htmlFor="fullName">Your Full Name *</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          required
          disabled={isLoading}
        />
      </div>

      {/* Role Info */}
      <div className="p-3 bg-muted rounded-md text-sm">
        <p className="text-muted-foreground">
          You will be added as a <strong className="text-foreground">{roleName}</strong>
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !fullName.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <MicrosoftIcon className="h-4 w-4 mr-2" />
            Accept Invitation & Sign In
          </>
        )}
      </Button>
    </form>
  );
}
