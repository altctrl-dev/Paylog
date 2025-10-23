/**
 * Admin Console Page
 *
 * Main admin landing page with role-based tabs.
 * - Admin users: 3 tabs (Dashboard, Master Data Requests, Master Data)
 * - Super Admin users: 4 tabs (+ User Management)
 *
 * This page is protected by Phase 3 RBAC middleware (admin/super_admin only).
 * Created as part of Sprint 9A Phase 4 corrections.
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminDashboard from '@/components/admin/admin-dashboard';
import MasterDataRequests from '@/components/admin/master-data-requests';
import MasterDataManagement from '@/components/admin/master-data-management';
import UserManagement from '@/components/admin/user-management';

export default function AdminPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const isSuperAdmin = session?.user?.role === 'super_admin';

  const handleTabChange = (value: string) => {
    router.push(`/admin?tab=${value}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage master data, review requests, and configure system settings
        </p>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleTabChange('requests')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Master Data Requests
          </button>
          <button
            onClick={() => handleTabChange('master-data')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${
                activeTab === 'master-data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Master Data
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => handleTabChange('users')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              User Management
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'requests' && <MasterDataRequests />}
        {activeTab === 'master-data' && <MasterDataManagement />}
        {isSuperAdmin && activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  );
}
