import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AnalysisResultSchema,
  ApiErrorSchema,
  CreateAnalysisInputSchema,
  PasswordSchema,
  RegisterInputSchema,
  StreamEventSchema,
  SynthesisOutputSchema,
  VibeProfileSchema,
} from './index';

describe('Zod Contracts & Schemas (T-015)', () => {
  describe('Fixture AnalysisResult validation', () => {
    it('parses packages/shared/test/fixtures/analysis-result.lempuyang.json contract fixture', () => {
      const fixturePath = resolve(__dirname, '../../test/fixtures/analysis-result.lempuyang.json');
      const raw: unknown = JSON.parse(readFileSync(fixturePath, 'utf-8'));
      const parsed = AnalysisResultSchema.parse(raw);

      expect(parsed.id).toBe('0192e2b0-8c20-7193-8db6-8d5ec4f0f001');
      expect(parsed.status).toBe('COMPLETED');
      expect(parsed.simulate).toBe(true);
      expect(parsed.origin.cfs).toBe(86);
      expect(parsed.origin.redZone).toBe(true);
      expect(parsed.regional).toHaveLength(1);

      const alt = parsed.regional[0];
      expect(alt).toBeDefined();
      if (alt) {
        expect(alt.venue.slug).toBe('taman-ujung');
        expect(alt.rank).toBe(82.3);
        expect(alt.msme).toHaveLength(1);
      }
    });
  });

  describe('StreamEvent discriminated union', () => {
    it('parses "step" variant', () => {
      const event = StreamEventSchema.parse({
        type: 'step',
        agent: 'vibe',
        stepId: 'vibe-vision',
        status: 'running',
        title: 'Extracting scene atmosphere',
        detail: 'Calling vision model',
        ts: 1730000000000,
      });
      expect(event.type).toBe('step');
    });

    it('parses "tool_call" variant', () => {
      const event = StreamEventSchema.parse({
        type: 'tool_call',
        agent: 'crowd',
        tool: 'getBusyness',
        args: { venue: 'taman-ujung', hour: 9 },
        resultSummary: 'live=null -> forecast 22%',
        tier: 'FORECAST',
        ms: 45,
        ts: 1730000000000,
      });
      expect(event.type).toBe('tool_call');
    });

    it('parses "partial" variant', () => {
      const event = StreamEventSchema.parse({
        type: 'partial',
        section: 'vibe',
        payload: { summary: 'Volcanic mountain backdrop' },
      });
      expect(event.type).toBe('partial');
    });

    it('parses "result" variant', () => {
      const fixturePath = resolve(__dirname, '../../test/fixtures/analysis-result.lempuyang.json');
      const raw: unknown = JSON.parse(readFileSync(fixturePath, 'utf-8'));
      const event = StreamEventSchema.parse({
        type: 'result',
        payload: raw,
      });
      expect(event.type).toBe('result');
    });

    it('parses "error" variant', () => {
      const event = StreamEventSchema.parse({
        type: 'error',
        code: 'NOT_A_SCENE',
        message: 'Uploaded image is not a recognizable travel scene',
        recoverable: false,
      });
      expect(event.type).toBe('error');
    });

    it('parses "done" variant', () => {
      const event = StreamEventSchema.parse({
        type: 'done',
        totalMs: 7420,
        models: { vision: 'gemini-2.5-flash', synthesis: 'gemini-2.5-flash' },
      });
      expect(event.type).toBe('done');
    });

    it('fails when event type is unknown or invalid', () => {
      expect(() =>
        StreamEventSchema.parse({
          type: 'unknown_magic_event',
          ts: 123456,
        }),
      ).toThrow();
    });
  });

  describe('JSON Schema generation (z.toJSONSchema)', () => {
    it('successfully generates JSON schema for VibeProfile', () => {
      const jsonSchema = z.toJSONSchema(VibeProfileSchema) as {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
      };
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties?.topography).toBeDefined();
      expect(jsonSchema.required).toContain('isTravelScene');
      expect(jsonSchema.required).toContain('sceneSummary');
    });

    it('successfully generates JSON schema for SynthesisOutput', () => {
      const jsonSchema = z.toJSONSchema(SynthesisOutputSchema) as {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
      };
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties?.headline).toBeDefined();
      expect(jsonSchema.properties?.cards).toBeDefined();
      expect(jsonSchema.required).toContain('headline');
      expect(jsonSchema.required).toContain('cards');
    });
  });

  describe('Auth password policy and DTOs', () => {
    it('enforces >= 8 chars with letter and number', () => {
      expect(() => PasswordSchema.parse('short1A')).toThrow(); // 7 chars
      expect(() => PasswordSchema.parse('onlyletterslowercase')).toThrow(); // no number
      expect(() => PasswordSchema.parse('1234567890')).toThrow(); // no letter
      expect(PasswordSchema.parse('Balipulse2026!')).toBe('Balipulse2026!');
    });

    it('validates RegisterInput schema', () => {
      const input = RegisterInputSchema.parse({
        email: 'traveler@margi.ai',
        password: 'Password123!',
        name: 'Wayan Traveler',
      });
      expect(input.email).toBe('traveler@margi.ai');
    });
  });

  describe('Analysis input coercion and error formatting', () => {
    it('coerces string booleans in CreateAnalysisInput', () => {
      const inputStr = CreateAnalysisInputSchema.parse({
        presetId: 'lempuyang-morning',
        simulate: 'true',
        saveImage: 'false',
      });
      expect(inputStr.simulate).toBe(true);
      expect(inputStr.saveImage).toBe(false);
      expect(inputStr.locale).toBe('en');

      const inputBool = CreateAnalysisInputSchema.parse({
        presetId: 'lempuyang-morning',
        simulate: false,
        saveImage: true,
      });
      expect(inputBool.simulate).toBe(false);
      expect(inputBool.saveImage).toBe(true);
    });

    it('validates ApiError standard format', () => {
      const err = ApiErrorSchema.parse({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input payload',
          requestId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f099',
        },
      });
      expect(err.error.code).toBe('VALIDATION_FAILED');
      expect(err.error.requestId).toBeDefined();
    });
  });
});
