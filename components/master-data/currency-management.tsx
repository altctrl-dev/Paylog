/**
 * Currency Management Component
 *
 * Displays all 50 pre-seeded currencies with activation toggle.
 * Admin can only toggle is_active status (no create/edit/delete).
 * Enforces at least 1 active currency at all times.
 *
 * Created as part of Sprint 9A Phase 5-8.
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { toggleCurrency } from '@/app/actions/admin/toggle-currency';

type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
};

type FilterStatus = 'all' | 'active' | 'inactive';

export default function CurrencyManagement() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch currencies on mount
  useEffect(() => {
    fetchCurrencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/currencies');
      const data = await response.json();

      if (data.success) {
        setCurrencies(data.data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load currencies',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Fetch currencies error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load currencies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (currencyId: number, currentStatus: boolean) => {
    // Check if this is the last active currency
    const activeCurrencies = currencies.filter((c) => c.is_active);
    if (activeCurrencies.length === 1 && currentStatus) {
      toast({
        title: 'Cannot Deactivate',
        description: 'At least one currency must remain active',
        variant: 'destructive',
      });
      return;
    }

    setTogglingId(currencyId);

    try {
      const result = await toggleCurrency(currencyId);

      if (result.success) {
        // Update local state
        setCurrencies((prev) =>
          prev.map((c) =>
            c.id === currencyId ? { ...c, is_active: !c.is_active } : c
          )
        );

        toast({
          title: 'Success',
          description: `Currency ${currentStatus ? 'deactivated' : 'activated'} successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update currency',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Toggle currency error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update currency',
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Filter currencies
  const filteredCurrencies = currencies.filter((currency) => {
    // Status filter
    if (filterStatus === 'active' && !currency.is_active) return false;
    if (filterStatus === 'inactive' && currency.is_active) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const activeCount = currencies.filter((c) => c.is_active).length;
  const inactiveCount = currencies.length - activeCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading currencies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Currency Management</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage active currencies for invoice system. At least one currency must remain active.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold">{currencies.length}</div>
          <div className="text-sm text-muted-foreground">Total Currencies</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-gray-400">{inactiveCount}</div>
          <div className="text-sm text-muted-foreground">Inactive</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All ({currencies.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filterStatus === 'active'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filterStatus === 'inactive'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-semibold">Code</th>
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold">Symbol</th>
              <th className="p-3 text-left text-sm font-semibold">Status</th>
              <th className="p-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCurrencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No currencies found
                </td>
              </tr>
            ) : (
              filteredCurrencies.map((currency) => (
                <tr key={currency.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-3 font-mono text-sm font-medium">{currency.code}</td>
                  <td className="p-3 text-sm">{currency.name}</td>
                  <td className="p-3 text-lg">{currency.symbol}</td>
                  <td className="p-3 text-sm">
                    <Badge variant={currency.is_active ? 'default' : 'secondary'}>
                      {currency.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currency.is_active}
                        onChange={() => handleToggle(currency.id, currency.is_active)}
                        disabled={togglingId === currency.id}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{currency.is_active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">About Currency Management:</p>
        <ul className="mt-2 space-y-1 text-blue-800">
          <li>• Currencies are pre-seeded and cannot be created or deleted</li>
          <li>• You can only activate or deactivate currencies</li>
          <li>• At least one currency must remain active at all times</li>
          <li>• Active currencies will appear in invoice creation forms</li>
        </ul>
      </div>
    </div>
  );
}
