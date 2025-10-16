/**
 * Category List Component
 *
 * Table displaying categories with edit/archive actions (admin only).
 */

'use client';

import { Edit2, Archive, RefreshCw } from 'lucide-react';
import { useCategories, useArchiveCategory, useRestoreCategory } from '@/hooks/use-categories';
import { Badge } from '@/components/ui/badge';

interface CategoryListProps {
  onEdit: (category: { id: number; name: string }) => void;
  showArchived?: boolean;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function CategoryList({ onEdit, showArchived = false }: CategoryListProps) {
  const { data, isLoading } = useCategories({ is_active: !showArchived });
  const archiveMutation = useArchiveCategory();
  const restoreMutation = useRestoreCategory();

  const handleArchive = (id: number) => {
    if (confirm('Archive this category?')) {
      archiveMutation.mutate(id);
    }
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading categories...</div>;
  }

  const categories = data?.categories || [];

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        {showArchived ? 'No archived categories found.' : 'No categories found. Create one to get started.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-semibold">Name</th>
            <th className="p-3 text-center text-sm font-semibold">Invoices</th>
            <th className="p-3 text-left text-sm font-semibold">Status</th>
            <th className="p-3 text-left text-sm font-semibold">Created</th>
            <th className="p-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="p-3 text-sm font-medium">{category.name}</td>
              <td className="p-3 text-center text-sm text-muted-foreground">
                {category.invoiceCount}
              </td>
              <td className="p-3 text-sm">
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? 'Active' : 'Archived'}
                </Badge>
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {formatDate(category.created_at)}
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {category.is_active ? (
                    <>
                      <button
                        onClick={() => onEdit({ id: category.id, name: category.name })}
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        aria-label="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(category.id)}
                        disabled={category.invoiceCount > 0}
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Archive category"
                        title={category.invoiceCount > 0 ? 'Cannot archive category with invoices' : 'Archive category'}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestore(category.id)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      aria-label="Restore category"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
