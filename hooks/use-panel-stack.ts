/**
 * Custom Hook: usePanelStack
 *
 * Provides read-only access to the current panel stack state.
 * Useful for components that need to react to panel stack changes.
 *
 * @example
 * ```tsx
 * function PanelIndicator() {
 *   const { panelCount, topPanel } = usePanelStack();
 *
 *   return (
 *     <div>
 *       Open panels: {panelCount}
 *       {topPanel && <span>Top: {topPanel.type}</span>}
 *     </div>
 *   );
 * }
 * ```
 */

'use client';

import { usePanelStore } from '@/lib/store/panel-store';
import type { UsePanelStackReturn } from '@/types/panel';

export function usePanelStack(): UsePanelStackReturn {
  const panels = usePanelStore((state) => state.panels);
  const getTopPanel = usePanelStore((state) => state.getTopPanel);

  const panelCount = panels.length;
  const topPanel = getTopPanel();
  const hasOpenPanels = panelCount > 0;

  return {
    panels,
    panelCount,
    topPanel,
    hasOpenPanels,
  };
}
