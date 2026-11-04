import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ReactNode } from 'react';
import { AppProviders } from '../../app/providers';
import { appRoutes } from '../../app/router';
import { i18n } from '../../lib/i18n';
import { EXPLORE_PLACES } from '../../mocks/data/places';
import { mockDb } from '../../mocks/db';
import { server } from '../../mocks/node';
import { useTripStore } from '../../stores/tripStore';

vi.mock('react-leaflet', () => {
  const map = { flyToBounds: vi.fn() };
  return {
    MapContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="map">{children}</div>
    ),
    TileLayer: () => null,
    Marker: () => null,
    Polyline: () => null,
    useMap: () => map,
  };
});

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function idOf(slug: string): string {
  const seed = EXPLORE_PLACES.find((place) => place.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed.venue.id;
}

function renderTrip() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/app/trip'] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

beforeEach(async () => {
  window.sessionStorage.clear();
  useTripStore.getState().reset();
  await i18n.changeLanguage('en');
});

describe('TripPage (D-026)', () => {
  it('asks the traveller to start from the map when no trip is open', async () => {
    renderTrip();
    expect(await screen.findByText(/start from the map/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open the map/i })).toHaveAttribute('href', '/app');
  });

  it('shows the itinerary, then applies a copilot suggestion and logs it', async () => {
    useTripStore.getState().start(
      {
        origin: { lat: -8.5069, lng: 115.2625 },
        originLabel: 'Ubud',
        departAt: '2026-11-07T09:00:00+08:00',
        stops: [{ venueId: idOf('tegallalang') }, { venueId: idOf('pura-tirta-empul') }],
      },
      'PLAN',
    );
    renderTrip();

    expect(await screen.findByText(/terraces|tegallalang/i, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/crowd exposure/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start navigation/i })).toHaveAttribute(
      'href',
      expect.stringContaining('waypoints='),
    );

    fireEvent.click(screen.getByRole('tab', { name: /ask margi/i }));
    const apply = await screen.findAllByRole('button', { name: /^apply$/i }, { timeout: 6000 });
    expect(screen.getByText(/template narrative/i)).toBeInTheDocument();
    fireEvent.click(apply[0] as HTMLElement);

    await waitFor(() => expect(useTripStore.getState().changeLog).toHaveLength(1));
    expect(screen.getAllByRole('button', { name: /^applied$/i }).length).toBeGreaterThan(0);
  }, 15000);

  it('asks a guest to sign in before saving and keeps planning open', async () => {
    mockDb.currentUserId = null;
    useTripStore.getState().start(
      {
        origin: { lat: -8.5069, lng: 115.2625 },
        originLabel: 'Ubud',
        departAt: '2026-11-07T09:00:00+08:00',
        stops: [{ venueId: idOf('pura-tirta-empul') }],
      },
      'PLAN',
    );
    renderTrip();

    const save = await screen.findByRole('button', { name: /save plan/i });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    expect(await screen.findByRole('heading', { name: /sign in to margi ai/i })).toBeInTheDocument();
    expect(useTripStore.getState().savedPlanId).toBeNull();
  }, 15000);

  it('saves the plan and lists it under saved plans', async () => {
    mockDb.currentUserId = mockDb.users[0]?.id ?? null;
    useTripStore.getState().start(
      {
        origin: { lat: -8.5069, lng: 115.2625 },
        originLabel: 'Ubud',
        departAt: '2026-11-07T09:00:00+08:00',
        stops: [{ venueId: idOf('pura-tirta-empul') }],
      },
      'PLAN',
    );
    renderTrip();

    const save = await screen.findByRole('button', { name: /save plan/i });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(useTripStore.getState().savedPlanId).not.toBeNull());

    fireEvent.click(screen.getByRole('link', { name: /saved plans/i }));
    expect(await screen.findByRole('button', { name: /open trip to/i })).toBeInTheDocument();
  }, 15000);
});
