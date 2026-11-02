import { z } from 'zod';
import { AnalysisResultSchema } from './analysis';
import { TelemetryTierSchema } from './telemetry';

export const AgentIdSchema = z.enum(['orchestrator', 'vibe', 'crowd', 'bundler']);
export type AgentId = z.infer<typeof AgentIdSchema>;

export const StepStatusSchema = z.enum(['running', 'done', 'fallback', 'failed']);
export type StepStatus = z.infer<typeof StepStatusSchema>;

export const StreamStepEventSchema = z.object({
  type: z.literal('step'),
  agent: AgentIdSchema,
  stepId: z.string(),
  status: StepStatusSchema,
  title: z.string(),
  detail: z.string().optional(),
  ms: z.number().optional(),
  data: z.unknown().optional(),
  ts: z.number(),
});
export type StreamStepEvent = z.infer<typeof StreamStepEventSchema>;

export const StreamToolCallEventSchema = z.object({
  type: z.literal('tool_call'),
  agent: AgentIdSchema,
  tool: z.string(),
  args: z.unknown(),
  resultSummary: z.string(),
  tier: TelemetryTierSchema.optional(),
  ms: z.number(),
  ts: z.number(),
});
export type StreamToolCallEvent = z.infer<typeof StreamToolCallEventSchema>;

export const StreamPartialSectionSchema = z.enum([
  'vibe',
  'origin',
  'candidates',
  'recommendations',
]);
export type StreamPartialSection = z.infer<typeof StreamPartialSectionSchema>;

export const StreamPartialEventSchema = z.object({
  type: z.literal('partial'),
  section: StreamPartialSectionSchema,
  payload: z.unknown(),
});
export type StreamPartialEvent = z.infer<typeof StreamPartialEventSchema>;

export const StreamResultEventSchema = z.object({
  type: z.literal('result'),
  payload: AnalysisResultSchema,
});
export type StreamResultEvent = z.infer<typeof StreamResultEventSchema>;

export const StreamErrorEventSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean(),
});
export type StreamErrorEvent = z.infer<typeof StreamErrorEventSchema>;

export const StreamDoneEventSchema = z.object({
  type: z.literal('done'),
  totalMs: z.number(),
  models: z.record(z.string(), z.string()),
});
export type StreamDoneEvent = z.infer<typeof StreamDoneEventSchema>;

/**
 * Discriminated union of all SSE stream events for MARGI AI analysis (TDD §6.7).
 */
export const StreamEventSchema = z.discriminatedUnion('type', [
  StreamStepEventSchema,
  StreamToolCallEventSchema,
  StreamPartialEventSchema,
  StreamResultEventSchema,
  StreamErrorEventSchema,
  StreamDoneEventSchema,
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;
