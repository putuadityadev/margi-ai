import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface DisclaimersProps {
  readonly disclaimers?: readonly string[] | undefined;
  readonly className?: string | undefined;
}

export function Disclaimers({ disclaimers, className = '' }: DisclaimersProps): ReactNode {
  const { i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');

  const defaultNote = isId
    ? 'Perkiraan keramaian dapat berubah sewaktu-waktu saat upacara adat Bali (Odalan) atau hari libur. Mohon selalu berpakaian sopan saat memasuki kawasan suci.'
    : 'Crowd estimates may shift during Balinese ceremonies (Odalan) or public holidays. Please dress respectfully when visiting sacred grounds.';

  const customFirst = disclaimers && disclaimers.length > 0 ? disclaimers[0] : defaultNote;

  return (
    <footer
      aria-label="Responsible Travel Note"
      data-testid="disclaimers-block"
      className={`border-t border-ash/60 pt-4 text-xs text-graphite font-normal leading-relaxed ${className}`}
    >
      <p>{customFirst}</p>
    </footer>
  );
}
