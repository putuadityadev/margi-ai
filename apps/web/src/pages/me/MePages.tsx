import { type ReactNode } from 'react';
import { Card, Pill } from '../../components/ui';

export function HistoryPage(): ReactNode {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
      <div className="flex items-center gap-3">
        <Pill tone="default">User Profile</Pill>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Analysis History</h1>
      </div>
      <Card tone="parchment">
        <p className="text-sm text-graphite">Saved analysis history arrives in T-061.</p>
      </Card>
    </div>
  );
}

export function TripsPage(): ReactNode {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
      <div className="flex items-center gap-3">
        <Pill tone="default">Trips</Pill>
        <h1 className="text-2xl font-medium tracking-tight text-ink">My Saved Trips</h1>
      </div>
      <Card tone="parchment">
        <p className="text-sm text-graphite">Saved trips collection arrives in T-061.</p>
      </Card>
    </div>
  );
}

export function TripDetailPage(): ReactNode {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
      <h1 className="text-2xl font-medium tracking-tight text-ink">Trip Details</h1>
      <Card tone="white">
        <p className="text-sm text-graphite">Trip itinerary viewer arrives in T-061.</p>
      </Card>
    </div>
  );
}
