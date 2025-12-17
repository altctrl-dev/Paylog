'use client';

/**
 * Panel Tabs Component
 *
 * A tab bar with content wrapper for sidepanels.
 * Provides horizontal tabs with optional count badges and scrollable content area.
 * Supports responsive overflow menu for mobile devices.
 */

import * as React from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-media-query';

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
  /** Maximum visible tabs on mobile before showing overflow menu (default: 3) */
  mobileMaxTabs?: number;
}

export function PanelTabs({
  tabs,
  defaultTab,
  className,
  onTabChange,
  mobileMaxTabs = 3,
}: PanelTabsProps) {
  const [activeTab, setActiveTab] = React.useState<string>(
    defaultTab || tabs[0]?.id || ''
  );
  const isMobile = useIsMobile();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  // Determine visible and overflow tabs on mobile
  const visibleTabs = isMobile ? tabs.slice(0, mobileMaxTabs) : tabs;
  const overflowTabs = isMobile ? tabs.slice(mobileMaxTabs) : [];

  // Check if active tab is in overflow - if so, we need to show it in the visible tabs
  const activeInOverflow = overflowTabs.some((tab) => tab.id === activeTab);
  const activeOverflowTab = activeInOverflow
    ? tabs.find((tab) => tab.id === activeTab)
    : null;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab Bar */}
      <div className="flex items-end border-b border-border">
        {visibleTabs.map((tab) => {
          // On mobile, if active tab is in overflow, replace the last visible tab with active tab
          if (
            isMobile &&
            activeInOverflow &&
            tab.id === visibleTabs[visibleTabs.length - 1]?.id
          ) {
            // Show active overflow tab instead
            return (
              <TabButton
                key={activeOverflowTab!.id}
                tab={activeOverflowTab!}
                isActive={true}
                onClick={() => handleTabChange(activeOverflowTab!.id)}
              />
            );
          }

          return (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            />
          );
        })}

        {/* Overflow Menu */}
        {isMobile && overflowTabs.length > 0 && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-auto px-3 py-2 text-muted-foreground hover:text-foreground',
                  // Highlight if active tab is in overflow
                  activeInOverflow && 'text-foreground'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] z-[100]">
              {overflowTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onSelect={() => handleTabChange(tab.id)}
                  className={cn(
                    'cursor-pointer',
                    activeTab === tab.id && 'bg-accent'
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
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">{activeTabContent}</div>
    </div>
  );
}

interface TabButtonProps {
  tab: TabItem;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-4 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'text-foreground'
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
      {/* Active indicator - positioned to overlap border */}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </button>
  );
}
