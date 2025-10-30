'use client';

/**
 * Settings Error Boundary
 * Sprint 13 Phase 3: Testing & Polish
 *
 * Catches errors in the settings section and displays fallback UI.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Settings error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Error in Settings</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while loading settings
            </p>
          </div>
        </div>

        {/* Error message (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 rounded-md bg-muted p-3">
            <p className="mb-1 text-xs font-semibold">Error Details:</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = '/dashboard')}
            className="flex-1"
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Support info */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </Card>
    </div>
  );
}
