import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">PayLog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Invoice Management System
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
