import { type ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CompassIcon, MapPinIcon, RouteIcon, BookmarkIcon } from '../ui';
import { Film } from 'lucide-react';

export function MobileBottomNav(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const navItems = [
    {
      to: '/',
      label: isId ? 'Jelajah' : 'Explore',
      icon: CompassIcon,
      end: true,
    },
    {
      to: '/app',
      label: isId ? 'Rute AI' : 'AI Route',
      icon: RouteIcon,
      end: false,
    },
    {
      to: '/feed',
      label: isId ? 'Reels' : 'Feed',
      icon: Film,
      end: true,
    },
    {
      to: '/me/trips',
      label: isId ? 'Tersimpan' : 'Saved',
      icon: BookmarkIcon,
      end: false,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ash/80 px-2 py-1.5 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {navItems.map((item) => {
        const IconComponent = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors cursor-pointer select-none ${
                isActive
                  ? 'text-ink'
                  : 'text-graphite hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 transition-all ${
                    isActive ? 'bg-lime text-ink border border-ink' : 'text-graphite'
                  }`}
                >
                  <IconComponent size={16} />
                </div>
                <span className={`mt-0.5 ${isActive ? 'font-medium text-ink' : 'text-graphite'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;

