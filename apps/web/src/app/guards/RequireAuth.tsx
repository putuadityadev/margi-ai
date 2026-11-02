import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useMe } from '../../features/auth/useMe';

export function RequireAuth(): ReactNode {
  const { isAuthenticated, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-graphite animate-pulse">
          Authenticating...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
