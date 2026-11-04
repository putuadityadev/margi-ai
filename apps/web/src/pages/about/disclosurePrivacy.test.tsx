import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { i18n } from '../../lib/i18n';
import { AiDisclosurePage } from './AiDisclosurePage';
import { PrivacyPage } from '../privacy/PrivacyPage';

describe('AiDisclosurePage', () => {
  it('describes the AI that is actually used and the honesty guarantees', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(<AiDisclosurePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /AI & Technology Disclosure/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Copilot and Chat')).toBeInTheDocument();
    expect(screen.getByText(/DeepSeek V4\.1 Flash/i)).toBeInTheDocument();
    expect(screen.getByText(/Gemini Embedding 001/i)).toBeInTheDocument();
    expect(screen.getByText('No invented fallback')).toBeInTheDocument();
    expect(screen.getByText(/developed from scratch/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude by Anthropic/i)).toBeInTheDocument();
    // The retired photo analyzer must not be described any more.
    expect(screen.queryByText(/Vibe Analyst/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/BestTime/i)).not.toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render(<AiDisclosurePage />);

    expect(screen.getByText('Pengungkapan Teknologi & AI')).toBeInTheDocument();
    expect(screen.getByText('Copilot dan Chat')).toBeInTheDocument();
    expect(screen.getByText('Tanpa cadangan karangan')).toBeInTheDocument();
  });
});

describe('PrivacyPage', () => {
  it('lists the cookies that exist and what is shared', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(<PrivacyPage />);

    expect(screen.getByText('margi_sid')).toBeInTheDocument();
    expect(screen.getByText('margi_auth')).toBeInTheDocument();
    expect(screen.getByText('margi_oauth')).toBeInTheDocument();
    expect(screen.getByText(/never stored on our servers or in logs/i)).toBeInTheDocument();
    expect(screen.getByText('AI provider')).toBeInTheDocument();
    expect(screen.queryByText(/photo/i)).not.toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render(<PrivacyPage />);

    expect(screen.getByText('Kebijakan Privasi & Perlindungan Data')).toBeInTheDocument();
    expect(screen.getByText('margi_auth')).toBeInTheDocument();
    expect(screen.getByText('Penyedia AI')).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });
});
