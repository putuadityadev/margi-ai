import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LogOut, Shield, User as UserIcon } from 'lucide-react';
import { AuthDialog } from '../auth/AuthDialog';
import { useMe } from '../auth/useMe';

const CHIP =
  'pointer-events-auto flex h-11 items-center justify-center border border-ink bg-white text-ink';

/**
 * Account chip for every top bar: guests get a sign-in button (opens the shared dialog), signed-in
 * users get a small menu with their plans, the curator console for admins, and sign out.
 */
export function AccountMenu(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const { user, isLoading, logout } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent): void => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setMenuOpen(false);
      } else if (!wrapper.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  if (isLoading) return <span className={`${CHIP} w-11`} aria-hidden="true" />;

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className={`${CHIP} gap-2 px-3 text-body-sm font-medium`}
        >
          <UserIcon size={15} aria-hidden="true" />
          <span className="hidden sm:inline">{isId ? 'Masuk' : 'Sign in'}</span>
        </button>
        <AuthDialog isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  const label = user.name || user.email.split('@')[0] || '';
  return (
    <div ref={wrapper} className="pointer-events-auto relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className={`${CHIP} max-w-[9rem] gap-2 px-3 text-body-sm`}
      >
        <span className="h-2.5 w-2.5 flex-none border border-ink bg-lime" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-56 border border-ink bg-white text-body-sm text-ink"
        >
          <div className="border-b border-ash px-4 py-3">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-caption text-graphite">{user.email}</p>
          </div>
          {user.role === 'ADMIN' && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 hover:bg-parchment"
            >
              <Shield size={15} aria-hidden="true" />
              {isId ? 'Konsol kurator' : 'Curator console'}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void logout();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-parchment"
          >
            <LogOut size={15} aria-hidden="true" />
            {isId ? 'Keluar' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
