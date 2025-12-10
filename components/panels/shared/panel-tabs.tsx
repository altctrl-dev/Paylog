'use client';

/**
 * Panel Tabs Component
 *
 * A tab bar with content wrapper for sidepanels.
 * Provides horizontal tabs with optional count badges and scrollable content area.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Optional count badge displayed next to the label */
  badge?: number;
  /** Content to render when this tab is active */
  content: React.ReactNode;
}

export interface PanelTabsProps {
  /** Array of tab items to display */
  tabs: TabItem[];
  /** ID of the tab to show by default (defaults to first tab) */
  defaultTab?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback fired when the active tab changes */
  onTabChange?: (tabId: string) => void;
}

export function PanelTabs({
  tabs,
  defaultTab,
  className,
  onTabChange,
}: PanelTabsProps) {
  const [activeTab, setActiveTab] = React.useState<string>(
    defaultTab || tabs[0]?.id || ''
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab Bar */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">{activeTabContent}</div>
    </div>
  );
}
