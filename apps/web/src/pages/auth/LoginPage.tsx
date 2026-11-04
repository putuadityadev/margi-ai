import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput } from '@margi-ai/shared';
import { Button, Card, Input, Pill } from '../../components/ui';
import { GoogleButton } from '../../features/auth/GoogleButton';
import { useMe } from '../../features/auth/useMe';
import { ApiClientError } from '../../lib/apiClient';

export function LoginPage(): ReactNode {
  const { t, i18n } = useTranslation('auth');
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/app';

  const { login, isLoggingIn } = useMe();
  const googleFailed = searchParams.get('error') === 'google';
  const [serverError, setServerError] = useState<string | null>(
    googleFailed
      ? isId
        ? 'Masuk dengan Google gagal. Coba lagi atau pakai email.'
        : 'Google sign-in did not work. Try again or use your email.'
      : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput): Promise<void> => {
    setServerError(null);
    try {
      await login(data);
      void navigate(nextPath);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(
          err.code === 'UNAUTHORIZED'
            ? isId
              ? 'Email atau kata sandi tidak valid'
              : 'Invalid email or password'
            : err.message,
        );
      } else {
        setServerError(isId ? 'Terjadi kesalahan sistem' : 'An error occurred during sign in');
      }
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 md:py-20 space-y-6">
      <div className="space-y-2 text-center">
        <Pill tone="dark">{isId ? 'Autentikasi' : 'Authentication'}</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink">{t('signInTitle')}</h1>
        <p className="text-xs text-graphite">
          {isId
            ? 'Masuk untuk mengakses riwayat dan menyimpan rencana perjalanan.'
            : 'Sign in to access your analysis history and saved trips.'}
        </p>
      </div>

      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash">
        {serverError && (
          <div
            role="alert"
            className="rounded-input border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {serverError}
          </div>
        )}

        <form
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="space-y-4"
          noValidate
        >
          <div>
            <Input
              id="login-email"
              label={t('emailLabel')}
              type="email"
              placeholder="demo@margi.test"
              error={errors.email?.message}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="text-xs font-medium text-ink">
                {t('passwordLabel')}
              </label>
            </div>
            <Input
              id="login-password"
              type="password"
              error={errors.password?.message}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
            />
          </div>

          <Button variant="primary" type="submit" disabled={isLoggingIn} className="w-full mt-2">
            {isLoggingIn ? (isId ? 'Memproses...' : 'Signing In...') : t('continueButton')}
          </Button>
        </form>

        <GoogleButton next={nextPath} />

        <div className="text-center text-xs text-graphite pt-2 border-t border-ash/60">
          <span>{isId ? 'Belum punya akun? ' : "Don't have an account? "}</span>
          <Link to="/register" className="font-medium text-ink underline hover:text-stone">
            {isId ? 'Daftar sekarang' : 'Create an account'}
          </Link>
        </div>
      </Card>
    </div>
  );
}
