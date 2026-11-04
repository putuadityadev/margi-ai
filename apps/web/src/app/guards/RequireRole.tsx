import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router';
import { useMe } from '../../features/auth/useMe';
import { Button, Card, Pill } from '../../components/ui';

export interface RequireRoleProps {
  role: 'ADMIN' | 'USER';
}

export function RequireRole({ role }: RequireRoleProps): ReactNode {
  const { user, isAuthenticated, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-graphite animate-pulse">
          Checking permissions...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (role === 'ADMIN' && user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <Card tone="white" className="p-8 space-y-4 border border-ash">
          <Pill tone="dark">Access Restricted</Pill>
          <h1 className="text-xl font-medium tracking-tight text-ink">Admin Access Required</h1>
          <p className="text-xs text-graphite leading-relaxed">
            Your current account does not have permission to access administration consoles. Please
            sign in with an administrator account to continue.
          </p>
          <div className="pt-2">
            <Link to="/app">
              <Button variant="primary" size="sm">
                Back to Analyzer
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}
