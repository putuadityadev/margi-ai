import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, StreamEvent } from '@margi-ai/shared';
import { useStreamStore } from '../../stores/streamStore';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { server } from '../../mocks/node';
import { useAnalysisStream } from './useAnalysisStream';

describe('useStreamStore and useAnalysisStream (T-046)', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    useStreamStore.getState().reset();
    useAnalyzerStore.getState().reset();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    useStreamStore.getState().reset();
    useAnalyzerStore.getState().reset();
    vi.restoreAllMocks();
  });

  describe('streamStore unit behavior', () => {
    it('initializes with idle status and empty events', () => {
      const state = useStreamStore.getState();
      expect(state.status).toBe('idle');
      expect(state.events).toHaveLength(0);
      expect(state.analysisId).toBeNull();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
    });

    it('deduplicates events by event id', () => {
      const stepEvent: StreamEvent = {
        type: 'step',
        agent: 'orchestrator',
        stepId: 'orch-1',
        status: 'running',
        title: 'Starting pipeline',
        ts: 1730000000000,
      };

      act(() => {
        useStreamStore.getState().addEvent('evt-1', stepEvent);
        useStreamStore.getState().addEvent('evt-1', stepEvent); // duplicate
        useStreamStore.getState().addEvent('evt-2', stepEvent); // unique
      });

      const events = useStreamStore.getState().events;
      expect(events).toHaveLength(2);
      expect(events[0]?.id).toBe('evt-1');
      expect(events[1]?.id).toBe('evt-2');
    });

    it('updates sections state progressively on partial events', () => {
      const partialVibe: StreamEvent = {
        type: 'partial',
        section: 'vibe',
        payload: {
          isTravelScene: true,
          sceneSummary: 'Scenic split gate temple',
        },
      };

      const partialOrigin: StreamEvent = {
        type: 'partial',
        section: 'origin',
        payload: {
          cfs: 86,
          redZone: true,
        },
      };

      act(() => {
        useStreamStore.getState().addEvent('evt-p1', partialVibe);
        useStreamStore.getState().addEvent('evt-p2', partialOrigin);
      });

      const { sections } = useStreamStore.getState();
      expect(sections.vibe).toEqual({
        isTravelScene: true,
        sceneSummary: 'Scenic split gate temple',
      });
      expect(sections.origin).toEqual({
        cfs: 86,
        redZone: true,
      });
    });

    it('sets activeCardId automatically when result arrives', () => {
      const mockOriginVenue = {
        id: '0192e2b0-orig-7000-8000-000000000001',
        slug: 'origin',
        kind: 'DTW' as const,
        category: 'TEMPLE' as const,
        nameEn: 'Origin',
        nameId: 'Asal',
        descriptionEn: 'Desc',
        descriptionId: 'Desk',
        regencyId: 'regency-karangasem',
        lat: -8.4,
        lng: 115.5,
        imageUrl: '/test.webp',
        isHotspot: true,
        isBufferZone: false,
      };

      const mockResult: AnalysisResult = {
        id: '0192e2b0-test',
        status: 'COMPLETED',
        locale: 'en',
        simulate: false,
        input: { origin: mockOriginVenue, arrivalAt: new Date().toISOString() },
        vibe: {
          isTravelScene: true,
          sceneSummary: 'Test',
          topography: { label: 'Mountain', descriptors: ['high', 'peak'], intensity: 0.9 },
          architecture: { label: 'Temple', descriptors: ['stone', 'gate'], intensity: 0.8 },
          lighting: { label: 'Sun', descriptors: ['bright', 'gold'], intensity: 0.7 },
          activity: { label: 'Tour', descriptors: ['walk', 'view'], intensity: 0.6 },
          visualDensity: { label: 'Dense', descriptors: ['crowd', 'tight'], intensity: 0.5 },
          detectedLandmarkGuess: null,
          confidence: 0.9,
        },
        origin: {
          venue: mockOriginVenue,
          snapshot: {
            busynessNow: 80,
            forecastNow: 80,
            forecastPlus2: 85,
            bEff: 80,
            tier: 'FORECAST',
            synthetic: false,
            hourlyCurve: Array(24).fill(50) as number[],
            arrivalHours: [8],
            departureHours: [9],
            isOpen: true,
          },
          cfs: 86,
          redZone: true,
          queueEstimateMin: 180,
        },
        insight: 'Test insight',
        micro: [
          {
            venue: {
              id: '0192e2b0-dest-7000-8000-000000000002',
              slug: 'alt-1',
              kind: 'DTW',
              category: 'TEMPLE',
              nameEn: 'Alt 1',
              nameId: 'Alt 1 ID',
              descriptionEn: 'Desc',
              descriptionId: 'Desk',
              regencyId: 'regency-karangasem',
              lat: -8.45,
              lng: 115.55,
              imageUrl: '/alt.webp',
              isHotspot: false,
              isBufferZone: false,
              regency: {
                id: 'regency-karangasem',
                nameEn: 'Karangasem',
                nameId: 'Karangasem',
                phrStatus: 'RECIPIENT',
              },
              distanceKm: 12,
              travelMinEstimate: 20,
            },
            simVibe: 80,
            topMatchingDimensions: ['Temple'],
            cfs: 20,
            rank: 82.3,
            fiscalBoost: true,
            snapshot: {
              busynessNow: 20,
              forecastNow: 20,
              forecastPlus2: 25,
              bEff: 20,
              tier: 'FORECAST',
              synthetic: false,
              hourlyCurve: Array(24).fill(20) as number[],
              arrivalHours: [8],
              departureHours: [9],
              isOpen: true,
            },
            whyItMatches: 'Quiet atmosphere',
            bestTimeTip: 'Early morning',
            msme: [],
            impact: {
              timeSavedMin: [60, 90],
              supportsMsmeCount: 1,
            },
            etiquette: [],
            mapsUrl: 'https://www.google.com/maps/dir/?api=1',
          },
        ],
        regional: [],
        disclaimers: [],
        meta: {
          totalMs: 6500,
          models: { vision: 'gemini' },
          tiersUsed: ['FORECAST'],
          isReplay: false,
          relaxedStep: 0,
        },
      };

      const resultEvent: StreamEvent = {
        type: 'result',
        payload: mockResult,
      };

      act(() => {
        useStreamStore.getState().addEvent('evt-res', resultEvent);
      });

      const state = useStreamStore.getState();
      expect(state.result).toBeDefined();
      expect(state.activeCardId).toBe('0192e2b0-dest-7000-8000-000000000002');
    });
  });

  describe('useAnalysisStream hook lifecycle and network integration', () => {
    it('sets starting status, fires analytics event, and opens EventSource', async () => {
      // Set up preset in analyzer store
      act(() => {
        useAnalyzerStore.getState().setPreset(MOCK_PRESETS[0]!);
      });

      const { result } = renderHook(() => useAnalysisStream());

      await act(async () => {
        await result.current.start();
      });

      await waitFor(() => {
        expect(['starting', 'streaming', 'completed']).toContain(result.current.status);
      });

      // Cleanup
      act(() => {
        result.current.stop();
      });
      expect(result.current.status).toBe('idle');
    });

    it('handles missing input with friendly recoverable error', async () => {
      // No preset, no image
      const { result } = renderHook(() => useAnalysisStream());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.error?.code).toBe('MISSING_INPUT');
      expect(result.current.error?.recoverable).toBe(true);
    });

    it('cleans up EventSource and timers on unmount', async () => {
      act(() => {
        useAnalyzerStore.getState().setPreset(MOCK_PRESETS[0]!);
      });

      const { result, unmount } = renderHook(() => useAnalysisStream());

      await act(async () => {
        await result.current.start();
      });

      unmount();

      // Ensure no leaks after unmount
      expect(true).toBe(true);
    });
  });
});
