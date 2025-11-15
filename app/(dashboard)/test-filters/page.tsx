/**
 * Test Page for Multi-Select Filter Components
 *
 * TEMPORARY PAGE - For testing MultiSelect and useUrlFilters in isolation.
 * Will be removed after integration with main invoice page.
 *
 * Test Checklist:
 * - [ ] MultiSelect opens/closes correctly
 * - [ ] Selecting items updates URL
 * - [ ] URL changes update component
 * - [ ] Browser back/forward works
 * - [ ] Clear all resets filters
 * - [ ] Component is accessible (keyboard nav)
 * - [ ] Dark mode styling works
 * - [ ] Search filter works (for status with >10 options)
 */

'use client';

import { useEffect, useState } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { INVOICE_STATUS, INVOICE_STATUS_CONFIG } from '@/types/invoice';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestFiltersPage() {
  const { filters, setFilter, clearFilters } = useUrlFilters({
    defaultFilters: { page: 1, per_page: 20 },
  });

  // Track current URL for display
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Update URL display on mount and whenever it changes
    const updateUrl = () => {
      setCurrentUrl(`${window.location.pathname}${window.location.search}`);
    };

    updateUrl();

    // Listen for URL changes
    window.addEventListener('popstate', updateUrl);

    return () => {
      window.removeEventListener('popstate', updateUrl);
    };
  }, [filters]); // Re-run when filters change

  // Status options from INVOICE_STATUS constant
  const statusOptions = Object.entries(INVOICE_STATUS).map(([, value]) => ({
    label: INVOICE_STATUS_CONFIG[value].label,
    value,
  }));

  // Mock vendor options for testing
  const vendorOptions = [
    { label: 'Vendor A', value: '1' },
    { label: 'Vendor B', value: '2' },
    { label: 'Vendor C', value: '3' },
    { label: 'Vendor D', value: '4' },
    { label: 'Vendor E', value: '5' },
  ];

  // Mock category options for testing
  const categoryOptions = [
    { label: 'Category 1', value: '1' },
    { label: 'Category 2', value: '2' },
    { label: 'Category 3', value: '3' },
  ];

  // Helper to convert filter value to array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (value !== undefined && value !== null) return [String(value)];
    return [];
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Filter Component Test Page</h1>
        <p className="mt-2 text-muted-foreground">
          Test MultiSelect component and useUrlFilters hook in isolation
        </p>
      </div>

      {/* Filter Components */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Filter Controls</h2>

        <div className="space-y-4">
          {/* Status Filter */}
          <MultiSelect
            label="Invoice Status"
            options={statusOptions}
            value={toArray(filters.status)}
            onChange={(values) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setFilter('status', values.length ? (values as any) : undefined)
            }
            placeholder="Select statuses"
          />

          {/* Vendor Filter */}
          <MultiSelect
            label="Vendor"
            options={vendorOptions}
            value={toArray(filters.vendor_id)}
            onChange={(values) =>
              setFilter(
                'vendor_id',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                values.length ? (values.map(Number) as any) : undefined
              )
            }
            placeholder="Select vendors"
          />

          {/* Category Filter */}
          <MultiSelect
            label="Category"
            options={categoryOptions}
            value={toArray(filters.category_id)}
            onChange={(values) =>
              setFilter(
                'category_id',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                values.length ? (values.map(Number) as any) : undefined
              )
            }
            placeholder="Select categories"
          />

          {/* Clear All Button */}
          <div className="pt-4">
            <Button onClick={clearFilters} variant="outline">
              Clear All Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Filter State */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Current Filter State</h2>

        <div className="space-y-4">
          {/* JSON Output */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Filter Object:</h3>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>

          {/* URL Output */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Current URL:</h3>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              {currentUrl || '/test-filters'}
            </pre>
          </div>
        </div>
      </Card>

      {/* Test Instructions */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Test Checklist</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Click a filter dropdown - it should open smoothly</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Select multiple items - URL should update with comma-separated values</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Click the &quot;X&quot; button in the badge - should clear that filter</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Click &quot;Clear All&quot; - all filters should be removed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>
              Manually edit URL (add ?status=unpaid,overdue) - component should reflect changes
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Use browser back/forward buttons - filters should sync</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Try keyboard navigation (Tab, Enter, Escape, Space)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Toggle dark mode - styling should adapt properly</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Click outside dropdown - it should close</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">□</span>
            <span>Check console - no errors should appear</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
