import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateCorridorInput } from '@margi-ai/shared';
import { Button, Card, Input, Pill, Spinner } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';

export function AdminCorridorsPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [corridors, setCorridors] = useState<CreateCorridorInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addDialogRef = useRef<HTMLDialogElement>(null);

  const fetchCorridors = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiClient<{ items: CreateCorridorInput[] }>('/admin/corridors');
      setCorridors(res.items);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCorridors();
  }, []);

  useEffect(() => {
    const dialog = addDialogRef.current;
    if (!dialog) return;
    if (isAddOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isAddOpen]);

  const handleCreate = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = (formData.get('name') as string).trim();
    const id = (formData.get('id') as string)?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const centerLat = parseFloat(formData.get('centerLat') as string);
    const centerLng = parseFloat(formData.get('centerLng') as string);
    const radiusMeters = parseInt(formData.get('radiusMeters') as string, 10);
    const typicalDelayMinutes = parseInt(formData.get('typicalDelayMinutes') as string, 10) || 0;
    const start = (formData.get('startTime') as string) || '16:00';
    const end = (formData.get('endTime') as string) || '19:00';

    const newCorridor: CreateCorridorInput = {
      id,
      name,
      centerLat,
      centerLng,
      radiusMeters,
      typicalDelayMinutes,
      penaltyWindows: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          start,
          end,
        },
      ],
    };

    try {
      await apiClient('/admin/corridors', {
        method: 'POST',
        body: newCorridor,
      });
      setIsAddOpen(false);
      void fetchCorridors();
    } catch {
      // Error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink">
            {isId ? 'Koridor Kemacetan Bali' : 'Traffic Congestion Corridors'}
          </h2>
          <p className="text-xs text-graphite">
            {isId
              ? 'Zona penalti waktu tempuh yang dihitung oleh Agent 3 saat memetakan rute antar-kabupaten.'
              : 'Travel-time penalty corridors used by Agent 3 when planning cross-regency routes.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          data-testid="add-corridor-button"
        >
          + {isId ? 'Tambah Koridor' : 'Add Corridor'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {corridors.map((c) => (
            <Card key={c.id} tone="white" className="p-5 border border-ash space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-stone">{c.id}</span>
                  <h3 className="text-sm font-medium text-ink">{c.name}</h3>
                </div>
                <Pill tone="dark">+{c.typicalDelayMinutes}m delay</Pill>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-parchment rounded-inner border border-ash/70 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-stone">
                    {isId ? 'Radius & Koordinat' : 'Radius & Coordinates'}
                  </span>
                  <div className="font-mono text-ink text-[11px]">
                    {c.radiusMeters}m radius
                  </div>
                  <div className="font-mono text-graphite text-[10px]">
                    {c.centerLat.toFixed(4)}, {c.centerLng.toFixed(4)}
                  </div>
                </div>

                <div className="p-2.5 bg-parchment rounded-inner border border-ash/70 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-stone">
                    {isId ? 'Jendela Penalti' : 'Penalty Windows'}
                  </span>
                  {c.penaltyWindows.map((pw, i) => (
                    <div key={i} className="font-mono text-ink text-[11px]">
                      {pw.start} - {pw.end} (All Days)
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Corridor Dialog */}
      {isAddOpen && (
        <dialog
          open
          ref={addDialogRef}
          onClose={() => setIsAddOpen(false)}
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-lg w-full"
        >
          <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">
                {isId ? 'Tambah Koridor Macet' : 'Add Congestion Corridor'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-stone hover:text-ink text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <Input id="corridor-id" name="id" label="ID Slug" placeholder="ubud-monkey-forest-rd" required />
                <Input id="corridor-name" name="name" label="Corridor Name" placeholder="Ubud Monkey Forest Rd" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="corridor-lat" name="centerLat" label="Center Latitude" type="number" step="any" placeholder="-8.5190" required />
                <Input id="corridor-lng" name="centerLng" label="Center Longitude" type="number" step="any" placeholder="115.2600" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="corridor-radius" name="radiusMeters" label="Radius (Meters)" type="number" placeholder="2500" required />
                <Input id="corridor-delay" name="typicalDelayMinutes" label="Typical Delay (Min)" type="number" placeholder="20" required />
              </div>

              <div className="p-3 bg-parchment rounded-inner border border-ash/70 space-y-2">
                <span className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  {isId ? 'Jendela Jam Padat (Peak Window)' : 'Peak Hour Window'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Input id="corridor-start-time" name="startTime" label="Start (HH:mm)" placeholder="16:00" defaultValue="16:00" required />
                  <Input id="corridor-end-time" name="endTime" label="End (HH:mm)" placeholder="19:00" defaultValue="19:00" required />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                  {isId ? 'Batal' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {isId ? 'Simpan Koridor' : 'Save Corridor'}
                </Button>
              </div>
            </form>
          </Card>
        </dialog>
      )}
    </div>
  );
}
