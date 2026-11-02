import { type ReactNode } from 'react';
import { Card, Pill } from '../../components/ui';

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

export function AiDisclosurePage(): ReactNode {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-6">
      <div className="space-y-2">
        <Pill tone="parchment">Transparency</Pill>
        <h1 className="text-display tracking-tight text-ink">Ethical AI Disclosure</h1>
      </div>
      <Card tone="parchment" className="space-y-4">
        <h2 className="text-xl font-medium text-ink">Autonomous Agent Architecture</h2>
        <p className="text-sm text-graphite leading-relaxed">
          MARGI AI strictly enforces responsible tourism principles by dispersing crowds while
          preserving the aesthetic and cultural vibe of your chosen Bali destination.
        </p>
      </Card>
    </div>
  );
}

export function PrivacyPage(): ReactNode {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-6">
      <div className="space-y-2">
        <Pill tone="outline">Data Privacy</Pill>
        <h1 className="text-display tracking-tight text-ink">Privacy Policy</h1>
      </div>
      <Card tone="white" className="space-y-4">
        <p className="text-sm text-graphite leading-relaxed">
          Your location data never leaves your browser without explicit intent. Image uploads are
          sanitized on-device with EXIF metadata stripped prior to analysis.
        </p>
      </Card>
    </div>
  );
}
