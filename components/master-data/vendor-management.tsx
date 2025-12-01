/**
 * Vendor Management Component
 *
 * Wrapper around VendorList for admin master-data page.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorList } from './vendor-list';
import { usePanel } from '@/hooks/use-panel';

export default function VendorManagement() {
  const [showArchived, setShowArchived] = useState(false);
  const { openPanel } = usePanel();

  const handleCreateVendor = () => {
    openPanel('vendor-form', {});
  };

  const handleEditVendor = (vendor: {
    id: number;
    name: string;
    address?: string | null;
    gst_exemption?: boolean;
    bank_details?: string | null;
  }) => {
    openPanel('vendor-form', { vendor });
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

        <Button onClick={handleCreateVendor}>
          <Plus className="mr-2 h-4 w-4" />
          Create Vendor
        </Button>
      </div>

      {/* Vendor List */}
      <VendorList onEdit={handleEditVendor} showArchived={showArchived} />
    </div>
  );
}
