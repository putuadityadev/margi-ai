import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterInputSchema, type RegisterInput } from '@margi-ai/shared';
import { Button, Card, Input, Pill } from '../../components/ui';
import { GoogleButton } from '../../features/auth/GoogleButton';
import { useMe } from '../../features/auth/useMe';
import { ApiClientError } from '../../lib/apiClient';

export function RegisterPage(): ReactNode {
  const { t, i18n } = useTranslation('auth');
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();

  const { register: registerUser, isRegistering } = useMe();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterInput): Promise<void> => {
    setServerError(null);
    try {
      await registerUser(data);
      void navigate('/app');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(
          err.code === 'CONFLICT'
            ? isId
              ? 'Email ini sudah terdaftar. Silakan masuk.'
              : 'An account with this email address already exists.'
            : err.message,
        );
      } else {
        setServerError(isId ? 'Terjadi kesalahan sistem' : 'An error occurred during registration');
      }
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 md:py-20 space-y-6">
      <div className="space-y-2 text-center">
        <Pill tone="dark">{isId ? 'Pendaftaran' : 'Registration'}</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink">
          {isId ? 'Buat Akun MARGI AI' : 'Create MARGI AI Account'}
        </h1>
        <p className="text-xs text-graphite">
          {isId
            ? 'Buka akses penyimpanan rute, riwayat pribadi, dan rekomendasi cerdas.'
            : 'Unlock route saving, private photo history, and personalized recommendations.'}
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
              id="register-name"
              label={isId ? 'Nama Lengkap' : 'Full Name'}
              type="text"
              placeholder="Wayan Sukadana"
              error={errors.name?.message}
              aria-describedby={errors.name ? 'register-name-error' : undefined}
              {...register('name')}
            />
          </div>

          <div>
            <Input
              id="register-email"
              label={t('emailLabel')}
              type="email"
              placeholder="wayan@example.com"
              error={errors.email?.message}
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              {...register('email')}
            />
          </div>

          <div>
            <Input
              id="register-password"
              label={t('passwordLabel')}
              type="password"
              error={errors.password?.message}
              aria-describedby={
                errors.password ? 'register-password-error' : 'password-policy-hint'
              }
              {...register('password')}
            />
            <p id="password-policy-hint" className="mt-1 text-[11px] text-graphite">
              {isId
                ? 'Minimal 8 karakter, wajib memuat huruf dan angka.'
                : 'At least 8 characters, with letters and at least one number.'}
            </p>
          </div>

          <Button variant="primary" type="submit" disabled={isRegistering} className="w-full mt-2">
            {isRegistering
              ? isId
                ? 'Mendaftarkan...'
                : 'Creating Account...'
              : isId
                ? 'Daftar Akun'
                : 'Create Account'}
          </Button>
        </form>

        <GoogleButton />

        <div className="text-center text-xs text-graphite pt-2 border-t border-ash/60">
          <span>{isId ? 'Sudah memiliki akun? ' : 'Already have an account? '}</span>
          <Link to="/login" className="font-medium text-ink underline hover:text-stone">
            {isId ? 'Masuk di sini' : 'Sign in'}
          </Link>
        </div>
      </Card>
    </div>
  );
}
