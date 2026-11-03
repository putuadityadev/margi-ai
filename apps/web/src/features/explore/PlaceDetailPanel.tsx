import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUpRight, Check, Navigation, Share2, X } from 'lucide-react';
import {
  googleMapsDirUrl,
  type NearbyPlace,
  type PlaceDetail,
  type QuietAlternative,
} from '@margi-ai/shared';
import { CrowdMeter } from '../../components/data/CrowdMeter';
import { CrowdTimeline } from '../../components/data/CrowdTimeline';
import { Spinner } from '../../components/ui';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';
import { crowdLevelKey, hourLabel, placeDescription, placeName, regencyLabel } from './placeText';

export interface PlaceDetailPanelProps {
  readonly detail: PlaceDetail | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly canGoBack: boolean;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly onRetry: () => void;
  readonly onOpenPlace: (placeId: string) => void;
  /** Opens MARGI's in-app trip plan for this place (D-026). */
  readonly onPlan: (placeId: string) => void;
  /** Visible sheet height on phones, so the map keeps the route above it. */
  readonly onHeightChange: (heightPx: number) => void;
}

const COPIED_NOTE_MS = 2000;
/** Phone sheet snaps (viewport fractions): peek with name and crowd, half, full. */
const DETAIL_SNAPS = [0.36, 0.68, 0.94] as const;

function isBusy(detail: PlaceDetail): boolean {
  const { level } = detail.place.crowd;
  return detail.isRedZone || level === 'above_average' || level === 'high';
}

function AlternativeRow({
  alternative,
  onOpen,
}: {
  readonly alternative: QuietAlternative;
  readonly onOpen: (placeId: string) => void;
}): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const { place } = alternative;
  const level = t(`crowd.levels.${crowdLevelKey(place.crowd)}`);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(place.venue.id)}
        className="group flex w-full items-center gap-3 py-3 text-left"
      >
        <img
          src={place.venue.imageUrl}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          className="h-14 w-14 flex-none border border-ash object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-ink">
            {placeName(place.venue, isId)}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-graphite">
            <span>
              {level} {place.crowd.busynessPct}%
            </span>
            <span>{t('browse.km', { value: place.distanceKm.toFixed(1) })}</span>
            <span>{t('browse.minutes', { count: place.travelMinutes })}</span>
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1">
            {alternative.sharedVibes.map((tag) => (
              <span key={tag} className="border border-ash px-1.5 py-0.5 text-[10px] text-ink">
                {t(`vibe.tags.${tag}`)}
              </span>
            ))}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          {alternative.crowdDropPts > 0 && (
            <span className="bg-lime px-1.5 py-0.5 font-mono text-[11px] text-ink">
              {t('detail.fewerPts', { value: alternative.crowdDropPts })}
            </span>
          )}
          <ArrowUpRight
            size={16}
            className="text-graphite transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      </button>
    </li>
  );
}

function MsmeRow({
  place,
  onOpen,
}: {
  readonly place: NearbyPlace;
  readonly onOpen: (id: string) => void;
}): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  return (
    <li className="w-[148px] flex-none">
      <button
        type="button"
        onClick={() => onOpen(place.venue.id)}
        className="block w-full text-left"
      >
        <img
          src={place.venue.imageUrl}
          alt=""
          width={148}
          height={92}
          loading="lazy"
          className="h-[92px] w-full border border-ash object-cover"
        />
        <span className="mt-1.5 block truncate text-body-sm font-medium text-ink">
          {placeName(place.venue, isId)}
        </span>
        <span className="font-mono text-[11px] text-graphite">
          {t(`categories.${place.venue.category}`)}
        </span>
      </button>
    </li>
  );
}

