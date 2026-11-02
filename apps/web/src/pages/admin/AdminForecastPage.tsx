import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Pill, Spinner } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';
import { MOCK_VENUES } from '../../mocks/data/venues';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AdminForecastPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [selectedVenueId, setSelectedVenueId] = useState<string>(MOCK_VENUES[0]?.id ?? '');
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // CSV Import Modal
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvDialogRef = useRef<HTMLDialogElement>(null);

  const fetchForecast = async (venueId: string): Promise<void> => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient<{ forecasts: Array<{ dayOfWeek: number; hour: number; busyness: number }> }>(
        `/admin/venues/${venueId}/forecast`,
      );
      const mat: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 20));
      if (res.forecasts) {
        for (const item of res.forecasts) {
          const targetRow = mat[item.dayOfWeek];
          if (targetRow) {
            targetRow[item.hour] = item.busyness;
          }
        }
      }
      setMatrix(mat);
    } catch {
      // Fallback: 7x24 20s
      setMatrix(Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 20)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVenueId) {
      void fetchForecast(selectedVenueId);
    }
  }, [selectedVenueId]);

  useEffect(() => {
    const dialog = csvDialogRef.current;
    if (!dialog) return;
    if (isCsvOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isCsvOpen]);

  const handleCellChange = (dayIdx: number, hourIdx: number, value: number): void => {
    const clamped = Math.max(0, Math.min(100, isNaN(value) ? 0 : value));
    setMatrix((prev) => {
      const copy = prev.map((row) => [...row]);
      if (copy[dayIdx]) {
        copy[dayIdx][hourIdx] = clamped;
      }
      return copy;
    });
  };

  const handleSaveForecast = async (): Promise<void> => {
    if (!selectedVenueId) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const forecasts: Array<{ dayOfWeek: number; hour: number; busyness: number }> = [];
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          forecasts.push({
            dayOfWeek: d,
            hour: h,
            busyness: matrix[d]?.[h] ?? 20,
          });
        }
      }

      await apiClient(`/admin/venues/${selectedVenueId}/forecast`, {
        method: 'PUT',
        body: { forecasts },
      });
      setFeedback(isId ? 'Prakiraan berhasil diperbarui!' : 'Forecast saved successfully!');
    } catch {
      setFeedback(isId ? 'Gagal menyimpan matriks.' : 'Failed to save matrix.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvImport = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setCsvError(null);

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      setCsvError('CSV must include header "day,hour,busyness" and at least one row.');
      return;
    }

    try {
      const res = await apiClient<{ success: boolean; imported: number }>(
        `/admin/venues/${selectedVenueId}/forecast/import-csv`,
        {
          method: 'POST',
          body: { csvText: csvContent },
        },
      );
      setIsCsvOpen(false);
      setCsvContent('');
      void fetchForecast(selectedVenueId);
      setFeedback(
        isId
          ? `${res.imported} baris CSV berhasil diimpor!`
          : `Successfully imported ${res.imported} hourly forecast rows!`,
      );
    } catch {
      setCsvError('Failed to import CSV. Check format: day (0-6), hour (0-23), busyness (0-100)');
    }
  };

  const selectedVenue = MOCK_VENUES.find((v) => v.id === selectedVenueId);

  // Cell heatmap background color helper
  const getCellBg = (val: number): string => {
    if (val < 25) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    if (val < 50) return 'bg-emerald-100 text-emerald-950 border-emerald-300';
    if (val < 75) return 'bg-amber-100 text-amber-950 border-amber-300';
    return 'bg-red-100 text-red-950 border-red-300 font-medium';
  };

  return (
    <div className="space-y-6">
      {/* Top Selector & Action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="forecast-venue-select" className="text-xs font-medium text-graphite uppercase tracking-[0.1em]">
            {isId ? 'Pilih Destinasi:' : 'Select Venue:'}
          </label>
          <select
            id="forecast-venue-select"
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            className="rounded-input border border-ash bg-white px-3.5 py-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer min-w-64"
          >
            {MOCK_VENUES.map((v) => (
              <option key={v.id} value={v.id}>
                {isId ? v.nameId : v.nameEn} ({v.kind})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCsvOpen(true)}
            data-testid="open-csv-button"
            className="text-xs border border-ash bg-white"
          >
            📥 {isId ? 'Impor CSV' : 'Import CSV'}
          </Button>

          {/* BestTime disabled in offline mock */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-xs border border-ash bg-parchment opacity-60 cursor-not-allowed"
            >
              🔄 Sync from BestTime
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-48 p-2 bg-ink text-white text-[10px] rounded-inner font-mono">
              BestTime live sync is disabled in prototype offline mock.
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            disabled={isSaving}
            onClick={handleSaveForecast}
            data-testid="save-forecast-button"
          >
            {isSaving ? 'Saving...' : '💾 Save Matrix'}
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-parchment rounded-inner border border-ash text-xs font-medium text-ink flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {/* 7x24 Matrix Editor */}
      <Card tone="white" className="p-4 sm:p-6 border border-ash space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-medium text-ink">
              {isId ? 'Matriks Kepadatan 7x24 Jam' : '7×24 Hourly Crowd Curve'}
            </h2>
            <p className="text-xs text-graphite">
              {isId
                ? `Prakiraan kepadatan pengunjung (0 - 100) untuk ${selectedVenue?.nameEn ?? 'venue'}. Klik pada sel untuk mengedit.`
                : `Hourly crowd density (0 - 100) for ${selectedVenue?.nameEn ?? 'venue'}. Click any cell to adjust values.`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-stone">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-300" />
              <span>Calm</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-300" />
              <span>Moderate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-red-100 border border-red-300" />
              <span>Peak</span>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <Spinner size="lg" className="mx-auto text-ink" />
            <p className="text-xs text-graphite font-mono">Loading matrix...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px] font-mono text-center">
              <thead>
                <tr>
                  <th className="p-1 text-left text-graphite font-medium w-12">Day</th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th key={h} className="p-1 text-stone font-normal">
                      {String(h).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((dayName, dayIdx) => {
                  const row = matrix[dayIdx] ?? [];
                  return (
                    <tr key={dayName}>
                      <td className="p-1 text-left font-medium text-ink">{dayName}</td>
                      {Array.from({ length: 24 }).map((_, hourIdx) => {
                        const val = row[hourIdx] ?? 20;
                        return (
                          <td key={hourIdx} className="p-0.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={val}
                              onChange={(e) =>
                                handleCellChange(dayIdx, hourIdx, parseInt(e.target.value, 10))
                              }
                              className={`w-8 h-7 text-center rounded-xs border text-[10px] focus:outline-ink ${getCellBg(
                                val,
                              )}`}
                              title={`${dayName} ${String(hourIdx).padStart(2, '0')}:00 - ${val}%`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CSV Import Dialog */}
      {isCsvOpen && (
        <dialog
          open
          ref={csvDialogRef}
          onClose={() => setIsCsvOpen(false)}
          className="fixed inset-0 m-auto z-50 rounded-card p-0 bg-transparent border-0 backdrop:bg-ink/60 max-w-lg w-full"
        >
          <Card tone="white" className="p-6 sm:p-8 space-y-5 border border-ash">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">Import Crowd Curve from CSV</h2>
              <button
                type="button"
                onClick={() => setIsCsvOpen(false)}
                className="text-stone hover:text-ink text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-graphite">
              Paste CSV formatted as <code className="bg-parchment px-1 font-mono">day,hour,busyness</code> where day is 0 (Mon) to 6 (Sun), hour is 0 to 23, and busyness is 0 to 100.
            </p>

            {csvError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-inner border border-red-200 text-xs">
                {csvError}
              </div>
            )}

            <form onSubmit={handleCsvImport} className="space-y-4">
              <textarea
                rows={8}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                aria-label="CSV Content"
                placeholder="day,hour,busyness&#10;0,8,25&#10;0,9,45&#10;0,10,75..."
                className="w-full rounded-input border border-ash p-3 font-mono text-xs bg-white focus-visible:outline-2 focus-visible:outline-ink"
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCsvOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" data-testid="submit-csv-button">
                  Import Rows
                </Button>
              </div>
            </form>
          </Card>
        </dialog>
      )}
    </div>
  );
}
