import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { EtiquetteBrief } from '@margi-ai/shared';
import { TempleGateIcon } from '../../components/ui';

export interface EtiquetteProps {
  readonly items: readonly EtiquetteBrief[];
  readonly category?: string;
  readonly className?: string;
}

export function Etiquette({
  items,
  category,
  className = '',
}: EtiquetteProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n?.language?.startsWith('id') ?? false;

  const isTemple = category === 'TEMPLE';
  const hasSarong = items.some((item) => /sarong|kamen|kamben/i.test(item.text));

  const displayItems = [...items];
  if (isTemple && !hasSarong) {
    displayItems.unshift({
      id: 'temple-sarong-mandate',
      text: isId
        ? 'Wajib mengenakan kamen dan selendang selama berada di area suci pura.'
        : 'Must wear a sarong and sash (kamben & selendang) at all times on sacred temple grounds.',
      severity: 3,
    });
  }

  const finalItems = displayItems.slice(0, 3);
  if (finalItems.length === 0) return null;

  return (
    <div
      className={`p-3.5 rounded-inner bg-parchment border border-ash/80 text-xs text-ink space-y-2 ${className}`}
      data-testid="cultural-etiquette-box"
    >
      <div className="flex items-center gap-1.5 font-medium text-graphite text-[11px]">
        <TempleGateIcon size={14} className="text-ink" />
        <span>{t('culturalEtiquette', 'Local Etiquette')}</span>
      </div>

      <ul className="space-y-1.5 list-disc list-inside text-graphite">
        {finalItems.map((item) => (
          <li key={item.id} className="leading-relaxed break-words" data-severity={item.severity}>
            {item.severity === 3 ? (
              <span className="inline-block rounded-pill bg-white border border-ash px-1.5 py-0.2 text-[10px] font-medium text-ink mr-1.5">
                {isId ? 'Wajib' : 'Required'}
              </span>
            ) : null}
            <span className="text-ink">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
