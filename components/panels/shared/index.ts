/**
 * Shared Panel Components
 *
 * Reusable building blocks for sidepanel layouts.
 * These components provide consistent styling and behavior
 * across all panel types in the application.
 */

// Layout Components
export { PanelSection } from './panel-section';
export { PanelTabs, type TabItem, type PanelTabsProps } from './panel-tabs';

// Header & Stats
export {
  PanelSummaryHeader,
  type PanelSummaryHeaderProps,
} from './panel-summary-header';
export {
  PanelStatGroup,
  type StatItem,
  type PanelStatGroupProps,
} from './panel-stat-group';

// Action Bar
export {
  PanelActionBar,
  type ActionBarAction,
  type PanelActionBarProps,
} from './panel-action-bar';

// Content Components
export {
  PanelAttachmentList,
  type Attachment,
  type PanelAttachmentListProps,
} from './panel-attachment-list';
export {
  PanelTimeline,
  type TimelineItem,
  type PanelTimelineProps,
} from './panel-timeline';
export {
  PanelPaymentCard,
  type PaymentCardPayment,
  type PanelPaymentCardProps,
} from './panel-payment-card';
