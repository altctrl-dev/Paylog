/**
 * Panel Container Component
 *
 * Root container for the global panel system.
 * Manages overlay, multiple panel levels, and global keyboard events.
 *
 * Should be mounted once at the app root level.
 */

'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePanelStore } from '@/lib/store/panel-store';
import { PANEL_Z_INDEX } from '@/types/panel';

export interface PanelContainerProps {
  /** Panel renderer function that maps panel type to React component */
  renderPanel: (config: {
    id: string;
    type: string;
    props: Record<string, unknown>;
    onClose: () => void;
  }) => React.ReactNode;
}

/**
 * Global panel container
 *
 * Usage:
 * ```tsx
 * // In your root layout or main app component
 * <PanelContainer
 *   renderPanel={({ type, props, onClose }) => {
 *     switch (type) {
 *       case 'invoice-detail':
 *         return <InvoiceDetailPanel {...props} onClose={onClose} />;
 *       case 'invoice-edit':
 *         return <InvoiceEditPanel {...props} onClose={onClose} />;
 *       default:
 *         return null;
 *     }
 *   }}
 * />
 * ```
 */
export function PanelContainer({ renderPanel }: PanelContainerProps) {
  const panels = usePanelStore((state) => state.panels);
  const closeAllPanels = usePanelStore((state) => state.closeAllPanels);
  const closePanel = usePanelStore((state) => state.closePanel);

  const hasOpenPanels = panels.length > 0;

  // Handle overlay click to close all panels
  const handleOverlayClick = (event: React.MouseEvent) => {
    // Only close if clicking directly on overlay (not bubbled from panel)
    if (event.target === event.currentTarget) {
      closeAllPanels();
    }
  };

  // Prevent body scroll when panels are open
  React.useEffect(() => {
    if (hasOpenPanels) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [hasOpenPanels]);

  if (!hasOpenPanels) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {hasOpenPanels && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            className="panel-overlay fixed inset-0 bg-black/50"
            style={{ zIndex: PANEL_Z_INDEX.OVERLAY }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel Stack */}
      <AnimatePresence mode="sync">
        {panels.map((config) => (
          <React.Fragment key={config.id}>
            {renderPanel({
              id: config.id,
              type: config.type,
              props: config.props,
              onClose: () => closePanel(config.id),
            })}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </>
  );
}
