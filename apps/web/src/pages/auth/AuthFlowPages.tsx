import { type ReactNode } from 'react';
import { Card } from '../../components/ui';

export function ForgotPasswordPage(): ReactNode {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card tone="white">
        <h1 className="text-xl font-medium tracking-tight text-ink">Reset Password</h1>
        <p className="mt-2 text-sm text-graphite">Password reset link arrives in T-059.</p>
      </Card>
    </div>
  );
}

export function ResetPasswordPage(): ReactNode {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card tone="white">
        <h1 className="text-xl font-medium tracking-tight text-ink">Set New Password</h1>
        <p className="mt-2 text-sm text-graphite">Password reset form arrives in T-059.</p>
      </Card>
    </div>
  );
}

export function VerifyEmailPage(): ReactNode {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card tone="white">
        <h1 className="text-xl font-medium tracking-tight text-ink">Verify Your Email</h1>
        <p className="mt-2 text-sm text-graphite">Email verification status arrives in T-059.</p>
      </Card>
    </div>
  );
}

export function AuthCallbackPage(): ReactNode {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card tone="white">
        <h1 className="text-xl font-medium tracking-tight text-ink">Authenticating...</h1>
        <p className="mt-2 text-sm text-graphite">Processing SSO callback.</p>
      </Card>
    </div>
  );
}
