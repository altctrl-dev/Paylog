/**
 * Currency Management Component
 *
 * Features:
 * - Add currencies from a predefined dropdown
 * - Archive currencies (deactivate)
 * - Delete currencies (only if not in use)
 * - Restore archived currencies
 * - Filter by status (all/active/archived)
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Archive, Trash2, RotateCcw } from 'lucide-react';
import {
  addCurrency,
  archiveCurrency,
  deleteCurrency,
  restoreCurrency,
  getAvailableCurrencies,
} from '@/app/actions/admin/currency-actions';

type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
};

type AvailableCurrency = {
  code: string;
  name: string;
  symbol: string;
};

export default function CurrencyManagement() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<AvailableCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Currency | null>(null);
  const { toast } = useToast();

  // Fetch currencies on mount
  useEffect(() => {
    fetchCurrencies();
    fetchAvailableCurrencies();
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

  const fetchAvailableCurrencies = async () => {
    try {
      const result = await getAvailableCurrencies();
      if (result.success) {
        setAvailableCurrencies(result.data);
      }
    } catch (error) {
      console.error('Fetch available currencies error:', error);
    }
  };

  const handleAddCurrency = async () => {
    if (!selectedCurrencyCode) {
      toast({
        title: 'Error',
        description: 'Please select a currency to add',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      const result = await addCurrency(selectedCurrencyCode);

      if (result.success) {
        toast({
          title: 'Success',
          description: `${result.data.name} (${result.data.code}) added successfully`,
        });
        setSelectedCurrencyCode('');
        fetchCurrencies();
        fetchAvailableCurrencies();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Add currency error:', error);
      toast({
        title: 'Error',
        description: 'Failed to add currency',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleArchive = async (currency: Currency) => {
    setActionInProgress(currency.id);
    try {
      const result = await archiveCurrency(currency.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: `${currency.name} archived successfully`,
        });
        setCurrencies((prev) =>
          prev.map((c) =>
            c.id === currency.id ? { ...c, is_active: false } : c
          )
        );
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Archive currency error:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive currency',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRestore = async (currency: Currency) => {
    setActionInProgress(currency.id);
    try {
      const result = await restoreCurrency(currency.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: `${currency.name} restored successfully`,
        });
        setCurrencies((prev) =>
          prev.map((c) =>
            c.id === currency.id ? { ...c, is_active: true } : c
          )
        );
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Restore currency error:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore currency',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (currency: Currency) => {
    setActionInProgress(currency.id);
    try {
      const result = await deleteCurrency(currency.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: `${currency.name} deleted successfully`,
        });
        setCurrencies((prev) => prev.filter((c) => c.id !== currency.id));
        fetchAvailableCurrencies(); // Currency is now available to add again
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete currency error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete currency',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
      setDeleteConfirm(null);
    }
  };


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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Currency Management</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, archive, or delete currencies for the invoice system
          </p>
        </div>
      </div>

      {/* Add Currency Section */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="currency-select" className="text-sm font-medium">
            Add Currency
          </label>
          <Select
            id="currency-select"
            value={selectedCurrencyCode}
            onChange={(e) => setSelectedCurrencyCode(e.target.value)}
            disabled={availableCurrencies.length === 0}
          >
            <option value="">
              {availableCurrencies.length === 0
                ? 'All currencies have been added'
                : 'Select a currency to add...'}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name} ({currency.symbol})
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={handleAddCurrency}
          disabled={!selectedCurrencyCode || isAdding}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isAdding ? 'Adding...' : 'Add Currency'}
        </Button>
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
            {currencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {currencies.length === 0
                    ? 'No currencies added yet. Add one from the dropdown above.'
                    : 'No currencies found'}
                </td>
              </tr>
            ) : (
              currencies.map((currency) => (
                <tr
                  key={currency.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-3 font-mono text-sm font-medium">
                    {currency.code}
                  </td>
                  <td className="p-3 text-sm">{currency.name}</td>
                  <td className="p-3 text-lg">{currency.symbol}</td>
                  <td className="p-3 text-sm">
                    <Badge
                      variant={currency.is_active ? 'default' : 'secondary'}
                    >
                      {currency.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionInProgress === currency.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {currency.is_active ? (
                          <DropdownMenuItem
                            onClick={() => handleArchive(currency)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleRestore(currency)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(currency)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
        <p className="font-semibold">About Currency Management:</p>
        <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200">
          <li>• Add currencies from a predefined list of world currencies</li>
          <li>• Archive currencies to hide them from invoice forms (can be restored later)</li>
          <li>• Delete currencies only if they are not used by any invoices</li>
          <li>• At least one active currency must exist at all times</li>
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Currency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {deleteConfirm?.name} ({deleteConfirm?.code})
              </strong>
              ? This action cannot be undone.
              <br />
              <br />
              <span className="text-amber-600">
                Note: If this currency is used by any invoices or profiles, it
                cannot be deleted. Archive it instead.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
