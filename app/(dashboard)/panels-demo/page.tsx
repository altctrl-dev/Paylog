/**
 * Panel System Demo Page
 *
 * Demonstrates the global stacked panel infrastructure.
 * Access at: /panels-demo
 */

'use client';

import { ExamplePanelDemo } from '@/components/panels/example-panel';

export default function PanelsDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panel System Demo</h1>
        <p className="mt-2 text-muted-foreground">
          Demonstration of the Microsoft 365-style stacked panel system
        </p>
      </div>

      <ExamplePanelDemo />
    </div>
  );
}
