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
import { PANEL_WIDTH } from '@/types/panel';

export default function CategoryManagement() {
  const [showArchived, setShowArchived] = useState(false);
  const { openPanel } = usePanel();

  const handleCreateCategory = () => {
    openPanel('category-form', {}, { width: PANEL_WIDTH.SMALL });
  };

  const handleEditCategory = (category: { id: number; name: string }) => {
    openPanel('category-form', { category }, { width: PANEL_WIDTH.SMALL });
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
