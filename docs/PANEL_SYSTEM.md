# Global Stacked Panel System

## Overview

The global stacked panel system provides a Microsoft 365-style slide-out panel experience for the Invoice Management System. It supports up to 3 levels of nested panels with smooth animations, keyboard navigation, and responsive design.

## Architecture

### Technology Stack

- **State Management**: Zustand (lightweight, TypeScript-friendly)
- **Animations**: Framer Motion (declarative, GPU-accelerated)
- **Styling**: Tailwind CSS + Shadcn/ui design tokens
- **Type Safety**: Full TypeScript coverage

### Key Components

1. **PanelStore** (`lib/store/panel-store.ts`)
   - Zustand store managing panel stack state
   - Actions: `openPanel`, `closePanel`, `closeTopPanel`, `closeAllPanels`
   - Max depth enforcement (3 levels)
   - Automatic z-index calculation

2. **PanelContainer** (`components/panels/panel-container.tsx`)
   - Root container with overlay management
   - Portal rendering to document.body
   - Global event handling (overlay click, body scroll lock)

3. **PanelLevel** (`components/panels/panel-level.tsx`)
   - Individual panel with slide-in animation
   - Keyboard support (ESC to close)
   - Responsive width handling
   - Focus management

4. **PanelHeader** & **PanelFooter**
   - Sticky header with close button
   - Optional footer for action buttons

5. **Custom Hooks**
   - `usePanel()`: Panel operations (open, close)
   - `usePanelStack()`: Read-only stack state

## Usage

### 1. Basic Usage

```tsx
'use client';

import { usePanel } from '@/hooks/use-panel';
import { Button } from '@/components/ui/button';

function MyComponent() {
  const { openPanel } = usePanel();

  const handleOpenDetail = () => {
    openPanel('invoice-detail', { invoiceId: '123' });
  };

  return <Button onClick={handleOpenDetail}>View Invoice</Button>;
}
```

### 2. Creating a Panel Component

```tsx
'use client';

import { PanelLevel } from '@/components/panels/panel-level';
import type { PanelConfig } from '@/types/panel';

interface InvoiceDetailPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: string;
}

export function InvoiceDetailPanel({
  config,
  onClose,
  invoiceId,
}: InvoiceDetailPanelProps) {
  return (
    <PanelLevel
      config={config}
      title={`Invoice #${invoiceId}`}
      onClose={onClose}
      footer={
        <Button onClick={onClose}>Close</Button>
      }
    >
      {/* Panel content here */}
      <div>Invoice details for {invoiceId}</div>
    </PanelLevel>
  );
}
```

### 3. Registering Panel Types

Edit `components/panels/panel-provider.tsx` to add your panel type:

```tsx
export function PanelProvider() {
  return (
    <PanelContainer
      renderPanel={({ id, type, props, onClose }) => {
        const panels = usePanelStack();
        const config = panels.panels.find((p) => p.id === id);

        if (!config) return null;

        switch (type) {
          case 'invoice-detail':
            return (
              <InvoiceDetailPanel
                config={config}
                onClose={onClose}
                invoiceId={props.invoiceId as string}
              />
            );
          case 'invoice-edit':
            return (
              <InvoiceEditPanel
                config={config}
                onClose={onClose}
                invoiceId={props.invoiceId as string}
              />
            );
          // Add more panel types here
          default:
            return null;
        }
      }}
    />
  );
}
```

## Panel Levels

### Level 1: Detail View (350px)
- **Purpose**: Read-only information display
- **Width**: 350px (desktop), 100% (mobile)
- **Use Case**: Invoice details, user profiles, activity logs

### Level 2: Edit Form (500px)
- **Purpose**: Edit existing records or create new ones
- **Width**: 500px (desktop), 100% (mobile)
- **Use Case**: Invoice edit form, payment form

### Level 3: Nested Form (500px)
- **Purpose**: Additional context or confirmation dialogs
- **Width**: 500px (desktop), 100% (mobile)
- **Use Case**: Confirmation dialogs, nested sub-forms

## Keyboard Shortcuts

- **ESC**: Close the topmost panel
- **Overlay Click**: Close all panels
- **Tab**: Navigate between focusable elements within panel

## Responsive Behavior

### Desktop (>1024px)
- Level 1: 350px width
- Level 2-3: 500px width
- Panels stack from right to left
- Overlay: Semi-transparent backdrop

### Tablet (768px - 1024px)
- Same as desktop but full-width on smaller tablets

### Mobile (<768px)
- All panels: 100% width
- Full-screen experience
- Overlay: Darker backdrop for better visibility

## Animation Specifications

- **Duration**: 300ms
- **Type**: Spring animation
- **Stiffness**: 400
- **Damping**: 30
- **Transform**: `translateX` (GPU-accelerated)
- **Overlay**: Fade in/out (200ms)

## Z-Index Layering

```
Overlay:  10000
Level 1:  10001
Level 2:  10002
Level 3:  10003
```

All panel z-indexes are isolated in the 10000+ range to avoid conflicts.

## API Reference

### usePanel()

```tsx
const {
  openPanel,        // (type, props, options?) => panelId
  closePanel,       // (id) => void
  closeTopPanel,    // () => void
  closeAllPanels,   // () => void
  hasOpenPanels,    // boolean
} = usePanel();
```

### usePanelStack()

```tsx
const {
  panels,           // PanelConfig[]
  panelCount,       // number
  topPanel,         // PanelConfig | undefined
  hasOpenPanels,    // boolean
} = usePanelStack();
```

### openPanel Options

```tsx
openPanel(
  'panel-type',
  { prop1: 'value', prop2: 123 },
  { width: 600 }  // Optional: override default width
);
```

## Best Practices

### 1. Panel Content Structure

```tsx
<PanelLevel config={config} title="Title" onClose={onClose}>
  {/* Always wrap content in semantic sections */}
  <section className="space-y-4">
    <Card>...</Card>
    <Card>...</Card>
  </section>
