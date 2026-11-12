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
  /** Facts about the reply the model must respect when it writes its last answer (e.g. card count). */
  readonly answerNote?: string;
  /** A claim the answer must not make in this turn (e.g. "the card is ready" when none exists). */
  readonly falseClaim?: RegExp;
}): Promise<string> {
  const { llm, messages, sources, maxTokens } = options;
  const answerNow = options.answerNote ? `${ANSWER_NOW} ${options.answerNote}` : ANSWER_NOW;
  let text = options.text;

  if (!text || text.trim().length === 0) {
    messages.push({ role: 'user', content: answerNow });
    text = (await llm.chat({ messages, maxTokens })).content;
  }

  let check = checkNarrative(text, sources);
  const claimsFalsely = (answer: string): boolean => options.falseClaim?.test(answer) ?? false;
  if (check.ok && !claimsFalsely(check.text)) return check.text;

  const correction =
    check.ok || check.reason !== 'unsourced'
      ? answerNow
      : `Rewrite your answer using ONLY numbers that appear in the trip snapshot or tool results; these numbers have no source: ${check.unsourced.join(', ')}. Plain text, at most 3 sentences.`;
  messages.push({ role: 'assistant', content: text ?? '' }, { role: 'user', content: correction });
  const retry = await llm.chat({ messages, maxTokens });
  check = checkNarrative(retry.content, sources);
  if (check.ok && !claimsFalsely(check.text)) return check.text;

  options.logger.warn(
    check.ok
      ? { reason: 'false-claim', unsourced: [] }
      : { reason: check.reason, unsourced: check.unsourced },
    `${options.label} narrative rejected`,
  );
  throw new LlmUnavailableError('The AI answer could not be verified');
}
