/**
 * Navbar Plus Menu Component
 *
 * Hierarchical dropdown menu for creating new records.
 * Features three expandable sections: Invoice, Masterdata, and User.
 * Respects user's invoice creation mode preference (page vs panel).
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Database,
  User,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { usePanel } from '@/hooks/use-panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { PANEL_WIDTH } from '@/types/panel';

interface NavbarPlusMenuProps {
  /** Optional callback when menu item is clicked */
  onItemClick?: (route: string) => void;
}

/**
 * Hierarchical menu structure
 */
const menuStructure = [
  {
    label: 'Invoice',
    icon: FileText,
    items: [
      { label: 'Recurring', route: '/invoices/new/recurring' },
      { label: 'Non Recurring', route: '/invoices/new/non-recurring' },
    ],
  },
  {
    label: 'Masterdata',
    icon: Database,
    items: [
      { label: 'Vendor', route: '/admin/master-data/vendors/new' },
      { label: 'Category', route: '/admin/master-data/categories/new' },
      { label: 'Entity', route: '/admin/master-data/entities/new' },
      { label: 'Payment Type', route: '/admin/master-data/payment-types/new' },
      { label: 'Currency', route: '/admin/master-data/currencies/new' },
      { label: 'Invoice Profile', route: '/admin/master-data/invoice-profiles/new' },
    ],
  },
  {
    label: 'User',
    icon: User,
    items: [
      { label: 'New User', route: '/admin/users/new' },
    ],
  },
];

export function NavbarPlusMenu({ onItemClick }: NavbarPlusMenuProps) {
  console.log('[NavbarPlusMenu] Function called - component is rendering');

  const router = useRouter();
  const { openPanel } = usePanel();
  const { invoiceCreationMode } = useUIVersion();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  console.log('[NavbarPlusMenu] State initialized - mounted:', mounted, 'open:', open, 'invoiceCreationMode:', invoiceCreationMode);

  // Prevent hydration issues
  React.useEffect(() => {
    console.log('[NavbarPlusMenu] useEffect fired - setting mounted to true');
    setMounted(true);
    console.log('[NavbarPlusMenu] Component mounted');
  }, []);

  React.useEffect(() => {
    console.log('[NavbarPlusMenu] Menu open state:', open);
  }, [open]);

  const handleItemClick = (route: string) => {
    console.log('[NavbarPlusMenu] Item clicked:', route);

    // Check if this is an invoice creation route and user prefers panel mode
    if (invoiceCreationMode === 'panel') {
      if (route === '/invoices/new/recurring') {
        console.log('[NavbarPlusMenu] Opening recurring invoice panel');
        openPanel('invoice-create-recurring', {}, { width: PANEL_WIDTH.LARGE });
        setOpen(false);
        return;
      }
      if (route === '/invoices/new/non-recurring') {
        console.log('[NavbarPlusMenu] Opening non-recurring invoice panel');
        openPanel('invoice-create-non-recurring', {}, { width: PANEL_WIDTH.LARGE });
        setOpen(false);
        return;
      }
    }

    if (onItemClick) {
      onItemClick(route);
    } else {
      // Default behavior: navigate to route
      router.push(route);
    }
    setOpen(false); // Close menu after selection
  };

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    console.log('[NavbarPlusMenu] Returning placeholder button (not mounted yet)');
    return (
      <button
        type="button"
        onClick={() => console.log('[NavbarPlusMenu] Placeholder button clicked (should not happen - button is disabled)')}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        aria-label="Create new"
        disabled
      >
        <Plus className="h-5 w-5" />
      </button>
    );
  }

  console.log('[NavbarPlusMenu] Rendering full dropdown menu (mounted=true)');

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label="Create new"
        >
          <Plus className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {menuStructure.map((section, index) => {
          const Icon = section.icon;

          return (
            <React.Fragment key={section.label}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{section.label}</span>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent sideOffset={8} alignOffset={-4}>
                  {section.items.map((item) => (
                    <DropdownMenuItem
                      key={item.route}
                      onClick={() => handleItemClick(item.route)}
                      className="cursor-pointer"
                    >
                      <ChevronRight className="mr-2 h-4 w-4 opacity-50" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {index < menuStructure.length - 1 && <DropdownMenuSeparator />}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
