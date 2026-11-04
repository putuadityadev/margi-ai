import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { i18n } from '../../lib/i18n';
import { AiDisclosurePage } from './AiDisclosurePage';
import { PrivacyPage } from '../privacy/PrivacyPage';

describe('T-054 · AiDisclosurePage', () => {
  it('renders all 3 agents and autonomous architecture details', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(<AiDisclosurePage />);

    expect(
      screen.getByRole('heading', { name: /3-Agent Autonomous Architecture/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Vibe Analyst')).toBeInTheDocument();
    expect(screen.getByText('Crowd Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Itinerary Bundler')).toBeInTheDocument();

    // AI Models & Data Sources
    expect(screen.getByText(/Claude 3.5 Sonnet/i)).toBeInTheDocument();
    expect(screen.getByText(/text-embedding-3-small/i)).toBeInTheDocument();
    expect(screen.getByText(/BestTime\.app/i)).toBeInTheDocument();

    // 3-Tier fallback
    expect(screen.getByText('LIVE:')).toBeInTheDocument();
    expect(screen.getByText('FORECAST:')).toBeInTheDocument();
    expect(screen.getByText('SIMULATION:')).toBeInTheDocument();

    // Fiscal equity boost rationale
    expect(screen.getByText(/Fiscal Equity Boost Rationale/i)).toBeInTheDocument();
    expect(screen.getByText(/Badung Regency captures 60\.5%/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders correctly in Indonesian (ID)', async () => {
    await i18n.changeLanguage('id');
    render(<AiDisclosurePage />);

    expect(screen.getByText('Pengungkapan Teknologi & AI')).toBeInTheDocument();
    expect(screen.getByText('Analis Vibe')).toBeInTheDocument();
    expect(screen.getByText('Prakiraan Kepadatan')).toBeInTheDocument();
    expect(screen.getByText('Perumus Itinerary')).toBeInTheDocument();
    expect(screen.getByText(/Landasan Etika Fiscal Equity Boost/i)).toBeInTheDocument();
  });
});

describe('T-054 · PrivacyPage', () => {
  it('lists all 3 API cookies and data protection policies', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(<PrivacyPage />);

    // Check all 3 cookies
    expect(screen.getByText('margi_sid')).toBeInTheDocument();
    expect(screen.getByText('margi_at')).toBeInTheDocument();
    expect(screen.getByText('margi_rt')).toBeInTheDocument();

    // Guest photo discard guarantee
    expect(screen.getByText(/Guest Analyses/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ephemeral server memory and discarded immediately/i),
    ).toBeInTheDocument();

    // Authenticated photo privacy
    expect(screen.getByText(/Authenticated Users/i)).toBeInTheDocument();
    expect(
      screen.getByText(/encrypted at rest solely to display your private trip history/i),
    ).toBeInTheDocument();

    // Geolocation client-side guarantee
    expect(screen.getByText(/Geolocation & GPS Data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/raw GPS coordinates are never stored in server logs/i),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders Indonesian translation with cookie explanations', async () => {
    await i18n.changeLanguage('id');
    render(<PrivacyPage />);

    expect(screen.getByText('Kebijakan Privasi & Perlindungan Data')).toBeInTheDocument();
    expect(screen.getByText('margi_sid')).toBeInTheDocument();
    expect(screen.getByText('margi_at')).toBeInTheDocument();
    expect(screen.getByText('margi_rt')).toBeInTheDocument();
    expect(screen.getByText(/Pengguna Tamu \(Guest\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Lokasi Geografis \(GPS\)/i)).toBeInTheDocument();
  });
});
