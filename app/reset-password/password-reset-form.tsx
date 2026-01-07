'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { startPasswordReset, setEmergencyPassword } from '@/app/actions/password-reset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MicrosoftIcon } from '@/components/icons/microsoft';
import { Loader2, Check, Eye, EyeOff } from 'lucide-react';

interface PasswordResetFormProps {
  step: 'verify' | 'set-password';
  userEmail?: string;
}

export function PasswordResetForm({ step, userEmail }: PasswordResetFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password requirements
  const requirements = [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  async function handleVerifyWithMicrosoft() {
    setIsLoading(true);
    setError('');

    try {
      // Set the password reset flow cookie
      await startPasswordReset();

      // Redirect to Microsoft OAuth
      // After successful auth, user will be redirected back to this page
      await signIn('microsoft-entra-id', {
        callbackUrl: '/reset-password',
      });
    } catch (err) {
      console.error('Failed to start Microsoft auth:', err);
      setError('Failed to start verification. Please try again.');
      setIsLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const result = await setEmergencyPassword(password, confirmPassword);

    if (result.success) {
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setError(result.error || 'Failed to set password');
      setIsLoading(false);
    }
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the button below to verify your identity with Microsoft. Only super administrators
          can set an emergency password.
        </p>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        <Button
          onClick={handleVerifyWithMicrosoft}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <MicrosoftIcon className="h-4 w-4 mr-2" />
              Verify with Microsoft
            </>
          )}
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-medium">Password set successfully!</p>
        <p className="text-sm text-muted-foreground mt-1">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSetPassword} className="space-y-4">
      {/* Current user info */}
      <div className="p-3 bg-muted rounded-md text-sm">
        <p className="text-muted-foreground">
          Setting password for: <strong className="text-foreground">{userEmail}</strong>
        </p>
      </div>

      {/* New Password */}
      <div>
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Password Requirements */}
      <div className="space-y-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                req.met ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
              }`}
            >
              {req.met && <Check className="h-3 w-3" />}
            </div>
            <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {/* Confirm Password */}
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirmPassword && !passwordsMatch && (
          <p className="text-xs text-destructive mt-1">Passwords do not match</p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <Check className="h-3 w-3" /> Passwords match
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !allRequirementsMet || !passwordsMatch}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Setting Password...
          </>
        ) : (
          'Set Emergency Password'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        This password can be used for emergency login when Microsoft authentication is unavailable.
      </p>
    </form>
  );
}
