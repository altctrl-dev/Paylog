/**
 * Custom Hook: usePanel
 *
 * Provides convenient access to panel operations (open, close).
 * Wraps the Zustand panel store with computed values.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { openPanel, closePanel, hasOpenPanels } = usePanel();
 *
 *   const handleOpenDetail = () => {
 *     openPanel('invoice-detail', { invoiceId: '123' });
 *   };
 *
 *   return (
 *     <button onClick={handleOpenDetail}>
 *       Open Detail
 *     </button>
 *   );
 * }
 * ```
 */

'use client';

import { usePanelStore } from '@/lib/store/panel-store';
import type { UsePanelReturn } from '@/types/panel';

export function usePanel(): UsePanelReturn {
  const openPanel = usePanelStore((state) => state.openPanel);
  const closePanel = usePanelStore((state) => state.closePanel);
  const closeTopPanel = usePanelStore((state) => state.closeTopPanel);
  const closeAllPanels = usePanelStore((state) => state.closeAllPanels);
  const panels = usePanelStore((state) => state.panels);

  const hasOpenPanels = panels.length > 0;

  return {
    openPanel,
    closePanel,
    closeTopPanel,
    closeAllPanels,
    hasOpenPanels,
  };
}
