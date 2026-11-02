import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AdminStats } from '@margi-ai/shared';
import { Card, Pill, Spinner } from '../../components/ui';
import { apiClient } from '../../lib/apiClient';
import { MOCK_ADMIN_STATS } from '../../mocks/data/admin-stats';

export function AdminStatsPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  const [stats, setStats] = useState<AdminStats>(MOCK_ADMIN_STATS);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiClient<AdminStats>('/admin/stats');
      setStats(data);
    } catch {
      // Fallback to mock
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const totalAnalyses = stats.analysesPerDay.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink">
            {isId ? 'Telemetri Sistem & Agregasi Analisis' : 'System Telemetry & Analysis Aggregates'}
          </h2>
          <p className="text-xs text-graphite">
            {isId
              ? 'Metrik operasional Agent 1-3, latensi p50/p95, rasio fallback LLM, dan diversifikasi UMKM.'
              : 'Operational telemetry for Agents 1-3, latency percentiles, LLM fallback ratios, and MSME conversions.'}
          </p>
        </div>

        <Pill tone="default" className="font-mono text-xs">
          Live Prototype Mode
        </Pill>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card tone="white" className="p-4 border border-ash space-y-1">
              <span className="text-[11px] uppercase font-mono text-stone">
                {isId ? 'Total Analisis (7 Hari)' : 'Total Analyses (7d)'}
              </span>
              <div className="text-2xl font-medium text-ink font-mono" data-testid="kpi-total-analyses">
                {totalAnalyses}
              </div>
              <div className="text-[11px] text-graphite">
                {stats.analysesPerDay[stats.analysesPerDay.length - 1]?.count ?? 0} {isId ? 'kemarin' : 'yesterday'}
              </div>
            </Card>

            <Card tone="white" className="p-4 border border-ash space-y-1">
              <span className="text-[11px] uppercase font-mono text-stone">
                {isId ? 'Latensi Pipeline (p50 / p95)' : 'Pipeline Latency (p50 / p95)'}
              </span>
              <div className="text-2xl font-medium text-ink font-mono" data-testid="kpi-latency">
                {(stats.durationMs.p50 / 1000).toFixed(1)}s / {(stats.durationMs.p95 / 1000).toFixed(1)}s
              </div>
              <div className="text-[11px] text-graphite">
                Target SLA: &lt; 8.0s p95
              </div>
            </Card>

            <Card tone="white" className="p-4 border border-ash space-y-1">
              <span className="text-[11px] uppercase font-mono text-stone">
                {isId ? 'Rasio Fallback LLM' : 'LLM Fallback Ratio'}
              </span>
              <div className="text-2xl font-medium text-ink font-mono" data-testid="kpi-fallback">
                {(stats.llmFallbackRatio * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-graphite">
                {isId ? 'Tier 1 Flash sukses tinggi' : 'Tier 1 Flash high health'}
              </div>
            </Card>

            <Card tone="white" className="p-4 border border-ash space-y-1">
              <span className="text-[11px] uppercase font-mono text-stone">
                {isId ? 'Klik Navigasi Google Maps' : 'Google Maps Nav Clicks'}
              </span>
              <div className="text-2xl font-medium text-ink font-mono" data-testid="kpi-nav-clicks">
                {(stats.navigateClicks['MSME'] ?? 0) + (stats.navigateClicks['DTW'] ?? 0)}
              </div>
              <div className="text-[11px] text-graphite">
                {stats.navigateClicks['MSME'] ?? 0} MSME ({Math.round(((stats.navigateClicks['MSME'] ?? 0) / (((stats.navigateClicks['MSME'] ?? 0) + (stats.navigateClicks['DTW'] ?? 0)) || 1)) * 100)}%)
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Volume Chart */}
            <Card tone="white" className="p-5 border border-ash space-y-4">
              <div>
                <h3 className="text-sm font-medium text-ink">
                  {isId ? 'Volume Analisis Harian' : 'Daily Analysis Inflow'}
                </h3>
                <span className="text-xs text-graphite">
                  {isId ? '7 hari terakhir' : 'Last 7 recorded days'}
                </span>
              </div>

              <div className="h-56 w-full" data-testid="analysis-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.analysesPerDay}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      tickFormatter={(val: string) => val.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E232A',
                        borderColor: '#374151',
                        borderRadius: '6px',
                        color: '#F9FAFB',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" fill="#1E232A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Tier Distribution & Conversion */}
            <Card tone="white" className="p-5 border border-ash space-y-4">
              <div>
                <h3 className="text-sm font-medium text-ink">
                  {isId ? 'Distribusi Telemetri Kepadatan' : 'Crowd Telemetry Tier Distribution'}
                </h3>
                <span className="text-xs text-graphite">
                  {isId ? 'Sumber data prediksi yang diakses wisatawan' : 'Data sources utilized across analysis runs'}
                </span>
              </div>

              <div className="space-y-4 pt-2">
                {Object.entries(stats.tierDistribution).map(([tier, count]) => {
                  const total = Object.values(stats.tierDistribution).reduce((a, b) => a + b, 0);
                  const pct = Math.round((count / (total || 1)) * 100);
                  return (
                    <div key={tier} className="space-y-1 text-xs">
                      <div className="flex justify-between font-mono">
                        <span className="text-ink font-medium">{tier}</span>
                        <span className="text-stone">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-parchment rounded-full overflow-hidden border border-ash/60">
                        <div
                          className="h-full bg-ink rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="p-3 bg-parchment rounded-inner border border-ash text-xs space-y-1 mt-4">
                  <div className="font-medium text-ink">
                    {isId ? 'Inovasi Pemerataan Ekonomi (PHR Dispersal)' : 'PHR Dispersal Direct Impact'}
                  </div>
                  <p className="text-graphite">
                    {isId
                      ? `Sebanyak ${stats.navigateClicks['MSME'] ?? 0} wisatawan telah dialihkan langsung ke UMKM lokal di kabupaten penerima PHR (Buleleng, Tabanan, Karangasem).`
                      : `${stats.navigateClicks['MSME'] ?? 0} travelers were directly diverted to local MSMEs in PHR recipient regencies (Buleleng, Tabanan, Karangasem).`}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Venues Table */}
          <Card tone="white" className="p-5 border border-ash space-y-4">
            <h3 className="text-sm font-medium text-ink">
              {isId ? 'Destinasi Wisata Paling Sering Direkomendasikan' : 'Top Recommended Destinations'}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ash text-stone font-mono uppercase text-[10px]">
                    <th className="pb-2">Destination / Venue</th>
                    <th className="pb-2">Venue ID</th>
                    <th className="pb-2 text-right">Analyses Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash/60">
                  {stats.topRecommendedVenues.map((v) => (
                    <tr key={v.venueId} className="hover:bg-parchment/40">
                      <td className="py-2.5 font-medium text-ink">{v.name}</td>
                      <td className="py-2.5 font-mono text-stone text-[11px]">{v.venueId}</td>
                      <td className="py-2.5 text-right font-mono text-ink font-medium">{v.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
