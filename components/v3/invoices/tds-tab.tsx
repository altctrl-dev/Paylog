'use client';

/**
 * TDS Tab Component (v3)
 *
 * Displays TDS (Tax Deducted at Source) transactions with:
 * - Table: Transaction ID, Client, Gross Amount, TDS Rate, TDS Amount, Net Amount, Date
 * - Summary row: Total TDS Collected, Total Gross Amount, Total Net Amount
 */

import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

interface TDSTransaction {
  id: string;
  client: string;
  grossAmount: number;
  tdsRate: string;
  tdsAmount: number;
  netAmount: number;
  date: string;
}

// ============================================================================
// Mock Data (Replace with actual API data later)
// ============================================================================

const MOCK_TDS_DATA: TDSTransaction[] = [
  {
    id: 'TDS-001',
    client: 'Infopark Rent',
    grossAmount: 125000,
    tdsRate: '10%',
    tdsAmount: 12500,
    netAmount: 112500,
    date: '2025-10-01',
  },
  {
    id: 'TDS-002',
    client: 'Infopark Electricity',
    grossAmount: 50000,
    tdsRate: '10%',
    tdsAmount: 5000,
    netAmount: 45000,
    date: '2025-10-15',
  },
  {
    id: 'TDS-003',
    client: 'AC Charges',
    grossAmount: 75000,
    tdsRate: '2%',
    tdsAmount: 1500,
    netAmount: 73500,
    date: '2025-09-20',
  },
];

// ============================================================================
// Format Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ============================================================================
// Main Component
// ============================================================================

export function TDSTab() {
  const transactions = MOCK_TDS_DATA;

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => ({
      tdsCollected: acc.tdsCollected + t.tdsAmount,
      grossAmount: acc.grossAmount + t.grossAmount,
      netAmount: acc.netAmount + t.netAmount,
    }),
    { tdsCollected: 0, grossAmount: 0, netAmount: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Client
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gross Amount
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TDS Rate
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TDS Amount
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No TDS transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="p-4 font-medium">{transaction.id}</td>
                    <td className="p-4 text-muted-foreground">{transaction.client}</td>
                    <td className="p-4">{formatCurrency(transaction.grossAmount)}</td>
                    <td className="p-4 text-muted-foreground">{transaction.tdsRate}</td>
                    <td className="p-4 text-red-500">
                      -{formatCurrency(transaction.tdsAmount)}
                    </td>
                    <td className="p-4">{formatCurrency(transaction.netAmount)}</td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(transaction.date)}
                    </td>
                  </tr>
                ))
              )}

              {/* Summary Row */}
              {transactions.length > 0 && (
                <tr className="bg-muted/20 border-t-2 border-border">
                  <td colSpan={2} className="p-4" />
                  <td className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      Total Gross Amount
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(totals.grossAmount)}
                    </div>
                  </td>
                  <td className="p-4" />
                  <td className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      Total TDS Collected
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(totals.tdsCollected)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      Total Net Amount
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(totals.netAmount)}
                    </div>
                  </td>
                  <td className="p-4" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TDSTab;
