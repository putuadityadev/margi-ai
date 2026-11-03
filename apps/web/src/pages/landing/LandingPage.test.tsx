import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AppProviders } from '../../app/providers';
import { appRoutes } from '../../app/router';
import { i18n } from '../../lib/i18n';

function renderLanding() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('LandingPage (D-025)', () => {
  it('leads every primary CTA into the explore flow', async () => {
    await i18n.changeLanguage('en');
    renderLanding();

    expect(
      screen.getByRole('heading', { level: 1, name: /bali, minus the queue\./i }),
    ).toBeInTheDocument();
    const goNow = screen.getAllByRole('link', { name: /go now/i });
    expect(goNow.length).toBeGreaterThanOrEqual(2);
    for (const link of goNow) expect(link).toHaveAttribute('href', '/app');
    // The photo flow has no real API yet, so its entry point is hidden (lib/features.ts).
    expect(screen.queryByRole('link', { name: /match a photo instead/i })).not.toBeInTheDocument();
  });

  it('explains the flow in three steps and cites its numbers', async () => {
    await i18n.changeLanguage('en');
    renderLanding();

    expect(
      screen.getByRole('heading', { level: 3, name: /see what is packed/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /read the hours/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /go calmer/i })).toBeInTheDocument();
    expect(screen.getByText('7.05M')).toBeInTheDocument();
    expect(screen.getByText(/sources: bps bali/i)).toBeInTheDocument();
  });

  it('renders the Indonesian copy', async () => {
    await i18n.changeLanguage('id');
    renderLanding();

    expect(
      screen.getByRole('heading', { level: 1, name: /bali, tanpa antre\./i }),
    ).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });

  it('has zero accessibility violations', async () => {
    await i18n.changeLanguage('en');
    const { container } = renderLanding();
    expect(await axe(container)).toHaveNoViolations();
  });
});
