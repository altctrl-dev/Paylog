'use client';

/**
 * Admin Security Settings Component
 *
 * Password policy configuration for super admins only.
 * Includes:
 * - Password policy settings (length, complexity, expiry)
 * - Login alert email configuration
 * - Emergency password reset
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import {
  Settings2,
  Bell,
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  getSecuritySettings,
  updatePasswordPolicy,
  updateLoginAlertEmail,
  resetEmergencyPassword,
  hasPasswordSet,
} from '@/app/actions/security-settings';
import type { PasswordPolicy } from '@/lib/password-policy';

export function AdminSecuritySettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password policy state
  const [policy, setPolicy] = useState<PasswordPolicy>({
    minLength: 12,
    requireUppercase: true,
    requireNumber: true,
    requireSpecial: true,
    expiryDays: 90,
  });

  // Login alert email
  const [alertEmail, setAlertEmail] = useState('');

  // Password reset state
  const [hasPassword, setHasPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const [settings, hasPass] = await Promise.all([
          getSecuritySettings(),
          hasPasswordSet(),
        ]);
        setPolicy(settings.policy);
        setAlertEmail(settings.loginAlertEmail || '');
        setHasPassword(hasPass);
      } catch (err) {
        setError('Failed to load settings');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleSavePolicy = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updatePasswordPolicy(policy);
      if (result.success) {
        setSuccess('Password policy updated successfully');
      } else {
        setError(result.error || 'Failed to update policy');
      }
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAlertEmail = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateLoginAlertEmail(alertEmail || null);
      if (result.success) {
        setSuccess('Login alert email updated successfully');
      } else {
        setError(result.error || 'Failed to update email');
      }
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resetEmergencyPassword(newPassword, confirmPassword);
      if (result.success) {
        setSuccess('Emergency password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
        setShowResetForm(false);
        setHasPassword(true);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password');
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Administrator Security Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure password policies and security alerts for emergency admin access
        </p>
      </div>

      {/* Status Messages */}
      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            {success}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Password Policy Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Key className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-medium">Password Policy</h3>
              <p className="text-sm text-muted-foreground">
                Set requirements for emergency admin passwords
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Minimum Length */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="minLength">Minimum Length</Label>
              <Select
                id="minLength"
                value={String(policy.minLength)}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, minLength: parseInt(e.target.value, 10) }))
                }
              >
                {[8, 10, 12, 14, 16, 20, 24, 32].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} characters
                  </option>
                ))}
              </Select>
            </div>

            {/* Require Uppercase */}
            <div className="flex items-center justify-between">
              <Label htmlFor="requireUppercase">Require uppercase letter</Label>
              <Switch
                id="requireUppercase"
                checked={policy.requireUppercase}
                onCheckedChange={(v) =>
                  setPolicy((p) => ({ ...p, requireUppercase: v }))
                }
              />
            </div>

            {/* Require Number */}
            <div className="flex items-center justify-between">
              <Label htmlFor="requireNumber">Require number</Label>
              <Switch
                id="requireNumber"
                checked={policy.requireNumber}
                onCheckedChange={(v) =>
                  setPolicy((p) => ({ ...p, requireNumber: v }))
                }
              />
            </div>

            {/* Require Special Character */}
            <div className="flex items-center justify-between">
              <Label htmlFor="requireSpecial">Require special character</Label>
              <Switch
                id="requireSpecial"
                checked={policy.requireSpecial}
                onCheckedChange={(v) =>
                  setPolicy((p) => ({ ...p, requireSpecial: v }))
                }
              />
            </div>

            {/* Password Expiry */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="expiryDays">Password expires after</Label>
              <Select
                id="expiryDays"
                value={String(policy.expiryDays)}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, expiryDays: parseInt(e.target.value, 10) }))
                }
              >
                <option value="0">Never</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </Select>
            </div>
          </div>

          <Button onClick={handleSavePolicy} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Password Policy
          </Button>
        </div>
      </Card>

      {/* Login Alert Email */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-medium">Login Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Receive email alerts when someone logs in with password
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertEmail">Alert Email Address</Label>
            <Input
              id="alertEmail"
              type="email"
              placeholder="security@company.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to disable login alerts
            </p>
          </div>

          <Button onClick={handleSaveAlertEmail} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Alert Email
          </Button>
        </div>
      </Card>

      {/* Emergency Password Reset */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <Key className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-medium">Emergency Password</h3>
              <p className="text-sm text-muted-foreground">
                {hasPassword
                  ? 'Reset your emergency admin password'
                  : 'Set up an emergency admin password for backup access'}
              </p>
            </div>
          </div>

          {!showResetForm ? (
            <Button
              variant="outline"
              onClick={() => setShowResetForm(true)}
            >
              {hasPassword ? 'Reset Password' : 'Set Password'}
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Password must meet the following requirements:</p>
                <ul className="list-disc list-inside">
                  <li>At least {policy.minLength} characters</li>
                  {policy.requireUppercase && <li>At least one uppercase letter</li>}
                  {policy.requireNumber && <li>At least one number</li>}
                  {policy.requireSpecial && <li>At least one special character</li>}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleResetPassword} disabled={isResetting}>
                  {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hasPassword ? 'Update Password' : 'Set Password'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowResetForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-900">
            <strong>Note:</strong> This password is for emergency admin access only.
            Regular sign-in should use Microsoft authentication.
          </div>
        </div>
      </Card>
    </div>
  );
}
