import { type ReactNode } from 'react';
import { Card, Pill } from '../../components/ui';

export { AiDisclosurePage } from './AiDisclosurePage';
export { PrivacyPage } from '../privacy/PrivacyPage';

export function AdminLayout(): ReactNode {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-6">
      <div className="flex items-center gap-3">
        <Pill tone="dark">Admin Operations</Pill>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Operations Dashboard</h1>
      </div>
      <Card tone="white">
        <p className="text-sm text-graphite">
          Admin venue management and telemetry override panels arrive in T-064 / T-065.
        </p>
      </Card>
    </div>
  );
}
