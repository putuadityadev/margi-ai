import { z } from 'zod';

export const SynthesisCardMsmeSchema = z.object({
  venueId: z.uuid(),
  pairingReason: z.string().max(160),
});
export type SynthesisCardMsme = z.infer<typeof SynthesisCardMsmeSchema>;

export const SynthesisCardSchema = z.object({
  venueId: z.uuid(),
  whyItMatches: z.string().max(220),
  bestTimeTip: z.string().max(120),
  msme: z.array(SynthesisCardMsmeSchema).max(2),
  etiquetteRuleIds: z.array(z.string()).max(3),
});
export type SynthesisCard = z.infer<typeof SynthesisCardSchema>;

/**
 * Structured LLM response from Agent 3 (TDD §6.5).
 */
export const SynthesisOutputSchema = z.object({
  headline: z.string().max(120),
  cards: z.array(SynthesisCardSchema),
});
export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;

/**
 * Crowd bottleneck commentary generated during telemetry synthesis (TDD §6.4).
 */
export const BottleneckInsightSchema = z.object({
  headline: z.string().max(200),
  queueSummary: z.string().max(200),
  calmCandidatesCount: z.number().int().nonnegative(),
  totalCandidatesCount: z.number().int().nonnegative(),
  isSimulated: z.boolean(),
});
export type BottleneckInsight = z.infer<typeof BottleneckInsightSchema>;
