import { useState, useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  type ForgotPasswordInput,
} from '@margi-ai/shared';
import { Button, Card, Input, Pill } from '../../components/ui';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { useMe } from '../../features/auth/useMe';

export function ForgotPasswordPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordInputSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput): Promise<void> => {
    setIsLoading(true);
    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: data,
      });
      setSubmitted(true);
    } catch {
      // Enumeration safe: always show success
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 md:py-20 space-y-6">
      <div className="space-y-2 text-center">
        <Pill tone="dark">{isId ? 'Pemulihan Sandi' : 'Password Recovery'}</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink">
          {isId ? 'Lupa Kata Sandi' : 'Reset Your Password'}
        </h1>
        <p className="text-xs text-graphite">
          {isId
            ? 'Masukkan email Anda untuk menerima instruksi pemulihan.'
            : 'Enter your email address and we will send you a reset link.'}
        </p>
      </div>

      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash">
        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="text-2xl" aria-hidden="true">
              📬
            </div>
            <h2 className="text-base font-medium text-ink">
              {isId ? 'Periksa Kotak Masuk Anda' : 'Check Your Inbox'}
            </h2>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Jika email terdaftar pada sistem kami, tautan pemulihan kata sandi telah dikirimkan. Tautan berlaku selama 30 menit.'
                : 'If an account exists with that email, a password reset link has been dispatched. The link expires in 30 minutes.'}
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="w-full">
                  {isId ? 'Kembali ke Halaman Masuk' : 'Back to Sign In'}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Input
                id="forgot-email"
                label={isId ? 'Alamat Email' : 'Email Address'}
                type="email"
                placeholder="name@example.com"
                error={errors.email?.message}
                aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                {...register('email')}
              />
            </div>

            <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
              {isLoading
                ? isId
                  ? 'Mengirim...'
                  : 'Sending...'
                : isId
                  ? 'Kirim Tautan Pemulihan'
                  : 'Send Reset Link'}
            </Button>

            <div className="text-center text-xs text-graphite pt-2 border-t border-ash/60">
              <Link to="/login" className="font-medium text-ink underline hover:text-stone">
                {isId ? 'Kembali ke Masuk' : 'Back to Sign In'}
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export function ResetPasswordPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>({
    defaultValues: { password: '' },
  });

  const onSubmit = async ({ password }: { password: string }): Promise<void> => {
    if (!token) {
      setServerError(isId ? 'Token reset tidak ditemukan di URL' : 'Reset token missing from URL');
      return;
    }

    const parse = ResetPasswordInputSchema.safeParse({ token, password });
    if (!parse.success) {
      setServerError(parse.error.issues[0]?.message ?? 'Invalid password');
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(
          err.code === 'AUTH_TOKEN_INVALID'
            ? isId
              ? 'Tautan reset tidak valid atau sudah digunakan.'
              : 'Reset token is invalid or has already been used.'
            : err.message,
        );
      } else {
        setServerError(isId ? 'Gagal memperbarui kata sandi' : 'Failed to update password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 md:py-20 space-y-6">
      <div className="space-y-2 text-center">
        <Pill tone="dark">{isId ? 'Kata Sandi Baru' : 'New Password'}</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink">
          {isId ? 'Atur Ulang Kata Sandi' : 'Set New Password'}
        </h1>
        <p className="text-xs text-graphite">
          {isId
            ? 'Buat kata sandi baru untuk mengamankan akun Anda.'
            : 'Choose a strong password to protect your account.'}
        </p>
      </div>

      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash">
        {isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="text-2xl" aria-hidden="true">
              ✅
            </div>
            <h2 className="text-base font-medium text-ink">
              {isId ? 'Kata Sandi Berhasil Diperbarui' : 'Password Updated Successfully'}
            </h2>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Kata sandi Anda telah berhasil diganti. Silakan masuk menggunakan kata sandi baru.'
                : 'Your password has been changed. You may now sign in with your new credentials.'}
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" size="sm" className="w-full">
                  {isId ? 'Masuk Sekarang' : 'Sign In Now'}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <div
                role="alert"
                className="rounded-input border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                {serverError}
              </div>
            )}

            <div>
              <Input
                id="reset-password"
                label={isId ? 'Kata Sandi Baru' : 'New Password'}
                type="password"
                error={errors.password?.message}
                aria-describedby="reset-password-policy"
                {...register('password', {
                  required: isId ? 'Kata sandi wajib diisi' : 'Password is required',
                  minLength: {
                    value: 8,
                    message: isId ? 'Minimal 8 karakter' : 'At least 8 characters',
                  },
                })}
              />
              <p id="reset-password-policy" className="mt-1 text-[11px] text-graphite">
                {isId
                  ? 'Minimal 8 karakter, wajib memuat kombinasi huruf dan angka.'
                  : 'At least 8 characters with letters and numbers.'}
              </p>
            </div>

            <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
              {isLoading
                ? isId
                  ? 'Memperbarui...'
                  : 'Updating...'
                : isId
                  ? 'Simpan Kata Sandi'
                  : 'Update Password'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export function VerifyEmailPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { refetch } = useMe();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'error',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(
        isId ? 'Tautan verifikasi tidak memiliki token.' : 'Verification token is missing.',
      );
      return;
    }

    let isMounted = true;
    void apiClient('/auth/verify-email', {
      method: 'POST',
      body: { token },
    })
      .then(() => {
        if (isMounted) {
          setStatus('success');
          void refetch();
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setStatus('error');
          if (err instanceof ApiClientError) {
            setErrorMessage(
              err.code === 'AUTH_TOKEN_INVALID'
                ? isId
                  ? 'Tautan verifikasi tidak valid atau sudah kadaluarsa.'
                  : 'Verification link is invalid or expired.'
                : err.message,
            );
          } else {
            setErrorMessage(
              isId ? 'Gagal memverifikasi email.' : 'Email verification failed.',
            );
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, isId, refetch]);

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 md:py-20 space-y-6">
      <div className="space-y-2 text-center">
        <Pill tone="dark">{isId ? 'Verifikasi Akun' : 'Email Verification'}</Pill>
        <h1 className="text-heading font-medium tracking-tight text-ink">
          {isId ? 'Status Verifikasi Email' : 'Email Verification'}
        </h1>
      </div>

      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash text-center">
        {status === 'verifying' && (
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-graphite animate-pulse">
              {isId ? 'Memverifikasi email Anda...' : 'Verifying your email...'}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-3xl" aria-hidden="true">
              🎉
            </div>
            <h2 className="text-lg font-medium text-ink">
              {isId ? 'Email Berhasil Diverifikasi!' : 'Email Verified Successfully!'}
            </h2>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Akun Anda kini aktif penuh. Anda dapat menyimpan rute perjalanan dan mengakses riwayat pribadi.'
                : 'Your account is now fully verified. You can now save trips and access private history.'}
            </p>
            <div className="pt-2">
              <Link to="/app">
                <Button variant="primary" size="sm" className="w-full">
                  {isId ? 'Mulai Analisis' : 'Launch Analyzer'}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-3xl" aria-hidden="true">
              ⚠️
            </div>
            <h2 className="text-lg font-medium text-ink">
              {isId ? 'Verifikasi Gagal' : 'Verification Failed'}
            </h2>
            <p className="text-xs text-red-700 leading-relaxed">
              {errorMessage ?? (isId ? 'Tautan verifikasi tidak sah.' : 'Invalid verification link.')}
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="w-full">
                  {isId ? 'Masuk ke Akun' : 'Go to Sign In'}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function AuthCallbackPage(): ReactNode {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextPath = searchParams.get('next') || '/app';
  const { refetch } = useMe();

  useEffect(() => {
    void refetch().then(() => {
      // Validate relative path to prevent open redirects (T-058 / TDD §11)
      const sanitized = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/app';
      void navigate(sanitized, { replace: true });
    });
  }, [nextPath, navigate, refetch]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-xs font-mono uppercase tracking-wider text-graphite animate-pulse">
        Completing sign-in...
      </div>
    </div>
  );
}
