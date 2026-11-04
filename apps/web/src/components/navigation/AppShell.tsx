import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, Compass, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface NavItem {
  readonly to: string;
  readonly icon: LucideIcon;
  readonly label: { readonly id: string; readonly en: string };
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/app', icon: Compass, label: { id: 'Jelajah', en: 'Explore' } },
  { to: '/feed', icon: Sparkles, label: { id: 'Feed', en: 'Feed' } },
  { to: '/chat', icon: MessageCircle, label: { id: 'Chat MARGI', en: 'Chat MARGI' } },
  { to: '/plans', icon: Bookmark, label: { id: 'Rencana', en: 'Plans' } },
];

/**
 * Main navigation for the signed-in-or-not app: a bottom bar on phones and a slim rail on wider
 * screens. Pages render inside the content area, so sheets and maps never sit under the bar.
 * The trip planner is the one full-screen exception and lives outside this shell.
 */
export function AppShell(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const labelOf = (item: NavItem): string => (isId ? item.label.id : item.label.en);

  return (
    <div className="fixed inset-0 flex flex-col bg-parchment text-ink md:flex-row">
      <nav
        aria-label={isId ? 'Navigasi utama' : 'Main navigation'}
        className="hidden w-[84px] flex-none flex-col items-center gap-1 border-r border-ink bg-white py-3 md:flex"
      >
        <Link
          to="/"
          aria-label="MARGI AI"
          className="mb-3 flex h-11 w-11 items-center justify-center border border-ink bg-white"
        >
          <span className="h-3.5 w-3.5 border border-ink bg-lime" aria-hidden="true" />
        </Link>
        {NAV_ITEMS.map((item) => (
          <NavTab key={item.to} item={item} label={labelOf(item)} layout="rail" />
        ))}
      </nav>

      <div className="relative min-h-0 min-w-0 flex-1">
        <Outlet />
      </div>

      <nav
        aria-label={isId ? 'Navigasi utama (ponsel)' : 'Main navigation (mobile)'}
        className="grid flex-none grid-cols-4 border-t border-ink bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavTab key={item.to} item={item} label={labelOf(item)} layout="bar" />
        ))}
      </nav>
    </div>
  );
}

function NavTab({
  item,
  label,
  layout,
}: {
  readonly item: NavItem;
  readonly label: string;
  readonly layout: 'bar' | 'rail';
}): ReactNode {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none transition-colors',
          layout === 'bar' ? 'h-14' : 'h-16 w-full',
          isActive ? 'text-ink' : 'text-graphite hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center border',
              isActive ? 'border-ink bg-lime text-ink' : 'border-transparent',
            )}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
          <span className="max-w-full truncate px-1">{label}</span>
        </>
      )}
    </NavLink>
  );
}
