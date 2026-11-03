import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AppProviders } from '../../app/providers';
import { appRoutes } from '../../app/router';
import { i18n } from '../../lib/i18n';

describe('LandingPage (Seamless Mobile-First Entry)', () => {
  it('renders seamless photo upload dropzone and 4 quick sample spots without clutter', async () => {
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
      screen.getByText(/upload a photo of the bali spot you want to visit/i),
    ).toBeInTheDocument();

    // Direct upload dropzone embedded right on the entry screen
    expect(
      screen.getByRole('button', { name: /upload a destination photo/i }),
    ).toBeInTheDocument();

    // 4 quick sample destination cards
    expect(screen.getByText(/gates of heaven — pura lempuyang/i)).toBeInTheDocument();
    expect(screen.getByText(/floating temple — ulun danu beratan/i)).toBeInTheDocument();
    expect(screen.getByText(/emerald steps — tegallalang rice terrace/i)).toBeInTheDocument();
    expect(screen.getByText(/ocean sunset sanctuary — tanah lot/i)).toBeInTheDocument();
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
    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/app');
        expect(router.state.location.search).toBe('?preset=lempuyang-morning&run=1');
      },
      { timeout: 3000 },
    );
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
