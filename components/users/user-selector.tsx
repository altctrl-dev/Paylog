/**
 * User Selector Component (Sprint 11 Phase 5)
 *
 * Searchable dropdown for selecting users with shadcn Command component.
 * Used by ProfileAccessManager to grant profile access.
 */

'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface UserSelectorProps {
  users: Array<{ id: number; email: string; full_name: string; role: string }>;
  selectedUserId?: number;
  onSelect: (userId: number) => void;
  placeholder?: string;
  excludeUserIds?: number[];
  disabled?: boolean;
}

export function UserSelector({
  users,
  selectedUserId,
  onSelect,
  placeholder = 'Select user...',
  excludeUserIds = [],
  disabled = false,
}: UserSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Filter out super_admins and excluded users
  const filteredUsers = React.useMemo(() => {
    return users.filter(
      (user) =>
        user.role !== 'super_admin' && !excludeUserIds.includes(user.id)
    );
  }, [users, excludeUserIds]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedUser ? (
            <span className="truncate">
              {selectedUser.full_name} ({selectedUser.email})
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or email..." />
          <CommandEmpty>No users found</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredUsers.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.full_name} ${user.email}`}
                onSelect={() => {
                  onSelect(user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{user.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
