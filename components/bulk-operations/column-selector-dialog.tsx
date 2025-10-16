/**
 * Column Selector Dialog Component
 *
 * Allows users to select which columns to export to CSV.
 * Sprint 7 Phase 8: Bulk Operations
 */

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EXPORT_COLUMNS } from '@/types/bulk-operations';
import { Download } from 'lucide-react';

interface ColumnSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceIds: number[];
  onExport: (columnIds: string[]) => void;
  isLoading?: boolean;
}

export function ColumnSelectorDialog({
  open,
  onClose,
  invoiceIds,
  onExport,
  isLoading = false,
}: ColumnSelectorDialogProps) {
  // Default selected columns (most commonly exported)
  const defaultColumns = [
    'invoice_number',
    'vendor_name',
    'invoice_amount',
    'invoice_date',
    'due_date',
    'status',
  ];

  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(defaultColumns);

  // Reset to default columns when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedColumns([
        'invoice_number',
        'vendor_name',
        'invoice_amount',
        'invoice_date',
        'due_date',
        'status',
      ]);
    }
  }, [open]);

  const handleToggleColumn = (columnId: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnId)) {
        // Don't allow deselecting if it's the last column
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((id) => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedColumns(EXPORT_COLUMNS.map((col) => col.id));
  };

  const handleDeselectAll = () => {
    // Keep at least one column selected (first one)
    setSelectedColumns([EXPORT_COLUMNS[0].id]);
  };

  const handleExport = () => {
    if (selectedColumns.length === 0) {
      return;
    }
    onExport(selectedColumns);
  };

  const allSelected = selectedColumns.length === EXPORT_COLUMNS.length;
  const noneSelected = selectedColumns.length === 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export to CSV</DialogTitle>
          <DialogDescription>
            Select the columns you want to include in the export.
            {invoiceIds.length > 0 && (
              <span className="block mt-1 font-medium text-foreground">
                Exporting {invoiceIds.length} invoice{invoiceIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Select/Deselect All */}
        <div className="flex items-center gap-2 py-2 border-b">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected || isLoading}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedColumns.length <= 1 || isLoading}
          >
            Deselect All
          </Button>
          <span className="text-sm text-muted-foreground ml-auto">
            {selectedColumns.length} of {EXPORT_COLUMNS.length} columns selected
          </span>
        </div>

        {/* Column checkboxes */}
        <div className="space-y-3 py-4">
          {EXPORT_COLUMNS.map((column) => {
            const isSelected = selectedColumns.includes(column.id);
            const isLastSelected = selectedColumns.length === 1 && isSelected;

            return (
              <div
                key={column.id}
                className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`column-${column.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleToggleColumn(column.id)}
                  disabled={isLastSelected || isLoading}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`column-${column.id}`}
                    className="font-medium cursor-pointer"
                  >
                    {column.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {column.description}
                  </p>
                  {isLastSelected && (
                    <p className="text-xs text-muted-foreground italic">
                      At least one column must be selected
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={noneSelected || isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isLoading ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
