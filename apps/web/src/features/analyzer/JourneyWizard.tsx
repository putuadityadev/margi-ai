import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyzerStore, type TravelIntent } from '../../stores/analyzerStore';
import { DestinationSearch } from './DestinationSearch';
import { SocialLinkInput } from './SocialLinkInput';
import { ImageDropzone } from './ImageDropzone';
import { PresetGrid } from './PresetGrid';
import { TripContextSheet } from './TripContextSheet';
import {
  Card,
  SearchIcon,
  CompassIcon,
  CameraIcon,
  ShareLinkIcon,
  CheckCircleIcon,
} from '../../components/ui';

export interface JourneyWizardProps {
  readonly onStartScan: () => void;
  readonly className?: string | undefined;
}

type ExploreSubTab = 'upload' | 'link' | 'presets';

export function JourneyWizard({
  onStartScan,
  className = '',
}: JourneyWizardProps): ReactNode {
  const { i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');

  const intent = useAnalyzerStore((s) => s.intent);
  const setIntent = useAnalyzerStore((s) => s.setIntent);
  const destinationVenueId = useAnalyzerStore((s) => s.destinationVenueId);
  const presetId = useAnalyzerStore((s) => s.presetId);
  const file = useAnalyzerStore((s) => s.file);

  const [activeSubTab, setActiveSubTab] = useState<ExploreSubTab>('upload');
  const [step, setStep] = useState<1 | 2>(1);

  // Check whether user has picked an input in Step 1
  const hasDestination = Boolean(destinationVenueId || presetId || file);

  const handleSelectIntent = (newIntent: TravelIntent): void => {
    setIntent(newIntent);
    setStep(1);
  };

  const handleGoToContext = (): void => {
    if (hasDestination) {
      setStep(2);
    }
  };

  const handleBackToStep1 = (): void => {
    setStep(1);
  };

  // If in Step 2, show the TripContextSheet
  if (step === 2) {
    return (
      <div className={className}>
        <TripContextSheet onStartScan={onStartScan} onBack={handleBackToStep1} />
      </div>
    );
  }

  return (
    <Card className={`p-5 sm:p-7 bg-parchment-card space-y-6 ${className}`}>
      {/* Header Question */}
      <div className="space-y-1.5 text-center sm:text-left">
        <span className="text-[11px] font-medium uppercase tracking-wider text-graphite block">
          {isId ? 'Panduan Perjalanan Cerdas' : 'Smart Journey Guide'}
        </span>
        <h2 className="text-xl sm:text-2xl font-medium text-ink">
          {isId ? 'Mau ke mana hari ini?' : 'Where do you want to go today?'}
        </h2>
        <p className="text-xs sm:text-sm text-graphite">
          {isId
            ? 'MARGI AI akan memindai kepadatan jalan, antrean gerbang, dan merekomendasikan rute paling tenang.'
            : 'MARGI AI scans road traffic, gate queues, and guides you to the calmest alternative.'}
        </p>
      </div>

      {/* Main 2-Branch Choice: Sudah Tahu vs Belum Tahu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSelectIntent('known')}
          className={`p-4 text-left border transition-all ${
            intent === 'known'
              ? 'border-ink bg-ink text-parchment'
              : 'border-ash/80 bg-parchment hover:bg-parchment-border text-ink'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon size={16} />
            <h3 className="text-sm font-medium">
              {isId ? 'Sudah Tahu Tempat Tujuan' : 'I Know Where to Go'}
            </h3>
          </div>
          <p
            className={`text-xs ${
              intent === 'known' ? 'text-ash' : 'text-graphite'
            }`}
          >
            {isId
              ? 'Cari langsung nama pura, danau, pantai, atau atraksi Bali.'
              : 'Search directly for Balinese temples, lakes, or attractions.'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleSelectIntent('explore')}
          className={`p-4 text-left border transition-all ${
            intent === 'explore'
              ? 'border-ink bg-ink text-parchment'
              : 'border-ash/80 bg-parchment hover:bg-parchment-border text-ink'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CompassIcon size={16} />
            <h3 className="text-sm font-medium">
              {isId ? 'Belum Tahu / Cari Inspirasi' : 'Need Inspiration / Explore'}
            </h3>
          </div>
          <p
            className={`text-xs ${
              intent === 'explore' ? 'text-ash' : 'text-graphite'
            }`}
          >
            {isId
              ? 'Unggah foto, tempel link Instagram/TikTok, atau coba destinasi populer.'
              : 'Upload a photo, paste a social link, or choose popular spots.'}
          </p>
        </button>
      </div>

      {/* Branch 1: Search Known Destination */}
      {intent === 'known' && (
        <div className="space-y-4 pt-2 border-t border-ash/40 animate-fade-in">
          <DestinationSearch />

          {hasDestination && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGoToContext}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-lime text-ink font-medium text-xs border border-ink hover:brightness-105 active:scale-[0.99] transition-all"
              >
                <span>
                  {isId ? 'Lanjut ke Detail Perjalanan' : 'Proceed to Trip Context'}
                </span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Branch 2: Explore via Photo, Link, or Presets */}
      {intent === 'explore' && (
        <div className="space-y-4 pt-2 border-t border-ash/40 animate-fade-in">
          {/* Sub-Tabs: Upload Foto vs Tautan Medsos vs 4 Populer */}
          <div className="grid grid-cols-3 border border-ash/80 bg-parchment p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('upload')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 text-xs font-medium transition-colors ${
                activeSubTab === 'upload'
                  ? 'bg-ink text-parchment border border-ink'
                  : 'bg-transparent text-graphite hover:text-ink border border-transparent'
              }`}
            >
              <CameraIcon size={14} className="shrink-0" />
              <span className="truncate">{isId ? 'Unggah' : 'Upload'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('link')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 text-xs font-medium transition-colors ${
                activeSubTab === 'link'
                  ? 'bg-ink text-parchment border border-ink'
                  : 'bg-transparent text-graphite hover:text-ink border border-transparent'
              }`}
            >
              <ShareLinkIcon size={14} className="shrink-0" />
              <span className="truncate">{isId ? 'Tautan' : 'Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('presets')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 text-xs font-medium transition-colors ${
                activeSubTab === 'presets'
                  ? 'bg-ink text-parchment border border-ink'
                  : 'bg-transparent text-graphite hover:text-ink border border-transparent'
              }`}
            >
              <CheckCircleIcon size={14} className="shrink-0" />
              <span className="truncate">{isId ? 'Populer' : 'Popular'}</span>
            </button>
          </div>

          {/* Sub-Tab 1: Upload */}
          {activeSubTab === 'upload' && (
            <div className="space-y-3">
              <ImageDropzone onFileAccepted={handleGoToContext} />
            </div>
          )}

          {/* Sub-Tab 2: Link */}
          {activeSubTab === 'link' && (
            <div className="space-y-3">
              <SocialLinkInput onConfirmed={handleGoToContext} />
            </div>
          )}

          {/* Sub-Tab 3: Presets */}
          {activeSubTab === 'presets' && (
            <div className="space-y-3">
              <span className="block text-xs text-graphite">
                {isId
                  ? 'Pilih salah satu ikon pariwisata Bali untuk simulasi instan:'
                  : 'Pick an iconic Bali landmark for instant simulation:'}
              </span>
              <PresetGrid />
            </div>
          )}

          {/* Advance CTA if destination selected */}
          {hasDestination && (
            <div className="pt-3 border-t border-ash/40 flex justify-end">
              <button
                type="button"
                onClick={handleGoToContext}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-lime text-ink font-medium text-xs border border-ink hover:brightness-105 active:scale-[0.99] transition-all"
              >
                <span>
                  {isId ? 'Lanjut ke Detail Perjalanan' : 'Proceed to Trip Context'}
                </span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* If neither intent selected yet, prompt user */}
      {!intent && (
        <div className="p-4 bg-parchment border border-ash/60 text-center">
          <p className="text-xs text-graphite">
            {isId
              ? 'Pilih salah satu opsi di atas untuk memulai rancangan perjalanan Anda.'
              : 'Choose one of the options above to begin planning your journey.'}
          </p>
        </div>
      )}
    </Card>
  );
}
