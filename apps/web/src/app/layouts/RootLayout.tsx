import { useState, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Pill, ToastRegion, type ToastItem } from '../../components/ui';
import { MobileBottomNav } from '../../components/navigation/MobileBottomNav';
import { useMe } from '../../features/auth/useMe';
import { apiClient } from '../../lib/apiClient';
import { Film } from 'lucide-react';

export function RootLayout(): ReactNode {
  const { t, i18n } = useTranslation();
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

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink antialiased">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-none focus:bg-lime focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-ink focus:outline-none"
      >
        {t('nav.skipToContent')}
      </a>

      {/* Unverified Email Alert Banner */}
      {user && !user.emailVerified && (
        <aside
          role="region"
          aria-label="Email Verification Notice"
          className="bg-parchment border-b border-ash px-4 py-2 text-xs text-ink"
        >
          <div className="mx-auto max-w-3xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pill tone="sim">{currentLang === 'id' ? 'Verifikasi' : 'Notice'}</Pill>
              <span>
                {currentLang === 'id'
                  ? 'Verifikasi email Anda untuk menyimpan rencana perjalanan.'
                  : 'Verify your email address to save trip plans.'}
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
                  ? 'Kirim ulang tautan'
                  : 'Resend link'}
            </button>
          </div>
        </aside>
      )}

      {/* Minimal Mobile-First Header */}
      <header className="sticky top-0 z-40 border-b border-ash/60 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="h-2 w-2 rounded-none bg-lime border border-ink shrink-0" />
              <span className="text-lg font-medium tracking-tight text-ink group-hover:text-graphite transition">
                {t('brandName')}
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-4 text-xs font-medium">
              <Link to="/app" className="text-graphite hover:text-ink transition">
                {currentLang === 'id' ? 'Rute AI' : 'AI Route'}
              </Link>
              <Link
                to="/feed"
                className="inline-flex items-center gap-1.5 text-graphite hover:text-ink transition"
              >
                <Film className="w-3.5 h-3.5 text-stone" />
                <span>Reels</span>
                <span className="bg-lime text-ink text-[9px] px-1 font-mono">NEW</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={`Switch language to ${currentLang === 'en' ? 'Indonesian' : 'English'}`}
              className="rounded-none border border-ash px-2.5 py-1 text-xs font-medium text-graphite hover:text-ink hover:bg-parchment transition cursor-pointer"
            >
              <span className={currentLang === 'en' ? 'text-ink font-medium' : 'text-stone'}>
                EN
              </span>
              <span className="mx-1 text-stone">|</span>
              <span className={currentLang === 'id' ? 'text-ink font-medium' : 'text-stone'}>
                ID
              </span>
            </button>

            {/* User Account / Sign In */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className="rounded-none border border-ash bg-parchment px-3 py-1.5 text-xs font-medium text-ink hover:bg-ash transition flex items-center gap-2 cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-none bg-lime border border-ink/40" />
                  <span className="max-w-24 truncate">{user.name || user.email.split('@')[0]}</span>
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 rounded-none border border-ash bg-white py-2 text-xs text-ink z-50 divide-y divide-ash/60"
                  >
                    <div className="px-4 py-2">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-[11px] text-graphite truncate">{user.email}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/me/trips"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-parchment text-graphite hover:text-ink transition"
                      >
                        {currentLang === 'id' ? 'Perjalanan Tersimpan' : 'Saved Trips'}
                      </Link>
                      <Link
                        to="/me/history"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-parchment text-graphite hover:text-ink transition"
                      >
                        {currentLang === 'id' ? 'Riwayat Foto' : 'Photo History'}
                      </Link>
                      {user.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 hover:bg-parchment text-graphite hover:text-ink transition font-medium"
                        >
                          {currentLang === 'id' ? 'Panel Pengelola' : 'Admin Panel'}
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
                            currentLang === 'id' ? 'Berhasil keluar.' : 'Signed out.',
                            'default',
                          );
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-parchment text-ink transition cursor-pointer"
                      >
                        {currentLang === 'id' ? 'Keluar' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-none px-3 py-1.5 text-xs font-medium text-ink hover:bg-parchment transition"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>

      {/* Clean Minimal Footer (hidden on mobile, replaced by MobileBottomNav) */}
      <footer className="hidden sm:block border-t border-ash/60 bg-parchment/60 text-graphite py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-center sm:text-left">
            <span className="font-medium text-ink">{t('brandName')}</span>
            <span className="mx-2 text-ash">·</span>
            <span>{t('footer.tagline')}</span>
          </div>

          <nav aria-label="Footer Navigation" className="flex items-center gap-5">
            <Link to="/app" className="hover:text-ink transition">
              {t('nav.analyzer')}
            </Link>
            <Link to="/privacy" className="hover:text-ink transition">
              {t('footer.privacy')}
            </Link>
            <Link to="/about/ai-disclosure" className="hover:text-ink transition">
              {t('footer.disclosure')}
            </Link>
          </nav>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Toast Notifications Region */}
      <ToastRegion
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
}
