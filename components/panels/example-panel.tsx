/**
 * Example Panel Usage Component
 *
 * Demonstrates how to use the global stacked panel system.
 * Shows all 3 levels of nested panels with proper keyboard support.
 *
 * Usage:
 * ```tsx
 * import { ExamplePanelDemo } from '@/components/panels/example-panel';
 *
 * function MyPage() {
 *   return <ExamplePanelDemo />;
 * }
 * ```
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { PanelLevel } from './panel-level';
import type { PanelConfig } from '@/types/panel';

/**
 * Example Level 1 Panel: Detail View (Read-only)
 */
function Level1DetailPanel({
  config,
  onClose,
  itemId,
}: {
  config: PanelConfig;
  onClose: () => void;
  itemId: string;
}) {
  const { openPanel } = usePanel();

  const handleOpenEdit = () => {
    openPanel('example-edit', { itemId }, { width: 500 });
  };

  return (
    <PanelLevel
      config={config}
      title={`Detail View: Item ${itemId}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleOpenEdit}>Edit Item</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Item Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item ID:</span>
              <span className="font-medium">{itemId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">2025-10-08</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Description</h3>
          <p className="text-sm text-muted-foreground">
            This is a read-only detail view (Level 1 panel). Level 1 panels are
            typically 350px wide and used for viewing information.
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Actions</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Click the &quot;Edit Item&quot; button in the footer to open a
            Level 2 panel on top of this one.
          </p>
        </Card>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Keyboard Shortcuts:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Press ESC to close this panel</li>
            <li>• Click the overlay to close all panels</li>
            <li>• Use Tab to navigate between elements</li>
          </ul>
        </div>
      </div>
    </PanelLevel>
  );
}

/**
 * Example Level 2 Panel: Edit Form
 */
function Level2EditPanel({
  config,
  onClose,
  itemId,
}: {
  config: PanelConfig;
  onClose: () => void;
  itemId: string;
}) {
  const { openPanel } = usePanel();

  const handleOpenNested = () => {
    openPanel('example-nested', { itemId }, { width: 500 });
  };

  const handleSave = () => {
    console.log('Saving item:', itemId);
    onClose();
  };

  return (
    <PanelLevel
      config={config}
      title={`Edit Item: ${itemId}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Edit Form</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Item Name
              </label>
              <input
                type="text"
                defaultValue={`Item ${itemId}`}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Active</option>
                <option>Pending</option>
                <option>Archived</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="This is a Level 2 panel (500px width). Level 2 panels are typically used for edit forms and create forms."
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Nested Panel Demo</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            You can open a third panel (Level 3) on top of this one. The
            system supports up to 3 levels of nesting.
          </p>
          <Button variant="outline" onClick={handleOpenNested} className="w-full">
            Open Level 3 Panel
          </Button>
        </Card>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Panel Stack Info:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• This is a Level 2 panel (500px width)</li>
            <li>• Press ESC to close only this panel</li>
            <li>• The Level 1 panel will remain open</li>
          </ul>
        </div>
      </div>
    </PanelLevel>
  );
}

/**
 * Example Level 3 Panel: Nested Form
 */
function Level3NestedPanel({
  config,
  onClose,
  itemId,
}: {
  config: PanelConfig;
  onClose: () => void;
  itemId: string;
}) {
  const { closeAllPanels } = usePanel();

  const handleConfirm = () => {
    console.log('Confirmed action for item:', itemId);
    closeAllPanels();
  };

  return (
    <PanelLevel
      config={config}
      title="Confirmation Required"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Go Back
          </Button>
          <Button onClick={handleConfirm}>Confirm & Close All</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Level 3 Panel</h3>
          <p className="text-sm text-muted-foreground">
            This is the maximum depth (Level 3). The panel system prevents
            opening more than 3 panels at once to maintain usability.
          </p>
        </Card>

        <Card className="border-destructive p-4">
          <h3 className="mb-2 font-semibold text-destructive">
            Are you sure?
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            This action cannot be undone. Clicking &quot;Confirm &amp; Close
            All&quot; will close all 3 panels at once.
          </p>
        </Card>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Maximum Depth Reached:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• This is Level 3 (500px width)</li>
            <li>• Maximum of 3 panels enforced</li>
            <li>• Press ESC to close this panel only</li>
            <li>• Click overlay to close all panels</li>
          </ul>
        </div>
      </div>
    </PanelLevel>
  );
}

/**
 * Panel Renderer for Example Panels
 */
function ExamplePanelRenderer({
  id,
  type,
  props,
  onClose,
}: {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}) {
  const panels = usePanelStack();
  const config = panels.panels.find((p) => p.id === id);

  if (!config) return null;

  switch (type) {
    case 'example-detail':
      return (
        <Level1DetailPanel
          config={config}
          onClose={onClose}
          itemId={props.itemId as string}
        />
      );
    case 'example-edit':
      return (
        <Level2EditPanel
          config={config}
          onClose={onClose}
          itemId={props.itemId as string}
        />
      );
    case 'example-nested':
      return (
        <Level3NestedPanel
          config={config}
          onClose={onClose}
          itemId={props.itemId as string}
        />
      );
    default:
      return null;
  }
}

/**
 * Example Panel Demo Component
 *
 * Add this to any page to demonstrate the panel system.
 */
export function ExamplePanelDemo() {
  const { openPanel } = usePanel();
  const { panelCount, hasOpenPanels } = usePanelStack();

  const handleOpenDetail = () => {
    openPanel('example-detail', { itemId: 'ITEM-001' }, { width: 350 });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Stacked Panel System Demo
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This demonstrates the Microsoft 365-style stacked panel system.
          Click the button below to open a Level 1 detail panel, then explore
          nested panels.
        </p>

        <div className="mb-4 flex items-center gap-4">
          <Button onClick={handleOpenDetail}>Open Detail Panel</Button>
          {hasOpenPanels && (
            <span className="text-sm text-muted-foreground">
              {panelCount} panel{panelCount !== 1 ? 's' : ''} open
            </span>
          )}
        </div>

        <div className="rounded-md bg-muted p-4 text-xs">
          <p className="mb-2 font-semibold">Features Demonstrated:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✓ Three levels of nested panels (350px, 500px, 500px)</li>
            <li>✓ Smooth 300ms spring animations (Framer Motion)</li>
            <li>✓ Keyboard support (ESC to close top panel)</li>
            <li>✓ Click overlay to close all panels</li>
            <li>✓ Responsive design (full-width on mobile)</li>
            <li>✓ TypeScript type safety throughout</li>
            <li>✓ Zustand state management</li>
            <li>✓ Sticky header and footer</li>
          </ul>
        </div>
      </Card>

      {/* Panel Renderer - Handled by PanelContainer in layout */}
    </div>
  );
}

// Export renderer for use in PanelContainer
export { ExamplePanelRenderer };
