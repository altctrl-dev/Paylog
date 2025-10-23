/**
 * Category Management Component
 *
 * Wrapper around CategoryList for admin master-data page.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryList } from './category-list';
import { usePanel } from '@/hooks/use-panel';

export default function CategoryManagement() {
  const [showArchived, setShowArchived] = useState(false);
  const { openPanel } = usePanel();

  const handleCreateCategory = () => {
    openPanel('category-form', {});
  };

  const handleEditCategory = (category: { id: number; name: string }) => {
    openPanel('category-form', { category });
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300"
            />
            Show archived
          </label>
        </div>

        <Button onClick={handleCreateCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Create Category
        </Button>
      </div>

      {/* Category List */}
      <CategoryList onEdit={handleEditCategory} showArchived={showArchived} />
    </div>
  );
}
