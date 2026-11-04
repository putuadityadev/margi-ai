import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'vitest-axe';
import { i18n } from '../../lib/i18n';
import { server } from '../../mocks/node';
import { mockDb } from '../../mocks/db';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockDb.reset();
});
afterAll(() => server.close());

function renderWithClient(ui: React.ReactElement, initialRoute = '/') {
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

describe('T-059 · Authentication Pages', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('LoginPage', () => {
    it('renders login form and inputs correctly', async () => {
      const { container } = renderWithClient(<LoginPage />);

      expect(screen.getByRole('heading', { name: /sign in to margi ai/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^continue$/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('shows error on invalid credentials', async () => {
      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'demo@margi.test' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'WrongPassword' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('successfully signs in demo user and handles redirect', async () => {
      renderWithClient(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div>Analyzer App Loaded</div>} />
        </Routes>,
        '/login',
      );

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'demo@margi.test' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'Password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

      await waitFor(() => {
        expect(screen.getByText('Analyzer App Loaded')).toBeInTheDocument();
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders registration form', async () => {
      const { container } = renderWithClient(<RegisterPage />);

      expect(screen.getByRole('heading', { name: /create margi ai account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('prevents registering an existing email', async () => {
      renderWithClient(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Demo Duplicate' },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'demo@margi.test' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'Password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/an account with this email address already exists/i),
        ).toBeInTheDocument();
      });
    });

    it('successfully registers a new account', async () => {
      renderWithClient(
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<div>Welcome to Margi AI</div>} />
        </Routes>,
        '/register',
      );

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Ketut New User' },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'ketut@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'BaliSunset123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Welcome to Margi AI')).toBeInTheDocument();
      });
    });
  });
});
