'use client';

/**
 * Categorized Tab Component (v3)
 *
 * Placeholder component for the categorized reports feature.
 * Shows an empty state indicating the feature is coming soon.
 */

import * as React from 'react';
import { LayoutGrid } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function CategorizedTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <LayoutGrid className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Categorized Reports
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Coming soon - categorized reports will be available here.
      </p>
    </div>
  );
}

export default CategorizedTab;
