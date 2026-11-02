import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './providers';
import { appRoutes } from './router';
import { i18n } from '../lib/i18n';

describe('App Router and Shell', () => {
  it('renders RootLayout header and landing page on /', async () => {
    await i18n.changeLanguage('en');
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    // Header wordmark & nav
    expect(screen.getByRole('link', { name: 'MARGI AI' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main Navigation' });
    expect(within(nav).getByRole('link', { name: 'How it works' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Analyzer' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'AI Disclosure' })).toBeInTheDocument();

    // Landing content
    expect(screen.getByRole('heading', { level: 1, name: /same vibe/i })).toBeInTheDocument();

    // Footer
    expect(
      screen.getByText(/vibe-preserving crowd dispersion engine for bali/i),
    ).toBeInTheDocument();
  });

  it('navigates to /app and renders the Analyzer page lazy chunk', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /crowd & vibe analyzer/i }),
      ).toBeInTheDocument();
    });
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
    expect(screen.getByRole('heading', { level: 1, name: /same vibe/i })).toBeInTheDocument();

    // Toggle language button
    const toggleBtn = screen.getByRole('button', { name: /switch language to indonesian/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('id');
      expect(
        screen.getByRole('heading', { level: 1, name: /vibe yang sama/i }),
      ).toBeInTheDocument();
    });
  });
});
