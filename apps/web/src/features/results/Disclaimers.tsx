import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface DisclaimersProps {
  readonly disclaimers?: readonly string[] | undefined;
  readonly className?: string | undefined;
}

export function Disclaimers({ disclaimers, className = '' }: DisclaimersProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');

  const defaultDisclaimers = isId
    ? [
        'Telemetri kepadatan bersumber dari pola historis dan estimasi langsung jika tersedia. Kondisi dapat berubah sewaktu-waktu selama upacara keagamaan (Odalan) atau hari libur nasional.',
        'Rekomendasi MARGI AI dirancang untuk pemerataan pariwisata berkelanjutan. Harap selalu hormati adat Bali (Awig-Awig) dan kenakan pakaian adat yang sopan saat mengunjungi tempat suci.',
      ]
    : [
        'Crowd telemetry reflects historical patterns and live estimates where available. Conditions can change rapidly during temple ceremonies (Odalan) or national holidays.',
        'MARGI AI recommendations are designed to promote equitable sustainable tourism. Always respect Balinese custom (Awig-Awig) and observe proper temple attire etiquette.',
      ];

  const items = disclaimers && disclaimers.length > 0 ? disclaimers : defaultDisclaimers;

  return (
    <footer
      aria-label="Result Disclaimers"
      data-testid="disclaimers-block"
      className={`border-t border-ash/60 pt-6 mt-8 text-xs text-graphite space-y-2.5 font-normal leading-relaxed ${className}`}
    >
      <div className="font-medium text-ink uppercase tracking-wider text-[10px]">
        {t('disclaimerEyebrow', 'Notice & Responsible Travel')}
      </div>
      <ul className="space-y-1.5 list-disc list-inside">
        {items.map((item, idx) => (
          <li key={idx} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </footer>
  );
}
