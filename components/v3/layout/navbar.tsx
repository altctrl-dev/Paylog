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
  Menu,
  Plus,
  LogOut,
  User,
  Settings,
  FileText,
  Database,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { logout } from '@/lib/logout';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  /** Sidebar collapsed state - passed from parent for consistent rendering */
  isCollapsed?: boolean;
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

interface SearchBarProps {
  onOpenCommandPalette?: () => void;
}

function SearchBar({ onOpenCommandPalette }: SearchBarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when expanded
  React.useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, open command palette with the search query
      // In the future, this could directly search
      onOpenCommandPalette?.();
    }
  };

  if (isExpanded) {
    return (
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full',
            'bg-muted/50 border border-border pl-3 pr-2 h-8',
            'transition-all duration-200'
          )}
        >
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className={cn(
              'bg-transparent border-none',
              'outline-none focus:outline-none focus:ring-0',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'w-[220px]'
            )}
          />
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setSearchQuery('');
            }}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      onClick={() => setIsExpanded(true)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full',
        'bg-muted/50 border border-border px-3 h-8',
        'text-sm text-muted-foreground',
        'hover:bg-muted hover:text-foreground transition-all duration-200'
      )}
    >
      <Search className="h-4 w-4" />
      <span className="text-xs font-medium">⌘K</span>
    </button>
  );
}

/**
 * Menu structure for quick actions
 * Routes point to actual admin pages with appropriate subtabs
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
      { label: 'Vendor', route: '/admin?tab=master-data&subtab=vendors' },
      { label: 'Category', route: '/admin?tab=master-data&subtab=categories' },
      { label: 'Entity', route: '/admin?tab=master-data&subtab=entities' },
      { label: 'Payment Type', route: '/admin?tab=master-data&subtab=payment-types' },
      { label: 'Currency', route: '/admin?tab=master-data&subtab=currencies' },
      { label: 'Invoice Profile', route: '/admin?tab=master-data&subtab=profiles' },
    ],
  },
  {
    label: 'User',
    icon: User,
    items: [
      { label: 'New User', route: '/admin?tab=users' },
    ],
  },
];

interface QuickActionsMenuProps {
  invoiceCreationMode?: 'page' | 'panel';
}

function QuickActionsMenu({ invoiceCreationMode = 'page' }: QuickActionsMenuProps) {
  const router = useRouter();
  const { openPanel } = usePanel();
  const [open, setOpen] = React.useState(false);

  const handleItemClick = (route: string) => {
    // Check if this is an invoice creation route and user prefers panel mode
    if (invoiceCreationMode === 'panel') {
      if (route === '/invoices/new/recurring') {
        openPanel('invoice-create-recurring', {}, { width: PANEL_WIDTH.LARGE });
        setOpen(false);
        return;
      }
      if (route === '/invoices/new/non-recurring') {
        openPanel('invoice-create-non-recurring', {}, { width: PANEL_WIDTH.LARGE });
        setOpen(false);
        return;
      }
    }

    // Default behavior: navigate to route
    router.push(route);
    setOpen(false);
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="subtle" size="icon" className="h-9 w-9">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Quick actions</span>
        </Button>
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

/**
 * Sync button to manually refresh all data
 * Invalidates all React Query caches and refetches
 */
function SyncButton() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Invalidate all queries to force refetch
      await queryClient.invalidateQueries();
      toast.success('Data synced', {
        description: 'All data has been refreshed',
        duration: 2000,
      });
    } catch {
      toast.error('Sync failed', {
        description: 'Please try again',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="subtle"
      size="icon"
      onClick={handleSync}
      disabled={isSyncing}
      className="h-9 w-9"
      aria-label="Sync data"
    >
      <RefreshCw className={cn('h-5 w-5', isSyncing && 'animate-spin')} />
    </Button>
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
      variant="subtle"
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

// NotificationBell has been replaced by NotificationPanel component

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
          onClick={() => logout()}
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

export function Navbar({ user, onOpenCommandPalette, isCollapsed = false }: NavbarProps) {
  const { toggleMobileMenu, invoiceCreationMode } = useUIVersion();

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
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      {/* Mobile Layout */}
      <div className="flex md:hidden h-full items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          className="h-10 w-10"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <SyncButton />
          <QuickActionsMenu invoiceCreationMode={invoiceCreationMode} />
          <ThemeToggle />
          <NotificationPanel />
          <UserProfileMenu user={user} />
        </div>
      </div>

      {/* Desktop Layout - with centering wrapper to match page content alignment */}
      <div
        className={cn(
          'hidden md:block h-full mx-auto',
          isCollapsed ? 'max-w-[1500px]' : 'max-w-[1350px]'
        )}
      >
        <div className="flex h-full items-center justify-between">
          {/* Left: Logo + Search */}
          <div className={cn('flex items-center', isCollapsed ? 'gap-3' : 'gap-0')}>
            {/* Logo - Only when sidebar is collapsed */}
            <div
              className={cn(
                'flex items-center gap-4 transition-all duration-300',
                isCollapsed ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              <span className="text-xl font-bold tracking-tight">PAYLOG</span>
              <div className="h-6 w-px bg-border" aria-hidden="true" />
            </div>

            {/* Search Bar */}
            <SearchBar onOpenCommandPalette={onOpenCommandPalette} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <SyncButton />
            <QuickActionsMenu invoiceCreationMode={invoiceCreationMode} />
            <ThemeToggle />
            <NotificationPanel />
            <UserProfileMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
