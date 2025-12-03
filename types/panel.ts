/**
 * Panel Infrastructure Type Definitions
 *
 * Type-safe contracts for the global stacked panel system.
 * Supports up to 3 levels of nested panels (Microsoft 365 style).
 */

/**
 * Unique identifier for a panel instance
 */
export type PanelId = string;

/**
 * Panel type identifier for routing and rendering
 */
export type PanelType = string;

/**
 * Panel level in the stack (1-3)
 * Level determines z-index stacking, not width.
 * Width should be specified using PANEL_WIDTH tiers.
 */
export type PanelLevel = 1 | 2 | 3;

/**
 * Configuration for a single panel in the stack
 */
export interface PanelConfig<TProps = Record<string, unknown>> {
  /** Unique identifier for this panel instance */
  id: PanelId;

  /** Panel type identifier (e.g., 'invoice-detail', 'invoice-edit') */
  type: PanelType;

  /** Props passed to the panel component */
  props: TProps;

  /** Panel width in pixels (default: PANEL_WIDTH.MEDIUM = 650px) */
  width?: number;

  /** Panel level in the stack (1-3) */
  level: PanelLevel;

  /** Z-index for stacking (calculated automatically) */
  zIndex: number;
}

/**
 * Base props that all panel components receive
 */
export interface PanelProps {
  /** Panel title displayed in header */
  title: string;

  /** Callback when panel is closed */
  onClose?: () => void;

  /** Optional footer content */
  footer?: React.ReactNode;

  /** Panel content */
  children: React.ReactNode;
}

/**
 * Zustand store state shape for panel management
 */
export interface PanelStackStore {
  /** Array of open panels (stack order) */
  panels: PanelConfig[];

  /** Open a new panel and add to stack */
  openPanel: <TProps = Record<string, unknown>>(
    type: PanelType,
    props: TProps,
    options?: { width?: number }
  ) => PanelId;

  /** Close a specific panel by ID */
  closePanel: (id: PanelId) => void;

  /** Close the topmost panel in the stack */
  closeTopPanel: () => void;

  /** Close all panels */
  closeAllPanels: () => void;

  /** Check if a panel is currently open */
  isPanelOpen: (id: PanelId) => boolean;

  /** Get the topmost panel (or undefined if empty) */
  getTopPanel: () => PanelConfig | undefined;
}

/**
 * Return type for the usePanel hook
 */
export interface UsePanelReturn {
  /** Open a new panel */
  openPanel: PanelStackStore['openPanel'];

  /** Close a specific panel */
  closePanel: PanelStackStore['closePanel'];

  /** Close the topmost panel */
  closeTopPanel: PanelStackStore['closeTopPanel'];

  /** Close all panels */
  closeAllPanels: PanelStackStore['closeAllPanels'];

  /** Check if any panels are open */
  hasOpenPanels: boolean;
}

/**
 * Return type for the usePanelStack hook
 */
export interface UsePanelStackReturn {
  /** Array of open panels */
  panels: PanelConfig[];

  /** Number of panels in the stack */
  panelCount: number;

  /** The topmost panel (or undefined) */
  topPanel: PanelConfig | undefined;

  /** Check if any panels are open */
  hasOpenPanels: boolean;
}

/**
 * Animation configuration for panel transitions
 */
export interface PanelAnimationConfig {
  /** Animation duration in milliseconds */
  duration: number;

  /** Spring animation stiffness */
  stiffness: number;

  /** Spring animation damping */
  damping: number;
}

/**
 * Default animation configuration (300ms spring)
 */
export const DEFAULT_PANEL_ANIMATION: PanelAnimationConfig = {
  duration: 300,
  stiffness: 400,
  damping: 30,
};

/**
 * Z-index base values for panel layering
 */
export const PANEL_Z_INDEX = {
  OVERLAY: 10000,
  LEVEL_1: 10001,
  LEVEL_2: 10002,
  LEVEL_3: 10003,
} as const;

/**
 * Standardized panel width tiers
 * - SMALL (500px): Read-only detail views, quick info, summaries
 * - MEDIUM (650px): Forms, editing, moderate complexity
 * - LARGE (800px): Complex forms, invoice creation, multi-section content
 */
export const PANEL_WIDTH = {
  /** 500px - Detail views, read-only summaries */
  SMALL: 500,
  /** 650px - Forms, editing panels */
  MEDIUM: 650,
  /** 800px - Complex forms, multi-section content */
  LARGE: 800,
} as const;

export type PanelWidthTier = (typeof PANEL_WIDTH)[keyof typeof PANEL_WIDTH];

/**
 * Maximum number of panels that can be open simultaneously
 */
export const MAX_PANEL_DEPTH = 3;
