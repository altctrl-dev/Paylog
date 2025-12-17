/**
 * Panel Level Component
 *
 * Individual panel in the stack with slide-in animation.
 * Handles keyboard events (ESC to close) and responsive sizing.
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PanelHeader } from './panel-header';
import { PanelFooter } from './panel-footer';
import type { PanelConfig } from '@/types/panel';
import { DEFAULT_PANEL_ANIMATION } from '@/types/panel';

export interface PanelLevelProps {
  /** Panel configuration from store */
  config: PanelConfig;

  /** Panel title */
  title: string;

  /** Callback when panel should close */
  onClose: () => void;

  /** Panel content */
  children: React.ReactNode;

  /** Optional footer content */
  footer?: React.ReactNode;

  /** Optional header action buttons */
  headerActions?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function PanelLevel({
  config,
  title,
  onClose,
  children,
  footer,
  headerActions,
  className,
}: PanelLevelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Handle ESC key to close panel
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Focus the panel for keyboard navigation
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Width class - w-full ensures panel fills viewport on mobile
  // maxWidth in style prop caps it at config.width on larger screens
  const getWidthClass = () => 'w-full';

  return (
    <motion.div
      ref={panelRef}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{
        type: 'spring',
        stiffness: DEFAULT_PANEL_ANIMATION.stiffness,
        damping: DEFAULT_PANEL_ANIMATION.damping,
        duration: DEFAULT_PANEL_ANIMATION.duration / 1000,
      }}
      style={{
        zIndex: config.zIndex,
        // Use maxWidth instead of width so panel can shrink on mobile
        // The w-full class will make it 100% on small screens
        maxWidth: config.width,
      }}
      className={cn(
        'panel-level fixed right-0 top-0 h-full',
        'flex flex-col bg-background shadow-2xl',
        'overflow-hidden', // Ensure content doesn't overflow panel bounds
        getWidthClass(),
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`panel-${config.id}-title`}
      tabIndex={-1}
    >
      <PanelHeader title={title} onClose={onClose} actions={headerActions} />

      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

      {footer && <PanelFooter>{footer}</PanelFooter>}
    </motion.div>
  );
}
