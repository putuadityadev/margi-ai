import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './providers';
import { appRoutes } from './router';

describe('appRoutes', () => {
  it('renders the MARGI AI landing placeholder on /', () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    expect(
      screen.getByRole('heading', { name: /vibe-preserving crowd dispersion for bali/i }),
    ).toBeInTheDocument();
  });

  it('renders the * not-found placeholder instead of a blank page on unknown routes', () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app/unknown-route'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to home/i })).toHaveAttribute('href', '/');
  });
});
