import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, Pill, Spinner } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';

interface ReembedJob {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  done: number;
  total: number;
  errors: string[];
}

export function AdminLayout(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();

  const [activeJob, setActiveJob] = useState<ReembedJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const navLinks = [
    { to: '/admin/venues', labelEn: 'Venues & Vibe', labelId: 'Destinasi & Vibe' },
    { to: '/admin/forecast', labelEn: 'Crowd Forecast', labelId: 'Prakiraan Kepadatan' },
    { to: '/admin/presets', labelEn: 'Presets', labelId: 'Preset' },
    { to: '/admin/etiquette', labelEn: 'Etiquette Rules', labelId: 'Etika Budaya' },
    { to: '/admin/corridors', labelEn: 'Corridors', labelId: 'Koridor Macet' },
    { to: '/admin/stats', labelEn: 'System Telemetry', labelId: 'Telemetri Sistem' },
  ];

  const handleTriggerReembedAll = async (): Promise<void> => {
    try {
      const res = await apiClient<{ job: ReembedJob }>('/admin/venues/re-embed-all', {
        method: 'POST',
      });
      setActiveJob(res.job);
      setIsPolling(true);

      const interval = setInterval(async () => {
        try {
          const poll = await apiClient<{ job: ReembedJob }>(`/admin/jobs/${res.job.id}`);
          setActiveJob(poll.job);
          if (poll.job.status !== 'RUNNING') {
            clearInterval(interval);
            setIsPolling(false);
          }
        } catch {
          clearInterval(interval);
          setIsPolling(false);
        }
      }, 1000);
    } catch {
      // Error
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ash pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Pill tone="dark">{isId ? 'Konsol Kurator MARGI' : 'MARGI Curator Console'}</Pill>
            <span className="text-[11px] font-mono text-graphite">Role: ADMIN</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            {isId ? 'Manajemen Destinasi & Telemetri' : 'Destination & Telemetry Operations'}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTriggerReembedAll}
            disabled={isPolling}
            className="text-xs border border-ash bg-white hover:bg-parchment"
          >
            {isPolling ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" />
                <span>{isId ? 'Memproses Vektor...' : 'Re-embedding...'}</span>
              </span>
            ) : (
              <span>{isId ? 'Re-embed Semua Vektor' : 'Re-embed All Vectors'}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="text-xs border border-ash bg-white"
          >
            ← {isId ? 'Buka Aplikasi' : 'Open User App'}
          </Button>
        </div>
      </div>

      {/* Re-embed Progress Alert if active */}
      {activeJob && (
        <Card tone="parchment" className="p-4 border border-ash flex items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <span>{activeJob.status === 'RUNNING' ? '•' : '✓'}</span>
              <span>
                {isId ? 'Status Rekalkulasi Vektor:' : 'Vector Embedding Job:'}{' '}
                {activeJob.status} ({activeJob.done}/{activeJob.total} {isId ? 'destinasi' : 'venues'})
              </span>
            </div>
            <div className="w-full bg-ash/50 h-2 rounded-pill overflow-hidden">
              <div
                className="bg-ink h-full transition-all duration-300"
                style={{
                  width: `${Math.round((activeJob.done / (activeJob.total || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {activeJob.status !== 'RUNNING' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveJob(null)}
              className="text-xs"
            >
              ✕
            </Button>
          )}
        </Card>
      )}

      {/* Admin Subnav */}
      <nav aria-label="Admin navigation" className="flex items-center gap-1 border-b border-ash overflow-x-auto pb-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-pill whitespace-nowrap transition ${
                isActive
                  ? 'bg-ink text-parchment'
                  : 'text-graphite hover:text-ink hover:bg-parchment'
              }`
            }
          >
            <span>{isId ? link.labelId : link.labelEn}</span>
          </NavLink>
        ))}
      </nav>

      {/* Nested Admin Route Content */}
      <Outlet />
    </div>
  );
}

