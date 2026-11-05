import type { Logger } from '@nestjs/common';
import {
  LlmUnavailableError,
  type ChatMessage,
  type OpenRouterClient,
} from '../llm/openrouter.client';
import { checkNarrative } from './narrative-guard';

const ANSWER_NOW =
  'Write your final answer to the traveller now: at most 3 short sentences, plain text, in the language of their latest message, using only the trip snapshot and the tool results above. Do not call tools.';

/**
 * Turns the model's last message into a checked answer. When the tool rounds ran out (no text)
 * the model is asked once to answer from the facts it already has; when the answer is empty or
 * quotes a number with no source it gets one corrective round. Only after that does the request
 * fail, so a long tool chain no longer ends in an error by itself.
 */
export async function finalizeNarrative(options: {
  readonly llm: OpenRouterClient;
  readonly messages: ChatMessage[];
  readonly text: string | null;
  readonly sources: unknown;
  readonly maxTokens: number;
  readonly logger: Logger;
  readonly label: string;
}): Promise<string> {
  const { llm, messages, sources, maxTokens } = options;
  let text = options.text;

  if (!text || text.trim().length === 0) {
    messages.push({ role: 'user', content: ANSWER_NOW });
    text = (await llm.chat({ messages, maxTokens })).content;
  }

  let check = checkNarrative(text, sources);
  if (check.ok) return check.text;

  const correction =
    check.reason !== 'unsourced'
      ? ANSWER_NOW
      : `Rewrite your answer using ONLY numbers that appear in the trip snapshot or tool results; these numbers have no source: ${check.unsourced.join(', ')}. Plain text, at most 3 sentences.`;
  messages.push({ role: 'assistant', content: text ?? '' }, { role: 'user', content: correction });
  const retry = await llm.chat({ messages, maxTokens });
  check = checkNarrative(retry.content, sources);
  if (check.ok) return check.text;

  options.logger.warn(
    { reason: check.reason, unsourced: check.unsourced },
    `${options.label} narrative rejected`,
  );
  throw new LlmUnavailableError('The AI answer could not be verified');
}
