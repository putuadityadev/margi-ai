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

describe('LandingPage', () => {
  it('leads every primary CTA into the app', async () => {
    await i18n.changeLanguage('en');
    renderLanding();

    expect(
      screen.getByRole('heading', { level: 1, name: /bali, minus the queue\./i }),
    ).toBeInTheDocument();
    const start = screen.getAllByRole('link', { name: /start exploring/i });
    expect(start.length).toBeGreaterThanOrEqual(2);
    for (const link of start) expect(link).toHaveAttribute('href', '/app');
    expect(screen.getByRole('link', { name: /open app/i })).toHaveAttribute('href', '/app');
  });

  it('explains the four-step flow and what the traveller gets', async () => {
    await i18n.changeLanguage('en');
    renderLanding();

    expect(screen.getByRole('heading', { level: 2, name: /how margi works/i })).toBeInTheDocument();
    for (const step of [
      /say where you are/i,
      /pick a mood/i,
      /see what is calm/i,
      /plan and go/i,
    ]) {
      expect(screen.getByRole('heading', { level: 3, name: step })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 2, name: /what you get/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /less waiting/i })).toBeInTheDocument();
  });

  it('cites its numbers and links to the AI disclosure', async () => {
    await i18n.changeLanguage('en');
    renderLanding();

    expect(screen.getByText('7.05')).toBeInTheDocument();
    expect(screen.getByText(/sources: bps bali/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /how margi uses ai/i })).toHaveAttribute(
      'href',
      '/about/ai-disclosure',
    );
  });

  it('renders the Indonesian copy', async () => {
    await i18n.changeLanguage('id');
    renderLanding();

    expect(
      screen.getByRole('heading', { level: 1, name: /bali, tanpa antre\./i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /cara kerja margi/i }),
    ).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });

  it('has zero accessibility violations', async () => {
    await i18n.changeLanguage('en');
    const { container } = renderLanding();
    expect(await axe(container)).toHaveNoViolations();
  });
});
