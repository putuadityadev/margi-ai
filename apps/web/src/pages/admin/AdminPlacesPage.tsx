import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdminPlaceListSchema,
  AdminPlaceSchema,
  DEFAULT_CROWD_PROFILE,
  RegencySchema,
  VenueCategorySchema,
  VibeTagSchema,
  type AdminPlace,
  type AdminPlaceInput,
  type VibeTag,
} from '@margi-ai/shared';
import { z } from 'zod';
import { Button, Card, Input, Pill, Spinner } from '../../components/ui';
import { apiClient, ApiClientError } from '../../lib/apiClient';

type KindFilter = 'ALL' | 'DTW' | 'MSME' | 'OTHER';
type ReviewFilter = 'all' | 'pending';
type StatusFilter = 'active' | 'inactive' | 'all';
const PAGE_SIZE = 20;
const FIELD =
  'w-full rounded-input border border-ash bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none';

interface FormState {
  kind: AdminPlace['kind'];
  category: AdminPlaceInput['category'];
  nameEn: string;
  nameId: string;
  descriptionEn: string;
  descriptionId: string;
  regencyId: string;
  lat: string;
  lng: string;
  vibeTags: VibeTag[];
  opens: string;
  closes: string;
  hoursEdited: boolean;
  avgDwellMinutes: string;
  typicalPeakQueueMinutes: string;
  priceLevel: string;
  imageUrl: string;
  imageCredit: string;
  isHotspot: boolean;
  peakHour: string;
  peakBusyness: string;
  baseBusyness: string;
}

function blankForm(): FormState {
  const crowd = DEFAULT_CROWD_PROFILE.MSME;
  return {
    kind: 'MSME',
    category: 'CULINARY',
    nameEn: '',
    nameId: '',
    descriptionEn: '',
    descriptionId: '',
    regencyId: '',
    lat: '',
    lng: '',
    vibeTags: ['CULINARY'],
    opens: '08:00',
    closes: '20:00',
    hoursEdited: true,
    avgDwellMinutes: '45',
    typicalPeakQueueMinutes: '0',
    priceLevel: '',
    imageUrl: '/places/coffee.svg',
    imageCredit: '',
    isHotspot: false,
    peakHour: String(crowd.peakHour),
    peakBusyness: String(crowd.peakBusyness),
    baseBusyness: String(crowd.baseBusyness),
  };
}

function formFrom(place: AdminPlace): FormState {
  const monday = place.openingHours['0']?.[0];
  return {
    kind: place.kind,
    category: place.category,
    nameEn: place.nameEn,
    nameId: place.nameId,
    descriptionEn: place.descriptionEn,
    descriptionId: place.descriptionId,
    regencyId: place.regencyId,
    lat: String(place.lat),
    lng: String(place.lng),
    vibeTags: [...place.vibeTags],
    opens: monday?.[0] ?? '08:00',
    closes: monday?.[1] ?? '18:00',
    hoursEdited: false,
    avgDwellMinutes: String(place.avgDwellMinutes),
    typicalPeakQueueMinutes: String(place.typicalPeakQueueMinutes),
    priceLevel: place.priceLevel === null ? '' : String(place.priceLevel),
    imageUrl: place.imageUrl,
    imageCredit: place.imageCredit ?? '',
    isHotspot: place.isHotspot,
    peakHour: String(place.crowd.peakHour),
    peakBusyness: String(place.crowd.peakBusyness),
    baseBusyness: String(place.crowd.baseBusyness),
  };
}

function dailyHours(opens: string, closes: string): AdminPlaceInput['openingHours'] {
  const day: [string, string][] = [[opens, closes]];
  return { '0': day, '1': day, '2': day, '3': day, '4': day, '5': day, '6': day };
}

