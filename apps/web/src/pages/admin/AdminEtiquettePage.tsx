import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Pill } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';

interface EtiquetteRule {
  id: string;
  tag: string;
  severity: number;
  textEn: string;
  textId: string;
}

export function AdminEtiquettePage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [rules, setRules] = useState<EtiquetteRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addDialogRef = useRef<HTMLDialogElement>(null);

  const fetchRules = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiClient<{ items: EtiquetteRule[] }>('/admin/etiquette-rules');
      setRules(res.items);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRules();
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

    const newRule = {
      id: `rule-${Date.now()}`,
      tag: (formData.get('tag') as string).toUpperCase().trim(),
      severity: parseInt(formData.get('severity') as string, 10) || 1,
      textEn: (formData.get('textEn') as string).trim(),
      textId: (formData.get('textId') as string).trim(),
    };

    try {
      await apiClient('/admin/etiquette-rules', {
        method: 'POST',
        body: newRule,
      });
      setIsAddOpen(false);
      void fetchRules();
    } catch {
      // Error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink">
            {isId ? 'Aturan Etika Budaya Bali' : 'Balinese Cultural Etiquette Rules'}
          </h2>
          <p className="text-xs text-graphite">
            {isId
              ? 'Petunjuk tata krama sakral yang disuntikkan ke dalam rekomendasi Agent 3 sesuai Perda Bali.'
              : 'Sacred behavioural guidelines injected into Agent 3 itinerary bundles per Bali regulations.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          data-testid="add-rule-button"
        >
          + {isId ? 'Tambah Aturan' : 'Add Rule'}
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} tone="white" className="p-4 border border-ash flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Pill tone={rule.severity === 3 ? 'dark' : 'default'}>
                  Severity {rule.severity}: {rule.tag}
                </Pill>
              </div>
              <p className="text-xs font-medium text-ink">{rule.textEn}</p>
              <p className="text-xs text-graphite">{rule.textId}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Rule Dialog */}
      {isAddOpen && (
        <dialog
          open
          ref={addDialogRef}
          onClose={() => setIsAddOpen(false)}
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-md w-full"
        >
          <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">Add Etiquette Rule</h2>
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
                <Input id="rule-tag" name="tag" label="Tag" placeholder="TEMPLE" required />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rule-severity" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                    Severity (1-3)
                  </label>
                  <select id="rule-severity" name="severity" className="rounded-input border border-ash p-2 bg-white">
                    <option value="1">1 - Informational</option>
                    <option value="2">2 - Recommended</option>
                    <option value="3">3 - Mandatory Sacred</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="rule-text-en" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Rule Text (EN)
                </label>
                <textarea id="rule-text-en" name="textEn" rows={2} className="rounded-input border border-ash p-2 bg-white" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="rule-text-id" className="font-medium text-graphite uppercase tracking-[0.1em] text-[11px]">
                  Rule Text (ID)
                </label>
                <textarea id="rule-text-id" name="textId" rows={2} className="rounded-input border border-ash p-2 bg-white" required />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Rule
                </Button>
              </div>
            </form>
          </Card>
        </dialog>
      )}
    </div>
  );
}
