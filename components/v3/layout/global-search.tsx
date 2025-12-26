'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Building, Navigation } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Navigation items for quick jump
const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Navigation },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Admin', href: '/admin', icon: FileText },
  { label: 'Settings', href: '/settings', icon: FileText },
];

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search invoices, vendors, or navigate..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Navigation */}
        <CommandGroup heading="Quick Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                onSelect={() => handleSelect(item.href)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Future: Invoice Search Results */}
        {search && (
          <CommandGroup heading="Invoices">
            <CommandItem>
              <FileText className="mr-2 h-4 w-4" />
              Search invoices (coming soon)
            </CommandItem>
          </CommandGroup>
        )}

        {/* Future: Vendor Search Results */}
        {search && (
          <CommandGroup heading="Vendors">
            <CommandItem>
              <Building className="mr-2 h-4 w-4" />
              Search vendors (coming soon)
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