function payloadFrom(form: FormState): Record<string, unknown> {
  return {
    kind: form.kind,
    category: form.category,
    nameEn: form.nameEn,
    nameId: form.nameId,
    descriptionEn: form.descriptionEn,
    descriptionId: form.descriptionId,
    regencyId: form.regencyId,
    lat: Number(form.lat),
    lng: Number(form.lng),
    vibeTags: form.vibeTags,
    ...(form.hoursEdited ? { openingHours: dailyHours(form.opens, form.closes) } : {}),
    avgDwellMinutes: Number(form.avgDwellMinutes),
    typicalPeakQueueMinutes: Number(form.typicalPeakQueueMinutes),
    priceLevel: form.priceLevel === '' ? null : Number(form.priceLevel),
    imageUrl: form.imageUrl,
    imageCredit: form.imageCredit.trim() === '' ? null : form.imageCredit.trim(),
    isHotspot: form.isHotspot,
    crowd: {
      peakHour: Number(form.peakHour),
      peakBusyness: Number(form.peakBusyness),
      baseBusyness: Number(form.baseBusyness),
    },
  };
}

function errorText(error: unknown, isId: boolean): string {
  if (error instanceof ApiClientError) return error.message;
  return isId ? 'Gagal menyimpan. Periksa koneksi.' : 'Could not save. Check your connection.';
}

