import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react';
import type { SavedTripPlan } from '@margi-ai/shared';
import { Spinner } from '../../components/ui';
import { useDeletePlan, useSavedPlans } from './queries';
import { clockLabel } from './tripText';

export interface SavedPlansSheetProps {
  readonly onOpen: (plan: SavedTripPlan) => void;
  readonly onClose: () => void;
}

/** List of guest-saved plans; opening one restores its request and change log. */
export function SavedPlansSheet({ onOpen, onClose }: SavedPlansSheetProps): ReactNode {
  const { t, i18n } = useTranslation('trip');
  const isId = i18n.language.startsWith('id');
  const saved = useSavedPlans();
  const remove = useDeletePlan();

  return (
    <section
      aria-label={t('saved.title')}
      className="absolute inset-x-0 bottom-0 z-40 flex max-h-[70dvh] flex-col border-t border-ink bg-white md:top-20 md:bottom-4 md:left-4 md:max-h-none md:w-[440px] md:border"
    >
      <header className="flex items-center justify-between border-b border-ash px-5 py-4">
        <h2 className="text-subheading font-medium text-ink">{t('saved.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('saved.close')}
          className="flex h-10 w-10 items-center justify-center border border-ink text-ink"
        >
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        {saved.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        )}
        {saved.data?.length === 0 && (
          <p className="px-5 py-8 text-body-sm text-graphite">{t('saved.empty')}</p>
        )}
        <ul className="divide-y divide-ash">
          {saved.data?.map((plan) => (
            <li key={plan.id} className="flex items-center gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => onOpen(plan)}
                aria-label={t('saved.open', { title: plan.title })}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-body font-medium text-ink">{plan.title}</span>
                <span className="mt-1 block truncate text-body-sm text-graphite">
                  {plan.stopNames.map((name) => (isId ? name.id : name.en)).join(' → ')}
                </span>
                <span className="mt-1 block font-mono text-[11px] text-graphite">
                  {clockLabel(plan.request.departAt, isId)} ·{' '}
                  {t('saved.stops', { count: plan.request.stops.length })} · {t('metrics.crowd')}{' '}
                  {plan.metrics.crowdExposure}
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(plan.id)}
                aria-label={t('saved.delete', { title: plan.title })}
                className="flex h-10 w-10 flex-none items-center justify-center text-graphite hover:text-ink"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
