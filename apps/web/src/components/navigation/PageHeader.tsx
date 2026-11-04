import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountMenu } from '../../features/account/AccountMenu';

export interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Extra controls placed before language and account, e.g. a refresh button. */
  readonly actions?: ReactNode;
}

/** Header shared by the Feed, Chat and Plans screens: title on the left, language and account right. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  return (
    <header className="flex flex-none items-center gap-3 border-b border-ink bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-subheading font-medium text-ink">{title}</h1>
        {subtitle && <p className="truncate text-caption text-graphite">{subtitle}</p>}
      </div>
      {actions}
      <button
        type="button"
        onClick={() => void i18n.changeLanguage(isId ? 'en' : 'id')}
        aria-label={isId ? 'Ganti bahasa' : 'Switch language'}
        className="pointer-events-auto flex h-11 w-11 flex-none items-center justify-center border border-ink bg-white font-mono text-caption text-ink"
      >
        {isId ? 'EN' : 'ID'}
      </button>
      <AccountMenu />
    </header>
  );
}
