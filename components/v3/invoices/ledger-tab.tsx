'use client';

/**
 * Ledger Tab Component (v3)
 *
 * Displays transaction history per invoice profile with:
 * - Profile dropdown selector
 * - Summary cards (total invoiced, TDS, paid, outstanding)
 * - Table view (default) or Timeline view
 * - Running balance calculation
 */

import * as React from 'react';
import { useState } from 'react';
import { TableIcon, Clock, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLedgerProfiles, useLedger } from '@/hooks/use-ledger';
import { LEDGER_VIEW_MODE, type LedgerViewMode } from '@/types/ledger';
import { LedgerSummaryCards } from './ledger-summary-cards';
import { LedgerTableView } from './ledger-table-view';

// ============================================================================
// Types
// ============================================================================

interface LedgerTabProps {
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

function ProfileSelectorSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full max-w-md" />
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-28" />
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Select an Invoice Profile
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Choose an invoice profile from the dropdown above to view its
        transaction ledger.
      </p>
    </div>
  );
}

function NoDataState({ profileName }: { profileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No Transactions Yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {profileName} doesn&apos;t have any invoices or payments recorded yet.
      </p>
    </div>
  );
}

function TimelinePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-muted rounded-lg">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Clock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Timeline View Coming Soon
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        The visual timeline view is under development. Use the Table view for
        now.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LedgerTab({ className }: LedgerTabProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<LedgerViewMode>(LEDGER_VIEW_MODE.TABLE);

  // Fetch available profiles
  const {
    data: profiles,
    isLoading: isLoadingProfiles,
    error: profilesError,
  } = useLedgerProfiles();

  // Fetch ledger data for selected profile
  const {
    data: ledgerData,
    isLoading: isLoadingLedger,
    error: ledgerError,
  } = useLedger(
    { profileId: selectedProfileId ?? 0 },
    selectedProfileId !== null && selectedProfileId > 0
  );

  // Handle profile selection
  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const id = parseInt(value, 10);
    setSelectedProfileId(id > 0 ? id : null);
  };

  // Get selected profile info
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Profile Selector and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        {/* Profile Selector */}
        <div className="space-y-2 flex-1 max-w-md">
          <label
            htmlFor="profile-select"
            className="text-sm font-medium text-muted-foreground"
          >
            Invoice Profile
          </label>
          {isLoadingProfiles ? (
            <ProfileSelectorSkeleton />
          ) : profilesError ? (
            <div className="text-sm text-destructive">
              Failed to load profiles
            </div>
          ) : (
            <div className="relative">
              <select
                id="profile-select"
                value={selectedProfileId?.toString() ?? ''}
                onChange={handleProfileChange}
                className={cn(
                  'flex h-10 w-full appearance-none rounded-md border border-input bg-background',
                  'px-3 py-2 pr-10 text-sm',
                  'focus:outline-none focus:ring-0 focus-visible:border-primary',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <option value="">Select an invoice profile...</option>
                {profiles?.map((profile) => (
                  <option key={profile.id} value={profile.id.toString()}>
                    {profile.name} - {profile.vendorName}
                    {profile.unpaidCount > 0 ? ` (${profile.unpaidCount} unpaid)` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        {selectedProfileId && (
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg">
            <Button
              variant={viewMode === LEDGER_VIEW_MODE.TABLE ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(LEDGER_VIEW_MODE.TABLE)}
              className="gap-2"
            >
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === LEDGER_VIEW_MODE.TIMELINE ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(LEDGER_VIEW_MODE.TIMELINE)}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {!selectedProfileId ? (
        <EmptyState />
      ) : isLoadingLedger ? (
        <div className="space-y-6">
          <SummaryCardsSkeleton />
          <TableSkeleton />
        </div>
      ) : ledgerError ? (
        <div className="text-center py-8 text-destructive">
          Failed to load ledger data. Please try again.
        </div>
      ) : !ledgerData || ledgerData.entries.length === 0 ? (
        <NoDataState profileName={selectedProfile?.name ?? 'This profile'} />
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <LedgerSummaryCards summary={ledgerData.summary} />

          {/* View Content */}
          {viewMode === LEDGER_VIEW_MODE.TABLE ? (
            <LedgerTableView
              entries={ledgerData.entries}
              summary={ledgerData.summary}
            />
          ) : (
            <TimelinePlaceholder />
          )}
        </div>
      )}
    </div>
  );
}

export default LedgerTab;
