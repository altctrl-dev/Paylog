import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Version Store
 *
 * Manages theme selection and per-theme UI preferences.
 *
 * Themes:
 * - v1: "Old" - Legacy UI
 * - v2: "Classic" - Current default UI
 * - v3: "Modern" - New SaaS-style UI with collapsible sidebar
 */

export type UIVersion = 'v1' | 'v2' | 'v3';
export type InvoiceCreationMode = 'page' | 'panel';

/** Human-readable theme names for UI display */
export const UI_VERSION_LABELS: Record<UIVersion, string> = {
  v1: 'Old',
  v2: 'Classic',
  v3: 'Modern',
};

/** Theme descriptions for settings UI */
export const UI_VERSION_DESCRIPTIONS: Record<UIVersion, string> = {
  v1: 'Original PayLog interface',
  v2: 'Enhanced layout with improved navigation',
  v3: 'Modern SaaS design with collapsible sidebar',
};

interface UIVersionStore {
  // Theme selection
  version: UIVersion;
  setVersion: (version: UIVersion) => void;

  // Per-theme sidebar collapsed state
  sidebarCollapsedV1: boolean;
  sidebarCollapsedV2: boolean;
  sidebarCollapsedV3: boolean;

  // Legacy single sidebar state (for backward compatibility)
  sidebarCollapsed: boolean;

  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Get/set sidebar for current theme
  getCurrentSidebarCollapsed: () => boolean;
  setCurrentSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // Invoice creation mode
  invoiceCreationMode: InvoiceCreationMode;
  setInvoiceCreationMode: (mode: InvoiceCreationMode) => void;
}

export const useUIVersion = create<UIVersionStore>()(
  persist(
    (set, get) => ({
      // Theme - default to Classic (v2)
      version: 'v2',
      setVersion: (version) => set({ version }),

      // Per-theme sidebar states
      sidebarCollapsedV1: false,
      sidebarCollapsedV2: false,
      sidebarCollapsedV3: false, // Modern theme starts expanded

      // Legacy sidebar state (kept for backward compatibility)
      sidebarCollapsed: false,

      // Toggle sidebar for current theme
      toggleSidebar: () => {
        const state = get();
        const currentVersion = state.version;

        if (currentVersion === 'v1') {
          set({ sidebarCollapsedV1: !state.sidebarCollapsedV1 });
        } else if (currentVersion === 'v2') {
          set({ sidebarCollapsedV2: !state.sidebarCollapsedV2 });
        } else if (currentVersion === 'v3') {
          set({ sidebarCollapsedV3: !state.sidebarCollapsedV3 });
        }

        // Also update legacy state for components that still use it
        set({ sidebarCollapsed: !state.sidebarCollapsed });
      },

      // Set sidebar collapsed for current theme
      setSidebarCollapsed: (collapsed) => {
        const currentVersion = get().version;

        if (currentVersion === 'v1') {
          set({ sidebarCollapsedV1: collapsed });
        } else if (currentVersion === 'v2') {
          set({ sidebarCollapsedV2: collapsed });
        } else if (currentVersion === 'v3') {
          set({ sidebarCollapsedV3: collapsed });
        }

        // Also update legacy state
        set({ sidebarCollapsed: collapsed });
      },

      // Get current theme's sidebar state
      getCurrentSidebarCollapsed: () => {
        const state = get();
        const currentVersion = state.version;

        if (currentVersion === 'v1') return state.sidebarCollapsedV1;
        if (currentVersion === 'v2') return state.sidebarCollapsedV2;
        if (currentVersion === 'v3') return state.sidebarCollapsedV3;
        return state.sidebarCollapsed;
      },

      // Set current theme's sidebar state
      setCurrentSidebarCollapsed: (collapsed) => {
        const currentVersion = get().version;

        if (currentVersion === 'v1') {
          set({ sidebarCollapsedV1: collapsed, sidebarCollapsed: collapsed });
        } else if (currentVersion === 'v2') {
          set({ sidebarCollapsedV2: collapsed, sidebarCollapsed: collapsed });
        } else if (currentVersion === 'v3') {
          set({ sidebarCollapsedV3: collapsed, sidebarCollapsed: collapsed });
        }
      },

      // Mobile menu
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      // Invoice creation mode
      invoiceCreationMode: 'page',
      setInvoiceCreationMode: (mode) => set({ invoiceCreationMode: mode }),
    }),
    {
      name: 'paylog-ui-preferences',
      version: 2, // Bump version for migration
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<UIVersionStore>;

        if (version < 2) {
          // Migrate from single sidebar state to per-theme states
          const collapsed = state.sidebarCollapsed ?? false;
          return {
            ...state,
            sidebarCollapsedV1: collapsed,
            sidebarCollapsedV2: collapsed,
            sidebarCollapsedV3: false, // Start Modern theme expanded
          };
        }

        return state as UIVersionStore;
      },
    }
  )
);
