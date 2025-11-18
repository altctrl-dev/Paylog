'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUIVersion } from '@/lib/stores/ui-version-store';

type UIVersion = 'v1' | 'v2';

interface UIVersionContextValue {
  version: UIVersion;
  sidebarCollapsed: boolean;
  setVersion: (version: UIVersion) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// Default values for SSR
const defaultContextValue: UIVersionContextValue = {
  version: 'v2',
  sidebarCollapsed: false,
  setVersion: () => {},
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
};

const UIVersionContext = createContext<UIVersionContextValue>(defaultContextValue);

export function UIVersionProvider({ children }: { children: React.ReactNode }) {
  const store = useUIVersion();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always provide context, use defaults during SSR
  const contextValue = isClient ? store : defaultContextValue;

  return (
    <UIVersionContext.Provider value={contextValue}>
      {children}
    </UIVersionContext.Provider>
  );
}

export function useUIVersionContext() {
  return useContext(UIVersionContext);
}
