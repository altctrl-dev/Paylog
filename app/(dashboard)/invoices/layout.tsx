/**
 * Invoices Layout
 *
 * Simple pass-through layout for invoice pages.
 * Tabs are now handled within the v3 InvoicesPage component.
 */

export default function InvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
