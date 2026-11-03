import { useState, useMemo, type ReactNode, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_VENUES, type MockVenueDetail } from '../../mocks/data/venues';
import { ShareLinkIcon, CheckCircleIcon, MapPinIcon } from '../../components/ui';

export interface SocialLinkInputProps {
  readonly onConfirmed?: (() => void) | undefined;
  readonly className?: string | undefined;
}

interface SampleLink {
  readonly labelId: string;
  readonly labelEn: string;
  readonly url: string;
}

const SAMPLE_LINKS: readonly SampleLink[] = [
  {
    labelId: 'IG: Pura Lempuyang',
    labelEn: 'IG: Lempuyang Temple',
    url: 'https://www.instagram.com/reel/C7-lempuyang-gate-of-heaven/',
  },
  {
    labelId: 'TikTok: Terasering Tegallalang',
    labelEn: 'TikTok: Tegallalang Terrace',
    url: 'https://www.tiktok.com/@explorebali/video/7382910-tegallalang-terrace',
  },
  {
    labelId: 'Maps: Danau Beratan',
    labelEn: 'Maps: Lake Beratan',
    url: 'https://maps.app.goo.gl/ulun-danu-beratan-bedugul',
  },
  {
    labelId: 'IG: Pura Tanah Lot',
    labelEn: 'IG: Tanah Lot Sunset',
    url: 'https://www.instagram.com/p/tanah-lot-sunset-view/',
  },
];

function matchVenueFromUrl(input: string): MockVenueDetail | null {
  const text = input.toLowerCase();
  if (!text) return null;

  if (text.includes('lempuyang') || text.includes('gate of heaven')) {
    return MOCK_VENUES.find((v) => v.slug === 'pura-lempuyang') ?? null;
  }
  if (text.includes('ulun danu') || text.includes('beratan') || text.includes('bedugul')) {
    return MOCK_VENUES.find((v) => v.slug === 'ulun-danu-beratan') ?? null;
  }
  if (text.includes('tegallalang') || text.includes('rice terrace') || text.includes('ceking')) {
    return MOCK_VENUES.find((v) => v.slug === 'tegallalang') ?? null;
  }
  if (text.includes('tanah lot')) {
    return MOCK_VENUES.find((v) => v.slug === 'tanah-lot') ?? null;
  }
  if (text.includes('kelingking') || text.includes('t-rex') || text.includes('nusa penida')) {
    return MOCK_VENUES.find((v) => v.slug === 'kelingking-beach') ?? null;
  }
  if (text.includes('kehen') || text.includes('bangli')) {
    return MOCK_VENUES.find((v) => v.slug === 'pura-kehen') ?? null;
  }
  if (text.includes('jatiluwih')) {
    return MOCK_VENUES.find((v) => v.slug === 'jatiluwih') ?? null;
  }

  // Fallback generic scan over venue names and slugs
  return (
    MOCK_VENUES.find(
      (v) =>
        text.includes(v.slug) ||
        text.includes(v.nameEn.toLowerCase()) ||
        text.includes(v.nameId.toLowerCase()),
    ) ?? null
  );
}

