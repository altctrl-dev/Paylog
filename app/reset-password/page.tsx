import { auth } from '@/lib/auth';
import { PasswordResetForm } from './password-reset-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ResetPasswordPage() {
  const session = await auth();

  // If not authenticated, show verify with Microsoft UI
  if (!session?.user) {
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
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Set Emergency Password
              </CardTitle>
              <CardDescription>
                Verify your identity with Microsoft to set or reset your emergency password.
                This is only available for super administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordResetForm step="verify" />
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link href="/login" className="underline hover:text-foreground">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated - check if super_admin
  if (session.user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Emergency password is only available for super administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is super_admin - show password form
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
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Set Emergency Password
            </CardTitle>
            <CardDescription>
              Create a backup password for emergency access when Microsoft authentication is unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordResetForm step="set-password" userEmail={session.user.email || ''} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link href="/dashboard" className="underline hover:text-foreground">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
