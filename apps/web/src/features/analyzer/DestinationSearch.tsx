import { useState, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_VENUES } from '../../mocks/data/venues';
import { SearchIcon, MapPinIcon, CheckCircleIcon } from '../../components/ui';

export interface DestinationSearchProps {
  readonly onSelectDestination?: ((venueId: string) => void) | undefined;
  readonly className?: string | undefined;
}

const POPULAR_DTWS = MOCK_VENUES.filter((v) => v.kind === 'DTW');

export function DestinationSearch({
  onSelectDestination,
  className = '',
}: DestinationSearchProps): ReactNode {
  const { i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');

  const destinationVenueId = useAnalyzerStore((s) => s.destinationVenueId);
  const setDestinationVenueId = useAnalyzerStore((s) => s.setDestinationVenueId);
  const setOriginVenueId = useAnalyzerStore((s) => s.setOriginVenueId);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredVenues = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_DTWS.slice(0, 5);
    return POPULAR_DTWS.filter(
      (v) =>
        v.nameEn.toLowerCase().includes(q) ||
        v.nameId.toLowerCase().includes(q) ||
        v.slug.toLowerCase().includes(q) ||
        v.regencyId.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query]);

  const selectedVenue = useMemo(
    () => POPULAR_DTWS.find((v) => v.id === destinationVenueId),
    [destinationVenueId],
  );

  const handleSelect = (venueId: string): void => {
    const target = POPULAR_DTWS.find((v) => v.id === venueId);
    if (!target) return;

    setDestinationVenueId(target.id);
    setOriginVenueId(target.id);

    // Map to corresponding preset if available for instant photo & timing
    if (target.slug === 'pura-lempuyang') {
      setPreset({
        id: 'lempuyang-morning',
        originVenueId: target.id,
        titleEn: target.nameEn,
        titleId: target.nameId,
        subtitleEn: target.descriptionEn,
        subtitleId: target.descriptionId,
        imageUrl: target.imageUrl,
        imageSha256: '',
        defaultDay: 5,
        defaultHour: 8,
        simPeakDay: 5,
        simPeakHour: 8,
        sortOrder: 1,
        isActive: true,
      });
    } else if (target.slug === 'ulun-danu-beratan') {
      setPreset({
        id: 'ulun-danu-lake',
        originVenueId: target.id,
        titleEn: target.nameEn,
        titleId: target.nameId,
        subtitleEn: target.descriptionEn,
        subtitleId: target.descriptionId,
        imageUrl: target.imageUrl,
        imageSha256: '',
        defaultDay: 5,
        defaultHour: 9,
        simPeakDay: 5,
        simPeakHour: 9,
        sortOrder: 2,
        isActive: true,
      });
    } else if (target.slug === 'tegallalang-rice-terrace' || target.slug === 'tegallalang') {
      setPreset({
        id: 'tegallalang-terrace',
        originVenueId: target.id,
        titleEn: target.nameEn,
        titleId: target.nameId,
        subtitleEn: target.descriptionEn,
        subtitleId: target.descriptionId,
        imageUrl: target.imageUrl,
        imageSha256: '',
        defaultDay: 5,
        defaultHour: 10,
        simPeakDay: 5,
        simPeakHour: 10,
        sortOrder: 3,
        isActive: true,
      });
    } else if (target.slug === 'tanah-lot') {
      setPreset({
        id: 'tanah-lot-sunset',
        originVenueId: target.id,
        titleEn: target.nameEn,
        titleId: target.nameId,
        subtitleEn: target.descriptionEn,
        subtitleId: target.descriptionId,
        imageUrl: target.imageUrl,
        imageSha256: '',
        defaultDay: 5,
        defaultHour: 16,
        simPeakDay: 5,
        simPeakHour: 16,
        sortOrder: 4,
        isActive: true,
      });
    }

    setQuery(isId ? target.nameId : target.nameEn);
    setIsOpen(false);
    onSelectDestination?.(target.id);
  };

  return (
    <div className={`space-y-3 relative ${className}`} data-testid="destination-search">
      <div className="relative">
        <label htmlFor="destination-search-input" className="sr-only">
          {isId ? 'Cari tempat wisata tujuan' : 'Search destination'}
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-graphite pointer-events-none">
            <SearchIcon size={16} />
          </span>
          <input
            id="destination-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={
              isId
                ? 'Ketik nama tempat wisata (mis. Lempuyang, Tegallalang, Tanah Lot...)'
                : 'Type destination name (e.g. Lempuyang, Tegallalang, Tanah Lot...)'
            }
            className="w-full pl-10 pr-4 py-3 rounded-inner border border-ash bg-white text-xs sm:text-body-sm text-ink placeholder:text-stone focus-visible:outline-2 focus-visible:outline-ink transition-colors"
          />
        </div>
      </div>

      {/* Selected Indicator Card if chosen */}
      {selectedVenue && !isOpen && (
        <div className="p-3 rounded-inner bg-white border border-ash flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={selectedVenue.imageUrl}
              alt=""
              className="w-10 h-10 rounded-input object-cover border border-ash shrink-0 bg-parchment"
            />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-medium tracking-wide text-graphite">
                {isId ? 'Tujuan Terpilih' : 'Selected Target'}
              </span>
              <div className="font-medium text-ink truncate">
                {isId ? selectedVenue.nameId : selectedVenue.nameEn}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink bg-lime/30 px-2 py-0.5 rounded-pill border border-ink/20">
            <CheckCircleIcon size={13} />
            <span>{isId ? 'Siap' : 'Ready'}</span>
          </span>
        </div>
      )}

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="rounded-inner bg-white border border-ash divide-y divide-ash/60 overflow-hidden text-xs z-30">
          <div className="p-2.5 bg-parchment/60 text-[11px] font-medium text-graphite flex items-center justify-between">
            <span>{isId ? 'Destinasi Wisata Populer Bali' : 'Popular Bali Destinations'}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone hover:text-ink cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredVenues.length === 0 ? (
              <div className="p-4 text-center text-graphite">
                {isId ? 'Tidak ada destinasi cocok.' : 'No destinations found.'}
              </div>
            ) : (
              filteredVenues.map((v) => {
                const name = isId ? v.nameId : v.nameEn;
                const isSelected = v.id === destinationVenueId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelect(v.id)}
                    className={`w-full text-left p-3 hover:bg-parchment transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected ? 'bg-parchment font-medium' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={v.imageUrl}
                        alt=""
                        className="w-9 h-9 rounded-input object-cover border border-ash/80 shrink-0 bg-parchment"
                      />
                      <div className="min-w-0">
                        <div className="text-ink truncate font-medium">{name}</div>
                        <div className="text-[11px] text-graphite flex items-center gap-1">
                          <MapPinIcon size={12} className="text-stone" />
                          <span>{v.regencyId.replace('regency-', '')}</span>
                          {v.isHotspot ? (
                            <span className="text-[10px] text-graphite font-medium ml-1">
                              · {isId ? 'Sering Padat' : 'Peak Crowded'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-stone hover:text-ink">→</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
