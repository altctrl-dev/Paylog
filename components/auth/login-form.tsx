'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MicrosoftIcon } from '@/components/icons/microsoft';

// Error messages for different session errors
const ERROR_MESSAGES: Record<string, string> = {
  deactivated:
    'Your account has been deactivated. Please contact your administrator.',
  session_expired: 'Your session has expired. Please sign in again.',
  CredentialsSignin: 'Invalid email or password.',
  OAuthAccountNotLinked:
    'This email is already registered. Please sign in with your original method.',
  AccessDenied: 'Access denied. Your account may be deactivated.',
  NotInvited:
    'You are not authorized to access this application. Please contact your administrator for an invitation.',
  AccountDeactivated:
    'Your account has been deactivated. Please contact your administrator.',
  EmailMismatch:
    'Please sign in with the Microsoft account that matches your invitation email.',
  InviteExpired:
    'Your invitation has expired or is no longer valid. Please contact your administrator for a new invitation.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [error, setError] = useState('');

  // Check for error in URL params (from middleware redirect or OAuth error)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      if (ERROR_MESSAGES[urlError]) {
        setError(ERROR_MESSAGES[urlError]);
      } else {
        setError('An error occurred during sign in. Please try again.');
      }
      // Clear the URL param without navigation
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  async function handleMicrosoftSignIn() {
    setIsMicrosoftLoading(true);
    setError('');

    try {
      await signIn('microsoft-entra-id', {
        callbackUrl: '/dashboard',
      });
    } catch {
      setError('An error occurred. Please try again.');
      setIsMicrosoftLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Check for specific error messages
        if (result.error.includes('only available for administrators')) {
          setError(
            'Password login is only available for administrators. Please use Microsoft sign-in.'
          );
        } else if (result.error.includes('Too many login attempts')) {
          setError(result.error);
        } else {
          setError('Invalid email or password.');
        }
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Microsoft Sign In - Primary */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={handleMicrosoftSignIn}
          disabled={isMicrosoftLoading || isLoading}
        >
          <MicrosoftIcon className="mr-2 h-5 w-5" />
          {isMicrosoftLoading ? 'Redirecting...' : 'Continue with Microsoft'}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Admin Login Toggle */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdminLogin(!showAdminLogin)}
        >
          Administrator? Sign in with email
          {showAdminLogin ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Admin Email/Password Form - Collapsible */}
        {showAdminLogin && (
          <div className="space-y-4 pt-2">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              This login is for emergency administrator access only. Regular
              users should use Microsoft sign-in above.
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@company.com"
                  required
                  disabled={isLoading || isMicrosoftLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading || isMicrosoftLoading}
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={isLoading || isMicrosoftLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <Link
                  href="/reset-password"
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Forgot password? Set up emergency access
                </Link>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