export function SocialLinkInput({
  onConfirmed,
  className = '',
}: SocialLinkInputProps): ReactNode {
  const { i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');

  const sourceUrl = useAnalyzerStore((s) => s.sourceUrl);
  const setSourceUrl = useAnalyzerStore((s) => s.setSourceUrl);
  const setSourceType = useAnalyzerStore((s) => s.setSourceType);
  const setDestinationVenueId = useAnalyzerStore((s) => s.setDestinationVenueId);
  const setOriginVenueId = useAnalyzerStore((s) => s.setOriginVenueId);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const [rawUrl, setRawUrl] = useState(sourceUrl || '');

  const detectedVenue = useMemo(() => matchVenueFromUrl(rawUrl), [rawUrl]);

  const applyVenue = (venue: MockVenueDetail | null, urlVal: string): void => {
    setSourceUrl(urlVal);
    setSourceType('link');

    if (venue) {
      setDestinationVenueId(venue.id);
      setOriginVenueId(venue.id);

      if (venue.slug === 'pura-lempuyang') {
        setPreset({
          id: 'lempuyang-morning',
          originVenueId: venue.id,
          titleEn: venue.nameEn,
          titleId: venue.nameId,
          subtitleEn: venue.descriptionEn,
          subtitleId: venue.descriptionId,
          imageUrl: venue.imageUrl,
          imageSha256: '',
          defaultDay: 5,
          defaultHour: 8,
          simPeakDay: 5,
          simPeakHour: 8,
          sortOrder: 1,
          isActive: true,
        });
      } else if (venue.slug === 'ulun-danu-beratan') {
        setPreset({
          id: 'ulun-danu-lake',
          originVenueId: venue.id,
          titleEn: venue.nameEn,
          titleId: venue.nameId,
          subtitleEn: venue.descriptionEn,
          subtitleId: venue.descriptionId,
          imageUrl: venue.imageUrl,
          imageSha256: '',
          defaultDay: 5,
          defaultHour: 9,
          simPeakDay: 5,
          simPeakHour: 9,
          sortOrder: 2,
          isActive: true,
        });
      } else if (venue.slug === 'tegallalang') {
        setPreset({
          id: 'tegallalang-terrace',
          originVenueId: venue.id,
          titleEn: venue.nameEn,
          titleId: venue.nameId,
          subtitleEn: venue.descriptionEn,
          subtitleId: venue.descriptionId,
          imageUrl: venue.imageUrl,
          imageSha256: '',
          defaultDay: 5,
          defaultHour: 10,
          simPeakDay: 5,
          simPeakHour: 10,
          sortOrder: 3,
          isActive: true,
        });
      } else if (venue.slug === 'tanah-lot') {
        setPreset({
          id: 'tanah-lot-sunset',
          originVenueId: venue.id,
          titleEn: venue.nameEn,
          titleId: venue.nameId,
          subtitleEn: venue.descriptionEn,
          subtitleId: venue.descriptionId,
          imageUrl: venue.imageUrl,
          imageSha256: '',
          defaultDay: 5,
          defaultHour: 16,
          simPeakDay: 5,
          simPeakHour: 16,
          sortOrder: 4,
          isActive: true,
        });
      }
    } else {
      setDestinationVenueId(null);
      setOriginVenueId(null);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setRawUrl(val);
    const matched = matchVenueFromUrl(val);
    applyVenue(matched, val);
  };

  const handlePickSample = (sample: SampleLink): void => {
    setRawUrl(sample.url);
    const matched = matchVenueFromUrl(sample.url);
    applyVenue(matched, sample.url);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label
          htmlFor="social-link-input"
          className="block text-xs font-medium text-graphite uppercase tracking-wider mb-1.5"
        >
          {isId
            ? 'Tempel Tautan Instagram, TikTok, atau Google Maps'
            : 'Paste Instagram Reel, TikTok, or Google Maps Link'}
        </label>
        <div className="relative">
          <input
            id="social-link-input"
            type="url"
            value={rawUrl}
            onChange={handleInputChange}
            placeholder={
              isId
                ? 'https://www.instagram.com/reel/...'
                : 'https://www.instagram.com/reel/...'
            }
            className="w-full h-11 pl-10 pr-4 bg-parchment rounded-none border border-ash/80 text-sm text-ink placeholder:text-graphite/60 focus:outline-none focus:border-ink transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-graphite">
            <ShareLinkIcon size={16} />
          </div>
        </div>
      </div>

      {/* Quick sample chips */}
      <div>
        <span className="block text-[11px] text-graphite mb-1.5">
          {isId ? 'Atau coba tautan sampel:' : 'Or try a sample link:'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_LINKS.map((sample) => (
            <button
              key={sample.url}
              type="button"
              onClick={() => handlePickSample(sample)}
              className="text-xs px-2.5 py-1 bg-parchment-card hover:bg-parchment-border border border-ash/60 rounded-none text-ink transition-colors"
            >
              {isId ? sample.labelId : sample.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Detected venue preview card */}
      {detectedVenue && (
        <div className="p-3 bg-parchment-card border border-ash/80 rounded-none flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={detectedVenue.imageUrl}
              alt={isId ? detectedVenue.nameId : detectedVenue.nameEn}
              className="w-14 h-14 object-cover border border-ash/60 shrink-0"
            />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-ink bg-lime px-1.5 py-0.5 rounded-none mb-1">
                <CheckCircleIcon size={12} />
                <span>
                  {isId ? 'Destinasi Terdeteksi' : 'Detected Destination'}
                </span>
              </div>
              <h4 className="text-sm font-medium text-ink truncate">
                {isId ? detectedVenue.nameId : detectedVenue.nameEn}
              </h4>
              <p className="text-xs text-graphite flex items-center gap-1">
                <MapPinIcon size={11} />
                <span className="capitalize">{detectedVenue.regencyId}</span>
              </p>
            </div>
          </div>

          {onConfirmed && (
            <button
              type="button"
              onClick={onConfirmed}
              className="shrink-0 text-xs font-medium px-3 py-2 bg-ink text-parchment hover:bg-charcoal rounded-none transition-colors"
            >
              {isId ? 'Pilih' : 'Confirm'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

