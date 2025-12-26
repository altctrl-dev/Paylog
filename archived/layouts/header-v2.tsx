'use client';

import React from 'react';
import { Sun, Moon, Bell, Menu, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { UserProfileMenu } from './user-profile-menu';
import { GlobalSearch } from './global-search';
import { NavbarPlusMenu } from './navbar-plus-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIVersion } from '@/lib/stores/ui-version-store';

interface HeaderV2Props {
  sidebarCollapsed: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function HeaderV2({ sidebarCollapsed, user }: HeaderV2Props) {
  const { theme, setTheme } = useTheme();
  const { toggleMobileMenu } = useUIVersion();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4">
        {/* Mobile Menu Button - Only visible on mobile */}
        <button
          onClick={toggleMobileMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent md:hidden"
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo - ONLY show when sidebar is collapsed on desktop */}
        <AnimatePresence>
          {sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="hidden md:flex items-center"
            >
              <span className="text-xl font-bold">PAYLOG</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Centered Search Bar - Desktop only */}
        <div className="flex-1 max-w-lg mx-auto hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search invoices, vendors...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Add Button - Now using NavbarPlusMenu */}
          <NavbarPlusMenu />

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
          >
            {!mounted ? (
              <Sun className="h-5 w-5" />
            ) : theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>

          {/* Notification Bell */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent">
            <Bell className="h-5 w-5" />
            {/* Badge - show if notifications > 0 */}
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User Profile Menu */}
          <UserProfileMenu user={user} />
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
