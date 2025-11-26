/**
 * Profile Tab Component
 *
 * User profile settings including name, initials, and appearance.
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { updateUserProfile } from '@/app/actions/user-settings';
import { User, Save, Loader2 } from 'lucide-react';

export function ProfileTab() {
  const { data: session, update: updateSession } = useSession();
  const { version, setVersion, invoiceCreationMode, setInvoiceCreationMode } = useUIVersion();

  // Form state
  const [fullName, setFullName] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [initials, setInitials] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load user data from session
  React.useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || '');
      const user = session.user as unknown as Record<string, unknown>;
      setDisplayName((user.displayName as string) || '');
      setInitials((user.initials as string) || '');
    }
  }, [session]);

  // Auto-generate initials from full name
  const generateInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFullName(newName);
    // Auto-generate initials if not manually set
    if (!initials || initials === generateInitials(fullName)) {
      setInitials(generateInitials(newName));
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await updateUserProfile({
        full_name: fullName,
        display_name: displayName || null,
        initials: initials || null,
      });

      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
        // Update the session to reflect changes
        await updateSession();
      } else {
        setSaveMessage({ type: 'error', text: result.error });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setIsSaving(false);
    }
  };

  // Clear message after 3 seconds
  React.useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {initials ? (
                <span className="text-xl font-semibold text-primary">{initials}</span>
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium">Profile Information</h3>
              <p className="text-sm text-muted-foreground">
                Update your personal information
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={handleFullNameChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be called"
              />
              <p className="text-xs text-muted-foreground">
                This name will be shown instead of your full name
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="initials">Initials</Label>
              <Input
                id="initials"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().substring(0, 3))}
                placeholder="AB"
                maxLength={3}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Up to 3 characters, used for your avatar
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                value={session?.user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact your administrator to change your email
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage.text}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Appearance Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Customize how PayLog looks and feels
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Modern UI (v2)</Label>
              <p className="text-sm text-muted-foreground">
                Use the new modern interface with collapsible sidebar
              </p>
            </div>
            <Switch
              checked={version === 'v2'}
              onCheckedChange={(checked) => setVersion(checked ? 'v2' : 'v1')}
            />
          </div>
        </div>
      </Card>

      {/* Invoice Preferences */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Invoice Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Configure how invoices are created and displayed
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use Side Panel for Invoice Creation</Label>
              <p className="text-sm text-muted-foreground">
                Create invoices in a side panel instead of navigating to a new page
              </p>
            </div>
            <Switch
              checked={invoiceCreationMode === 'panel'}
              onCheckedChange={(checked) => setInvoiceCreationMode(checked ? 'panel' : 'page')}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
