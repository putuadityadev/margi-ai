import {
  type AnalysisResult,
  type RouteCard,
  type TelemetryTier,
  type VenueLite,
  type VibeProfile,
  cfs,
  fiscalBoost,
  googleMapsDirUrl,
  haversineKm,
  isRedZone,
  queueEstimateMin,
  rankScore,
  simVibeFromCosine,
  timeSavedRange,
  travelMinutesEstimate,
} from '@margi-ai/shared';
import { MOCK_VENUES, type MockVenueDetail } from '../data/venues';
import { MOCK_REGENCIES } from '../data/regencies';
import { type MockScenario } from '../scenario';

export interface BuildResultOptions {
  input: {
    presetId?: string | undefined;
    originVenueId?: string | undefined;
    arrivalAt?: string | undefined;
    simulate?: boolean | undefined;
    locale?: ('en' | 'id') | undefined;
    saveImage?: boolean | undefined;
  };
  scenario?: MockScenario | undefined;
  analysisId?: string | undefined;
}

function toVenueLite(v: MockVenueDetail): VenueLite {
  return {
    id: v.id,
    slug: v.slug,
    kind: v.kind,
    category: v.category,
    nameEn: v.nameEn,
    nameId: v.nameId,
    descriptionEn: v.descriptionEn,
    descriptionId: v.descriptionId,
    regencyId: v.regencyId,
    lat: v.lat,
    lng: v.lng,
    imageUrl: v.imageUrl,
    imageCredit: v.imageCredit ?? null,
    priceLevel: v.priceLevel ?? null,
    isHotspot: v.isHotspot,
    isBufferZone: v.isBufferZone,
  };
}

