import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'vitest-axe';
import { i18n } from '../../lib/i18n';
import { server } from '../../mocks/node';
import { mockDb } from '../../mocks/db';
import {
  AdminLayout,
  AdminVenuesPage,
  AdminForecastPage,
  AdminPresetsPage,
  AdminEtiquettePage,
  AdminCorridorsPage,
  AdminStatsPage,
} from './index';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockDb.reset();
});
afterAll(() => server.close());

function renderAdminView(ui: React.ReactElement, initialRoute = '/admin') {
  const queryClient = new QueryClient({
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

describe('T-064 & T-065 · MARGI Curator Console & Admin UI', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    const adminUser = mockDb.users.find((u) => u.role === 'ADMIN');
    if (adminUser) {
      mockDb.currentUserId = adminUser.id;
    }
  });

  describe('AdminLayout & Global Operations', () => {
    it('renders admin navigation tabs and role badge', () => {
      const { container } = renderAdminView(<AdminLayout />);

      expect(screen.getByText('MARGI Curator Console')).toBeInTheDocument();
      expect(screen.getByText('Role: ADMIN')).toBeInTheDocument();
      expect(screen.getByText('Venues & Vibe')).toBeInTheDocument();
      expect(screen.getByText('Crowd Forecast')).toBeInTheDocument();
      expect(screen.getByText('Presets')).toBeInTheDocument();
      expect(screen.getByText('Etiquette Rules')).toBeInTheDocument();
      expect(screen.getByText('Corridors')).toBeInTheDocument();
      expect(screen.getByText('System Telemetry')).toBeInTheDocument();
      expect(screen.getByText('Re-embed All Vectors', { exact: false })).toBeInTheDocument();
    });

    it('triggers global background re-embedding and polls job status', async () => {
      renderAdminView(<AdminLayout />);

      const reembedBtn = screen.getByText('Re-embed All Vectors', { exact: false });
      fireEvent.click(reembedBtn);

      await waitFor(() => {
        expect(screen.getByText(/Re-embedding|Memproses/i)).toBeInTheDocument();
      });
    });
  });

  describe('AdminVenuesPage (T-064 Flow D)', () => {
    it('renders venue list with filter and search capabilities', async () => {
      renderAdminView(<AdminVenuesPage />);

      await waitFor(() => {
        expect(screen.getByText('Pura Penataran Agung Lempuyang')).toBeInTheDocument();
      });

      // Filter by search
      const searchInput = screen.getByPlaceholderText('Search by venue name or slug...');
      fireEvent.change(searchInput, { target: { value: 'Tanah Lot' } });

      await waitFor(() => {
        expect(screen.getByText('Pura Tanah Lot')).toBeInTheDocument();
        expect(screen.queryByText('Pura Penataran Agung Lempuyang')).not.toBeInTheDocument();
      });
    });

    it('opens Add Venue modal and creates a new MSME venue', async () => {
      renderAdminView(<AdminVenuesPage />);

      const addBtn = screen.getByTestId('add-venue-button');
      fireEvent.click(addBtn);

      expect(screen.getByText('Add New Venue')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'warung-kopi-kintamani' } });
      fireEvent.change(screen.getByLabelText('Name (EN)'), { target: { value: 'Warung Kopi Kintamani' } });
      fireEvent.change(screen.getByLabelText('Name (ID)'), { target: { value: 'Warung Kopi Kintamani' } });
      fireEvent.change(screen.getByLabelText('Description (EN)'), { target: { value: 'Authentic Arabica highland coffee' } });
      fireEvent.change(screen.getByLabelText('Description (ID)'), { target: { value: 'Kopi Arabika asli pegunungan' } });
      fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-8.245' } });
      fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '115.334' } });
      fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: '/venues/kintamani-coffee.webp' } });

      const submitBtn = screen.getByText('Save Venue');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByText('Add New Venue')).not.toBeInTheDocument();
      });
    });

    it('opens Vibe Studio, extracts AI vision profile, and saves embedding vector', async () => {
      renderAdminView(<AdminVenuesPage />);

      await waitFor(() => {
        expect(screen.getByText('Pura Penataran Agung Lempuyang')).toBeInTheDocument();
      });

      const vibeBtns = screen.getAllByTestId('open-vibe-button');
      const firstBtn = vibeBtns[0];
      if (!firstBtn) throw new Error('No vibe button found');
      fireEvent.click(firstBtn);

      expect(screen.getByText('Agent 1 Vibe Studio')).toBeInTheDocument();

      const extractBtn = screen.getByTestId('generate-vibe-button');
      fireEvent.click(extractBtn);

      await waitFor(() => {
        expect(screen.getByText(/5 Vibe Dimensions/i)).toBeInTheDocument();
      });

      // Save & Re-embed
      const saveEmbedBtn = screen.getByTestId('save-embed-button');
      fireEvent.click(saveEmbedBtn);

      await waitFor(() => {
        expect(screen.getByText(/Vector embedding created and persisted/i)).toBeInTheDocument();
      });
    });
  });

  describe('AdminForecastPage (T-064 Crowd Forecast)', () => {
    it('renders 7x24 heatmap matrix for selected venue and allows editing cells', async () => {
      renderAdminView(<AdminForecastPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading matrix/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });

      // Find an hourly cell input
      const cellInputs = screen.getAllByRole('spinbutton');
      expect(cellInputs.length).toBeGreaterThan(0);
      const firstCell = cellInputs[0];
      if (!firstCell) throw new Error('No cell input found');

      fireEvent.change(firstCell, { target: { value: '85' } });
      expect(firstCell).toHaveValue(85);

      // Save forecast changes
      const saveBtn = screen.getByTestId('save-forecast-button');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Prakiraan berhasil diperbarui|Forecast saved/i)).toBeInTheDocument();
      });
    });

    it('opens CSV import dialog and validates headers', async () => {
      renderAdminView(<AdminForecastPage />);

      const importBtn = screen.getByTestId('open-csv-button');
      fireEvent.click(importBtn);

      expect(screen.getByText('Import Crowd Curve from CSV')).toBeInTheDocument();

      const textarea = screen.getByLabelText(/CSV Content/i);
      fireEvent.change(textarea, {
        target: {
          value: 'day,hour,busyness\n0,8,25\n0,9,40\n0,10,75\n0,11,90',
        },
      });

      const uploadBtn = screen.getByTestId('submit-csv-button');
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        expect(screen.getByText(/imported 4/i)).toBeInTheDocument();
      });
    });
  });

  describe('AdminPresetsPage (T-065)', () => {
    it('renders presets and supports adding a new preset', async () => {
      renderAdminView(<AdminPresetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Gates of Heaven — Pura Lempuyang')).toBeInTheDocument();
      });

      const addBtn = screen.getByTestId('add-preset-button');
      fireEvent.click(addBtn);

      fireEvent.change(screen.getByLabelText('Preset Slug ID'), { target: { value: 'jatiluwih-mist' } });
      fireEvent.change(screen.getByLabelText('Title (EN)'), { target: { value: 'Jatiluwih Mist' } });
      fireEvent.change(screen.getByLabelText('Title (ID)'), { target: { value: 'Kabut Jatiluwih' } });
      fireEvent.change(screen.getByLabelText('Cover Image URL'), { target: { value: '/presets/jatiluwih.webp' } });

      const saveBtn = screen.getByText('Save Preset');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByText('Add Curated Preset')).not.toBeInTheDocument();
      });
    });
  });

  describe('AdminEtiquettePage (T-065)', () => {
    it('renders cultural etiquette rules and supports adding a new rule', async () => {
      renderAdminView(<AdminEtiquettePage />);

      await waitFor(() => {
        expect(screen.getByText(/Wear a kamen \(sarong\)/i)).toBeInTheDocument();
      });

      const addBtn = screen.getByTestId('add-rule-button');
      fireEvent.click(addBtn);

      fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'NATURE' } });
      fireEvent.change(screen.getByLabelText('Rule Text (EN)'), { target: { value: 'Do not litter sacred holy spring waters.' } });
      fireEvent.change(screen.getByLabelText('Rule Text (ID)'), { target: { value: 'Dilarang membuang sampah di area sumber air suci.' } });

      const saveBtn = screen.getByText('Save Rule');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByText('Add Etiquette Rule')).not.toBeInTheDocument();
      });
    });
  });

  describe('AdminCorridorsPage (T-065)', () => {
    it('renders traffic congestion corridors and supports adding a new corridor', async () => {
      renderAdminView(<AdminCorridorsPage />);

      await waitFor(() => {
        expect(screen.getByText('Canggu Coastal Shortcut')).toBeInTheDocument();
      });

      const addBtn = screen.getByTestId('add-corridor-button');
      fireEvent.click(addBtn);

      fireEvent.change(screen.getByLabelText('ID Slug'), { target: { value: 'ubud-monkey-forest' } });
      fireEvent.change(screen.getByLabelText('Corridor Name'), { target: { value: 'Ubud Monkey Forest Rd' } });
      fireEvent.change(screen.getByLabelText('Center Latitude'), { target: { value: '-8.519' } });
      fireEvent.change(screen.getByLabelText('Center Longitude'), { target: { value: '115.26' } });
      fireEvent.change(screen.getByLabelText('Radius (Meters)'), { target: { value: '2500' } });
      fireEvent.change(screen.getByLabelText('Typical Delay (Min)'), { target: { value: '20' } });

      const saveBtn = screen.getByText('Save Corridor');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByText('Add Congestion Corridor')).not.toBeInTheDocument();
      });
    });
  });

  describe('AdminStatsPage (T-065)', () => {
    it('renders telemetry KPI metrics, analysis charts, and diversion stats', async () => {
      renderAdminView(<AdminStatsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('kpi-total-analyses')).toHaveTextContent('1064');
        expect(screen.getByTestId('kpi-latency')).toHaveTextContent('4.2s / 7.8s');
        expect(screen.getByTestId('kpi-fallback')).toHaveTextContent('4.0%');
        expect(screen.getByTestId('kpi-nav-clicks')).toHaveTextContent('576');
      });

      expect(screen.getByText('Top Recommended Destinations')).toBeInTheDocument();
      expect(screen.getByText('Taman Ujung Sukasada')).toBeInTheDocument();
    });
  });

  describe('Accessibility compliance', () => {
    it('has zero vitest-axe violations across AdminLayout', async () => {
      const { container } = renderAdminView(<AdminLayout />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has zero vitest-axe violations across AdminStatsPage', async () => {
      const { container } = renderAdminView(<AdminStatsPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
