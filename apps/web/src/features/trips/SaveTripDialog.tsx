import { useState, useRef, useEffect, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedTrip } from '@margi-ai/shared';
import { Button, Card, Input, MapPinIcon, Pill } from '../../components/ui';
import { useCreateTrip } from './useTrips';
import { track } from '../../lib/track';
import { ApiClientError } from '../../lib/apiClient';

export interface SaveTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
  venueId: string;
  venueName: string;
  msmeVenueIds?: string[] | undefined;
  msmeNames?: string[] | undefined;
  onSaved?: ((trip: SavedTrip) => void) | undefined;
}

export function SaveTripDialog({
  isOpen,
  onClose,
  analysisId,
  venueId,
  venueName,
  msmeVenueIds = [],
  msmeNames = [],
  onSaved,
}: SaveTripDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [title, setTitle] = useState(`Trip to ${venueName}`);
  const [note, setNote] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync: createTrip, isPending } = useCreateTrip();

  useEffect(() => {
    if (venueName) {
      setTitle(isId ? `Perjalanan ke ${venueName}` : `Trip to ${venueName}`);
    }
  }, [venueName, isId]);

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
    setServerError(null);

    if (!title.trim()) {
      setServerError(isId ? 'Nama perjalanan wajib diisi' : 'Trip title is required');
      return;
    }

    try {
      const trip = await createTrip({
        analysisId,
        venueId,
        msmeVenueIds,
        title: title.trim(),
        note: note.trim() || undefined,
      });

      track('trip_saved', {
        tripId: trip.id,
        analysisId,
        venueId,
        msmeCount: msmeVenueIds.length,
      });

      onSaved?.(trip);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setServerError(
            isId
              ? 'Verifikasi email Anda terlebih dahulu untuk menyimpan perjalanan.'
              : 'Please verify your email address before saving trips.',
          );
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(
          isId ? 'Gagal menyimpan perjalanan' : 'Failed to save trip. Please try again.',
        );
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-lg w-full"
    >
      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Pill tone="dark">{isId ? 'Rencana Perjalanan' : 'Trip Plan'}</Pill>
            <h2 className="text-xl font-medium tracking-tight text-ink">
              {isId ? 'Simpan Rencana Perjalanan' : 'Save Trip to Your Account'}
            </h2>
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

        {serverError && (
          <div
            role="alert"
            className="rounded-input border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {serverError}
          </div>
        )}

        {/* Selected venues review */}
        <div className="p-4 rounded-inner bg-parchment/60 border border-ash/80 space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-graphite">
            {isId ? 'Destinasi Terpilih' : 'Selected Destination'}
          </div>
          <div className="text-sm font-medium text-ink flex items-center gap-2">
            <MapPinIcon size={15} />
            <span>{venueName}</span>
          </div>

          {msmeNames.length > 0 && (
            <div className="pt-2 border-t border-ash/60 space-y-1">
              <div className="text-[10px] uppercase font-mono text-graphite">
                {isId ? 'Mitra UMKM Lokal Terkurasi:' : 'Curated Local MSMEs:'}
              </div>
              <ul className="text-xs text-graphite space-y-0.5">
                {msmeNames.map((name) => (
                  <li key={name} className="flex items-center gap-1.5">
                    <span className="text-ink">•</span>
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="trip-title"
            label={isId ? 'Nama Perjalanan' : 'Trip Title'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isId ? 'Contoh: Pagi Tenang di Taman Ujung' : 'e.g., Morning Escape to Taman Ujung'}
            required
          />

          <div className="w-full flex flex-col gap-1.5">
            <label
              htmlFor="trip-notes"
              className="text-xs font-medium text-graphite uppercase tracking-[0.1em]"
            >
              {isId ? 'Catatan Tambahan (Opsional)' : 'Notes & Tips (Optional)'}
            </label>
            <textarea
              id="trip-notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                isId
                  ? 'Contoh: Kunjungi sebelum jam 10 pagi, sarapan di Warung Bali dekat sana...'
                  : 'e.g., Arrive before 10 AM, visit nearby warung for lunch...'
              }
              className="w-full rounded-input border bg-white px-3.5 py-2 text-sm text-ink placeholder:text-stone transition-colors focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 border-ash hover:border-stone"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {isId ? 'Batal' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending
                ? isId
                  ? 'Menyimpan...'
                  : 'Saving...'
                : isId
                  ? 'Simpan Perjalanan'
                  : 'Save Trip'}
            </Button>
          </div>
        </form>
      </Card>
    </dialog>
  );
}
