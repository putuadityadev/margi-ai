import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Pill } from '../../components/ui';

/** Curator console shell: manage the destinations and local businesses MARGI recommends. */
export function AdminLayout(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-3 border-b border-ash pb-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <Pill tone="dark">{isId ? 'Konsol Kurator' : 'Curator Console'}</Pill>
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            {isId ? 'Destinasi & UMKM' : 'Destinations & local businesses'}
          </h1>
          <p className="text-xs text-graphite">
            {isId
              ? 'Perubahan langsung tampil di peta, rencana, dan MARGI Copilot.'
              : 'Changes show up in the map, trip plans and MARGI Copilot right away.'}
          </p>
        </div>
        <Link to="/app" className="text-xs font-medium text-ink underline underline-offset-4">
          ← {isId ? 'Buka aplikasi' : 'Open the app'}
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
