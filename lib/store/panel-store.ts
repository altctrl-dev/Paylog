/**
 * Zustand Store for Global Stacked Panel Management
 *
 * Manages a stack of up to 3 nested panels with proper z-index layering.
 * Follows Microsoft 365-style slide-out panel pattern.
 */

import { create } from 'zustand';
import type {
  PanelConfig,
  PanelId,
  PanelStackStore,
  PanelType,
  PanelLevel,
} from '@/types/panel';
import {
  MAX_PANEL_DEPTH,
  PANEL_Z_INDEX,
  PANEL_WIDTHS,
} from '@/types/panel';

/**
 * Generate a unique panel ID
 */
function generatePanelId(): PanelId {
  return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate z-index based on panel level
 */
function calculateZIndex(level: PanelLevel): number {
  switch (level) {
    case 1:
      return PANEL_Z_INDEX.LEVEL_1;
    case 2:
      return PANEL_Z_INDEX.LEVEL_2;
    case 3:
      return PANEL_Z_INDEX.LEVEL_3;
    default:
      return PANEL_Z_INDEX.LEVEL_1;
  }
}

/**
 * Calculate default width based on panel level
 */
function getDefaultWidth(level: PanelLevel): number {
  switch (level) {
    case 1:
      return PANEL_WIDTHS.LEVEL_1;
    case 2:
    case 3:
      return PANEL_WIDTHS.LEVEL_2;
    default:
      return PANEL_WIDTHS.LEVEL_1;
  }
}

/**
 * Global panel store
 *
 * Usage:
 * ```tsx
 * const { openPanel, closePanel } = usePanelStore();
 *
 * // Open a detail panel
 * const panelId = openPanel('invoice-detail', { invoiceId: '123' });
 *
 * // Close a specific panel
 * closePanel(panelId);
 *
 * // Close the topmost panel
 * closeTopPanel();
 * ```
 */
export const usePanelStore = create<PanelStackStore>((set, get) => ({
  panels: [],

  openPanel: (type, props, options) => {
    const currentPanels = get().panels;

    // Enforce maximum depth
    if (currentPanels.length >= MAX_PANEL_DEPTH) {
      console.warn(
        `Maximum panel depth (${MAX_PANEL_DEPTH}) reached. Cannot open more panels.`
      );
      return ''; // Return empty string to indicate failure
    }

    // Calculate level (1-indexed)
    const level = (currentPanels.length + 1) as PanelLevel;

    // Generate unique ID
    const id = generatePanelId();

    // Calculate z-index
    const zIndex = calculateZIndex(level);

    // Determine width (use custom or default)
    const width = options?.width ?? getDefaultWidth(level);

    // Create panel config
    const panelConfig: PanelConfig = {
      id,
      type,
      props: props as Record<string, unknown>,
      width,
      level,
      zIndex,
    };

    // Add to stack
    set((state) => ({
      panels: [...state.panels, panelConfig],
    }));

    return id;
  },

  closePanel: (id) => {
    set((state) => ({
      panels: state.panels.filter((panel) => panel.id !== id),
    }));
  },

  closeTopPanel: () => {
    set((state) => ({
      panels: state.panels.slice(0, -1),
    }));
  },

  closeAllPanels: () => {
    set({ panels: [] });
  },

  isPanelOpen: (id) => {
    return get().panels.some((panel) => panel.id === id);
  },

  getTopPanel: () => {
    const panels = get().panels;
    return panels.length > 0 ? panels[panels.length - 1] : undefined;
  },
}));
