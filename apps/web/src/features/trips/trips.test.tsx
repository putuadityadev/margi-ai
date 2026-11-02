import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'vitest-axe';
import { i18n } from '../../lib/i18n';
import { server } from '../../mocks/node';
import { mockDb } from '../../mocks/db';
import { buildAnalysisResult } from '../../mocks/pipeline/buildResult';
import { SaveTripButton } from './SaveTripButton';
import { HistoryPage, TripsPage, TripDetailPage } from '../../pages/me/MePages';
import { queryKeys } from '../../lib/queryKeys';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockDb.reset();
});
afterAll(() => server.close());

function renderWithClient(
  ui: React.ReactElement,
  initialRoute = '/',
  customClient?: QueryClient,
) {
  const queryClient =
    customClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('T-061 · Trips, History, and Save Trip Flow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('SaveTripButton & Dialogs', () => {
    it('prompts guest user with LoginDialog when not authenticated', async () => {
      mockDb.currentUserId = null;

      const { container } = renderWithClient(
        <SaveTripButton
          analysisId="0192e2b0-8c20-7193-8db6-8d5ec4f0f001"
          venueId="0192e2b0-8c20-7193-8db6-8d5ec4f0f002"
          venueName="Taman Ujung Water Palace"
        />,
      );

      fireEvent.click(screen.getByTestId('save-trip-button'));

      expect(screen.getByText('Sign in to save your trip')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('shows verification alert for unverified signed-in user', async () => {
      // Sign in unverified user
      const unverified = mockDb.getUserByEmail('unverified@margi.test');
      if (unverified) mockDb.currentUserId = unverified.id;

      const qc = new QueryClient();
      qc.setQueryData(queryKeys.auth.me, unverified);

      renderWithClient(
        <SaveTripButton
          analysisId="0192e2b0-8c20-7193-8db6-8d5ec4f0f001"
          venueId="0192e2b0-8c20-7193-8db6-8d5ec4f0f012"
          venueName="Taman Ujung Water Palace"
        />,
        '/',
        qc,
      );

      fireEvent.click(screen.getByTestId('save-trip-button'));

      await waitFor(() => {
        expect(screen.getByText(/please verify your email/i)).toBeInTheDocument();
      });
    });

    it('opens SaveTripDialog and creates a new trip for verified user', async () => {
      const demo = mockDb.getUserByEmail('demo@margi.test');
      if (demo) mockDb.currentUserId = demo.id;

      const qc = new QueryClient();
      qc.setQueryData(queryKeys.auth.me, demo);

      const handleSaved = vi.fn();

      const { container } = renderWithClient(
        <SaveTripButton
          analysisId="0192e2b0-8c20-7193-8db6-8d5ec4f0f001"
          venueId="0192e2b0-8c20-7193-8db6-8d5ec4f0f012"
          venueName="Taman Ujung Water Palace"
          msmeVenueIds={['0192e2b0-8c20-7193-8db6-8d5ec4f0f004']}
          msmeNames={['Warung Babi Guling Ibu Oka']}
          onSaved={handleSaved}
        />,
        '/',
        qc,
      );

      fireEvent.click(screen.getByTestId('save-trip-button'));

      await waitFor(() => {
        expect(screen.getByText('Save Trip to Your Account')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Trip to Taman Ujung Water Palace')).toBeInTheDocument();
      expect(screen.getByText('Warung Babi Guling Ibu Oka')).toBeInTheDocument();

      fireEvent.submit(screen.getByLabelText(/trip title/i).closest('form')!);

      await waitFor(() => {
        expect(handleSaved).toHaveBeenCalledTimes(1);
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('HistoryPage (/me/history)', () => {
    it('renders empty history state when no analyses exist', async () => {
      const demo = mockDb.getUserByEmail('demo@margi.test');
      if (demo) mockDb.currentUserId = demo.id;

      const { container } = renderWithClient(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/no analysis history yet/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders saved analyses and deletes an item', async () => {
      const demo = mockDb.getUserByEmail('demo@margi.test');
      if (demo) mockDb.currentUserId = demo.id;

      // Seed an analysis owned by demo user
      const analysis = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-morning',
          arrivalAt: '2026-08-15T09:00:00.000Z',
          locale: 'en',
        },
        analysisId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f001',
      });
      mockDb.saveAnalysis(analysis);

      renderWithClient(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Pura Penataran Agung Lempuyang')).toBeInTheDocument();
      });

      // Click delete button
      fireEvent.click(screen.getByRole('button', { name: /delete analysis/i }));

      expect(screen.getByText('Delete Analysis Record?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));

      await waitFor(() => {
        expect(screen.getByText(/no analysis history yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('TripsPage & TripDetailPage (/me/trips)', () => {
    it('renders saved trip cards and navigates to details', async () => {
      const demo = mockDb.getUserByEmail('demo@margi.test');
      if (demo) mockDb.currentUserId = demo.id;

      const { container } = renderWithClient(<TripsPage />);

      await waitFor(() => {
        expect(screen.getByText('Morning Escape to Taman Ujung')).toBeInTheDocument();
      });

      expect(screen.getByText(/1 Linked Local MSMEs/i)).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders TripDetailPage with Google Maps navigation links and editable notes', async () => {
      const demo = mockDb.getUserByEmail('demo@margi.test');
      if (demo) mockDb.currentUserId = demo.id;

      const { container } = renderWithClient(
        <Routes>
          <Route path="/me/trips/:id" element={<TripDetailPage />} />
        </Routes>,
        '/me/trips/0192e2b0-trip-7000-8000-000000000001',
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Morning Escape to Taman Ujung' })).toBeInTheDocument();
      });

      // Verify Google Maps links
      const mapsLink = screen.getByRole('link', { name: /open in google maps/i });
      expect(mapsLink).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir'));

      // Edit notes
      fireEvent.click(screen.getByRole('button', { name: /edit notes/i }));

      const noteTextarea = screen.getByLabelText(/personal notes/i);
      fireEvent.change(noteTextarea, {
        target: { value: 'Updated note: Go early for the lotus pond reflection.' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/Updated note: Go early for the lotus pond reflection/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
