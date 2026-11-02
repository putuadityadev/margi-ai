import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { EtiquetteBrief } from '@margi-ai/shared';

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
  const { t } = useTranslation('results');

  // Enforce temple sarong rule if temple and not already explicitly listed (AC-05.4)
  const isTemple = category === 'TEMPLE';
  const hasSarong = items.some((item) => /sarong/i.test(item.text));

  const displayItems = [...items];
  if (isTemple && !hasSarong) {
    displayItems.unshift({
      id: 'temple-sarong-mandate',
      text: 'Must wear a sarong and sash (kamben & selendang) at all times on sacred temple grounds.',
      severity: 3,
    });
  }

  // Limit to at most 3 items
  const finalItems = displayItems.slice(0, 3);

  return (
    <div
      className={`p-3.5 rounded-inner bg-parchment border border-ash/80 text-xs text-ink space-y-2 ${className}`}
      data-testid="cultural-etiquette-box"
    >
      <div className="flex items-center gap-1.5 font-medium text-graphite text-[11px] uppercase tracking-wider">
        <span aria-hidden="true">🙏</span>
        <span>{t('culturalEtiquette', 'Balinese Cultural Etiquette')}</span>
      </div>

      <ul className="space-y-1.5 list-disc list-inside">
        {finalItems.map((item) => (
          <li key={item.id} className="leading-relaxed break-words" data-severity={item.severity}>
            {item.severity === 3 ? (
              <strong className="font-medium text-ink mr-1">[Mandatory]</strong>
            ) : null}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
