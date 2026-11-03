import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedTrip } from '@margi-ai/shared';
import { BookmarkIcon, Button, Card, Pill } from '../../components/ui';
import { useMe } from '../auth/useMe';
import { LoginDialog } from '../auth/LoginDialog';
import { SaveTripDialog } from './SaveTripDialog';
import { apiClient } from '../../lib/apiClient';

export interface SaveTripButtonProps {
  analysisId: string;
  venueId: string;
  venueName: string;
  msmeVenueIds?: string[] | undefined;
  msmeNames?: string[] | undefined;
  className?: string | undefined;
  variant?: 'primary' | 'ghost' | 'link' | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  onClick?: (() => void) | undefined;
  onSaved?: ((trip: SavedTrip) => void) | undefined;
  children?: ReactNode;
  'data-testid'?: string | undefined;
}

export function SaveTripButton({
  analysisId,
  venueId,
  venueName,
  msmeVenueIds = [],
  msmeNames = [],
  className,
  variant = 'primary',
  size = 'sm',
  onClick,
  onSaved,
  children,
  'data-testid': testId = 'save-trip-button',
}: SaveTripButtonProps): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const { user, isAuthenticated, isVerified, isLoading } = useMe();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isVerifyAlertOpen, setIsVerifyAlertOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleClick = (): void => {
    onClick?.();
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }

    if (!isVerified) {
      setIsVerifyAlertOpen(true);
      return;
    }

    setIsSaveOpen(true);
  };

  const handleLoginSuccess = async (): Promise<void> => {
    setIsLoginOpen(false);

    // Attempt to claim guest analysis
    try {
      await apiClient(`/me/analyses/${analysisId}/claim`, {
        method: 'POST',
      });
    } catch {
      // Ignore claim errors (e.g. already claimed or unowned)
    }

    // After login, recheck verification
    if (!user?.emailVerified) {
      setIsVerifyAlertOpen(true);
    } else {
      setIsSaveOpen(true);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!user) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await apiClient('/auth/resend-verification', {
        method: 'POST',
        body: { email: user.email },
      });
      setResendStatus(
        isId
          ? 'Tautan verifikasi baru telah dikirimkan ke email Anda.'
          : 'A new verification link has been sent to your email.',
      );
    } catch {
      setResendStatus(
        isId
          ? 'Gagal mengirimkan email verifikasi.'
          : 'Failed to resend verification email.',
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
        data-testid={testId}
      >
        {children ?? (
          <>
            <BookmarkIcon size={14} />
            <span>{isId ? 'Simpan Rencana' : 'Save Trip'}</span>
          </>
        )}
      </Button>

      {/* Guest Login Interruption */}
      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
        title={isId ? 'Masuk untuk Menyimpan Perjalanan' : 'Sign in to save your trip'}
        subtitle={
          isId
            ? 'Simpan destinasi ini ke riwayat perjalanan akun Anda.'
            : 'Save this curated alternative to your account trip planner.'
        }
      />

      {/* Unverified Email Warning Modal */}
      {isVerifyAlertOpen && (
        <dialog
          open
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
        >
          <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
            <div className="flex items-center justify-between">
              <Pill tone="dark">{isId ? 'Verifikasi Diperlukan' : 'Verification Required'}</Pill>
              <button
                type="button"
                onClick={() => setIsVerifyAlertOpen(false)}
                aria-label="Close dialog"
                className="text-stone hover:text-ink text-lg p-1 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium text-ink">
                {isId ? 'Verifikasi Email Anda' : 'Please Verify Your Email'}
              </h3>
              <p className="text-xs text-graphite leading-relaxed">
                {isId
                  ? 'Untuk menjaga keamanan dan privasi data perjalanan Anda, MARGI AI memerlukan alamat email terverifikasi sebelum dapat menyimpan rencana perjalanan.'
                  : 'To protect your trip data and privacy, MARGI AI requires a verified email address before saving trips to your account.'}
              </p>
            </div>

            {resendStatus && (
              <div
                role="status"
                className="rounded-input border border-ash bg-parchment p-3 text-xs text-ink"
              >
                {resendStatus}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVerifyAlertOpen(false)}
              >
                {isId ? 'Tutup' : 'Close'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isResending}
                onClick={handleResend}
              >
                {isResending
                  ? isId
                    ? 'Mengirim...'
                    : 'Sending...'
                  : isId
                    ? 'Kirim Ulang Tautan'
                    : 'Resend Verification'}
              </Button>
            </div>
          </Card>
        </dialog>
      )}

      {/* Real Save Trip Dialog */}
      <SaveTripDialog
        isOpen={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        analysisId={analysisId}
        venueId={venueId}
        venueName={venueName}
        msmeVenueIds={msmeVenueIds}
        msmeNames={msmeNames}
        onSaved={onSaved}
      />
    </>
  );
}
