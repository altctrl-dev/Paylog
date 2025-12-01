'use client';

/**
 * Modern Theme Navbar (v3)
 *
 * Top navigation bar built with:
 * - Radix UI DropdownMenu for user profile
 * - Lucide icons
 * - Tailwind CSS
 *
 * Layout (matching mockup):
 * - [Logo + divider] (only when sidebar collapsed)
 * - [⌘ ⌘K] command palette trigger button
 * - [spacer]
 * - [+] quick actions | [theme] | [bell] | [user profile]
 */

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Bell,
  Menu,
  Plus,
  Command,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  onOpenCommandPalette?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
}

function formatRole(role?: string | null): string {
  if (!role) return 'User';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// Sub-components
// ============================================================================

interface CommandPaletteTriggerProps {
  onClick?: () => void;
}

function CommandPaletteTrigger({ onClick }: CommandPaletteTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg',
        'bg-muted/50 border border-border px-2.5 py-1.5',
        'text-xs text-muted-foreground',
        'hover:bg-muted hover:text-foreground transition-colors'
      )}
    >
      <Command className="h-3.5 w-3.5" />
      <span className="font-medium">⌘K</span>
    </button>
  );
}

interface QuickActionsMenuProps {
  invoiceCreationMode?: 'page' | 'panel';
}

function QuickActionsMenu({ invoiceCreationMode = 'page' }: QuickActionsMenuProps) {
  const invoiceHref = invoiceCreationMode === 'page' ? '/invoices/new/non-recurring' : '#';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Quick actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={invoiceHref}>Add Invoice</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/invoices/new/recurring">Add Recurring</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ThemeToggleProps {
  className?: string;
}

function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn('h-9 w-9', className)}
      aria-label="Toggle theme"
    >
      {!mounted ? (
        <Sun className="h-5 w-5" />
      ) : theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}

function NotificationBell() {
  const hasNotifications = true; // TODO: Connect to real notification state

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9 relative">
      <Bell className="h-5 w-5" />
      {hasNotifications && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
      )}
      <span className="sr-only">Notifications</span>
    </Button>
  );
}

interface UserProfileMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

function UserProfileMenu({ user }: UserProfileMenuProps) {
  const displayName = user?.name || user?.email || 'User';
  const initials = getInitials(user?.name, user?.email);
  const role = formatRole(user?.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
          <div className="hidden sm:block text-right min-w-[80px] max-w-[150px]">
            <div className="text-sm font-medium truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{role}</div>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Navbar({ user, onOpenCommandPalette }: NavbarProps) {
  const { getCurrentSidebarCollapsed, toggleMobileMenu, invoiceCreationMode } = useUIVersion();
  const isCollapsed = getCurrentSidebarCollapsed();

  // Keyboard shortcut for command palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 gap-3">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobileMenu}
        className="h-10 w-10 md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo - Only when sidebar is collapsed */}
      <div
        className={cn(
          'hidden md:flex items-center gap-4 transition-all duration-300',
          isCollapsed ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
        )}
      >
        <span className="text-xl font-bold tracking-tight">PAYLOG</span>
        <div className="h-6 w-px bg-border" aria-hidden="true" />
      </div>

      {/* Command Palette Trigger */}
      <div className="hidden md:block">
        <CommandPaletteTrigger onClick={onOpenCommandPalette} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <QuickActionsMenu invoiceCreationMode={invoiceCreationMode} />
        <ThemeToggle />
        <NotificationBell />
        <UserProfileMenu user={user} />
      </div>
    </header>
  );
}

export default Navbar;
