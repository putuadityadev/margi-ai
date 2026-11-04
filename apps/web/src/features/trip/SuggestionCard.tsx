import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownUp,
  Check,
  Clock,
  Coffee,
  MapPin,
  Repeat,
  Scissors,
  type LucideIcon,
} from 'lucide-react';
import type { TripChange, TripPlan, TripSuggestion } from '@margi-ai/shared';
import { cn } from '../../lib/cn';
import { signed, suggestionTitle } from './tripText';

export interface SuggestionCardProps {
  readonly suggestion: TripSuggestion;
  readonly plan: TripPlan;
  readonly isApplied: boolean;
  /** Disabled when the card belongs to an older reply whose plan no longer matches. */
  readonly isStale: boolean;
  readonly onApply: (suggestion: TripSuggestion) => void;
  readonly onPreview: (suggestion: TripSuggestion | null) => void;
}

const KIND_ICONS: Readonly<Record<TripChange['kind'], LucideIcon>> = {
  SHIFT_DEPARTURE: Clock,
  SWAP_STOP: Repeat,
  REORDER: ArrowDownUp,
  ADD_STOP: Coffee,
  REMOVE_STOP: Scissors,
  SET_STOPS: MapPin,
};

/** One proposed change with its computed effect and an Apply action. */
export function SuggestionCard({
  suggestion,
  plan,
  isApplied,
  isStale,
  onApply,
  onPreview,
}: SuggestionCardProps): ReactNode {
  const { t, i18n } = useTranslation('trip');
  const isId = i18n.language.startsWith('id');
  const Icon = KIND_ICONS[suggestion.change.kind];
  const { delta } = suggestion;
  const title = suggestionTitle(t, suggestion, plan, isId);

  return (
    <article
      onMouseEnter={() => onPreview(suggestion)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(suggestion)}
      onBlur={() => onPreview(null)}
      className={cn(
        'border bg-white p-3 transition-colors',
        isApplied ? 'border-ash' : 'border-ink',
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] text-graphite uppercase">
        <Icon size={12} aria-hidden="true" />
        {t(`suggestion.reason.${suggestion.reason}`)}
      </p>
      <p className="mt-1.5 text-body font-medium text-ink">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
        {delta.crowdExposurePts !== 0 && (
          <span
            className={cn(
              'px-1.5 py-0.5',
              delta.crowdExposurePts < 0 ? 'bg-lime text-ink' : 'border border-ash text-ink',
            )}
          >
            {t('suggestion.crowd', { value: signed(delta.crowdExposurePts) })}
          </span>
        )}
        {delta.travelMinutes !== 0 && (
          <span
            className={cn(
              'px-1.5 py-0.5',
              delta.travelMinutes < 0 ? 'bg-lime text-ink' : 'border border-ash text-ink',
            )}
          >
            {t('suggestion.minutes', { value: signed(delta.travelMinutes) })}
          </span>
        )}
        {delta.redZoneStops !== 0 && (
          <span className="bg-ink px-1.5 py-0.5 text-white">
            {t('suggestion.redZones', { value: signed(delta.redZoneStops) })}
          </span>
        )}
      </div>
      <button
        type="button"
        disabled={isApplied || isStale}
        onClick={() => onApply(suggestion)}
        className={cn(
          'mt-3 flex h-10 w-full items-center justify-center gap-2 border text-body-sm font-medium',
          isApplied
            ? 'border-ash bg-parchment text-graphite'
            : 'border-ink bg-ink text-white hover:bg-charcoal',
          isStale && !isApplied && 'opacity-40',
        )}
      >
        {isApplied && <Check size={15} aria-hidden="true" />}
        {isApplied ? t('copilot.applied') : t('copilot.apply')}
      </button>
    </article>
  );
}
