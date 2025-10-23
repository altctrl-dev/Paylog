import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <Shield className="h-16 w-16 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-destructive">403</h1>
          <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
        </div>

        <div className="space-y-1">
          <p className="text-muted-foreground">
            You do not have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Admin privileges required.
          </p>
        </div>

        <Button asChild className="mt-8">
          <Link href="/dashboard">
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
