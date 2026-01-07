import { validateInvite } from '@/app/actions/invites';
import { InviteAcceptForm } from './invite-accept-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const result = await validateInvite(token);

  // Invalid or expired invite
  if (!result.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please contact your administrator for a new invitation.
            </p>
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite - show accept form
  const roleName =
    result.role === 'super_admin'
      ? 'Super Admin'
      : result.role === 'admin'
        ? 'Admin'
        : 'Standard User';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">PayLog</h1>
          <p className="text-muted-foreground">Invoice Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join PayLog as a <strong>{roleName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteAcceptForm
              token={token}
              email={result.email!}
              role={result.role!}
            />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/login" className="underline hover:text-foreground">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
