import { type ReactNode } from 'react';
import { Outlet } from 'react-router';

export interface RequireRoleProps {
  role: 'ADMIN' | 'USER';
}

export function RequireRole({ role: _role }: RequireRoleProps): ReactNode {
  // Stubbed for Stage 3 prototype — real role check lands in T-059
  return <Outlet />;
}
