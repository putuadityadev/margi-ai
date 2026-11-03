import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './providers';
import { appRoutes } from './router';
import { i18n } from '../lib/i18n';

describe('App Router and Shell', () => {
  it('renders the full-screen landing page on /', async () => {
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    expect(screen.getByRole('link', { name: 'MARGI home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open app/i })).toHaveAttribute('href', '/app');
    expect(
      screen.getByRole('heading', { level: 1, name: /bali, minus the queue\./i }),
    ).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: /privacy/i })).toBeInTheDocument();
  });

  it('opens the explore onboarding on /app', async () => {
    window.localStorage.clear();
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { level: 1, name: /bali is busy/i }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('keeps the photo analyzer reachable on /app/photo', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app/photo'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { level: 1, name: /check crowd & find calmer spots/i }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders NotFoundPage on unknown routes', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/unknown-random-route'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    });
  });

  it('switches languages between EN and ID and updates html lang attribute', async () => {
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    expect(document.documentElement.lang).toBe('en');
    fireEvent.click(screen.getByRole('button', { name: /switch language/i }));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('id');
      expect(
        screen.getByRole('heading', { level: 1, name: /bali, tanpa antre\./i }),
      ).toBeInTheDocument();
    });
  });
});
