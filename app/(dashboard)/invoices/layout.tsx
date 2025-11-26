/**
 * Invoices Layout
 *
 * Provides tabbed navigation for Recurring, All, and TDS invoice views.
 */

'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw, List, Receipt } from 'lucide-react';

type InvoiceTab = 'all' | 'recurring' | 'tds';

const TABS: { id: InvoiceTab; label: string; path: string; icon: React.ReactNode }[] = [
  {
    id: 'all',
    label: 'All Invoices',
    path: '/invoices',
    icon: <List className="h-4 w-4" />,
  },
  {
    id: 'recurring',
    label: 'Recurring',
    path: '/invoices/recurring',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  {
    id: 'tds',
    label: 'TDS',
    path: '/invoices/tds',
    icon: <Receipt className="h-4 w-4" />,
  },
];

export default function InvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from pathname
  const getActiveTab = (): InvoiceTab => {
    if (pathname === '/invoices/recurring') return 'recurring';
    if (pathname === '/invoices/tds') return 'tds';
    // Don't show tabs for /invoices/new/* routes
    if (pathname.startsWith('/invoices/new')) return 'all';
    return 'all';
  };

  const activeTab = getActiveTab();

  // Don't show tabs on new invoice pages
  const showTabs = !pathname.startsWith('/invoices/new');

  const handleTabChange = (tab: InvoiceTab) => {
    const targetTab = TABS.find((t) => t.id === tab);
    if (targetTab) {
      router.push(targetTab.path);
    }
  };

  return (
    <div className="space-y-6">
      {showTabs && (
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium flex items-center gap-2
                  transition-colors duration-150
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {children}
    </div>
  );
}
