import { useState, useRef, useEffect, type ReactNode, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { SavedTrip } from '@margi-ai/shared';
import { Button, Card, Input, Pill, Spinner } from '../../components/ui';
import { useHistory, useDeleteAnalysis, useDeleteAllAnalyses } from '../../features/history/useHistory';
import { useTrips, useTrip, useUpdateTrip, useDeleteTrip } from '../../features/trips/useTrips';
import { MOCK_VENUES, type MockVenueDetail } from '../../mocks/data/venues';

function findVenue(id: string) {
  return MOCK_VENUES.find((v) => v.id === id);
}

function getVenueName(
  venue: MockVenueDetail | { nameEn: string; nameId: string } | undefined,
  isId: boolean,
): string {
  if (!venue) return isId ? 'Destinasi' : 'Destination';
  return isId ? venue.nameId : venue.nameEn;
}

// ---------------------------------------------------------------------------
// 1. HistoryPage (/me/history)
// ---------------------------------------------------------------------------
export function HistoryPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const { data: analyses, isLoading } = useHistory();
  const { mutateAsync: deleteOne, isPending: isDeletingOne } = useDeleteAnalysis();
  const { mutateAsync: deleteAll, isPending: isDeletingAll } = useDeleteAllAnalyses();

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  const confirmDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const clearAllDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = confirmDeleteDialogRef.current;
    if (!dialog) return;
    if (deleteTargetId) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [deleteTargetId]);

  useEffect(() => {
    const dialog = clearAllDialogRef.current;
    if (!dialog) return;
    if (isClearAllOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isClearAllOpen]);

  const handleDeleteOne = async (): Promise<void> => {
    if (!deleteTargetId) return;
    try {
      await deleteOne(deleteTargetId);
      setDeleteTargetId(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClearAll = async (): Promise<void> => {
    try {
      await deleteAll();
      setIsClearAllOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ash pb-6">
        <div className="space-y-1">
          <Pill tone="dark">{isId ? 'Riwayat Akun' : 'Account History'}</Pill>
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            {isId ? 'Riwayat Rekomendasi Anda' : 'Your Analysis History'}
          </h1>
          <p className="text-xs text-graphite">
            {isId
              ? 'Foto dan hasil analisis privat tersimpan di akun Anda. Anda memegang kendali penuh untuk menghapusnya kapan saja.'
              : 'Private photos and analysis results stored securely in your account. You hold full ownership and can delete anytime.'}
          </p>
        </div>

        {analyses && analyses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsClearAllOpen(true)}
            className="text-xs border border-ash hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition"
          >
            🗑️ {isId ? 'Hapus Semua Riwayat' : 'Clear All History'}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Spinner size="lg" className="mx-auto text-ink" />
          <p className="text-xs text-graphite font-mono">
            {isId ? 'Memuat riwayat analisis...' : 'Loading your history...'}
          </p>
        </div>
      ) : !analyses || analyses.length === 0 ? (
        <Card tone="white" className="p-10 text-center space-y-4 border border-ash">
          <div className="text-3xl" aria-hidden="true">
            🧭
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-medium text-ink">
              {isId ? 'Belum Ada Riwayat Analisis' : 'No Analysis History Yet'}
            </h2>
            <p className="text-xs text-graphite max-w-md mx-auto leading-relaxed">
              {isId
                ? 'Jalankan analisis foto destinasi untuk menemukan alternatif tenang dan simpan riwayatnya di akun Anda.'
                : 'Run an analysis on any popular Bali destination photo to discover serene alternatives and save your history.'}
            </p>
          </div>
          <div className="pt-2">
            <Link to="/app">
              <Button variant="primary" size="sm">
                {isId ? 'Mulai Analisis Sekarang' : 'Start Analyzing Now'} →
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((item) => {
            const dateStr = new Date(item.input.arrivalAt || Date.now()).toLocaleDateString(
              isId ? 'id-ID' : 'en-US',
              { dateStyle: 'medium' },
            );
            const totalAlts = item.micro.length + item.regional.length;
            const originVenue = item.origin.venue;
            const tier = item.origin.snapshot.tier;
            const arrivalDate = new Date(item.input.arrivalAt);
            const arrivalHourStr = String(arrivalDate.getHours()).padStart(2, '0');

            return (
              <Card
                key={item.id}
                tone="white"
                className="p-5 border border-ash flex flex-col justify-between gap-4 transition hover:border-stone"
              >
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-inner overflow-hidden shrink-0 border border-ash bg-parchment">
                    <img
                      src={`/api/v1/me/analyses/${item.id}/image`}
                      alt={getVenueName(originVenue, isId)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Pill tone={tier === 'SIMULATION' ? 'sim' : 'default'}>
                        {tier}
                      </Pill>
                      <span className="text-[11px] font-mono text-graphite">{dateStr}</span>
                    </div>

                    <h2 className="text-sm font-medium text-ink truncate">
                      {getVenueName(originVenue, isId)}
                    </h2>

                    <p className="text-xs text-graphite">
                      {isId
                        ? `Kedatangan jam ${arrivalHourStr}:00 WITA · ${totalAlts} alternatif tenang`
                        : `Arrived at ${arrivalHourStr}:00 WITA · ${totalAlts} alternatives found`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-ash/60">
                  <Link to={`/app/a/${item.id}`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs border border-ash">
                      {isId ? 'Lihat Alternatif' : 'View Alternatives'} →
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTargetId(item.id)}
                    aria-label={isId ? 'Hapus analisis' : 'Delete analysis'}
                    className="text-xs text-stone hover:text-red-600 hover:bg-red-50 p-2"
                  >
                    🗑️
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog: Delete One */}
      <dialog
        ref={confirmDeleteDialogRef}
        onClose={() => setDeleteTargetId(null)}
        className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
      >
        <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Hapus Riwayat Analisis?' : 'Delete Analysis Record?'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Tindakan ini akan menghapus riwayat analisis dan foto terkait dari server secara permanen. Tindakan tidak dapat dibatalkan.'
                : 'This permanently removes the analysis and stored photo from our servers. This action cannot be undone.'}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
            >
              {isId ? 'Batal' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isDeletingOne}
              onClick={handleDeleteOne}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingOne
                ? isId
                  ? 'Menghapus...'
                  : 'Deleting...'
                : isId
                  ? 'Hapus Permanen'
                  : 'Delete Permanently'}
            </Button>
          </div>
        </Card>
      </dialog>

      {/* Confirmation Dialog: Clear All */}
      <dialog
        ref={clearAllDialogRef}
        onClose={() => setIsClearAllOpen(false)}
        className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
      >
        <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Hapus Seluruh Riwayat Analisis?' : 'Clear Entire Analysis History?'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Semua data analisis dan foto yang tersimpan akan dihapus secara permanen dari server. Tindakan ini tidak dapat dibatalkan.'
                : 'All saved analysis items and associated photos will be permanently deleted. This cannot be undone.'}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsClearAllOpen(false)}
            >
              {isId ? 'Batal' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isDeletingAll}
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingAll
                ? isId
                  ? 'Menghapus Semua...'
                  : 'Clearing All...'
                : isId
                  ? 'Hapus Semua'
                  : 'Clear Everything'}
            </Button>
          </div>
        </Card>
      </dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. TripsPage (/me/trips)
// ---------------------------------------------------------------------------
export function TripsPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const { data: trips, isLoading } = useTrips();
  const { mutateAsync: deleteTrip, isPending: isDeleting } = useDeleteTrip();

  const [tripToDelete, setTripToDelete] = useState<SavedTrip | null>(null);
  const deleteTripDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteTripDialogRef.current;
    if (!dialog) return;
    if (tripToDelete) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [tripToDelete]);

  const handleDeleteTrip = async (): Promise<void> => {
    if (!tripToDelete) return;
    try {
      await deleteTrip(tripToDelete.id);
      setTripToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ash pb-6">
        <div className="space-y-1">
          <Pill tone="dark">{isId ? 'Rencana Perjalanan' : 'Saved Trips'}</Pill>
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            {isId ? 'Koleksi Perjalanan Anda' : 'My Saved Trips'}
          </h1>
          <p className="text-xs text-graphite">
            {isId
              ? 'Rencana perjalanan alternatif tenang di Bali yang telah Anda kurasi bersama rekomendasi UMKM lokal.'
              : 'Your curated alternative itineraries across Bali, paired with local MSME artisans.'}
          </p>
        </div>

        <Link to="/app">
          <Button variant="ghost" size="sm" className="text-xs border border-ash">
            + {isId ? 'Rencanakan Baru' : 'Plan New Trip'}
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Spinner size="lg" className="mx-auto text-ink" />
          <p className="text-xs text-graphite font-mono">
            {isId ? 'Memuat daftar perjalanan...' : 'Loading your saved trips...'}
          </p>
        </div>
      ) : !trips || trips.length === 0 ? (
        <Card tone="white" className="p-10 text-center space-y-4 border border-ash">
          <div className="text-3xl" aria-hidden="true">
            🗺️
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-medium text-ink">
              {isId ? 'Belum Ada Perjalanan yang Disimpan' : 'No Saved Trips Yet'}
            </h2>
            <p className="text-xs text-graphite max-w-md mx-auto leading-relaxed">
              {isId
                ? 'Jalankan analisis destinasi, pilih rekomendasi alternatif tenang, dan simpan rencana perjalanan Anda di sini.'
                : 'Analyze a destination scene, pick a peaceful alternative recommendation, and save it to your planner.'}
            </p>
          </div>
          <div className="pt-2">
            <Link to="/app">
              <Button variant="primary" size="sm">
                {isId ? 'Temukan Destinasi Tenang' : 'Discover Calm Destinations'} →
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => {
            const destination = findVenue(trip.venueId);
            const dateStr = new Date(trip.createdAt).toLocaleDateString(
              isId ? 'id-ID' : 'en-US',
              { dateStyle: 'medium' },
            );

            return (
              <Card
                key={trip.id}
                tone="white"
                className="p-5 border border-ash flex flex-col justify-between gap-4 transition hover:border-stone"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Pill tone="default">{destination?.regencyId ?? 'Bali'}</Pill>
                    <span className="text-[11px] font-mono text-graphite">{dateStr}</span>
                  </div>

                  <div>
                    <h2 className="text-base font-medium text-ink tracking-tight">
                      {trip.title}
                    </h2>
                    {destination && (
                      <p className="text-xs text-graphite mt-0.5 flex items-center gap-1">
                        <span>📍</span>
                        <span>{getVenueName(destination, isId)}</span>
                      </p>
                    )}
                  </div>

                  {trip.note && (
                    <p className="text-xs text-graphite bg-parchment/60 p-2.5 rounded-inner border border-ash/60 line-clamp-2">
                      {trip.note}
                    </p>
                  )}

                  <div className="text-[11px] font-mono text-stone">
                    {isId
                      ? `${trip.msmeVenueIds.length} Mitra UMKM terkait`
                      : `${trip.msmeVenueIds.length} Linked Local MSMEs`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-ash/60">
                  <Link to={`/me/trips/${trip.id}`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs border border-ash">
                      {isId ? 'Buka Detail & Navigasi' : 'View & Navigate'} →
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTripToDelete(trip)}
                    aria-label={isId ? 'Hapus perjalanan' : 'Delete trip'}
                    className="text-xs text-stone hover:text-red-600 hover:bg-red-50 p-2"
                  >
                    🗑️
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Trip Dialog */}
      <dialog
        ref={deleteTripDialogRef}
        onClose={() => setTripToDelete(null)}
        className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
      >
        <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Hapus Rencana Perjalanan?' : 'Delete Trip Plan?'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? `Apakah Anda yakin ingin menghapus "${tripToDelete?.title}"? Tindakan ini tidak dapat dibatalkan.`
                : `Are you sure you want to remove "${tripToDelete?.title}"? This cannot be undone.`}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTripToDelete(null)}
            >
              {isId ? 'Batal' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteTrip}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting
                ? isId
                  ? 'Menghapus...'
                  : 'Deleting...'
                : isId
                  ? 'Hapus'
                  : 'Delete'}
            </Button>
          </div>
        </Card>
      </dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. TripDetailPage (/me/trips/:id)
// ---------------------------------------------------------------------------
export function TripDetailPage(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const { data: trip, isLoading, error } = useTrip(id);
  const { mutateAsync: updateTrip, isPending: isUpdating } = useUpdateTrip();
  const { mutateAsync: deleteTrip, isPending: isDeleting } = useDeleteTrip();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (trip) {
      setTitle(trip.title);
      setNote(trip.note ?? '');
    }
  }, [trip]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (isDeleteOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isDeleteOpen]);

  const handleSaveEdit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!id || !title.trim()) return;

    try {
      await updateTrip({
        id,
        data: {
          title: title.trim(),
          note: note.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!id) return;
    try {
      await deleteTrip(id);
      void navigate('/me/trips');
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center space-y-3">
        <Spinner size="lg" className="mx-auto text-ink" />
        <p className="text-xs text-graphite font-mono">
          {isId ? 'Memuat rencana perjalanan...' : 'Loading trip details...'}
        </p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="text-lg font-medium text-ink">
          {isId ? 'Perjalanan Tidak Ditemukan' : 'Trip Not Found'}
        </h1>
        <p className="text-xs text-graphite">
          {isId
            ? 'Rencana perjalanan ini mungkin telah dihapus atau Anda tidak memiliki akses.'
            : 'This trip may have been removed or you do not have permission to view it.'}
        </p>
        <Link to="/me/trips">
          <Button variant="ghost" size="sm">
            ← {isId ? 'Kembali ke Koleksi Perjalanan' : 'Back to Saved Trips'}
          </Button>
        </Link>
      </div>
    );
  }

  const destination = findVenue(trip.venueId);
  const msmes = (trip.msmeVenueIds ?? [])
    .map((msmeId) => findVenue(msmeId))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top back navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/me/trips"
          className="text-xs text-graphite hover:text-ink flex items-center gap-1.5 transition"
        >
          <span>←</span>
          <span>{isId ? 'Koleksi Perjalanan' : 'Back to Saved Trips'}</span>
        </Link>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs border border-ash"
            >
              ✏️ {isId ? 'Edit Catatan' : 'Edit Notes'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="text-xs border border-ash text-stone hover:text-red-600 hover:bg-red-50 hover:border-red-200"
          >
            🗑️ {isId ? 'Hapus' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Main Trip Card Header */}
      <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              id="edit-title"
              label={isId ? 'Nama Perjalanan' : 'Trip Title'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="w-full flex flex-col gap-1.5">
              <label
                htmlFor="edit-note"
                className="text-xs font-medium text-graphite uppercase tracking-[0.1em]"
              >
                {isId ? 'Catatan & Tips Pribadi' : 'Personal Notes & Tips'}
              </label>
              <textarea
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-input border bg-white px-3.5 py-2 text-sm text-ink placeholder:text-stone transition-colors focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 border-ash hover:border-stone"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle(trip.title);
                  setNote(trip.note ?? '');
                  setIsEditing(false);
                }}
              >
                {isId ? 'Batal' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isUpdating}>
                {isUpdating
                  ? isId
                    ? 'Menyimpan...'
                    : 'Saving...'
                  : isId
                    ? 'Simpan Perubahan'
                    : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill tone="dark">{destination?.regencyId ?? 'Bali'}</Pill>
              <span className="text-xs font-mono text-graphite">
                {new Date(trip.createdAt).toLocaleDateString(isId ? 'id-ID' : 'en-US', {
                  dateStyle: 'long',
                })}
              </span>
            </div>

            <h1 className="text-2xl font-medium tracking-tight text-ink">{trip.title}</h1>

            {trip.note ? (
              <div className="p-4 rounded-inner bg-parchment/60 border border-ash/80 text-xs text-graphite leading-relaxed">
                <span className="font-medium text-ink block mb-1">
                  {isId ? 'Catatan Perjalanan:' : 'Trip Notes:'}
                </span>
                {trip.note}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Destination Card & Navigation */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-graphite">
          {isId ? 'Destinasi Utama' : 'Main Destination'}
        </h2>

        {destination ? (
          <Card tone="white" className="p-6 border border-ash space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-ink">{getVenueName(destination, isId)}</h3>
                <p className="text-xs text-graphite">
                  {destination.regencyId} · {destination.category}
                </p>
                <p className="text-xs text-stone font-mono">
                  GPS: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                </p>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary" size="sm" className="whitespace-nowrap">
                  🗺️ {isId ? 'Petunjuk Arah Google Maps' : 'Open in Google Maps'} ↗
                </Button>
              </a>
            </div>
          </Card>
        ) : (
          <Card tone="white" className="p-6 border border-ash text-xs text-graphite">
            {isId ? 'Detail destinasi tidak tersedia' : 'Destination details unavailable'}
          </Card>
        )}
      </div>

      {/* Linked MSMEs Card & Navigation */}
      {msmes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-graphite">
            {isId ? 'Mitra UMKM Lokal Terkurasi' : 'Curated Local MSME Partners'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {msmes.map((msme) => (
              <Card
                key={msme.id}
                tone="white"
                className="p-5 border border-ash flex flex-col justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Pill tone="default">{msme.category}</Pill>
                    <span className="text-[11px] font-mono text-graphite">{msme.regencyId}</span>
                  </div>
                  <h3 className="text-sm font-medium text-ink">{getVenueName(msme, isId)}</h3>
                  <p className="text-xs text-stone font-mono">
                    GPS: {msme.lat.toFixed(4)}, {msme.lng.toFixed(4)}
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${msme.lat},${msme.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="w-full text-xs border border-ash">
                    🧭 {isId ? 'Petunjuk Arah UMKM' : 'Navigate to MSME'} ↗
                  </Button>
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <dialog
        ref={deleteDialogRef}
        onClose={() => setIsDeleteOpen(false)}
        className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
      >
        <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Hapus Perjalanan Ini?' : 'Delete This Trip?'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Rencana perjalanan ini akan dihapus secara permanen dari akun Anda.'
                : 'This trip itinerary will be permanently removed from your account.'}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
            >
              {isId ? 'Batal' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting
                ? isId
                  ? 'Menghapus...'
                  : 'Deleting...'
                : isId
                  ? 'Hapus'
                  : 'Delete'}
            </Button>
          </div>
        </Card>
      </dialog>
    </div>
  );
}