</PanelLevel>
```

### 2. Footer Actions

```tsx
// Standard pattern: Cancel on left, Primary on right
<PanelLevel
  footer={
    <>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleSave}>
        Save Changes
      </Button>
    </>
  }
>
  {/* Content */}
</PanelLevel>
```

### 3. Opening Nested Panels

```tsx
function Level1Panel() {
  const { openPanel } = usePanel();

  const handleOpenEdit = () => {
    // Opens Level 2 on top of Level 1
    openPanel('invoice-edit', { invoiceId: '123' });
  };

  return (
    <PanelLevel {...props}>
      <Button onClick={handleOpenEdit}>Edit Invoice</Button>
    </PanelLevel>
  );
}
```

### 4. Closing Multiple Panels

```tsx
// Close only the current panel
onClose();

// Close all panels (e.g., after saving)
const { closeAllPanels } = usePanel();
closeAllPanels();

// Close the top panel (from outside)
const { closeTopPanel } = usePanel();
closeTopPanel();
```

## Accessibility

- **ARIA Roles**: Panels use `role="dialog"` and `aria-modal="true"`
- **Focus Management**: Auto-focus on panel open
- **Keyboard Navigation**: Full keyboard support (Tab, ESC)
- **Screen Readers**: Proper labeling with `aria-labelledby`
- **Focus Trap**: Tab navigation contained within active panel

## Performance Considerations

- **GPU Acceleration**: Animations use `transform` for 60fps performance
- **Lazy Rendering**: Panels only render when open
- **Event Delegation**: Minimal event listeners
- **Body Scroll Lock**: Prevents scroll issues on mobile
- **Portal Rendering**: Avoids z-index conflicts

## Examples

### Simple Detail Panel

```tsx
const { openPanel } = usePanel();
openPanel('user-detail', { userId: '123' });
```

### Edit Form with Custom Width

```tsx
const { openPanel } = usePanel();
openPanel('invoice-edit', { invoiceId: 'INV-001' }, { width: 600 });
```

### Nested Confirmation Dialog

```tsx
function EditPanel() {
  const { openPanel } = usePanel();

  const handleDelete = () => {
    openPanel('confirm-delete', { itemId: '123' });
  };

  return (
    <PanelLevel {...props}>
      <Button variant="destructive" onClick={handleDelete}>
        Delete Invoice
      </Button>
    </PanelLevel>
  );
}
```

## Demo

Visit `/panels-demo` to see a live demonstration of all panel features.

## Troubleshooting

### Panels Not Rendering

1. Ensure `PanelProvider` is mounted in your layout
2. Check that panel type is registered in `panel-provider.tsx`
3. Verify `'use client'` directive on panel components

### Z-Index Conflicts

- Panel system uses z-index 10000-10003
- Ensure no other UI elements use this range
- Check for `isolation: isolate` CSS conflicts

### Animation Performance

- Ensure `transform: translateZ(0)` is applied (already in globals.css)
- Check for `will-change` usage (applied automatically)
- Test on lower-end devices for mobile performance

### TypeScript Errors

- All panel props must be serializable (no functions, no classes)
- Use `Record<string, unknown>` for dynamic props
- Ensure panel components receive correct prop types

## Files Reference

```
types/panel.ts                        # TypeScript definitions
lib/store/panel-store.ts              # Zustand state management
hooks/use-panel.ts                    # Panel operations hook
hooks/use-panel-stack.ts              # Panel stack state hook
components/panels/
  ├── panel-container.tsx             # Root container
  ├── panel-level.tsx                 # Individual panel
  ├── panel-header.tsx                # Sticky header
  ├── panel-footer.tsx                # Sticky footer
  ├── panel-provider.tsx              # Provider with routing
  ├── example-panel.tsx               # Demo components
  └── index.ts                        # Barrel exports
app/globals.css                       # Panel styles
app/(dashboard)/layout.tsx            # Integration point
app/(dashboard)/panels-demo/page.tsx  # Demo page
```

## Next Steps

1. **Invoice CRUD Integration**: Replace example panels with real Invoice panels
2. **Payment Forms**: Add Level 3 nested payment panels
3. **Storybook Stories**: Document components visually
4. **Unit Tests**: Add Vitest tests for store and hooks
5. **E2E Tests**: Add Playwright tests for full user flows

---

**Status**: ✅ Complete and production-ready
**Last Updated**: 2025-10-08
