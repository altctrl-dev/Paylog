import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UIVersion = 'v1' | 'v2';
type InvoiceCreationMode = 'page' | 'panel';

interface UIVersionStore {
  version: UIVersion;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  invoiceCreationMode: InvoiceCreationMode;
  setVersion: (version: UIVersion) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setInvoiceCreationMode: (mode: InvoiceCreationMode) => void;
}

export const useUIVersion = create<UIVersionStore>()(
  persist(
    (set) => ({
      version: 'v2', // Default to new UI
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      invoiceCreationMode: 'page', // Default to page mode
      setVersion: (version) => set({ version }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
      setInvoiceCreationMode: (mode) => set({ invoiceCreationMode: mode }),
    }),
    {
      name: 'paylog-ui-preferences',
    }
  )
);
