import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AppProviders } from '../../app/providers';
import { appRoutes } from '../../app/router';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { i18n } from '../../lib/i18n';
import { MOCK_PRESETS } from '../../mocks/data/presets';

describe('Analyzer Input Panel (T-045)', () => {
  beforeEach(async () => {
    useAnalyzerStore.getState().reset();
    await i18n.changeLanguage('en');
  });

  it('renders input panel with disabled CTA when empty', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    // Initial state: CTA disabled with helper text
    await waitFor(
      () => {
        const ctaButtons = screen.getAllByRole('button', { name: /analyze vibe/i });
        expect(ctaButtons[0]).toBeDisabled();
      },
      { timeout: 3000 },
    );
    expect(
      screen.getAllByText(/upload a travel photo or select a preset to begin analysis/i)[0],
    ).toBeInTheDocument();
  });

  it('selecting a preset fills fields and enables CTA', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    // Click Lempuyang preset card
    const lempuyangCard = await screen.findByRole('button', {
      name: /gates of heaven — pura lempuyang/i,
    });
    fireEvent.click(lempuyangCard);

    // Store updated with preset values
    const state = useAnalyzerStore.getState();
    expect(state.presetId).toBe('lempuyang-morning');
    expect(state.originVenueId).toBe(MOCK_PRESETS[0]?.originVenueId);
    expect(state.arrival.hour).toBe(MOCK_PRESETS[0]?.defaultHour);

    // CTA is now enabled
    const ctaButtons = screen.getAllByRole('button', { name: /analyze vibe/i });
    expect(ctaButtons[0]).toBeEnabled();
  });

  it('simulation toggle switches state and reveals simulation banner', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    const simulationSwitch = await screen.findByRole('switch', {
      name: /judge test mode/i,
    });
    expect(simulationSwitch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(simulationSwitch);

    expect(useAnalyzerStore.getState().simulate).toBe(true);
    expect(simulationSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/simulated data — not live conditions/i)).toBeInTheDocument();
  });

  it('rejects oversized files exceeding 5 MB', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    // Switch to upload tab
    const uploadTab = await screen.findByRole('tab', { name: /upload scene photo/i });
    fireEvent.click(uploadTab);

    // Simulate oversized file (6 MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'giant.jpg', {
      type: 'image/jpeg',
    });

    const dropzoneInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(dropzoneInput).toBeInTheDocument();

    Object.defineProperty(dropzoneInput, 'files', {
      value: [largeFile],
    });
    fireEvent.change(dropzoneInput);

    await waitFor(() => {
      expect(useAnalyzerStore.getState().file).toBeNull();
    });
  });

  it('auto-runs when arriving from preset link ?preset=lempuyang-morning&run=1', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/app?preset=lempuyang-morning&run=1'],
    });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(useAnalyzerStore.getState().presetId).toBe('lempuyang-morning');
      // Status message from dispatch appears
      expect(screen.getByText(/analysis dispatched to 3-agent pipeline/i)).toBeInTheDocument();
    });

    // The 'run' parameter is stripped from the URL
    expect(router.state.location.search).not.toContain('run=1');
  });

  it('has zero accessibility violations in the analyzer panel', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/app'] });

    const { container } = render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
