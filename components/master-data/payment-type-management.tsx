/**
 * Payment Type Management Component
 *
 * Wrapper around PaymentTypeList for admin master-data page.
 * Follows patterns from components/master-data/category-management.tsx
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentTypeList } from './payment-type-list';
import { usePanel } from '@/hooks/use-panel';

export default function PaymentTypeManagement() {
  const [showArchived, setShowArchived] = useState(false);
  const { openPanel } = usePanel();

  const handleCreatePaymentType = () => {
    openPanel('payment-type-form', {});
  };

  const handleEditPaymentType = (paymentType: {
    id: number;
    name: string;
    description?: string | null;
    requires_reference: boolean;
  }) => {
    openPanel('payment-type-form', { paymentType });
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

        <Button onClick={handleCreatePaymentType}>
          <Plus className="mr-2 h-4 w-4" />
          Create Payment Type
        </Button>
      </div>

      {/* Payment Type List */}
      <PaymentTypeList onEdit={handleEditPaymentType} showArchived={showArchived} />
    </div>
  );
}
