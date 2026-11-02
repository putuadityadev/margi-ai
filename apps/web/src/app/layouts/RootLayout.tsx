import { useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Pill, ToastRegion, type ToastItem } from '../../components/ui';
import { useMe } from '../../features/auth/useMe';
import { apiClient } from '../../lib/apiClient';

export function RootLayout(): ReactNode {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useMe();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const currentLang = i18n.language.startsWith('id') ? 'id' : 'en';

  const addToast = (message: string, tone: ToastItem['tone'] = 'default'): void => {
    setToasts((prev) => [
      ...prev,
      { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, message, tone },
    ]);
  };

  const toggleLanguage = (): void => {
    const nextLang = currentLang === 'en' ? 'id' : 'en';
    void i18n.changeLanguage(nextLang);
    if (user) {
      void apiClient('/me/profile', {
        method: 'PATCH',
        body: { locale: nextLang },
      }).catch(() => {
        // Silently ignore background profile sync failure
      });
    }
  };

  const handleResendVerification = async (): Promise<void> => {
    if (!user) return;
    setIsResending(true);
    try {
      await apiClient('/auth/resend-verification', {
        method: 'POST',
        body: { email: user.email },
      });
      addToast(
        currentLang === 'id'
          ? 'Tautan verifikasi baru telah dikirimkan ke email Anda.'
          : 'A new verification link has been sent to your email.',
        'default',
      );
    } catch {
      addToast(
        currentLang === 'id'
          ? 'Gagal mengirim ulang email verifikasi.'
          : 'Failed to resend verification email.',
        'sim',
      );
    } finally {
      setIsResending(false);
    }
  };

  const isAnalyzerRoute = location.pathname.startsWith('/app');

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink antialiased">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-pill focus:bg-lime focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-ink focus:outline-none"
      >
        {t('nav.skipToContent')}
      </a>

      {/* Unverified Email Alert Banner (T-059) */}
      {user && !user.emailVerified && (
        <aside
          role="region"
          aria-label="Email Verification Notice"
          className="bg-parchment border-b border-ash px-6 py-2.5 text-xs text-ink"
        >
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pill tone="sim">{currentLang === 'id' ? 'Verifikasi' : 'Notice'}</Pill>
              <span>
                {currentLang === 'id'
                  ? 'Harap verifikasi alamat email Anda untuk mengaktifkan penyimpanan rute perjalanan.'
                  : 'Please verify your email address to unlock trip saving.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="font-medium underline hover:text-stone cursor-pointer transition text-xs"
            >
              {isResending
                ? currentLang === 'id'
                  ? 'Mengirim...'
                  : 'Sending...'
                : currentLang === 'id'
                  ? 'Kirim ulang email verifikasi'
                  : 'Resend verification link'}
            </button>
          </div>
        </aside>
      )}

      {/* Global Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-ash/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Brand Wordmark */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl font-medium tracking-tight text-ink group-hover:text-graphite transition">
              {t('brandName')}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            <Link
              to="/#how-it-works"
              className="text-sm font-medium text-graphite hover:text-ink transition"
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              to="/app"
              className={`text-sm font-medium transition ${
                isAnalyzerRoute
                  ? 'text-ink underline underline-offset-4'
                  : 'text-graphite hover:text-ink'
              }`}
            >
              {t('nav.analyzer')}
            </Link>
            <Link
              to="/about/ai-disclosure"
              className="text-sm font-medium text-graphite hover:text-ink transition"
            >
              {t('nav.disclosure')}
            </Link>
          </nav>

          {/* Actions & Language Switcher */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={`Switch language to ${currentLang === 'en' ? 'Indonesian' : 'English'}`}
              className="rounded-pill border border-ash px-2.5 py-1 text-xs font-medium text-graphite hover:text-ink hover:bg-parchment transition cursor-pointer"
            >
              <span className={currentLang === 'en' ? 'text-ink font-medium' : 'text-stone'}>
                EN
              </span>
              <span className="mx-1 text-stone">|</span>
              <span className={currentLang === 'id' ? 'text-ink font-medium' : 'text-stone'}>
                ID
              </span>
            </button>

            {/* Authenticated user menu vs Guest Sign in */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className="rounded-pill border border-ash bg-parchment px-3 py-1.5 text-xs font-medium text-ink hover:bg-ash transition flex items-center gap-2 cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-lime" />
                  <span>{user.name || user.email.split('@')[0]}</span>
                  <span aria-hidden="true" className="text-[10px] text-stone">
                    ▼
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 rounded-card border border-ash bg-white py-2 text-xs text-ink z-50 divide-y divide-ash/60"
                  >
                    <div className="px-4 py-2">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-[11px] text-graphite truncate">{user.email}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/me/history"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-parchment text-graphite hover:text-ink transition"
                      >
                        {currentLang === 'id' ? 'Riwayat & Perjalanan' : 'History & Trips'}
                      </Link>
                      {user.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 hover:bg-parchment text-graphite hover:text-ink transition font-medium"
                        >
                          {currentLang === 'id' ? 'Konsol Admin' : 'Admin Operations'}
                        </Link>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logout();
                          addToast(
                            currentLang === 'id' ? 'Berhasil keluar.' : 'Signed out successfully.',
                            'default',
                          );
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-700 transition cursor-pointer"
                      >
                        {currentLang === 'id' ? 'Keluar' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  {t('nav.signIn')}
                </Button>
              </Link>
            )}

            {/* Primary Lime CTA (singular lime action in header) */}
            <Link to="/app">
              <Button variant="primary" size="sm">
                {t('nav.tryAnalyzer')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Global Dark Island Footer */}
      <footer className="border-t border-charcoal bg-ink text-parchment py-12 px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="space-y-3 max-w-md">
              <div className="text-xl font-medium tracking-tight text-white">{t('brandName')}</div>
              <p className="text-sm text-ash">{t('footer.tagline')}</p>
              <div className="flex items-center gap-3 pt-2">
                <Pill tone="sim">{t('footer.mockBadge')}</Pill>
                <span className="flex items-center gap-1.5 text-xs text-ash">
                  <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
                  {t('footer.statusOperational')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-12 text-xs">
              <div className="space-y-2">
                <span className="block font-medium uppercase tracking-[0.1em] text-stone">
                  Explore
                </span>
                <ul className="space-y-1.5">
                  <li>
                    <Link to="/app" className="text-ash hover:text-white transition">
                      {t('nav.analyzer')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/about/ai-disclosure"
                      className="text-ash hover:text-white transition"
                    >
                      {t('footer.disclosure')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="text-ash hover:text-white transition">
                      {t('footer.privacy')}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <span className="block font-medium uppercase tracking-[0.1em] text-stone">
                  Management
                </span>
                <ul className="space-y-1.5">
                  <li>
                    <Link to="/admin" className="text-ash hover:text-white transition">
                      {t('footer.admin')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/me/history" className="text-ash hover:text-white transition">
                      History &amp; Trips
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-charcoal pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone">
            <p>
              &copy; {new Date().getFullYear()} {t('footer.copyright')}
            </p>
            <p>Empowering local MSMEs and sustainable dispersion across Bali.</p>
          </div>
        </div>
      </footer>

      {/* Global Toast Notifications Region */}
      <ToastRegion
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
