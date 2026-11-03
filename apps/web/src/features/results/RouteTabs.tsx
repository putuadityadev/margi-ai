import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import type { RouteCard as RouteCardType } from '@margi-ai/shared';
import { RouteCard } from './RouteCard';
import { useStreamStore } from '../../stores/streamStore';

export interface RouteTabsProps {
  readonly microCards: readonly RouteCardType[];
  readonly regionalCards: readonly RouteCardType[];
  readonly activeCardId?: string | null | undefined;
  readonly onSelectCard?: ((cardId: string) => void) | undefined;
  readonly className?: string | undefined;
}

export function RouteTabs({
  microCards,
  regionalCards,
  activeCardId,
  onSelectCard,
  className = '',
}: RouteTabsProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');
  const storeActiveTab = useStreamStore((s) => s.activeTab);
  const setActiveTabStore = useStreamStore((s) => s.setActiveTab);
  const setActiveCardIdStore = useStreamStore((s) => s.setActiveCardId);

  let searchParams: URLSearchParams | null = null;
  let setSearchParams: ((updater: (prev: URLSearchParams) => URLSearchParams) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [sp, ssp] = useSearchParams();
    searchParams = sp;
    setSearchParams = ssp;
  } catch {
    // Not inside Router
  }

  const urlTab = searchParams?.get('tab');
  const defaultTab: 'micro' | 'regional' =
    microCards.length === 0 && regionalCards.length > 0 ? 'regional' : storeActiveTab;
  const initialTab: 'micro' | 'regional' =
    urlTab === 'regional' ? 'regional' : urlTab === 'micro' ? 'micro' : defaultTab;

  const [currentTab, setCurrentTab] = useState<'micro' | 'regional'>(initialTab);

  useEffect(() => {
    if (urlTab === 'micro' || urlTab === 'regional') {
      setCurrentTab(urlTab);
      setActiveTabStore(urlTab);
    }
  }, [urlTab, setActiveTabStore]);

  const handleTabChange = (tab: 'micro' | 'regional'): void => {
    setCurrentTab(tab);
    setActiveTabStore(tab);
    if (setSearchParams) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      });
    }

    const cards = tab === 'micro' ? microCards : regionalCards;
    if (cards.length > 0) {
      const isCurrentActiveInNewTab = cards.some((c) => c.venue.id === activeCardId);
      if (!isCurrentActiveInNewTab) {
        const firstId = cards[0]?.venue.id;
        if (firstId) {
          if (onSelectCard) {
            onSelectCard(firstId);
          } else {
            setActiveCardIdStore(firstId);
          }
        }
      }
    }
  };

  const handleCardSelect = (venueId: string): void => {
    if (onSelectCard) {
      onSelectCard(venueId);
    } else {
      setActiveCardIdStore(venueId);
    }
  };

  const displayedCards = (currentTab === 'micro' ? microCards : regionalCards).slice(0, 3);

  return (
    <section className={`space-y-4 ${className}`} data-testid="route-tabs-section">
      {/* Section Heading & Simple Distance Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-subheading font-medium text-ink">
            {isId ? 'Tempat Serupa yang Lebih Tenang' : 'Calmer Similar Places'}
          </h2>
          <p className="text-xs text-graphite mt-0.5">
            {isId
              ? 'Suasana sejenis dengan antrean jauh lebih singkat'
              : 'Matching scenery and atmosphere without the long wait'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={isId ? 'Jarak rekomendasi' : 'Distance options'}
          className="inline-flex items-center gap-1.5 p-1 rounded-none bg-parchment border border-ash self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            id="tab-micro"
            aria-selected={currentTab === 'micro'}
            aria-controls="tabpanel-micro"
            onClick={() => handleTabChange('micro')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none ${
              currentTab === 'micro'
                ? 'bg-white text-ink border border-ash'
                : 'text-graphite hover:text-ink border border-transparent'
            }`}
            data-testid="tab-button-micro"
          >
            <span>{t('tabMicro', isId ? 'Terdekat' : 'Nearby')}</span>
            <span className="text-[11px] text-graphite tabular-nums">({microCards.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-regional"
            aria-selected={currentTab === 'regional'}
            aria-controls="tabpanel-regional"
            onClick={() => handleTabChange('regional')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none ${
              currentTab === 'regional'
                ? 'bg-white text-ink border border-ash'
                : 'text-graphite hover:text-ink border border-transparent'
            }`}
            data-testid="tab-button-regional"
          >
            <span>{t('tabRegional', isId ? 'Area Lain' : 'Across Bali')}</span>
            <span className="text-[11px] text-graphite tabular-nums">({regionalCards.length})</span>
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div
        role="tabpanel"
        id={`tabpanel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
        className="space-y-4 focus:outline-none"
      >
        {displayedCards.length > 0 ? (
          <div className="space-y-4">
            {displayedCards.map((card) => (
              <RouteCard
                key={card.venue.id}
                card={card}
                isActive={card.venue.id === activeCardId}
                onSelect={handleCardSelect}
              />
            ))}
          </div>
        ) : (
          <div
            className="p-6 rounded-none bg-parchment border border-ash text-center text-graphite text-sm"
            data-testid="empty-tab-panel"
          >
            {isId
              ? 'Belum ada pilihan di kategori jarak ini. Coba tab sebelahnya.'
              : 'No places in this distance filter. Check the other tab.'}
          </div>
        )}
      </div>
    </section>
  );
}
