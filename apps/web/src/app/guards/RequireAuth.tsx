import { type ReactNode } from 'react';
import { Outlet } from 'react-router';

export function RequireAuth(): ReactNode {
  // Stubbed for Stage 3 prototype — real session authentication lands in T-059
  return <Outlet />;
}
