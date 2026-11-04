import { useRef, useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Pill } from '../../components/ui';
import { useMe } from './useMe';
import { ApiClientError } from '../../lib/apiClient';

export interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function LoginDialog({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
}: LoginDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t, i18n } = useTranslation('auth');
  const isId = i18n.language.startsWith('id');
  const { login, isLoggingIn } = useMe();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage(isId ? 'Email dan kata sandi wajib diisi' : 'Email and password are required');
      return;
    }

    try {
      await login({ email, password });
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(
          err.code === 'UNAUTHORIZED'
            ? isId
              ? 'Email atau kata sandi tidak valid'
              : 'Invalid email or password'
            : err.message,
        );
      } else {
        setErrorMessage(isId ? 'Terjadi kesalahan saat masuk' : 'An error occurred during sign in');
      }
    }
  };

  const handleSimulateGoogle = (): void => {
    window.location.href = '/auth/callback?next=' + encodeURIComponent(window.location.pathname);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
    >
      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Pill tone="dark">{isId ? 'Masuk Akun' : 'Sign In'}</Pill>
            <h2 className="text-xl font-medium tracking-tight text-ink">
              {title ?? (isId ? 'Masuk ke MARGI AI' : 'Sign In to MARGI AI')}
            </h2>
            <p className="text-xs text-graphite leading-relaxed">
              {subtitle ??
                (isId
                  ? 'Simpan dan kelola rencana perjalanan Anda dengan mudah.'
                  : 'Save and manage your personalized Bali trips.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-stone hover:text-ink text-lg p-1 cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-input border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Input
            id="modal-email"
            label={t('emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@margi.test"
            required
          />

          <Input
            id="modal-password"
            label={t('passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button variant="primary" type="submit" disabled={isLoggingIn} className="w-full">
            {isLoggingIn ? (isId ? 'Memproses...' : 'Signing In...') : t('continueButton')}
          </Button>
        </form>

        <div className="relative border-t border-ash pt-4 text-center">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] uppercase font-mono text-stone">
            {isId ? 'atau' : 'or'}
          </span>
          <button
            type="button"
            onClick={handleSimulateGoogle}
            className="w-full rounded-pill border border-ash py-2 px-4 text-xs font-medium text-ink hover:bg-parchment transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isId ? 'Lanjutkan dengan Google' : 'Continue with Google'}</span>
          </button>
        </div>
      </Card>
    </dialog>
  );
}

