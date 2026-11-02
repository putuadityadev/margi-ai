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
  const { t } = useTranslation('results');
  const storeActiveTab = useStreamStore((s) => s.activeTab);
  const setActiveTabStore = useStreamStore((s) => s.setActiveTab);
  const setActiveCardIdStore = useStreamStore((s) => s.setActiveCardId);

  // Safe router params read (supports tests outside Router)
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
  const initialTab: 'micro' | 'regional' =
    urlTab === 'regional' ? 'regional' : urlTab === 'micro' ? 'micro' : storeActiveTab;

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

    // Auto-select first card of the new tab if active card not in this tab
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

  // Limit each tab to at most 3 cards per PRD / T-051
  const displayedCards = (currentTab === 'micro' ? microCards : regionalCards).slice(0, 3);

  return (
    <section className={`space-y-6 ${className}`} data-testid="route-tabs-section">
      {/* Tab Navigation Headers */}
      <div
        role="tablist"
        aria-label="Recommendation Route Tiers"
        className="flex items-center gap-2 p-1.5 rounded-card bg-parchment border border-ash/80 w-full sm:w-fit"
      >
        <button
          type="button"
          role="tab"
          id="tab-micro"
          aria-selected={currentTab === 'micro'}
          aria-controls="tabpanel-micro"
          onClick={() => handleTabChange('micro')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-inner text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none ${
            currentTab === 'micro'
              ? 'bg-white text-ink border border-ash'
              : 'text-graphite hover:text-ink hover:bg-white/50 border border-transparent'
          }`}
          data-testid="tab-button-micro"
        >
          <span>{t('tabMicro', 'Micro Escape (1–3 km)')}</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-pill ${
              currentTab === 'micro' ? 'bg-parchment text-ink' : 'bg-ash/50 text-graphite'
            }`}
          >
            {microCards.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-regional"
          aria-selected={currentTab === 'regional'}
          aria-controls="tabpanel-regional"
          onClick={() => handleTabChange('regional')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-inner text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none ${
            currentTab === 'regional'
              ? 'bg-white text-ink border border-ash'
              : 'text-graphite hover:text-ink hover:bg-white/50 border border-transparent'
          }`}
          data-testid="tab-button-regional"
        >
          <span>{t('tabRegional', 'Regional Discovery (6 Regencies)')}</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-pill ${
              currentTab === 'regional' ? 'bg-parchment text-ink' : 'bg-ash/50 text-graphite'
            }`}
          >
            {regionalCards.length}
          </span>
        </button>
      </div>

      {/* Tab Panel Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
        className="space-y-6 focus:outline-none"
      >
        {displayedCards.length > 0 ? (
          <div className="space-y-6">
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
            className="p-8 rounded-card bg-parchment border border-ash text-center text-graphite font-mono text-sm"
            data-testid="empty-tab-panel"
          >
            No alternative routes found in this category.
          </div>
        )}
      </div>
    </section>
  );
}