/** Curator console: add, edit and deactivate destinations and local businesses. */
export function AdminPlacesPage(): ReactNode {
  const { i18n, t } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [review, setReview] = useState<ReviewFilter>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const params = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(kind === 'ALL' ? {} : { kind }),
    ...(review === 'pending' ? { review } : {}),
    status,
    page,
    pageSize: PAGE_SIZE,
  };
  const list = useQuery({
    queryKey: ['admin', 'places', params],
    queryFn: ({ signal }) =>
      apiClient('/admin/places', { schema: AdminPlaceListSchema, params, signal }),
    placeholderData: keepPreviousData,
  });
  const regencies = useQuery({
    queryKey: ['admin', 'regencies'],
    queryFn: ({ signal }) =>
      apiClient('/admin/regencies', { schema: z.array(RegencySchema), signal }),
    staleTime: Infinity,
  });

  const refresh = (): Promise<void> => client.invalidateQueries({ queryKey: ['admin', 'places'] });
  const save = useMutation({
    mutationFn: (input: { id: string | null; body: Record<string, unknown> }) =>
      input.id
        ? apiClient(`/admin/places/${input.id}`, {
            method: 'PATCH',
            body: input.body,
            schema: AdminPlaceSchema,
          })
        : apiClient('/admin/places', {
            method: 'POST',
            body: input.body,
            schema: AdminPlaceSchema,
          }),
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
    onError: (error) => setFormError(errorText(error, isId)),
  });
  const toggle = useMutation({
    mutationFn: (place: AdminPlace) =>
      place.isActive
        ? apiClient(`/admin/places/${place.id}`, { method: 'DELETE' })
        : apiClient(`/admin/places/${place.id}`, { method: 'PATCH', body: { isActive: true } }),
    onSuccess: refresh,
  });
  const approve = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/places/${id}`, { method: 'PATCH', body: { reviewStatus: 'APPROVED' } }),
    onSuccess: refresh,
  });
  const reembed = useMutation({
    mutationFn: (id: string) => apiClient(`/admin/places/${id}/embed`, { method: 'POST' }),
    onSuccess: refresh,
  });

  const open = (id: string | null, form: FormState): void => {
    setFormError(null);
    setEditing({ id, form });
  };
  const patch = (changes: Partial<FormState>): void =>
    setEditing((current) =>
      current ? { ...current, form: { ...current.form, ...changes } } : current,
    );

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!editing) return;
    const { form } = editing;
    if ((form.vibeTags.length === 0 && form.kind !== 'OTHER') || !form.regencyId) {
      setFormError(
        isId
          ? 'Pilih kabupaten dan minimal satu suasana.'
          : 'Pick a regency and at least one mood.',
      );
      return;
    }
    setFormError(null);
    save.mutate({ id: editing.id, body: payloadFrom(form) });
  };

  const text = {
    add: isId ? 'Tambah tempat' : 'Add place',
    search: isId ? 'Cari nama' : 'Search name',
    all: isId ? 'Semua' : 'All',
    dtw: isId ? 'Destinasi' : 'Destinations',
    msme: 'UMKM',
    other: isId ? 'Dari pencarian' : 'From search',
    pending: isId ? 'Perlu ditinjau' : 'Needs review',
    approve: isId ? 'Setujui' : 'Approve',
    anyReview: isId ? 'Semua tinjauan' : 'Any review',
    learnedFrom: isId ? 'Ditemukan lewat' : 'Found via',
    active: isId ? 'Aktif' : 'Active',
    inactive: isId ? 'Nonaktif' : 'Inactive',
    edit: isId ? 'Ubah' : 'Edit',
    deactivate: isId ? 'Nonaktifkan' : 'Deactivate',
    restore: isId ? 'Aktifkan' : 'Restore',
    noEmbed: isId ? 'Belum ada vektor' : 'No embedding',
    retry: isId ? 'Buat vektor' : 'Embed now',
    empty: isId ? 'Tidak ada tempat.' : 'No places found.',
    loadError: isId ? 'Daftar gagal dimuat.' : 'Could not load places.',
  };

  return (
    <section className="space-y-5" aria-label={text.add}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            id="admin-search"
            label={text.search}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Type"
          className={`${FIELD} w-auto`}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as KindFilter);
            setPage(1);
          }}
        >
          <option value="ALL">{text.all}</option>
          <option value="DTW">{text.dtw}</option>
          <option value="MSME">{text.msme}</option>
          <option value="OTHER">{text.other}</option>
        </select>
        <select
          aria-label="Review"
          className={`${FIELD} w-auto`}
          value={review}
          onChange={(event) => {
            setReview(event.target.value as ReviewFilter);
            setPage(1);
          }}
        >
          <option value="all">{text.anyReview}</option>
          <option value="pending">{text.pending}</option>
        </select>
        <select
          aria-label="Status"
          className={`${FIELD} w-auto`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
        >
          <option value="active">{text.active}</option>
          <option value="inactive">{text.inactive}</option>
          <option value="all">{text.all}</option>
        </select>
        <Button variant="primary" onClick={() => open(null, blankForm())}>
          + {text.add}
        </Button>
      </div>

      {list.isError && (
        <p role="alert" className="text-sm text-red-800">
          {text.loadError}
        </p>
      )}
      {list.isLoading && <Spinner size="md" />}
      {list.data?.items.length === 0 && <p className="text-sm text-graphite">{text.empty}</p>}

      <ul className="divide-y divide-ash border border-ash bg-white">
        {list.data?.items.map((place) => (
          <li key={place.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {isId ? place.nameId : place.nameEn}
              </p>
              <p className="truncate font-mono text-[11px] text-graphite">
                {place.slug} · {t(`categories.${place.category}`)} · {place.regencyId}
              </p>
            </div>
            <Pill tone={place.kind === 'DTW' ? 'dark' : 'sim'}>
              {place.kind === 'DTW' ? text.dtw : place.kind === 'MSME' ? text.msme : text.other}
            </Pill>
            {place.reviewStatus === 'PENDING' && (
              <>
                <span className="font-mono text-[11px] text-graphite">
                  {text.pending}
                  {place.learnedFrom ? ` · ${text.learnedFrom} ${place.learnedFrom}` : ''}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => approve.mutate(place.id)}
                  disabled={approve.isPending}
                >
                  {text.approve}
                </Button>
              </>
            )}
            {!place.hasEmbedding && (
              <button
                type="button"
                className="text-[11px] underline"
                onClick={() => reembed.mutate(place.id)}
                disabled={reembed.isPending}
              >
                {text.noEmbed} · {text.retry}
              </button>
            )}
            <Button size="sm" variant="ghost" onClick={() => open(place.id, formFrom(place))}>
              {text.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggle.mutate(place)}
              disabled={toggle.isPending}
            >
              {place.isActive ? text.deactivate : text.restore}
            </Button>
          </li>
        ))}
      </ul>

      {list.data && list.data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-graphite">
          <span>
            {list.data.total} {isId ? 'tempat' : 'places'} · {page}/
            {Math.ceil(list.data.total / PAGE_SIZE)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ←
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page * PAGE_SIZE >= list.data.total}
              onClick={() => setPage(page + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <PlaceForm
          title={editing.id ? text.edit : text.add}
          form={editing.form}
          regencies={regencies.data ?? []}
          isId={isId}
          isSaving={save.isPending}
          error={formError}
          onChange={patch}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

interface PlaceFormProps {
  readonly title: string;
  readonly form: FormState;
  readonly regencies: readonly z.infer<typeof RegencySchema>[];
  readonly isId: boolean;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly onChange: (changes: Partial<FormState>) => void;
  readonly onSubmit: (event: FormEvent) => void;
  readonly onClose: () => void;
}

function PlaceForm({
  title,
  form,
  regencies,
  isId,
  isSaving,
  error,
  onChange,
  onSubmit,
  onClose,
}: PlaceFormProps): ReactNode {
  const { t } = useTranslation('explore');
  const setKind = (kind: FormState['kind']): void => {
    const crowd = DEFAULT_CROWD_PROFILE[kind];
    onChange({
      kind,
      peakHour: String(crowd.peakHour),
      peakBusyness: String(crowd.peakBusyness),
      baseBusyness: String(crowd.baseBusyness),
    });
  };
  const toggleTag = (tag: VibeTag): void => {
    const has = form.vibeTags.includes(tag);
    onChange({
      vibeTags: has
        ? form.vibeTags.filter((item) => item !== tag)
        : [...form.vibeTags, tag].slice(0, 4),
    });
  };
  const label = {
    type: isId ? 'Jenis' : 'Type',
    category: isId ? 'Kategori' : 'Category',
    regency: isId ? 'Kabupaten' : 'Regency',
    moods: isId ? 'Suasana (maks. 4)' : 'Moods (max 4)',
    opens: isId ? 'Buka' : 'Opens',
    closes: isId ? 'Tutup' : 'Closes',
    dwell: isId ? 'Durasi kunjungan (mnt)' : 'Visit length (min)',
    queue: isId ? 'Antre puncak (mnt)' : 'Peak queue (min)',
    price: isId ? 'Harga (1-4)' : 'Price (1-4)',
    image: isId ? 'Foto (https:// atau /path)' : 'Photo (https:// or /path)',
    credit: isId ? 'Kredit foto' : 'Photo credit',
    hotspot: isId ? 'Destinasi terkenal (hotspot)' : 'Well-known hotspot',
    crowd: isId ? 'Kurva keramaian' : 'Crowd curve',
    peakHour: isId ? 'Jam puncak' : 'Peak hour',
    peak: isId ? 'Puncak (0-100)' : 'Peak (0-100)',
    base: isId ? 'Dasar (0-100)' : 'Base (0-100)',
    save: isId ? 'Simpan' : 'Save',
    saving: isId ? 'Menyimpan…' : 'Saving…',
    cancel: isId ? 'Batal' : 'Cancel',
    hoursNote: isId ? 'Jam yang sama setiap hari.' : 'Same hours every day.',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4"
    >
      <Card tone="white" className="my-6 w-full max-w-2xl space-y-5 border border-ash p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={label.cancel}
            className="p-1 text-lg text-stone hover:text-ink"
          >
            ✕
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-input border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-graphite">
              {label.type}
              <select
                className={FIELD}
                value={form.kind}
                onChange={(event) => setKind(event.target.value as FormState['kind'])}
              >
                <option value="DTW">{isId ? 'Destinasi wisata' : 'Destination'}</option>
                <option value="MSME">UMKM</option>
                <option value="OTHER">{isId ? 'Tempat dari pencarian' : 'Searched place'}</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-graphite">
              {label.category}
              <select
                className={FIELD}
                value={form.category}
                onChange={(event) =>
                  onChange({ category: event.target.value as FormState['category'] })
                }
              >
                {VenueCategorySchema.options.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}`)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              id="pl-name-en"
              label="Name (EN)"
              value={form.nameEn}
              onChange={(e) => onChange({ nameEn: e.target.value })}
              required
            />
            <Input
              id="pl-name-id"
              label="Nama (ID)"
              value={form.nameId}
              onChange={(e) => onChange({ nameId: e.target.value })}
              required
            />
          </div>
          <label className="block space-y-1 text-xs text-graphite">
            Description (EN)
            <textarea
              className={FIELD}
              rows={2}
              value={form.descriptionEn}
              onChange={(e) => onChange({ descriptionEn: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-xs text-graphite">
            Deskripsi (ID)
            <textarea
              className={FIELD}
              rows={2}
              value={form.descriptionId}
              onChange={(e) => onChange({ descriptionId: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-graphite">
              {label.regency}
              <select
                className={FIELD}
                value={form.regencyId}
                onChange={(e) => onChange({ regencyId: e.target.value })}
              >
                <option value="">—</option>
                {regencies.map((regency) => (
                  <option key={regency.id} value={regency.id}>
                    {isId ? regency.nameId : regency.nameEn}
                  </option>
                ))}
              </select>
            </label>
            <Input
              id="pl-lat"
              label="Latitude"
              inputMode="decimal"
              value={form.lat}
              onChange={(e) => onChange({ lat: e.target.value })}
            />
            <Input
              id="pl-lng"
              label="Longitude"
              inputMode="decimal"
              value={form.lng}
              onChange={(e) => onChange({ lng: e.target.value })}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs text-graphite">{label.moods}</legend>
            <div className="flex flex-wrap gap-2">
              {VibeTagSchema.options.map((tag) => (
                <label
                  key={tag}
                  className="flex cursor-pointer items-center gap-1.5 border border-ash px-3 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={form.vibeTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  {t(`vibe.tags.${tag}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="pl-opens"
              label={label.opens}
              type="time"
              value={form.opens}
              onChange={(e) => onChange({ opens: e.target.value, hoursEdited: true })}
            />
            <Input
              id="pl-closes"
              label={label.closes}
              type="time"
              value={form.closes}
              onChange={(e) => onChange({ closes: e.target.value, hoursEdited: true })}
            />
            <p className="self-end pb-2 text-[11px] text-graphite">{label.hoursNote}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="pl-dwell"
              label={label.dwell}
              inputMode="numeric"
              value={form.avgDwellMinutes}
              onChange={(e) => onChange({ avgDwellMinutes: e.target.value })}
            />
            <Input
              id="pl-queue"
              label={label.queue}
              inputMode="numeric"
              value={form.typicalPeakQueueMinutes}
              onChange={(e) => onChange({ typicalPeakQueueMinutes: e.target.value })}
            />
            <Input
              id="pl-price"
              label={label.price}
              inputMode="numeric"
              value={form.priceLevel}
              onChange={(e) => onChange({ priceLevel: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="pl-image"
              label={label.image}
              value={form.imageUrl}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
            />
            <Input
              id="pl-credit"
              label={label.credit}
              value={form.imageCredit}
              onChange={(e) => onChange({ imageCredit: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={form.isHotspot}
              onChange={(e) => onChange({ isHotspot: e.target.checked })}
            />
            {label.hotspot}
          </label>
          <details className="border border-ash p-3">
            <summary className="cursor-pointer text-xs font-medium text-ink">{label.crowd}</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Input
                id="pl-peak-hour"
                label={label.peakHour}
                inputMode="numeric"
                value={form.peakHour}
                onChange={(e) => onChange({ peakHour: e.target.value })}
              />
              <Input
                id="pl-peak"
                label={label.peak}
                inputMode="numeric"
                value={form.peakBusyness}
                onChange={(e) => onChange({ peakBusyness: e.target.value })}
              />
              <Input
                id="pl-base"
                label={label.base}
                inputMode="numeric"
                value={form.baseBusyness}
                onChange={(e) => onChange({ baseBusyness: e.target.value })}
              />
            </div>
          </details>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              {label.cancel}
            </Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? label.saving : label.save}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
