import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { axe } from 'vitest-axe';
import type { ReactNode } from 'react';
import { AppProviders } from '../../app/providers';
import { appRoutes } from '../../app/router';
import { i18n } from '../../lib/i18n';
import { server } from '../../mocks/node';
import { useExploreStore } from '../../stores/exploreStore';

// Leaflet needs real layout; the map is aria-hidden and duplicated by the panels, so stub it.
vi.mock('react-leaflet', () => {
  const map = {
    setView: vi.fn(),
    flyTo: vi.fn(),
    flyToBounds: vi.fn(),
    panInside: vi.fn(),
    getCenter: () => ({ lat: 0, lng: 0 }),
    project: () => ({ add: () => ({}) }),
    unproject: () => ({ lat: 0, lng: 0 }),
  };
  return {
    MapContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="map">{children}</div>
    ),
    TileLayer: () => null,
    Marker: () => null,
    Polyline: () => null,
    useMap: () => map,
    useMapEvents: () => map,
  };
});

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(async () => {
  window.localStorage.clear();
  useExploreStore.getState().reset();
  await i18n.changeLanguage('en');
});

function renderExplore() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });
  const view = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, ...view };
}

describe('ExplorePage (D-025)', () => {
  it('runs onboarding → manual start point → scan → browse → place detail', async () => {
    const { router } = renderExplore();

    expect(
      await screen.findByRole('heading', { level: 1, name: /bali is busy/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(await screen.findByRole('heading', { name: /where do you start/i })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Ubud' }));
    fireEvent.click(await screen.findByRole('button', { name: /start here/i }));

    expect(await screen.findByRole('heading', { name: /what mood today/i })).toBeInTheDocument();
    const temples = screen.getByRole('button', { name: /temples/i });
    fireEvent.click(temples);
    expect(temples).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /scan around me/i }));

    const list = await screen.findByRole('region', { name: /places near you/i }, { timeout: 8000 });
    const cards = within(list).getAllByRole('button', { name: /^open /i });
    expect(cards.length).toBeGreaterThan(0);

    fireEvent.click(cards[0] as HTMLElement);
    await waitFor(() => expect(router.state.location.search).toMatch(/^\?place=/));
    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /hourly crowd forecast/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
  }, 15000);

  it('rejects a GPS fix outside Bali and asks for a starting point', async () => {
    window.localStorage.setItem('margi_explore_onboarded', '1');
    useExploreStore.getState().reset();
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: -6.2, longitude: 106.8166 } } as GeolocationPosition),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    renderExplore();
    fireEvent.click(await screen.findByRole('button', { name: /use my location/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/outside bali/i);
    expect(useExploreStore.getState().origin).toBeNull();
  });

  it('has zero accessibility violations on the onboarding screen', async () => {
    const { container } = renderExplore();
    await screen.findByRole('heading', { level: 1, name: /bali is busy/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
