import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AppProviders } from '../../app/providers';
import { appRoutes } from '../../app/router';
import { i18n } from '../../lib/i18n';

describe('LandingPage (T-044)', () => {
  it('renders all key sections and 4 preset cards', async () => {
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    // Hero section
    expect(
      screen.getByRole('heading', { level: 1, name: /same vibe\. without the queue\./i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/discover authentic balinese alternatives that match the visual/i),
    ).toBeInTheDocument();

    // 4 Preset cards
    expect(screen.getByText(/gates of heaven — pura lempuyang/i)).toBeInTheDocument();
    expect(screen.getByText(/floating temple — ulun danu beratan/i)).toBeInTheDocument();
    expect(screen.getByText(/emerald steps — tegallalang rice terrace/i)).toBeInTheDocument();
    expect(screen.getByText(/ocean sunset sanctuary — tanah lot/i)).toBeInTheDocument();

    // Problem in numbers (Dark Island)
    expect(
      screen.getByRole('heading', { name: /the crisis in verified numbers/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('3.5 hrs')).toBeInTheDocument();
    expect(screen.getByText('48.6%')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.4T')).toBeInTheDocument();

    // 3 Agents section
    expect(
      screen.getByRole('heading', { name: /3 specialized agents\. 1 calmer bali\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/vibe deconstructor/i)).toBeInTheDocument();
    expect(screen.getByText(/crowd telemetry & cfs/i)).toBeInTheDocument();
    expect(screen.getByText(/rerouting & msme bundler/i)).toBeInTheDocument();

    // Impact section
    expect(
      screen.getByRole('heading', { name: /moving tourists, not just budget transfers/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/micro escape \(1–3 km\)/i)).toBeInTheDocument();
    expect(screen.getByText(/regional discovery/i)).toBeInTheDocument();

    // Responsible AI
    expect(
      screen.getByRole('heading', {
        name: /engineered with reverence for bali's sacred heritage/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/privacy-first & ephemeral/i)).toBeInTheDocument();
  });

  it('clicking a preset card navigates to /app?preset={id}&run=1', async () => {
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    const lempuyangCard = screen.getByRole('button', {
      name: /gates of heaven — pura lempuyang/i,
    });
    fireEvent.click(lempuyangCard);

    // After clicking, the router navigates to /app?preset=lempuyang-morning&run=1
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app');
      expect(router.state.location.search).toBe('?preset=lempuyang-morning&run=1');
    });
  });

  it('has zero accessibility violations on the landing page', async () => {
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    const { container } = render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
