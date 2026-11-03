import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateVenueInput, VenueKind, VenueCategory, VibeProfile } from '@margi-ai/shared';
import { Button, Card, Input, Pill, Spinner } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';
import type { MockVenueDetail } from '../../mocks/data/venues';
import { MOCK_REGENCIES } from '../../mocks/data/regencies';

export function AdminVenuesPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [venues, setVenues] = useState<MockVenueDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('ALL');
  const [selectedRegency, setSelectedRegency] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [vibeTargetVenue, setVibeTargetVenue] = useState<MockVenueDetail | null>(null);
  const [isGeneratingVibe, setIsGeneratingVibe] = useState(false);
  const [vibeProfile, setVibeProfile] = useState<VibeProfile | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [vibeSuccess, setVibeSuccess] = useState(false);

  const createDialogRef = useRef<HTMLDialogElement>(null);
  const vibeDialogRef = useRef<HTMLDialogElement>(null);

  const fetchVenues = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedKind !== 'ALL') params.set('kind', selectedKind);
      if (selectedRegency !== 'ALL') params.set('regencyId', selectedRegency);

      const res = await apiClient<{ items: MockVenueDetail[] }>(
        `/admin/venues?${params.toString()}`,
      );
      setVenues(res.items);
    } catch {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchVenues();
  }, [search, selectedKind, selectedRegency]);

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog) return;
    if (isCreateOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isCreateOpen]);

  useEffect(() => {
    const dialog = vibeDialogRef.current;
    if (!dialog) return;
    if (vibeTargetVenue) {
      setVibeProfile(vibeTargetVenue.vibeProfile ?? null);
      setVibeSuccess(false);
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [vibeTargetVenue]);

  // Handle Generate Vibe
  const handleGenerateVibe = async (): Promise<void> => {
    if (!vibeTargetVenue) return;
    setIsGeneratingVibe(true);
    try {
      const res = await apiClient<{ vibeProfile: VibeProfile }>(
        `/admin/venues/${vibeTargetVenue.id}/vibe/generate`,
        { method: 'POST' },
      );
      setVibeProfile(res.vibeProfile);
    } catch {
      // Error
    } finally {
      setIsGeneratingVibe(false);
    }
  };

  // Handle Save & Re-embed
  const handleSaveAndEmbed = async (): Promise<void> => {
    if (!vibeTargetVenue || !vibeProfile) return;
    setIsEmbedding(true);
    try {
      await apiClient(`/admin/venues/${vibeTargetVenue.id}/embed`, {
        method: 'POST',
        body: { vibeProfile },
      });
      setVibeSuccess(true);
      void fetchVenues();
    } catch {
      // Error
    } finally {
      setIsEmbedding(false);
    }
  };

  // Handle Venue Creation
  const handleCreateVenue = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newVenue: CreateVenueInput = {
      slug: (formData.get('slug') as string).trim(),
      kind: formData.get('kind') as VenueKind,
      category: formData.get('category') as VenueCategory,
      nameEn: (formData.get('nameEn') as string).trim(),
      nameId: (formData.get('nameId') as string).trim(),
      descriptionEn: (formData.get('descriptionEn') as string).trim(),
      descriptionId: (formData.get('descriptionId') as string).trim(),
      regencyId: formData.get('regencyId') as string,
      lat: parseFloat(formData.get('lat') as string),
      lng: parseFloat(formData.get('lng') as string),
      imageUrl: (formData.get('imageUrl') as string).trim(),
      priceLevel: parseInt(formData.get('priceLevel') as string, 10) || 1,
      isHotspot: formData.get('isHotspot') === 'on',
      isBufferZone: formData.get('isBufferZone') === 'on',
      typicalPeakQueueMinutes: parseInt(formData.get('queueMin') as string, 10) || 0,
      avgDwellMinutes: parseInt(formData.get('dwellMin') as string, 10) || 45,
      openingHours: {
        '0': [['08:00', '18:00']],
        '1': [['08:00', '18:00']],
        '2': [['08:00', '18:00']],
        '3': [['08:00', '18:00']],
        '4': [['08:00', '18:00']],
        '5': [['08:00', '18:00']],
        '6': [['08:00', '18:00']],
      },
      etiquetteTags: ['temple-sarong'],
      isActive: true,
    };

    try {
      await apiClient('/admin/venues', {
        method: 'POST',
        body: newVenue,
      });
      setIsCreateOpen(false);
      void fetchVenues();
    } catch {
      // Error
    }
  };

  return (
    <div className="space-y-6">
      {/* Control bar: Search, filters, Add venue */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <Input
            id="admin-search-venues"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isId ? 'Cari nama destinasi atau slug...' : 'Search by venue name or slug...'}
            className="w-full sm:w-64"
          />

          <div className="flex items-center gap-1 bg-parchment p-1 rounded-pill border border-ash text-xs">
            {['ALL', 'DTW', 'MSME'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKind(k)}
                className={`px-3 py-1 rounded-pill transition cursor-pointer font-medium ${
                  selectedKind === k ? 'bg-ink text-parchment' : 'text-graphite hover:text-ink'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <select
            value={selectedRegency}
            onChange={(e) => setSelectedRegency(e.target.value)}
            className="rounded-input border border-ash bg-white px-3 py-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
          >
            <option value="ALL">{isId ? 'Semua Kabupaten (9)' : 'All Regencies (9)'}</option>
            {MOCK_REGENCIES.map((r) => (
              <option key={r.id} value={r.id}>
                {isId ? r.nameId : r.nameEn} ({r.phrStatus})
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="whitespace-nowrap"
          data-testid="add-venue-button"
        >
          + {isId ? 'Tambah Destinasi' : 'Add New Venue'}
        </Button>
      </div>

      {/* Venues Table */}
      <Card tone="white" className="border border-ash overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-parchment/80 border-b border-ash text-[11px] font-medium uppercase tracking-[0.1em] text-graphite">
              <tr>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-3">Kind</th>
                <th className="py-3 px-3">Regency</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Vibe Profile</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-graphite">
                    <Spinner size="md" className="mx-auto text-ink mb-2" />
                    <span>{isId ? 'Memuat data destinasi...' : 'Loading venues catalog...'}</span>
                  </td>
                </tr>
              ) : venues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-graphite">
                    {isId ? 'Tidak ada destinasi ditemukan' : 'No venues matching criteria'}
                  </td>
                </tr>
              ) : (
                venues.map((v) => (
                  <tr key={v.id} className="hover:bg-parchment/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded-inner object-cover border border-ash bg-parchment shrink-0"
                        />
                        <div>
                          <div className="font-medium text-ink">{isId ? v.nameId : v.nameEn}</div>
                          <div className="text-[11px] font-mono text-stone">{v.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Pill tone={v.kind === 'DTW' ? 'dark' : 'default'}>{v.kind}</Pill>
                    </td>
                    <td className="py-3 px-3">{v.regencyId}</td>
                    <td className="py-3 px-3">{v.category}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          v.isHotspot ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      />
                      <span>{v.isHotspot ? 'Hotspot' : 'Calm'}</span>
                    </td>
                    <td className="py-3 px-3">
                      {v.vibeProfile ? (
                        <span className="font-mono text-[11px] text-green-700">Embedded ✓</span>
                      ) : (
                        <span className="font-mono text-[11px] text-stone">Not embedded</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVibeTargetVenue(v);
                          setVibeProfile(v.vibeProfile ?? null);
                          setVibeSuccess(false);
                        }}
                        className="text-[11px] border border-ash"
                        data-testid="open-vibe-button"
                      >
                        {isId ? 'Review Vibe' : 'Vibe Studio'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal 1: Create Venue Form */}
      {isCreateOpen && (
        <dialog
          open
          ref={createDialogRef}
          onClose={() => setIsCreateOpen(false)}
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-2xl w-full"
        >
        <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <h2 className="text-lg font-medium text-ink">
              {isId ? 'Tambah Destinasi Baru' : 'Add New Venue'}
            </h2>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="text-stone hover:text-ink text-lg p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="venue-name-en" name="nameEn" label="Name (EN)" placeholder="Taman Ujung Water Palace" required />
              <Input id="venue-name-id" name="nameId" label="Name (ID)" placeholder="Taman Soekasada Ujung" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input id="venue-slug" name="slug" label="Slug" placeholder="taman-ujung" required />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="venue-kind" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Kind
                </label>
                <select id="venue-kind" name="kind" className="rounded-input border border-ash p-2 bg-white">
                  <option value="DTW">DTW (Attraction)</option>
                  <option value="MSME">MSME (Local Partner)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="venue-category" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Category
                </label>
                <select id="venue-category" name="category" className="rounded-input border border-ash p-2 bg-white">
                  <option value="TEMPLE">TEMPLE</option>
                  <option value="WATERFALL">WATERFALL</option>
                  <option value="RICE_TERRACE">RICE_TERRACE</option>
                  <option value="BEACH">BEACH</option>
                  <option value="CULINARY">CULINARY</option>
                  <option value="CRAFT">CRAFT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="venue-regency" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Regency
                </label>
                <select id="venue-regency" name="regencyId" className="rounded-input border border-ash p-2 bg-white">
                  {MOCK_REGENCIES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {isId ? r.nameId : r.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <Input id="venue-lat" name="lat" label="Latitude" placeholder="-8.4633" type="number" step="any" required />
              <Input id="venue-lng" name="lng" label="Longitude" placeholder="115.6308" type="number" step="any" required />
            </div>

            <Input
              id="venue-image-url"
              name="imageUrl"
              label="Image URL"
              placeholder="https://images.unsplash.com/photo-..."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="venue-desc-en" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Description (EN)
                </label>
                <textarea id="venue-desc-en" name="descriptionEn" rows={2} className="rounded-input border border-ash p-2 bg-white" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="venue-desc-id" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Description (ID)
                </label>
                <textarea id="venue-desc-id" name="descriptionId" rows={2} className="rounded-input border border-ash p-2 bg-white" required />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" name="isHotspot" className="accent-ink" />
                <span>Mark as Crowded Hotspot</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" name="isBufferZone" className="accent-ink" />
                <span>Buffer Zone</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-ash">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Venue
              </Button>
            </div>
          </form>
        </Card>
      </dialog>
      )}

      {/* Modal 2: Vibe Studio (Generate -> Review 5 dims -> Save & Embed) */}
      {vibeTargetVenue && (
        <dialog
          open
          ref={vibeDialogRef}
          onClose={() => setVibeTargetVenue(null)}
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-xl w-full"
        >
        <Card tone="white" className="p-6 sm:p-8 space-y-6 border border-ash max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <div>
              <Pill tone="dark">Agent 1 Vibe Studio</Pill>
              <h2 className="text-lg font-medium text-ink mt-1">
                {vibeTargetVenue?.nameEn}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setVibeTargetVenue(null)}
              className="text-stone hover:text-ink text-lg p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-graphite">
              {isId
                ? 'Jalankan analisis visi Agent 1 pada foto destinasi untuk mengekstrak profil 5-dimensi vibe, edit secara manual bila diperlukan, lalu simpan ke index vektor pgvector.'
                : 'Run Agent 1 vision analysis on the venue photo to extract the 5-dimensional vibe profile, fine-tune the values, and persist to pgvector index.'}
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateVibe}
              disabled={isGeneratingVibe}
              className="w-full border border-ash bg-parchment"
              data-testid="generate-vibe-button"
            >
              {isGeneratingVibe ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <span>Agent 1 Vision Processing...</span>
                </span>
              ) : (
                <span>{isId ? 'Generate Profil Vibe (AI)' : 'Generate Vibe Profile (AI)'}</span>
              )}
            </Button>

            {vibeProfile && (
              <div className="space-y-4 pt-4 border-t border-ash">
                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-graphite">
                  5 Vibe Dimensions (0 - 100)
                </div>

                <div className="space-y-3">
                  {(
                    [
                      'topography',
                      'architecture',
                      'lighting',
                      'activity',
                      'visualDensity',
                    ] as const
                  ).map((dim) => {
                    const currentDim = vibeProfile[dim];
                    const percent = Math.round(currentDim.intensity * 100);
                    return (
                      <div key={dim} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-ink capitalize font-medium">{dim} ({currentDim.label})</span>
                          <span className="font-mono text-stone">{percent}%</span>
                        </div>
                        <input
                          id={`dim-${dim}`}
                          type="range"
                          min="0"
                          max="100"
                          value={percent}
                          onChange={(e) => {
                            const newIntensity = parseInt(e.target.value, 10) / 100;
                            setVibeProfile({
                              ...vibeProfile,
                              [dim]: {
                                ...currentDim,
                                intensity: newIntensity,
                              },
                            });
                          }}
                          className="w-full accent-ink cursor-pointer"
                        />
                        <div className="text-[11px] text-graphite italic">
                          {currentDim.descriptors.join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-parchment/60 rounded-inner border border-ash/80 text-xs space-y-1">
                  <div className="text-ink font-medium">Scene Summary:</div>
                  <div className="text-graphite">{vibeProfile.sceneSummary}</div>
                  <div className="text-[11px] font-mono text-stone">
                    Confidence: {(vibeProfile.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {vibeSuccess && (
                  <div className="p-3 bg-green-50 text-green-800 rounded-inner border border-green-200 text-xs text-center font-medium">
                    ✓ Vector embedding created and persisted to pgvector!
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVibeTargetVenue(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isEmbedding}
                    onClick={handleSaveAndEmbed}
                    data-testid="save-embed-button"
                  >
                    {isEmbedding ? 'Embedding...' : 'Save & Re-embed Vector'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </dialog>
      )}
    </div>
  );
}
