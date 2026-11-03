import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Car, ListChecks, Route, X } from 'lucide-react';
import { MargiAvatar } from '../../components/brand/MargiAvatar';
import { ExploreSheet } from '../explore/ExploreSheet';

export type AssistChoice = 'plan' | 'stuck-here' | 'stuck-example' | 'has-plan';

export interface AssistSheetProps {
  /** Name of the place in focus, used as the trip destination. */
  readonly placeName: string | null;
  readonly onChoose: (choice: AssistChoice) => void;
  readonly onClose: () => void;
}

function Option({
  icon: Icon,
  title,
  body,
  onClick,
  disabled,
}: {
  readonly icon: typeof Route;
  readonly title: string;
  readonly body: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 border border-ink bg-white p-3 text-left hover:bg-parchment disabled:opacity-40"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center border border-ink bg-lime text-ink">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">{title}</span>
        <span className="block truncate text-body-sm text-graphite">{body}</span>
      </span>
      <ArrowRight
        size={18}
        className="flex-none text-ink transition-transform group-hover:translate-x-1"
      />
    </button>
  );
}

/** Entry into the trip planner by situation: plan, stuck in traffic, or check an existing plan. */
export function AssistSheet({ placeName, onChoose, onClose }: AssistSheetProps): ReactNode {
  const { t } = useTranslation('trip');

  return (
    <ExploreSheet motionKey="assist" label={t('assist.title')} className="z-40">
      <div data-sheet-item className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MargiAvatar size={48} />
          <h2 className="text-heading font-medium text-ink">{t('assist.title')}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('assist.close')}
          className="flex h-10 w-10 items-center justify-center border border-ink text-ink"
        >
          <X size={18} />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        <div data-sheet-item>
          <Option
            icon={Route}
            title={t('assist.plan.title')}
            body={t('assist.plan.body', { place: placeName ?? '…' })}
            onClick={() => onChoose('plan')}
            disabled={placeName === null}
          />
        </div>
        <div data-sheet-item className="border border-ink">
          <div className="flex items-center gap-3 p-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center border border-ink bg-lime text-ink">
              <Car size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium text-ink">
                {t('assist.stuck.title')}
              </span>
              <span className="block text-body-sm text-graphite">{t('assist.stuck.body')}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 border-t border-ash">
            <button
              type="button"
              onClick={() => onChoose('stuck-here')}
              disabled={placeName === null}
              className="border-r border-ash px-3 py-2.5 text-left text-body-sm text-ink hover:bg-parchment disabled:opacity-40"
            >
              {t('assist.useMyPosition')}
            </button>
            <button
              type="button"
              onClick={() => onChoose('stuck-example')}
              disabled={placeName === null}
              className="px-3 py-2.5 text-left text-body-sm text-ink hover:bg-parchment disabled:opacity-40"
            >
              {t('assist.example')}
              <span className="mt-0.5 block font-mono text-[10px] text-graphite uppercase">
                {t('assist.exampleNote')}
              </span>
            </button>
          </div>
        </div>
        <div data-sheet-item>
          <Option
            icon={ListChecks}
            title={t('assist.hasPlan.title')}
            body={t('assist.hasPlan.body')}
            onClick={() => onChoose('has-plan')}
          />
        </div>
      </div>
    </ExploreSheet>
  );
}
