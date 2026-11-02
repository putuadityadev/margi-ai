import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreatePresetInput } from '@margi-ai/shared';
import { Button, Card, Input, Pill, Spinner } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { MOCK_VENUES } from '../../mocks/data/venues';

export function AdminPresetsPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [presets, setPresets] = useState<CreatePresetInput[]>([...MOCK_PRESETS]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addDialogRef = useRef<HTMLDialogElement>(null);

  const fetchPresets = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiClient<{ items: CreatePresetInput[] }>('/presets');
      setPresets(res.items);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPresets();
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

    const preset: CreatePresetInput = {
      id: (formData.get('id') as string).trim(),
      originVenueId: formData.get('originVenueId') as string,
      titleEn: (formData.get('titleEn') as string).trim(),
      titleId: (formData.get('titleId') as string).trim(),
      subtitleEn: (formData.get('subtitleEn') as string || formData.get('titleEn') as string).trim(),
      subtitleId: (formData.get('subtitleId') as string || formData.get('titleId') as string).trim(),
      imageUrl: (formData.get('imageUrl') as string).trim(),
      imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      defaultDay: parseInt(formData.get('defaultDay') as string, 10) || 5,
      defaultHour: parseInt(formData.get('defaultHour') as string, 10) || 9,
      simPeakDay: parseInt(formData.get('defaultDay') as string, 10) || 5,
      simPeakHour: parseInt(formData.get('defaultHour') as string, 10) || 9,
      sortOrder: 1,
      isActive: true,
    };

    try {
      await apiClient('/admin/presets', {
        method: 'POST',
        body: preset,
      });
      setIsAddOpen(false);
      void fetchPresets();
    } catch {
      // Error
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await apiClient(`/admin/presets/${id}`, { method: 'DELETE' });
      void fetchPresets();
    } catch {
      // Error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink">
            {isId ? 'Preset Kurasi Beranda' : 'Homepage Curated Presets'}
          </h2>
          <p className="text-xs text-graphite">
            {isId
              ? 'Kartu inspirasi 1-klik di landing page MARGI AI yang menghubungkan wisatawan ke analisis instan.'
              : '1-click inspiration cards on the MARGI AI landing page that jump straight into analysis.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          data-testid="add-preset-button"
        >
          + {isId ? 'Tambah Preset' : 'Add Preset'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => (
          <Card key={preset.id} tone="white" className="p-4 border border-ash flex items-start gap-4">
            <img
              src={preset.imageUrl}
              alt=""
              className="w-20 h-20 rounded-inner object-cover border border-ash bg-parchment shrink-0"
            />
            <div className="flex-1 space-y-1 min-w-0">
              <Pill tone="default">{preset.id}</Pill>
              <h3 className="text-sm font-medium text-ink truncate">
                {isId ? preset.titleId : preset.titleEn}
              </h3>
              <p className="text-xs text-graphite font-mono">
                Day {preset.defaultDay} · {preset.defaultHour}:00 WITA
              </p>
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(preset.id)}
                  className="text-xs text-red-600 hover:bg-red-50 p-1"
                >
                  🗑️ {isId ? 'Hapus' : 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Preset Dialog */}
      {isAddOpen && (
        <dialog
          open
          ref={addDialogRef}
          onClose={() => setIsAddOpen(false)}
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
        >
          <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">Add Curated Preset</h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-stone hover:text-ink text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <Input id="preset-id" name="id" label="Preset Slug ID" placeholder="lempuyang-morning" required />
              <Input id="preset-title-en" name="titleEn" label="Title (EN)" placeholder="Gates of Heaven — Pura Lempuyang" required />
              <Input id="preset-title-id" name="titleId" label="Title (ID)" placeholder="Gerbang Surga — Pura Lempuyang" required />
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="preset-origin" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Origin Venue
                </label>
                <select id="preset-origin" name="originVenueId" className="rounded-input border border-ash p-2 bg-white">
                  {MOCK_VENUES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {isId ? v.nameId : v.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <Input id="preset-image" name="imageUrl" label="Cover Image URL" placeholder="https://..." required />

              <div className="grid grid-cols-2 gap-4">
                <Input id="preset-day" name="defaultDay" label="Default Day (0-6)" type="number" min="0" max="6" defaultValue="5" required />
                <Input id="preset-hour" name="defaultHour" label="Default Hour WITA (0-23)" type="number" min="0" max="23" defaultValue="9" required />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Preset
                </Button>
              </div>
            </form>
          </Card>
        </dialog>
      )}
    </div>
  );
}
