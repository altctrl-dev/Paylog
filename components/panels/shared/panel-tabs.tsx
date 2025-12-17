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
  const [isOverflowOpen, setIsOverflowOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
    setIsOverflowOpen(false);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!isOverflowOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOverflowOpen]);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  // Determine visible and overflow tabs on mobile
  // When an overflow tab is active, swap it with the last visible tab
  const computeTabSets = React.useMemo(() => {
    if (!isMobile) {
      return { visible: tabs, overflow: [] as TabItem[] };
    }

    const baseVisible = tabs.slice(0, mobileMaxTabs);
    const baseOverflow = tabs.slice(mobileMaxTabs);

    // Check if active tab is in the overflow set
    const activeOverflowTab = baseOverflow.find((tab) => tab.id === activeTab);

    if (activeOverflowTab) {
      // Swap: replace last visible tab with active overflow tab
      const lastVisibleTab = baseVisible[baseVisible.length - 1];
      const newVisible = [
        ...baseVisible.slice(0, -1),
        activeOverflowTab,
      ];
      // Put the replaced tab into overflow, remove the active one
      const newOverflow = [
        ...baseOverflow.filter((tab) => tab.id !== activeTab),
        lastVisibleTab,
      ];
      return { visible: newVisible, overflow: newOverflow };
    }

    return { visible: baseVisible, overflow: baseOverflow };
  }, [tabs, activeTab, isMobile, mobileMaxTabs]);

  const visibleTabs = computeTabSets.visible;
  const overflowTabs = computeTabSets.overflow;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab Bar */}
      <div className="relative flex items-end border-b border-border">
        {visibleTabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
          />
        ))}

        {/* Overflow Menu - Native dropdown for better mobile support */}
        {isMobile && overflowTabs.length > 0 && (
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              className="px-3 py-2 text-muted-foreground hover:text-foreground touch-manipulation select-none"
              aria-label="More tabs"
              aria-expanded={isOverflowOpen}
              aria-haspopup="true"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            {isOverflowOpen && (
              <div
                ref={menuRef}
                className={cn(
                  'absolute right-0 top-full mt-1',
                  'min-w-[160px] rounded-md border bg-popover p-1 shadow-md',
                  'z-[9999]',
                  'animate-in fade-in-0 zoom-in-95'
                )}
              >
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-left',
                      'hover:bg-accent hover:text-accent-foreground',
                      'touch-manipulation',
                      activeTab === tab.id && 'bg-accent'
                    )}
                  >
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
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
        'relative px-4 py-2 text-sm font-medium transition-colors touch-manipulation select-none',
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
