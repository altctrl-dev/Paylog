'use client';

/**
 * Floating Action Bar Component
 *
 * Appears at the bottom of the screen when invoices are selected.
 * Provides bulk actions: Export, Archive, Delete (super admin only).
 *
 * Features:
 * - Slides up with animation when selections exist
 * - ESC key clears selection
 * - Responsive design
 * - Role-based action visibility
 */

import * as React from 'react';
import { useEffect } from 'react';
import { Download, Archive, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface FloatingActionBarProps {
  /** Number of selected invoices */
  selectedCount: number;
  /** Set of selected invoice IDs (reserved for future use) */
  selectedInvoices?: Set<number>;
  /** Current user's role */
  userRole: string;
  /** Handler for export action */
  onExport: () => void;
  /** Handler for archive action */
  onArchive: () => void;
  /** Handler for delete action (super admin only) */
  onDelete?: () => void;
  /** Handler to clear selection */
  onClearSelection: () => void;
  /** Whether any bulk operation is in progress */
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FloatingActionBar({
  selectedCount,
  userRole,
  onExport,
  onArchive,
  onDelete,
  onClearSelection,
  isLoading = false,
}: FloatingActionBarProps) {
  const isSuperAdmin = userRole === 'super_admin';
  const isVisible = selectedCount > 0;

  // Handle ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClearSelection]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        // Fixed position at bottom center
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        // Animation
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
      )}
    >
      <div
        className={cn(
          // Container styling
          'flex items-center gap-3 px-4 py-3 rounded-xl',
          // Background with blur
          'bg-background/95 backdrop-blur-sm',
          // Border and shadow
          'border border-border shadow-lg',
          // Dark mode adjustments
          'dark:bg-zinc-900/95 dark:border-zinc-700',
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary">
            <span className="text-xs font-bold">{selectedCount}</span>
          </div>
          <span className="text-sm font-medium text-foreground">
            selected
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Archive */}
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            disabled={isLoading}
            className="gap-2 text-amber-600 border-amber-600/50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-600 dark:text-amber-500 dark:border-amber-500/50 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Archive</span>
          </Button>

          {/* Delete (super admin only) */}
          {isSuperAdmin && onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isLoading}
              className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>

        {/* Clear selection button */}
        <div className="pl-2 border-l border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            disabled={isLoading}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Clear selection (ESC)"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear selection</span>
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
        <span className="text-[10px] text-muted-foreground/60">
          Press ESC to clear
        </span>
      </div>
    </div>
  );
}

export default FloatingActionBar;
