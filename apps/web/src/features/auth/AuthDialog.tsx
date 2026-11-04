import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PasswordSchema } from '@margi-ai/shared';
import { Button, Card, Input, Pill } from '../../components/ui';
import { ApiClientError } from '../../lib/apiClient';
import { useMe } from './useMe';

export type AuthMode = 'login' | 'register';

export interface AuthDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Runs after a successful sign in or sign up, e.g. to finish the action that needed an account. */
  readonly onSuccess?: () => void;
  readonly defaultMode?: AuthMode;
  /** Why the account is needed, shown under the heading. */
  readonly reason?: string;
}

const COPY = {
  id: {
    login: { pill: 'Masuk', title: 'Masuk ke MARGI AI', submit: 'Masuk', busy: 'Memproses…' },
    register: { pill: 'Daftar', title: 'Buat akun MARGI AI', submit: 'Daftar', busy: 'Mendaftar…' },
    name: 'Nama',
    email: 'Email',
    password: 'Kata sandi',
    hint: 'Minimal 8 karakter, ada huruf dan angka.',
    toRegister: 'Belum punya akun? Daftar',
    toLogin: 'Sudah punya akun? Masuk',
    close: 'Tutup',
    required: 'Lengkapi semua kolom.',
    badLogin: 'Email atau kata sandi salah.',
    exists: 'Email ini sudah terdaftar. Silakan masuk.',
    limited: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
    generic: 'Gagal memproses. Periksa koneksi lalu coba lagi.',
    defaultReason: 'Masuk untuk menyimpan rencana. Mencari dan menyusun rencana tetap bebas.',
  },
  en: {
    login: { pill: 'Sign in', title: 'Sign in to MARGI AI', submit: 'Sign in', busy: 'Working…' },
    register: { pill: 'Sign up', title: 'Create your MARGI AI account', submit: 'Sign up', busy: 'Creating…' },
    name: 'Name',
    email: 'Email',
    password: 'Password',
    hint: 'At least 8 characters, with a letter and a number.',
    toRegister: 'No account yet? Sign up',
    toLogin: 'Already have an account? Sign in',
    close: 'Close',
    required: 'Fill in every field.',
    badLogin: 'Email or password is incorrect.',
    exists: 'This email is already registered. Please sign in.',
    limited: 'Too many attempts. Try again in a few minutes.',
    generic: 'Something went wrong. Check your connection and try again.',
    defaultReason: 'Sign in to save your plan. Searching and planning stay free for everyone.',
  },
} as const;

/** Sign in or sign up in one modal, used wherever an account is required (save plan, saved list). */
export function AuthDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = 'login',
  reason,
}: AuthDialogProps): ReactNode {
  const { i18n } = useTranslation();
  const copy = i18n.language.startsWith('id') ? COPY.id : COPY.en;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { login, register, isLoggingIn, isRegistering } = useMe();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = isLoggingIn || isRegistering;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const close = (): void => {
    setMode(defaultMode);
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (!email || !password || (mode === 'register' && !name.trim())) {
      setError(copy.required);
      return;
    }
    if (mode === 'register') {
      const strength = PasswordSchema.safeParse(password);
      if (!strength.success) {
        setError(copy.hint);
        return;
      }
    }
    try {
      if (mode === 'login') await login({ email, password });
      else await register({ email, password, name: name.trim() });
      setPassword('');
      onSuccess?.();
      close();
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        if (cause.code === 'UNAUTHORIZED') setError(copy.badLogin);
        else if (cause.code === 'CONFLICT') setError(copy.exists);
        else if (cause.code === 'RATE_LIMITED') setError(copy.limited);
        else if (cause.code === 'VALIDATION_FAILED') setError(copy.hint);
        else setError(copy.generic);
      } else {
        setError(copy.generic);
      }
    }
  };

  const text = copy[mode];

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      aria-label={text.title}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-card border-0 bg-transparent p-0 backdrop:bg-ink/60"
    >
      <Card tone="white" className="space-y-5 border border-ash p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Pill tone="dark">{text.pill}</Pill>
            <h2 className="text-xl font-medium tracking-tight text-ink">{text.title}</h2>
            <p className="text-xs leading-relaxed text-graphite">{reason ?? copy.defaultReason}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={copy.close}
            className="cursor-pointer p-1 text-lg text-stone transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-input border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
          {mode === 'register' && (
            <Input
              id="auth-name"
              label={copy.name}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}
          <Input
            id="auth-email"
            label={copy.email}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            id="auth-password"
            label={copy.password}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {mode === 'register' && <p className="text-[11px] text-graphite">{copy.hint}</p>}
          <Button variant="primary" type="submit" disabled={busy} className="w-full">
            {busy ? text.busy : text.submit}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="w-full cursor-pointer text-center text-xs font-medium text-ink underline underline-offset-4"
        >
          {mode === 'login' ? copy.toRegister : copy.toLogin}
        </button>
      </Card>
    </dialog>
  );
}
