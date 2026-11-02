import { describe, expect, it } from 'vitest';
import { AnalysisResultSchema, StreamEventSchema } from '@margi-ai/shared';
import { buildAnalysisResult } from './buildResult';
import { buildTranscript } from './buildTranscript';
import { MOCK_PRESETS } from '../data/presets';

describe('Mock Analysis Pipeline (T-083)', () => {
  const presets = MOCK_PRESETS.map((p) => p.id);
  const locales = ['en', 'id'] as const;
  const simulateOptions = [false, true];

  describe('Contract validation across presets and locales', () => {
    for (const presetId of presets) {
      for (const locale of locales) {
        for (const simulate of simulateOptions) {
          it(`builds valid result and transcript for ${presetId} (simulate=${simulate}, ${locale})`, () => {
            const result = buildAnalysisResult({
              input: {
                presetId,
                simulate,
                locale,
              },
              scenario: simulate ? 'simulate' : 'default',
            });

            // Parse against Zod schema
            const parsedResult = AnalysisResultSchema.safeParse(result);
            expect(parsedResult.success, parsedResult.error?.message).toBe(true);

            // Verify transcript events
            const transcript = buildTranscript({
              result,
              scenario: simulate ? 'simulate' : 'default',
            });

            expect(transcript.length).toBeGreaterThan(10);

            for (const item of transcript) {
              const parsedEvent = StreamEventSchema.safeParse(item.event);
              expect(parsedEvent.success, parsedEvent.error?.message).toBe(true);
              expect(item.id).toMatch(/^\d+-\d+$/);
            }
          });
        }
      }
    }
  });

  describe('Lempuyang simulation worked example (TDD §7.6)', () => {
    it('reproduces exact mathematical scores for Lempuyang and Taman Ujung', () => {
      const result = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-gate',
          simulate: true,
          locale: 'en',
        },
        scenario: 'simulate',
      });

      // Origin Lempuyang: B_eff=115, F(t+2)=95, P=0 -> CFS = 0.5*115 + 0.3*95 + 0 = 86 -> Red Zone
      expect(result.origin.cfs).toBe(86);
      expect(result.origin.redZone).toBe(true);
      expect(result.origin.snapshot.bEff).toBe(115);
      expect(result.origin.snapshot.tier).toBe('SIMULATION');

      // Alternative: Taman Ujung (Karangasem, RECIPIENT):
      // cos=0.71 -> Sim = (0.71-0.20)/0.65*100 = 78.46... -> 78.5
      // B_eff=22, F(t+2)=30 -> CFS=20
      // R = 0.5*78.46... + 0.35*(100-20) + 0.15*100 = 82.23... -> 82.3
      const tamanUjung = result.regional.find((c) => c.venue.slug === 'taman-ujung');
      expect(tamanUjung).toBeDefined();
      if (tamanUjung) {
        expect(tamanUjung.simVibe).toBeCloseTo(78.5, 1);
        expect(tamanUjung.cfs).toBe(20);
        expect(Math.abs(tamanUjung.rank - 82.3)).toBeLessThanOrEqual(0.1);
        expect(tamanUjung.fiscalBoost).toBe(true);
        expect(tamanUjung.mapsUrl).toContain('google.com/maps/dir');
        expect(tamanUjung.msme.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Card yield and MSME bundling (PRD G-03)', () => {
    it('yields >= 2 Micro and >= 2 Regional cards with 1-2 MSMEs for normal preset', () => {
      const result = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-gate',
          simulate: false,
          locale: 'en',
        },
        scenario: 'default',
      });

      expect(result.micro.length).toBeGreaterThanOrEqual(2);
      expect(result.regional.length).toBeGreaterThanOrEqual(2);

      for (const card of [...result.micro, ...result.regional]) {
        expect(card.msme.length).toBeGreaterThanOrEqual(1);
        expect(card.msme.length).toBeLessThanOrEqual(2);
        expect(card.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/dir/);
        expect(card.venue.lat).toBeTypeOf('number');
        expect(card.venue.lng).toBeTypeOf('number');
      }
    });
  });

  describe('Mock Scenarios', () => {
    it('handles not-a-scene scenario gracefully', () => {
      const result = buildAnalysisResult({
        input: {
          originVenueId: '0192e2b0-0001-7000-8000-000000000001',
          locale: 'en',
        },
        scenario: 'not-a-scene',
      });

      expect(result.vibe.isTravelScene).toBe(false);
      expect(result.micro).toHaveLength(0);
      expect(result.regional).toHaveLength(0);

      const transcript = buildTranscript({
        result,
        scenario: 'not-a-scene',
      });

      const doneEvent = transcript.find((t) => t.event.type === 'done');
      expect(doneEvent).toBeDefined();
    });

    it('handles vision-busy scenario by emitting recoverable error', () => {
      const result = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-gate',
        },
        scenario: 'vision-busy',
      });

      const transcript = buildTranscript({
        result,
        scenario: 'vision-busy',
      });

      const errorEvent = transcript.find((t) => t.event.type === 'error');
      expect(errorEvent).toBeDefined();
      if (errorEvent && errorEvent.event.type === 'error') {
        expect(errorEvent.event.code).toBe('AI_VISION_BUSY');
        expect(errorEvent.event.recoverable).toBe(true);
      }
    });

    it('handles replay scenario with fallback step and isReplay metadata', () => {
      const result = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-gate',
        },
        scenario: 'replay',
      });

      expect(result.meta.isReplay).toBe(true);

      const transcript = buildTranscript({
        result,
        scenario: 'replay',
      });

      const fallbackStep = transcript.find(
        (t) => t.event.type === 'step' && t.event.status === 'fallback',
      );
      expect(fallbackStep).toBeDefined();
    });

    it('handles calm-origin scenario with CFS < 75 and non-red origin', () => {
      const result = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-gate',
        },
        scenario: 'calm-origin',
      });

      expect(result.origin.cfs).toBeLessThan(75);
      expect(result.origin.redZone).toBe(false);
    });

    it('handles relaxed scenario with relaxedStep > 0', () => {
      const result = buildAnalysisResult({
        input: {
          presetId: 'lempuyang-gate',
        },
        scenario: 'relaxed',
      });

      expect(result.meta.relaxedStep).toBeGreaterThan(0);
    });
  });
});
