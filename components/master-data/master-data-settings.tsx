/**
 * Master Data Settings Component
 *
 * Container for vendor and category management with tabbed interface.
 * Admin-only component for settings page.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorList } from './vendor-list';
import { CategoryList } from './category-list';
import { usePanel } from '@/hooks/use-panel';

export function MasterDataSettings() {
  const [activeTab, setActiveTab] = useState<'vendors' | 'categories'>('vendors');
  const [showArchived, setShowArchived] = useState(false);
  const { openPanel } = usePanel();

  const handleCreateVendor = () => {
    openPanel('vendor-form', {});
  };

  const handleEditVendor = (vendor: { id: number; name: string }) => {
    openPanel('vendor-form', { vendor });
  };

  const handleCreateCategory = () => {
    openPanel('category-form', {});
  };

  const handleEditCategory = (category: { id: number; name: string }) => {
    openPanel('category-form', { category });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Master Data</h2>
          <p className="text-sm text-muted-foreground">
            Manage vendors and categories for invoices
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8" aria-label="Master Data Tabs">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`border-b-2 pb-4 px-1 text-sm font-medium transition-colors ${
              activeTab === 'vendors'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Vendors
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`border-b-2 pb-4 px-1 text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Categories
          </button>
        </nav>
      </div>

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

        <Button
          onClick={activeTab === 'vendors' ? handleCreateVendor : handleCreateCategory}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create {activeTab === 'vendors' ? 'Vendor' : 'Category'}
        </Button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'vendors' ? (
          <VendorList onEdit={handleEditVendor} showArchived={showArchived} />
        ) : (
          <CategoryList onEdit={handleEditCategory} showArchived={showArchived} />
        )}
      </div>
    </div>
  );
}
