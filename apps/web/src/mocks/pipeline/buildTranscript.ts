import { type AnalysisResult, type StreamEvent, StreamEventSchema } from '@margi-ai/shared';
import { type MockScenario } from '../scenario';

export interface TranscriptItem {
  readonly id: string;
  readonly delayMs: number;
  readonly event: StreamEvent;
}

export interface BuildTranscriptOptions {
  result: AnalysisResult;
  scenario?: MockScenario;
  baseTs?: number;
}

export function buildTranscript(options: BuildTranscriptOptions): TranscriptItem[] {
  const { result, scenario = 'default' } = options;
  const baseTs = options.baseTs ?? Date.now();
  const isId = result.locale === 'id';
  const isSimulation = Boolean(result.simulate || scenario === 'simulate');
  const items: TranscriptItem[] = [];
  let seq = 0;
  let currentOffset = 0;

  function push(event: StreamEvent, delayAfterPrev: number): void {
    currentOffset += delayAfterPrev;
    const ts = baseTs + currentOffset;
    const id = `${ts}-${seq++}`;
    // Always parse and validate against Zod contract
    const parsed = StreamEventSchema.parse(event);
    items.push({
      id,
      delayMs: delayAfterPrev,
      event: parsed,
    });
  }

  // 1. Orchestrator start
  push(
    {
      type: 'step',
      agent: 'orchestrator',
      stepId: 'orch-init',
      status: 'running',
      title: isId
        ? 'Memulai orkestrasi pipeline MARGI AI...'
        : 'Starting MARGI AI orchestration pipeline...',
      ts: baseTs,
    },
    80,
  );

  push(
    {
      type: 'step',
      agent: 'orchestrator',
      stepId: 'orch-init',
      status: 'done',
      title: isId ? 'Orkestrator siap' : 'Orchestrator ready',
      ms: 120,
      ts: baseTs + 80,
    },
    120,
  );

  // 2. Agent 1: Vibe Deconstructor
  push(
    {
      type: 'step',
      agent: 'vibe',
      stepId: 'vibe-deconstruct',
      status: 'running',
      title: isId
        ? 'Menganalisis arsitektur, topografi, dan pencahayaan foto...'
        : 'Deconstructing architecture, topography, and lighting from image...',
      ts: baseTs + 200,
    },
    300,
  );

  // Scenario: vision-busy
  if (scenario === 'vision-busy') {
    push(
      {
        type: 'error',
        code: 'AI_VISION_BUSY',
        message: isId
          ? 'AI vision sedang sibuk, silakan coba lagi atau gunakan preset.'
          : 'AI vision is busy, please try again or choose a preset.',
        recoverable: true,
      },
      400,
    );
    return items;
  }

  // Scenario: not-a-scene
  if (scenario === 'not-a-scene' || !result.vibe.isTravelScene) {
    push(
      {
        type: 'tool_call',
        agent: 'vibe',
        tool: 'extract_visual_features',
        args: { model: 'google/gemini-2.5-flash', mode: 'zero-shot' },
        resultSummary: isId
          ? 'Bukan pemandangan wisata alam atau budaya (confidence: 0.95)'
          : 'Not a scenic travel landscape (confidence: 0.95)',
        ms: 720,
        ts: baseTs + 500,
      },
      720,
    );

    push(
      {
        type: 'step',
        agent: 'vibe',
        stepId: 'vibe-deconstruct',
        status: 'done',
        title: isId ? 'Dekonstruksi visual selesai' : 'Visual deconstruction complete',
        ms: 720,
        ts: baseTs + 1220,
      },
      100,
    );

    push(
      {
        type: 'partial',
        section: 'vibe',
        payload: result.vibe,
      },
      50,
    );

    push(
      {
        type: 'result',
        payload: result,
      },
      150,
    );

    push(
      {
        type: 'done',
        totalMs: 1450,
        models: result.meta.models,
      },
      50,
    );

    return items;
  }

  // Regular vibe deconstruction
  const isReplay = scenario === 'replay' || Boolean(result.meta.isReplay);
  push(
    {
      type: 'tool_call',
      agent: 'vibe',
      tool: 'extract_visual_features',
      args: { model: 'google/gemini-2.5-flash' },
      resultSummary: `${result.vibe.topography.label} · ${result.vibe.architecture.label} · ${result.vibe.lighting.label}`,
      ms: 820,
      ts: baseTs + 500,
    },
    820,
  );

  push(
    {
      type: 'step',
      agent: 'vibe',
      stepId: 'vibe-deconstruct',
      status: isReplay ? 'fallback' : 'done',
      title: isReplay
        ? isId
          ? 'Profil vibe dari cache LKG (AI Provider Replay)'
          : 'Cached vibe profile (LKG replay)'
        : isId
          ? 'Profil vibe teridentifikasi'
          : 'Vibe profile identified',
      detail: isReplay ? 'Replayed result — AI provider unavailable' : undefined,
      ms: 820,
      ts: baseTs + 1320,
      data: result.vibe,
    },
    150,
  );

  push(
    {
      type: 'tool_call',
      agent: 'vibe',
      tool: 'vector_similarity_search',
      args: { vectorDim: 1536, topK: 12 },
      resultSummary: isId
        ? 'Ditemukan 12 DTW kandidat dengan kemiripan visual ≥ 70%'
        : 'Found 12 candidate DTWs with visual similarity ≥ 70%',
      ms: 180,
      ts: baseTs + 1470,
    },
    200,
  );

  push(
    {
      type: 'partial',
      section: 'vibe',
      payload: result.vibe,
    },
    80,
  );

  // 3. Agent 2: Crowd Telemetry
  push(
    {
      type: 'step',
      agent: 'crowd',
      stepId: 'crowd-origin',
      status: 'running',
      title: isId
        ? `Mengambil telemetri asal: ${result.origin.venue.nameId}...`
        : `Querying origin telemetry: ${result.origin.venue.nameEn}...`,
      ts: baseTs + 1750,
    },
    250,
  );

  const originTier = isSimulation ? 'SIMULATION' : result.origin.snapshot.tier;
  const originSummary = isSimulation
    ? `live=null → simulated surge ${result.origin.snapshot.bEff}% (Virtual peak)`
    : `live=${result.origin.snapshot.busynessNow}% → forecast ${result.origin.snapshot.forecastNow}% (${result.origin.redZone ? 'Red Zone' : 'Moderate'})`;

  push(
    {
      type: 'tool_call',
      agent: 'crowd',
      tool: 'get_busyness',
      args: { venue: result.origin.venue.slug, hour: 13 },
      resultSummary: originSummary,
      tier: originTier,
      ms: 120,
      ts: baseTs + 2000,
    },
    350,
  );

  push(
    {
      type: 'step',
      agent: 'crowd',
      stepId: 'crowd-origin',
      status: 'done',
      title: isId
        ? `Telemetri asal: CFS ${result.origin.cfs} (${result.origin.redZone ? 'Zona Merah' : 'Tenang'})`
        : `Origin telemetry: CFS ${result.origin.cfs} (${result.origin.redZone ? 'Red Zone' : 'Calm'})`,
      ms: 350,
      ts: baseTs + 2350,
      data: result.origin,
    },
    150,
  );

  push(
    {
      type: 'partial',
      section: 'origin',
      payload: result.origin,
    },
    80,
  );

  push(
    {
      type: 'step',
      agent: 'crowd',
      stepId: 'crowd-candidates',
      status: 'running',
      title: isId
        ? 'Memeriksa telemetri keramaian tempat alternatif...'
        : 'Evaluating candidate venues crowd levels...',
      ts: baseTs + 2580,
    },
    250,
  );

  // Tool calls for alternatives
  const allCards = [...result.micro, ...result.regional];
  for (const card of allCards.slice(0, 3)) {
    const cardTier = isSimulation ? 'SIMULATION' : card.snapshot.tier;
    push(
      {
        type: 'tool_call',
        agent: 'crowd',
        tool: 'get_busyness',
        args: { venue: card.venue.slug, hour: 13 },
        resultSummary: isSimulation
          ? `live=null → simulated forecast ${card.snapshot.forecastNow}% (Calm)`
          : `live=null → forecast ${card.snapshot.forecastNow}% (Calm / Below average)`,
        tier: cardTier,
        ms: 45,
        ts: baseTs + 2830,
      },
      180,
    );
  }

  push(
    {
      type: 'step',
      agent: 'crowd',
      stepId: 'crowd-candidates',
      status: 'done',
      title: isId
        ? `Evaluasi keramaian selesai (${allCards.length} alternatif lolos kurasi)`
        : `Crowd evaluation complete (${allCards.length} alternatives passed filter)`,
      ms: 450,
      ts: baseTs + 3370,
    },
    150,
  );

  push(
    {
      type: 'partial',
      section: 'candidates',
      payload: {
        originCfs: result.origin.cfs,
        alternativesCount: allCards.length,
      },
    },
    80,
  );

  // 4. Agent 3: Bundler & Rerouting
  push(
    {
      type: 'step',
      agent: 'bundler',
      stepId: 'bundler-rank',
      status: 'running',
      title: isId
        ? 'Menghitung skor gabungan R dan rute pengalihan...'
        : 'Computing composite R score & rerouting options...',
      ts: baseTs + 3600,
    },
    250,
  );

  if (scenario === 'relaxed') {
    push(
      {
        type: 'step',
        agent: 'bundler',
        stepId: 'bundler-relax',
        status: 'done',
        title: isId
          ? 'Relaksasi kriteria (Langkah 1): Ambang tenang dinaikkan ke 45%'
          : 'Criteria relaxation (Step 1): Calm threshold expanded to 45%',
        detail: isId
          ? 'Kandidat micro memerlukan kelonggaran batas keramaian'
          : 'Micro candidates required relaxed crowd threshold',
        ms: 120,
        ts: baseTs + 3850,
      },
      180,
    );
  }

  push(
    {
      type: 'step',
      agent: 'bundler',
      stepId: 'bundler-rank',
      status: 'done',
      title: isId
        ? 'Algoritma peringkat selesai (bobot: 0.50 Sim, 0.35 CFS, 0.15 Fiskal)'
        : 'Ranking algorithm complete (weights: 0.50 Sim, 0.35 CFS, 0.15 Fiscal)',
      ms: 280,
      ts: baseTs + 4030,
    },
    150,
  );

  push(
    {
      type: 'step',
      agent: 'bundler',
      stepId: 'bundler-msme',
      status: 'running',
      title: isId
        ? 'Memasangkan UMKM lokal terverifikasi di sepanjang koridor...'
        : 'Bundling verified local MSMEs along travel corridors...',
      ts: baseTs + 4180,
    },
    250,
  );

  const totalMsmes = allCards.reduce((acc, c) => acc + c.msme.length, 0);
  push(
    {
      type: 'tool_call',
      agent: 'bundler',
      tool: 'find_corridor_msmes',
      args: { radiusKm: 3 },
      resultSummary: isId
        ? `Ditemukan ${totalMsmes} UMKM mitra (kuliner & kerajinan lokal)`
        : `Found ${totalMsmes} partner MSMEs (culinary & local crafts)`,
      ms: 160,
      ts: baseTs + 4430,
    },
    220,
  );

  push(
    {
      type: 'step',
      agent: 'bundler',
      stepId: 'bundler-msme',
      status: 'done',
      title: isId ? 'Bundling UMKM berhasil dipasangkan' : 'MSME corridor bundling complete',
      ms: 220,
      ts: baseTs + 4650,
    },
    150,
  );

  const isTemplateNarrative = scenario === 'template-narrative';
  push(
    {
      type: 'step',
      agent: 'bundler',
      stepId: 'bundler-narrative',
      status: isTemplateNarrative ? 'fallback' : 'running',
      title: isTemplateNarrative
        ? isId
          ? 'Template narasi (Fallback)'
          : 'Template narrative (Fallback)'
        : isId
          ? 'Menyusun rekomendasi naratif & panduan etika...'
          : 'Synthesizing narrative recommendations & etiquette notes...',
      detail: isTemplateNarrative
        ? 'AI narrative synthesis timed out, using deterministic fallback'
        : undefined,
      ts: baseTs + 4800,
    },
    250,
  );

  if (!isTemplateNarrative) {
    push(
      {
        type: 'step',
        agent: 'bundler',
        stepId: 'bundler-narrative',
        status: 'done',
        title: isId
          ? 'Narasi & wawasan rekomendasi siap'
          : 'Narrative & recommendations synthesized',
        ms: 750,
        ts: baseTs + 5050,
      },
      450,
    );
  }

  push(
    {
      type: 'partial',
      section: 'recommendations',
      payload: {
        micro: result.micro,
        regional: result.regional,
        insight: result.insight,
      },
    },
    100,
  );

  // 5. Final Result & Done
  push(
    {
      type: 'result',
      payload: result,
    },
    150,
  );

  push(
    {
      type: 'done',
      totalMs: result.meta.totalMs,
      models: result.meta.models,
    },
    50,
  );

  return items;
}