function DetailBody({
  detail,
  onOpenPlace,
}: {
  readonly detail: PlaceDetail;
  readonly onOpenPlace: (id: string) => void;
}): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const { place } = detail;
  const name = placeName(place.venue, isId);
  const levelKey = crowdLevelKey(place.crowd);
  const busy = isBusy(detail);
  const crowdText = `${t(`crowd.levels.${levelKey}`)} ${place.crowd.busynessPct}%`;

  return (
    <>
      <div data-detail-item className="px-5 pt-4">
        <p className="font-mono text-[11px] text-graphite uppercase">
          {t(`categories.${place.venue.category}`)} · {regencyLabel(place.venue.regencyId)}
        </p>
        <h2 className="mt-1 text-[30px] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
          {name}
        </h2>
        <p className="mt-2 text-body-sm text-graphite">{placeDescription(place.venue, isId)}</p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink">
          <span>{t('browse.km', { value: place.distanceKm.toFixed(1) })}</span>
          <span>{t('browse.minutes', { count: place.travelMinutes })}</span>
          <span>{t('detail.stay', { count: detail.avgDwellMinutes })}</span>
          {detail.typicalPeakQueueMinutes > 0 && (
            <span>{t('detail.queue', { count: detail.typicalPeakQueueMinutes })}</span>
          )}
        </p>
      </div>

      <div data-detail-item className="mx-5 mt-5 border-t border-ink pt-4">
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-[48px] leading-none tracking-[-0.05em] text-ink tabular-nums">
            {place.isOpenNow ? place.crowd.busynessPct : '–'}
            <span className="text-[22px]">{place.isOpenNow ? '%' : ''}</span>
          </p>
          <div className="text-right">
            <p className="text-subheading font-medium text-ink">
              {place.isOpenNow ? t(`crowd.levels.${levelKey}`) : t('detail.closedNow')}
            </p>
            <p className="mt-1 font-mono text-[11px] text-graphite">
              <span className="border border-ash px-1 uppercase">
                {t(`crowd.tier.${place.crowd.tier}`)}
              </span>{' '}
              {t('crowd.at', { time: hourLabel(place.crowd.hourWita, isId) })}
            </p>
          </div>
        </div>
        <CrowdMeter
          busynessPct={place.isOpenNow ? place.crowd.busynessPct : 0}
          label={crowdText}
          className="mt-3 h-2"
        />
        <p className="mt-5 mb-2 text-eyebrow text-graphite uppercase">{t('crowd.timeline')}</p>
        <CrowdTimeline
          hours={detail.today}
          currentHour={place.crowd.hourWita}
          quietHours={detail.quietHours}
          label={t('crowd.chartLabel', { name })}
          closedLabel={t('crowd.closedHour')}
        />
        {detail.quietHours.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-body-sm text-ink">
            <span
              className="h-[3px] w-4 bg-lime outline outline-1 outline-ink"
              aria-hidden="true"
            />
            {t('crowd.quietest')}:{' '}
            {detail.quietHours.map((hour) => hourLabel(hour, isId)).join(' · ')}
          </p>
        )}
      </div>

      <div
        data-detail-item
        className={cn('mx-5 mt-6', busy && 'border-2 border-ink bg-parchment px-4 pt-4')}
      >
        <p className={cn('font-medium text-ink', busy ? 'text-subheading' : 'text-body')}>
          {busy ? t('detail.busyTitle') : t('detail.calmTitle')}
        </p>
        {busy && <p className="mt-1 text-body-sm text-graphite">{t('detail.busyBody')}</p>}
        {detail.alternatives.length === 0 ? (
          <p className="py-3 text-body-sm text-graphite">{t('detail.noAlternatives')}</p>
        ) : (
          <ul className="mt-1 divide-y divide-ash">
            {detail.alternatives.map((alternative) => (
              <AlternativeRow
                key={alternative.place.venue.id}
                alternative={alternative}
                onOpen={onOpenPlace}
              />
            ))}
          </ul>
        )}
      </div>

      {detail.nearbyMsmes.length > 0 && (
        <div data-detail-item className="mt-6">
          <p className="mx-5 text-eyebrow text-graphite uppercase">{t('detail.stopBy')}</p>
          <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-5">
            {detail.nearbyMsmes.map((msme) => (
              <MsmeRow key={msme.venue.id} place={msme} onOpen={onOpenPlace} />
            ))}
          </ul>
        </div>
      )}

      {detail.etiquetteTags.length > 0 && (
        <div data-detail-item className="mx-5 mt-6">
          <p className="text-eyebrow text-graphite uppercase">{t('detail.etiquette')}</p>
          <ul className="mt-2 space-y-1.5">
            {detail.etiquetteTags.map((tag) => (
              <li key={tag} className="flex gap-2 text-body-sm text-ink">
                <span className="mt-[7px] h-1.5 w-1.5 flex-none bg-ink" aria-hidden="true" />
                {t(`etiquette.${tag}`, { defaultValue: tag })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="h-6" />
    </>
  );
}

/**
 * Detail of one place. On phones a tall bottom sheet with the map visible above;
 * on wide screens the left column. Tapping an alternative stacks another detail.
 */
export function PlaceDetailPanel(props: PlaceDetailPanelProps): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const { detail } = props;
  const scope = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const venueId = detail?.place.venue.id ?? 'loading';

  useGSAP(
    () => {
      scroller.current?.scrollTo?.({ top: 0 });
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-detail-item]', {
          y: 18,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.06,
        });
        gsap.from('[data-detail-hero]', { scale: 1.08, duration: 0.9, ease: 'power3.out' });
      });
    },
    { scope, dependencies: [venueId], revertOnUpdate: true },
  );

  const onShare = async (): Promise<void> => {
    if (!detail) return;
    const url = googleMapsDirUrl(detail.place.venue);
    const title = placeName(detail.place.venue, isId);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_NOTE_MS);
    } catch {
      // The traveller dismissed the share sheet or clipboard access was refused; nothing to do.
    }
  };

  return (
    <BottomSheet
      label={detail ? placeName(detail.place.venue, isId) : t('detail.back')}
      snaps={DETAIL_SNAPS}
      initialSnap={1}
      handleLabel={t('detail.handle')}
      onHeightChange={props.onHeightChange}
      className="z-30"
      desktopClassName="md:top-20 md:bottom-4 md:left-4 md:right-auto md:h-auto md:w-[400px] md:border"
    >
      <div ref={scope} className="flex min-h-0 flex-1 flex-col">
        <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="relative h-[184px] flex-none overflow-hidden bg-parchment">
            {detail && (
              <img
                data-detail-hero
                src={detail.place.venue.imageUrl}
                alt=""
                width={400}
                height={184}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-x-3 top-3 flex justify-between">
              {props.canGoBack ? (
                <button
                  type="button"
                  onClick={props.onBack}
                  aria-label={t('detail.back')}
                  className="flex h-10 w-10 items-center justify-center border border-ink bg-white text-ink"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={props.onClose}
                aria-label={t('detail.close')}
                className="flex h-10 w-10 items-center justify-center border border-ink bg-white text-ink"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {props.isLoading && !detail && (
            <div className="flex justify-center py-16">
              <Spinner size="md" />
            </div>
          )}
          {props.isError && !detail && (
            <div role="alert" className="space-y-4 p-5">
              <p className="text-body text-ink">{t('detail.loadError')}</p>
              <button
                type="button"
                onClick={props.onRetry}
                className="border border-ink px-4 py-2 text-body-sm text-ink"
              >
                {t('detail.retry')}
              </button>
            </div>
          )}
          {detail && <DetailBody detail={detail} onOpenPlace={props.onOpenPlace} />}
        </div>

        {detail && (
          <div className="flex flex-none gap-2 border-t border-ash bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => props.onPlan(detail.place.venue.id)}
              className="flex h-14 flex-1 items-center justify-between border border-ink bg-lime px-5 text-body font-medium text-ink active:scale-[0.99]"
            >
              <span className="truncate">{t('detail.plan')}</span>
              <Navigation size={18} className="flex-none" />
            </button>
            <button
              type="button"
              onClick={() => void onShare()}
              aria-label={t('detail.share')}
              className="flex h-14 w-14 flex-none items-center justify-center border border-ink bg-white text-ink"
            >
              {copied ? <Check size={18} /> : <Share2 size={18} />}
            </button>
            <span role="status" className="sr-only">
              {copied ? t('detail.copied') : ''}
            </span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
