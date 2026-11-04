import { z } from 'zod';
import { GeoPointSchema, NearbyPlaceSchema } from './explore';

/** Casual chat with MARGI: no trip needed, only where the traveller starts. */
export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  locale: z.enum(['en', 'id']),
  origin: GeoPointSchema,
  /** Visit instant the traveller is looking at (omitted = now). */
  at: z.iso.datetime({ offset: true }).optional(),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(700) }))
    .max(8)
    .optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatReplySchema = z.object({
  /** Narration by the language model; every figure in it came from a tool. */
  text: z.string().min(1).max(700),
  source: z.literal('LLM'),
  /** Places the answer is about, resolved by id so the cards never depend on the model's spelling. */
  places: z.array(NearbyPlaceSchema).max(6),
  /** Follow-up prompts generated from the places above, in the traveller's language. */
  quickReplies: z.array(z.string().max(80)).max(4),
  toolsUsed: z.array(z.string()).max(12),
});
export type ChatReply = z.infer<typeof ChatReplySchema>;
