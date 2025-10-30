'use client';

/**
 * Error Boundary Component
 * Sprint 13 Phase 3: Testing & Polish
 *
 * Catches React errors and displays a fallback UI instead of white screen.
 * Used to wrap major application sections (Dashboard, Invoices, Admin, Settings).
 */

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// Component
// ============================================================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('Error boundary caught:', error, errorInfo);

    // TODO: Send to error tracking service (e.g., Sentry) in production
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {this.props.section
                    ? `Error in ${this.props.section}`
                    : 'Something went wrong'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  An unexpected error occurred
                </p>
              </div>
            </div>

            {/* Error message (development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 rounded-md bg-muted p-3">
                <p className="mb-1 text-xs font-semibold">Error Details:</p>
                <p className="text-xs text-muted-foreground">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1"
              >
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

    return this.props.children;
  }
}
