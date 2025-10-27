/**
 * Master Data Management Component
 *
 * Contains 7 sub-tabs for managing master data:
 * - All Requests (master data change requests)
 * - Vendors
 * - Categories
 * - Entities
 * - Payment Types
 * - Currencies
 * - Invoice Profiles
 *
 * Reuses existing management components from Sprint 9A Phase 4.
 * Created as part of Sprint 9A Phase 4 corrections.
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import MasterDataRequests from '@/components/admin/master-data-requests';
import VendorManagement from '@/components/master-data/vendor-management';
import CategoryManagement from '@/components/master-data/category-management';
import EntityManagement from '@/components/master-data/entity-management';
import PaymentTypeManagement from '@/components/master-data/payment-type-management';
import CurrencyManagement from '@/components/master-data/currency-management';
import InvoiceProfileManagement from '@/components/master-data/invoice-profile-management';

type TabValue = 'requests' | 'vendors' | 'categories' | 'entities' | 'payment-types' | 'currencies' | 'profiles';

export default function MasterDataManagement() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get('subtab') as TabValue) || 'requests';

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'requests', label: 'All Requests' },
    { value: 'vendors', label: 'Vendors' },
    { value: 'categories', label: 'Categories' },
    { value: 'entities', label: 'Entities' },
    { value: 'payment-types', label: 'Payment Types' },
    { value: 'currencies', label: 'Currencies' },
    { value: 'profiles', label: 'Invoice Profiles' },
  ];

  const handleSubTabChange = (subtab: TabValue) => {
    router.push(`/admin?tab=master-data&subtab=${subtab}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Master Data Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all master data types for the invoice system
        </p>
      </div>

      {/* Sub-Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Master Data Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleSubTabChange(tab.value)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === tab.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'requests' && <MasterDataRequests />}
        {activeTab === 'vendors' && <VendorManagement />}
        {activeTab === 'categories' && <CategoryManagement />}
        {activeTab === 'entities' && <EntityManagement />}
        {activeTab === 'payment-types' && <PaymentTypeManagement />}
        {activeTab === 'currencies' && <CurrencyManagement />}
        {activeTab === 'profiles' && <InvoiceProfileManagement />}
      </div>
    </div>
  );
}
