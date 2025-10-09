'use client';

import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Welcome, {user.name}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {user.role}
        </span>
      </div>
      <Button
        variant="outline"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        Sign Out
      </Button>
    </header>
  );
}
