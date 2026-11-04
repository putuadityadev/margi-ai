import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';

export function AiDisclosurePage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 text-ink">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Pill tone="dark">Responsible AI</Pill>
          <span className="text-xs font-mono uppercase tracking-wider text-graphite">
            AIWIC DigiFest 2026
          </span>
        </div>
        <h1 className="text-heading md:text-heading-lg font-medium tracking-tight text-ink">
          {isId ? 'Pengungkapan Teknologi & AI' : 'AI & Technology Disclosure'}
        </h1>
        <p className="text-body text-graphite max-w-2xl leading-relaxed">
          {isId
            ? 'Transparansi penuh mengenai cara kerja 3 agen otonom, model kecerdasan buatan, integritas data keramaian, dan landasan etika pemerataan fiskal pariwisata Bali.'
            : 'Full transparency regarding our 3-agent autonomous architecture, AI models, telemetry integrity, and ethical rationale for Balinese fiscal tourism equity.'}
        </p>
      </div>

      {/* 1. Multi-Agent Architecture */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '1. Arsitektur 3 Agen Otonom' : '1. 3-Agent Autonomous Architecture'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card tone="parchment" className="p-5 space-y-2">
            <div className="text-xs font-mono uppercase text-stone font-medium">Agent 1</div>
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Analis Vibe' : 'Vibe Analyst'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Mendekonstruksi foto wisata ke dalam 5 dimensi estetika visual (topografi, arsitektur, pencahayaan, dinamika, dan densitas) serta embedding vektor cosine similarity.'
                : 'Deconstructs travel photos into 5 visual aesthetic dimensions (topography, architecture, lighting, activity, density) and generates cosine similarity embeddings.'}
            </p>
          </Card>

          <Card tone="parchment" className="p-5 space-y-2">
            <div className="text-xs font-mono uppercase text-stone font-medium">Agent 2</div>
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Prakiraan Kepadatan' : 'Crowd Forecaster'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Mengevaluasi kepadatan real-time, kurva per jam, bottleneck antrean foto, dan penalti kemacetan koridor jalan untuk menghasilkan Crowd Friction Score (CFS).'
                : 'Evaluates real-time busyness, hourly curves, photo queue bottlenecks, and corridor delay penalties to compute the Crowd Friction Score (CFS).'}
            </p>
          </Card>

          <Card tone="parchment" className="p-5 space-y-2">
            <div className="text-xs font-mono uppercase text-stone font-medium">Agent 3</div>
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Perumus Itinerary' : 'Itinerary Bundler'}
            </h3>
            <p className="text-xs text-graphite leading-relaxed">
              {isId
                ? 'Menghitung peringkat gabungan (R = 0.50×Sim + 0.35×(100-CFS) + 0.15×E_fiscal), memasangkan UMKM lokal terkurasi, dan menyematkan etika adat Bali.'
                : 'Calculates ranking (R = 0.50×Sim + 0.35×(100-CFS) + 0.15×E_fiscal), bundles paired local MSMEs, and attaches Balinese cultural etiquette.'}
            </p>
          </Card>
        </div>
      </section>

      {/* 2. Models & Data Sources */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '2. Model AI & Sumber Data' : '2. AI Models & Data Sources'}
        </h2>
        <Card tone="white" className="p-6 border border-ash space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <strong className="block font-medium text-ink text-sm">
                {isId ? 'Model Kecerdasan Buatan' : 'Artificial Intelligence Models'}
              </strong>
              <ul className="space-y-1.5 list-disc list-inside text-graphite">
                <li>
                  <span className="font-mono text-ink">Multimodal Vision LLM:</span> Claude 3.5
                  Sonnet via OpenRouter
                </li>
                <li>
                  <span className="font-mono text-ink">Text Embeddings:</span> OpenAI
                  text-embedding-3-small (1536 dim)
                </li>
                <li>
                  <span className="font-mono text-ink">Vector Search:</span> PostgreSQL pgvector
                  HNSW index
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <strong className="block font-medium text-ink text-sm">
                {isId ? 'Sumber Data & Telemetri' : 'Data & Telemetry Providers'}
              </strong>
              <ul className="space-y-1.5 list-disc list-inside text-graphite">
                <li>BestTime.app Foot-Traffic Telemetry API</li>
                <li>TomTom / OpenStreetMap Traffic & Routing</li>
                <li>BPS & Dinas Pariwisata Provinsi Bali (Statistik DTW & PAD)</li>
                <li>Katalog Kurasi Mandiri MARGI AI (40–60 DTW & UMKM Bali)</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. 3-Tier Fallback & Simulation Honesty */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId
            ? '3. Integritas Telemetri & 3-Tier Fallback'
            : '3. Telemetry Integrity & 3-Tier Fallback'}
        </h2>
        <Card tone="parchment" className="p-6 space-y-3 text-xs leading-relaxed text-graphite">
          <p>
            {isId
              ? 'MARGI AI menerapkan prinsip keterusterangan telemetri tanpa halusinasi data. Setiap data kepadatan selalu diberi label transparan:'
              : 'MARGI AI strictly enforces honest telemetry reporting with zero hallucinated signals. Every crowd metric carries a transparent provenance tier:'}
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong className="text-ink font-mono font-medium">LIVE:</strong>{' '}
              {isId
                ? 'Sinyal langsung terkini dari sensor dan satelit lalu lintas.'
                : 'Direct live real-time sensor and traffic satellite telemetry.'}
            </li>
            <li>
              <strong className="text-ink font-mono font-medium">FORECAST:</strong>{' '}
              {isId
                ? 'Prakiraan kurva mingguan historis saat sensor live sedang offline.'
                : 'Weekly historical forecast curves when live sensors are unavailable.'}
            </li>
            <li>
              <strong className="text-ink font-mono font-medium">SIMULATION:</strong>{' '}
              {isId
                ? 'Mode pengujian juri (Judge Test Mode) yang menyimulasikan lonjakan keramaian viral (+115%) untuk mengevaluasi ketahanan sistem.'
                : 'Judge Test Mode injecting peak hour congestion and viral surges (+115%) for robust scenario evaluation.'}
            </li>
          </ul>
        </Card>
      </section>

      {/* 4. Fiscal Equity Boost Rationale */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '4. Landasan Etika Fiscal Equity Boost' : '4. Fiscal Equity Boost Rationale'}
        </h2>
        <Card
          tone="white"
          className="p-6 border border-ash space-y-3 text-xs leading-relaxed text-graphite"
        >
          <p>
            {isId
              ? 'Berdasarkan data DJPK Kemenkeu dan Disparda Bali, terdapat ketimpangan Pajak Hotel dan Restoran (PHR) yang sangat tajam: Kabupaten Badung menguasai 60.5% penerimaan PHR Bali, sementara Kabupaten Bangli hanya menerima 1.7%.'
              : 'Official fiscal data from the Ministry of Finance (DJPK) reveals severe Balinese tourism tax disparity: Badung Regency captures 60.5% of total island PHR tax revenue, whereas Bangli Regency receives merely 1.7%.'}
          </p>
          <p>
            {isId
              ? 'Untuk mengatasi ketimpangan ini secara terukur, MARGI AI menyematkan bobot khusus (+15% score boost) kepada destinasi dan UMKM di 6 kabupaten penerima (Bangli, Klungkung, Karangasem, Buleleng, Tabanan, dan Jembrana) agar perputaran ekonomi tersebar merata.'
              : 'To systematically address this over-concentration, MARGI AI awards an explicit +15% ranking boost to destinations and local businesses located in the 6 recipient regencies (Bangli, Klungkung, Karangasem, Buleleng, Tabanan, Jembrana).'}
          </p>
        </Card>
      </section>

      {/* 5. Limitations */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-ink">
          {isId ? '5. Batasan & Peringatan Penting' : '5. Known Limitations & Advisories'}
        </h2>
        <Card tone="parchment" className="p-6 space-y-2 text-xs leading-relaxed text-graphite">
          <p>
            {isId
              ? '1. Rekomendasi MARGI AI bukan panduan navigasi darurat. Selalu patuhi rambu jalan dan instruksi petugas kepolisian setempat.'
              : '1. Recommendations are not emergency dispatch instructions. Always obey local traffic police and road signage.'}
          </p>
          <p>
            {isId
              ? '2. Upacara keagamaan adat Bali (Odalan / Melasti) dapat memicu penutupan jalan mendadak yang tidak tercatat dalam jadwal telemetri global.'
              : '2. Sacred temple ceremonies (Odalan, Melasti) may cause unannounced local road closures not reflected in global data feeds.'}
          </p>
          <p>
            {isId
              ? '3. Harap selalu kenakan kamen dan selendang saat memasuki area pura suci demi menghormati kesucian tatanan adat Bali (Awig-Awig).'
              : '3. Always wear a sarong and sash when visiting consecrated temple grounds in accordance with Balinese cultural custom (Awig-Awig).'}
          </p>
        </Card>
      </section>
    </div>
  );
}
