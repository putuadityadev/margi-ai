import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, SlidersHorizontal } from 'lucide-react';
import type { NearbyPlace } from '@margi-ai/shared';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';
import type { PlaceSort, VisitWindow } from '../../stores/exploreStore';
import { PlaceCard } from './PlaceCard';

export interface BrowsePanelProps {
  readonly places: readonly NearbyPlace[];
  readonly activePlaceId: string | null;
  readonly sort: PlaceSort;
  readonly vibeCount: number;
  readonly visitWindow: VisitWindow;
  readonly scanRun: number;
  readonly onSort: (sort: PlaceSort) => void;
  readonly onVisitWindow: (window: VisitWindow) => void;
  readonly onEditVibes: () => void;
  readonly onActivate: (placeId: string) => void;
  readonly onOpen: (placeId: string) => void;
  readonly onHeightChange: (heightPx: number) => void;
}

const VISIT_WINDOWS: readonly VisitWindow[] = ['now', 'later', 'morning'];

/** Places in the chosen order: API order is nearest first; "calmest" puts closed places last. */
export function sortPlaces(places: readonly NearbyPlace[], sort: PlaceSort): NearbyPlace[] {
  if (sort === 'nearest') return [...places];
  return [...places].sort((a, b) => {
    if (a.isOpenNow !== b.isOpenNow) return a.isOpenNow ? -1 : 1;
    return a.crowd.busynessPct - b.crowd.busynessPct || a.distanceKm - b.distanceKm;
  });
}

/** Step 4: filters plus a snap carousel (phones) or a list (wide screens) of nearby places. */
export function BrowsePanel(props: BrowsePanelProps): ReactNode {
  const { t } = useTranslation('explore');
  const { places, activePlaceId, onActivate, onHeightChange } = props;
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const scrollFrame = useRef(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-place-id]', {
          x: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.06,
        });
      });
    },
    { scope: root, dependencies: [props.scanRun], revertOnUpdate: true },
  );

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const report = (): void => onHeightChange(node.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeightChange]);

  // A pin tapped on the map scrolls its card into view.
  useEffect(() => {
    if (!activePlaceId || !list.current) return;
    const card = list.current.querySelector<HTMLElement>(`[data-place-id="${activePlaceId}"]`);
    card?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, [activePlaceId]);

  const onScroll = (): void => {
    const node = list.current;
    if (!node || node.scrollWidth <= node.clientWidth) return;
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      const cards = Array.from(node.querySelectorAll<HTMLElement>('[data-place-id]'));
      const left = node.getBoundingClientRect().left;
      let best: HTMLElement | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const card of cards) {
        const distance = Math.abs(card.getBoundingClientRect().left - left - 20);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = card;
        }
      }
      const id = best?.dataset.placeId;
      if (id && id !== activePlaceId) onActivate(id);
    });
  };

  const sorted = sortPlaces(places, props.sort);

  return (
    <section
      ref={root}
      aria-label={t('browse.listLabel')}
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'md:top-20 md:bottom-4 md:left-4 md:right-auto md:flex md:w-[400px] md:flex-col md:border md:border-ink md:bg-white md:pb-0',
      )}
    >
      <div className="mx-3 mb-2 flex items-center gap-1.5 md:mx-0 md:mb-0 md:border-b md:border-ash md:p-3">
        <label className="sr-only" htmlFor="visit-window">
          {t('visit.label')}
        </label>
        <select
          id="visit-window"
          value={props.visitWindow}
          onChange={(event) => props.onVisitWindow(event.target.value as VisitWindow)}
          className="h-9 min-w-0 flex-none border border-ink bg-white px-1.5 text-body-sm text-ink"
        >
          {VISIT_WINDOWS.map((window) => (
            <option key={window} value={window}>
              {t(`visit.${window}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={props.onEditVibes}
          aria-label={t('browse.editVibes')}
          className="flex h-9 flex-none items-center gap-1.5 border border-ink bg-white px-2.5 text-body-sm whitespace-nowrap text-ink"
        >
          <SlidersHorizontal size={14} />
          {props.vibeCount > 0
            ? t('browse.vibeCount', { count: props.vibeCount })
            : t('browse.allVibes')}
        </button>
        <button
          type="button"
          onClick={() => props.onSort(props.sort === 'nearest' ? 'calmest' : 'nearest')}
          aria-label={`${t('browse.sortLabel')}: ${t(props.sort === 'nearest' ? 'browse.sortNearest' : 'browse.sortCalmest')}`}
          className="ml-auto flex h-9 flex-none items-center gap-1.5 border border-ink bg-ink px-2.5 text-body-sm whitespace-nowrap text-white"
        >
          <ArrowDownUp size={14} className="text-lime" />
          {t(props.sort === 'nearest' ? 'browse.sortNearest' : 'browse.sortCalmest')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="mx-3 border border-ink bg-white p-4 text-body-sm text-ink md:mx-0 md:border-0">
          {t('browse.empty')}
        </p>
      ) : (
        <ul
          ref={list}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-3 px-3 md:flex-1 md:snap-none md:flex-col md:overflow-x-visible md:overflow-y-auto md:p-3 [&>li]:md:w-full"
        >
          {sorted.map((place) => (
            <PlaceCard
              key={place.venue.id}
              place={place}
              isActive={place.venue.id === activePlaceId}
              onOpen={props.onOpen}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