export function buildAnalysisResult(options: BuildResultOptions): AnalysisResult {
  const { input, scenario = 'default' } = options;
  const analysisId = options.analysisId ?? '0192e2b0-8c20-7193-8db6-8d5ec4f0f001';
  const locale = input.locale ?? 'en';
  const isId = locale === 'id';
  const isSimulation = Boolean(input.simulate || scenario === 'simulate');

  // Find origin venue
  let originVenue: MockVenueDetail;
  if (input.originVenueId) {
    const matched = MOCK_VENUES.find((v) => v.id === input.originVenueId);
    if (matched) {
      originVenue = matched;
    } else if (input.presetId === 'ulun-danu-lake') {
      originVenue = MOCK_VENUES.find((v) => v.slug === 'ulun-danu-beratan') ?? MOCK_VENUES[1]!;
    } else if (input.presetId === 'tegallalang-terrace') {
      originVenue =
        MOCK_VENUES.find((v) => v.slug === 'tegallalang-rice-terrace') ?? MOCK_VENUES[2]!;
    } else if (input.presetId === 'tanah-lot-sunset') {
      originVenue = MOCK_VENUES.find((v) => v.slug === 'tanah-lot') ?? MOCK_VENUES[3]!;
    } else {
      originVenue = MOCK_VENUES.find((v) => v.slug === 'pura-lempuyang') ?? MOCK_VENUES[0]!;
    }
  } else if (input.presetId === 'ulun-danu-lake') {
    originVenue = MOCK_VENUES.find((v) => v.slug === 'ulun-danu-beratan') ?? MOCK_VENUES[1]!;
  } else if (input.presetId === 'tegallalang-terrace') {
    originVenue = MOCK_VENUES.find((v) => v.slug === 'tegallalang-rice-terrace') ?? MOCK_VENUES[2]!;
  } else if (input.presetId === 'tanah-lot-sunset') {
    originVenue = MOCK_VENUES.find((v) => v.slug === 'tanah-lot') ?? MOCK_VENUES[3]!;
  } else {
    // Default or Lempuyang
    originVenue = MOCK_VENUES.find((v) => v.slug === 'pura-lempuyang') ?? MOCK_VENUES[0]!;
  }

  // Not a travel scene scenario
  if (scenario === 'not-a-scene') {
    const notSceneVibe: VibeProfile = {
      isTravelScene: false,
      sceneSummary: isId
        ? 'Foto yang diunggah tampak seperti foto close-up atau bukan pemandangan wisata.'
        : 'The uploaded image appears to be a close-up portrait or non-scenic image.',
      topography: {
        label: 'Indoors / Non-Scenic',
        descriptors: ['indoor', 'close-up'],
        intensity: 0.1,
      },
      architecture: { label: 'None', descriptors: ['non-architectural', 'indoor'], intensity: 0 },
      lighting: { label: 'Artificial', descriptors: ['ambient', 'diffused'], intensity: 0.2 },
      activity: { label: 'Portraiture', descriptors: ['selfie', 'portrait'], intensity: 0.5 },
      visualDensity: { label: 'Low', descriptors: ['minimal', 'sparse'], intensity: 0.1 },
      detectedLandmarkGuess: null,
      confidence: 0.95,
    };

    return {
      id: analysisId,
      status: 'COMPLETED',
      locale,
      simulate: isSimulation,
      input: {
        presetId: input.presetId,
        origin: toVenueLite(originVenue),
        arrivalAt: input.arrivalAt ?? new Date().toISOString(),
      },
      vibe: notSceneVibe,
      origin: {
        venue: toVenueLite(originVenue),
        snapshot: {
          busynessNow: 0,
          forecastNow: 0,
          forecastPlus2: 0,
          bEff: 0,
          tier: 'FORECAST',
          synthetic: false,
          hourlyCurve: Array(24).fill(0) as number[],
          arrivalHours: [8, 12, 16],
          departureHours: [9, 13, 17],
          isOpen: true,
        },
        cfs: 0,
        redZone: false,
        queueEstimateMin: 0,
      },
      insight: isId
        ? 'Foto yang diunggah bukan pemandangan alam atau tempat wisata. Silakan coba salah satu preset Bali kami.'
        : 'The uploaded image is not a scenic travel destination. Please select one of our curated Bali presets.',
      micro: [],
      regional: [],
      disclaimers: [],
      meta: {
        totalMs: 1450,
        models: { vision: 'google/gemini-2.5-flash' },
        tiersUsed: ['FORECAST'],
        isReplay: false,
        relaxedStep: 0,
      },
    };
  }

  // Determine origin crowd metrics
  const isCalmOrigin = scenario === 'calm-origin';
  const originBEff = isSimulation ? 115 : isCalmOrigin ? 25 : 85;
  const originFPlus2 = isSimulation ? 95 : isCalmOrigin ? 25 : 80;
  const originCfsResult = isSimulation
    ? cfs({ bEff: 115, fPlus2: 95, corridorPenalty: 0 }) // Exactly 86 per TDD §7.6
    : cfs({ bEff: originBEff, fPlus2: originFPlus2, corridorPenalty: isCalmOrigin ? 0 : 10 });

  const originRed = isRedZone({ cfsRaw: originCfsResult.raw, bEff: originBEff });
  const originQueue = queueEstimateMin(originVenue.typicalPeakQueueMinutes, originBEff);

  // Vibe Profile
  const vibe: VibeProfile = {
    isTravelScene: true,
    sceneSummary: isId
      ? 'Gerbang pura Candi Bentar ikonis dengan siluet megah berlatar puncak gunung vulkanik di pagi hari.'
      : 'Iconic Balinese split gate framing an active volcanic peak with morning atmospheric haze.',
    topography: {
      label: isId ? 'Latar Pegunungan Vulkanik' : 'Volcanic Mountain Backdrop',
      descriptors: ['volcanic peak', 'terraced valley', 'elevated ridge'],
      intensity: 0.95,
    },
    architecture: {
      label: isId ? 'Arsitektur Pura Tradisional Bali' : 'Traditional Balinese Temple Architecture',
      descriptors: ['candi bentar split gate', 'carved sandstone', 'ceremonial stairway'],
      intensity: 0.92,
    },
    lighting: {
      label: isId ? 'Cahaya Keemasan Pagi' : 'Crisp Morning Golden Hour',
      descriptors: ['morning haze', 'soft golden sunlight', 'dramatic clouds'],
      intensity: 0.8,
    },
    activity: {
      label: isId ? 'Kontemplasi Spiritual & Fotografi' : 'Spiritual Contemplation & Photography',
      descriptors: ['temple pilgrimage', 'scenic portraiture', 'reflection ritual'],
      intensity: 0.7,
    },
    visualDensity: {
      label: isId ? 'Simetri Geometris' : 'Geometric Symmetry',
      descriptors: ['symmetric framing', 'grand silhouette', 'open horizon'],
      intensity: 0.85,
    },
    detectedLandmarkGuess: originVenue.nameEn,
    confidence: 0.98,
  };

  // Helper to build a RouteCard from a DTW venue
  const buildCard = (
    venue: MockVenueDetail,
    cosine: number,
    bEff: number,
    fPlus2: number,
    msmeList: MockVenueDetail[],
    whyEn: string,
    whyId: string,
    tipEn: string,
    tipId: string,
    etiquetteEn: string,
    etiquetteId: string,
    isRelaxed = false,
  ): RouteCard => {
    const regency = MOCK_REGENCIES.find((r) => r.id === venue.regencyId) ?? {
      id: venue.regencyId,
      nameEn: venue.regencyId,
      nameId: venue.regencyId,
      phrStatus: 'RECIPIENT' as const,
    };

    // Fixed 0.20 / 0.85 bounds: the mock photo analysis uses hand-picked cosines, not measured ones.
    const simVibe = simVibeFromCosine(cosine, { floor: 0.2, ceil: 0.85 });
    const cardCfsResult = cfs({ bEff, fPlus2, corridorPenalty: 0 });
    const eFiscal = fiscalBoost({
      phrStatus: regency.phrStatus,
      isBufferZone: venue.isBufferZone,
      isHotspot: venue.isHotspot,
    });
    const rank = rankScore(simVibe, cardCfsResult.display, eFiscal);

    const distanceKm = haversineKm(
      { lat: originVenue.lat, lng: originVenue.lng },
      { lat: venue.lat, lng: venue.lng },
    );
    const travelMinEstimate = travelMinutesEstimate(distanceKm, false);
    const altQueue = queueEstimateMin(venue.typicalPeakQueueMinutes, bEff);
    const timeSaved = timeSavedRange({
      originQueue,
      originCorridorDelay: originRed ? 20 : 0,
      altQueue,
      altTravel: travelMinEstimate,
    });

    const tier: TelemetryTier = isSimulation ? 'SIMULATION' : 'FORECAST';

    const bundledMsmes = msmeList.map((m) => {
      const mDistance = haversineKm({ lat: venue.lat, lng: venue.lng }, { lat: m.lat, lng: m.lng });
      return {
        venue: {
          ...toVenueLite(m),
          distanceKm: Number(mDistance.toFixed(1)),
        },
        simVibe: 75.0,
        snapshot: {
          busynessNow: 15,
          forecastNow: 15,
          forecastPlus2: 20,
          bEff: 15,
          tier,
          synthetic: false,
          hourlyCurve: [
            0, 0, 0, 0, 0, 0, 10, 15, 15, 20, 25, 20, 15, 15, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ],
          arrivalHours: [8, 9, 10],
          departureHours: [9, 10, 11],
          isOpen: true,
        },
        pairingReason: isId
          ? `Nikmati sajian lokal khas ${m.category.toLowerCase()} hanya ${mDistance.toFixed(1)} km dari lokasi ini.`
          : `Enjoy authentic local ${m.category.toLowerCase()} treats just ${mDistance.toFixed(1)} km away.`,
      };
    });

    return {
      venue: {
        ...toVenueLite(venue),
        regency,
        distanceKm: Number(distanceKm.toFixed(1)),
        travelMinEstimate,
      },
      simVibe: Number(simVibe.toFixed(1)),
      topMatchingDimensions: isId
        ? ['Arsitektur Pura Tradisional Bali', 'Simetri Geometris']
        : ['Traditional Balinese Temple Architecture', 'Geometric Symmetry'],
      cfs: cardCfsResult.display,
      rank: Number(rank.toFixed(1)),
      fiscalBoost: eFiscal > 0,
      snapshot: {
        busynessNow: bEff,
        forecastNow: bEff,
        forecastPlus2: fPlus2,
        bEff,
        tier,
        synthetic: false,
        hourlyCurve: [
          0,
          0,
          0,
          0,
          0,
          0,
          10,
          20,
          bEff,
          25,
          25,
          25,
          20,
          20,
          15,
          10,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ],
        arrivalHours: [8, 9, 14],
        departureHours: [9, 10, 15],
        isOpen: true,
      },
      whyItMatches: isId ? whyId : whyEn,
      bestTimeTip: isId ? tipId : tipEn,
      msme: bundledMsmes,
      impact: {
        timeSavedMin: timeSaved,
        supportsMsmeCount: bundledMsmes.length,
      },
      etiquette: [
        {
          id: 'temple-respect',
          text: isId ? etiquetteId : etiquetteEn,
          severity: 1,
        },
      ],
      relaxed: isRelaxed
        ? { step: 1, reasons: [isId ? 'Ambang kemiripan dilonggarkan' : 'Relaxed crowd threshold'] }
        : undefined,
      mapsUrl: googleMapsDirUrl({ lat: venue.lat, lng: venue.lng }),
    };
  };

  // Find candidate venues from mock dataset
  const microVenues = MOCK_VENUES.filter(
    (v) => v.kind === 'DTW' && v.id !== originVenue.id && v.regencyId === originVenue.regencyId,
  );
  const regionalVenues = MOCK_VENUES.filter(
    (v) => v.kind === 'DTW' && v.id !== originVenue.id && v.regencyId !== originVenue.regencyId,
  );
  const msmes = MOCK_VENUES.filter((v) => v.kind === 'MSME');

  // Fallbacks if filtered empty
  const v1 = microVenues[0] ?? MOCK_VENUES[1]!;
  const v2 = microVenues[1] ?? MOCK_VENUES[2]!;
  const v3 = regionalVenues[0] ?? MOCK_VENUES[3]!;
  const v4 = regionalVenues[1] ?? MOCK_VENUES[4]!;

  const isRelaxedScenario = scenario === 'relaxed';

  const tamanUjungVenue = MOCK_VENUES.find((v) => v.slug === 'taman-ujung') ?? v3;

  // For Lempuyang worked example (TDD §7.6):
  // Taman Ujung with cosine 0.71 -> simVibe 78.5, bEff 22, fPlus2 30 -> CFS 20, R 82.3
  const cardTamanUjung = buildCard(
    tamanUjungVenue,
    0.71, // Sim = 78.5
    22, // CFS = 20
    30,
    msmes.slice(0, 1),
    'Magnificent historic water palace blending traditional Balinese stonework with European architecture, framed by Mount Agung.',
    'Istana air megah bersejarah yang memadukan arsitektur tradisional Bali dan Eropa berlatar Gunung Agung.',
    'Best visited at 09:30 WITA for soft reflections and quiet breezes.',
    'Paling pas dikunjungi pukul 09.30 WITA untuk pantulan air yang jernih dan suasana sejuk.',
    'Modest attire covering shoulders and knees is recommended on royal temple grounds.',
    'Pakaian sopan menutup bahu dan lutut dianjurkan di area taman suci kerajaan.',
    isRelaxedScenario,
  );

  const cardLahangan = buildCard(
    v1,
    0.73,
    25,
    25,
    msmes.slice(1, 2),
    'Panoramic cliff edge overlook offering unhindered vistas of Mount Agung without ceremonial queue crowds.',
    'Tebing panorama dengan pemandangan terbuka Gunung Agung tanpa kepadatan antrean foto.',
    'Best visited at 08:30 WITA when morning haze lifts over the eastern valley.',
    'Paling pas dikunjungi pukul 08.30 WITA saat kabut pagi terangkat dari lembah timur.',
    'Remain behind safety barriers on wooden lookout perimeters.',
    'Tetap berada di belakang pagar pengaman anjungan kayu.',
    isRelaxedScenario,
  );

  const cardMicro2 = buildCard(
    v2,
    0.7,
    28,
    30,
    msmes.slice(2, 3),
    'Serene sacred spring and heritage pool complex surrounded by ancient stone pavilions.',
    'Kompleks pemandian suci dengan paviliun batu kuno yang tenang.',
    'Visit around 10:00 WITA.',
    'Kunjungi sekitar pukul 10.00 WITA.',
    'Sarong and sash required.',
    'Wajib mengenakan kamen dan selendang.',
    isRelaxedScenario,
  );

  const cardRegional2 = buildCard(
    v4,
    0.69,
    18,
    22,
    msmes.slice(3, 4),
    'Ancient sanctuary nestled on peaceful hill terraces with authentic stone shrines and tranquil prayer courtyards.',
    'Pura kuno bertingkat di perbukitan asri dengan pelataran sembahyang yang hening.',
    'Arrive before midday.',
    'Tiba sebelum tengah hari.',
    'Sarong and sash required.',
    'Wajib mengenakan kamen dan selendang.',
    isRelaxedScenario,
  );

  const insight = isId
    ? `${originVenue.nameId} saat ini berada dalam ${
        originRed ? 'Zona Merah antrean padat' : 'kondisi normal'
      } dengan estimasi antre ${originQueue} menit. Tersedia alternatif tenang dengan atmosfer serupa di kawasan sekitar.`
    : `${originVenue.nameEn} is currently in a ${
        originRed ? 'severe Red Zone bottleneck' : 'comfortable state'
      } with an estimated photo queue of ${originQueue} minutes. Serenity-matched alternatives are calm right now.`;

  return {
    id: analysisId,
    status: 'COMPLETED',
    locale,
    simulate: isSimulation,
    simulation: isSimulation
      ? {
          virtualTime: '2026-11-07T09:00:00+08:00',
          surgePct: 115,
        }
      : undefined,
    input: {
      presetId: input.presetId,
      origin: toVenueLite(originVenue),
      arrivalAt: input.arrivalAt ?? new Date().toISOString(),
    },
    vibe,
    origin: {
      venue: toVenueLite(originVenue),
      snapshot: {
        busynessNow: originBEff,
        forecastNow: originBEff,
        forecastPlus2: originFPlus2,
        bEff: originBEff,
        tier: isSimulation ? 'SIMULATION' : 'FORECAST',
        synthetic: false,
        hourlyCurve: [
          0,
          0,
          0,
          0,
          0,
          10,
          35,
          65,
          85,
          originBEff,
          100,
          95,
          90,
          85,
          75,
          60,
          40,
          20,
          5,
          0,
          0,
          0,
          0,
          0,
        ],
        arrivalHours: [6, 7, 16],
        departureHours: [7, 8, 17],
        isOpen: true,
      },
      cfs: originCfsResult.display,
      redZone: originRed,
      queueEstimateMin: originQueue,
    },
    insight,
    micro: [cardLahangan, cardMicro2],
    regional: [cardTamanUjung, cardRegional2],
    disclaimers: [
      isId
        ? 'Estimasi waktu tempuh berdasarkan kondisi jalan lingkar Bali.'
        : 'Travel times are estimates based on standard Bali road conditions.',
      isId
        ? 'Tingkat keramaian bersumber dari sinyal telemetri dan simulasi kalibrasi.'
        : 'Crowd telemetry reflects live signals and calibrated forecasts.',
    ],
    meta: {
      totalMs: 7420,
      models: {
        vision: 'google/gemini-2.5-flash',
        synthesis: 'google/gemini-2.5-flash',
      },
      tiersUsed: [isSimulation ? 'SIMULATION' : 'FORECAST'],
      isReplay: scenario === 'replay',
      relaxedStep: isRelaxedScenario ? 1 : 0,
    },
  };
}
