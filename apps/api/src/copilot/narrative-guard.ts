const MAX_TEXT_CHARS = 700;
/** Numbers this small are counts ("two options", "3 stops") and never need a source. */
const FREE_NUMBER_LIMIT = 3;

/** Every integer token in `text`, so "09:42" yields 9 and 42 and "81%" yields 81. */
export function numbersIn(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map((token) => Number.parseInt(token, 10));
}

/** Numbers in `text` that no source fact contains (and that are not small counts). */
export function unsourcedNumbers(text: string, sourceFacts: unknown): number[] {
  const allowed = new Set(numbersIn(JSON.stringify(sourceFacts)));
  return numbersIn(text).filter((value) => value > FREE_NUMBER_LIMIT && !allowed.has(value));
}

/**
 * Shortens an over-long answer at the last full sentence that fits, so a model that writes one
 * sentence too many is trimmed instead of failing the whole request.
 */
function fitLength(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  const head = text.slice(0, MAX_TEXT_CHARS);
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (end > MAX_TEXT_CHARS / 3) return head.slice(0, end + 1);
  const space = head.lastIndexOf(' ');
  return `${head.slice(0, space > 0 ? space : MAX_TEXT_CHARS - 1).trimEnd()}…`;
}

/** Tool-call syntax some models print as text instead of calling the tool. */
const TOOL_MARKUP = /<[|｜]|invoke name=|<\/?(tool_call|function)/i;
const SENTENCE_END = /[.!?…)"'”]$/;

/**
 * An answer cut off by the token limit ends mid-word. It is shortened to its last full sentence;
 * with no full sentence to keep, null marks it as unusable.
 */
function finishSentence(text: string): string | null {
  if (SENTENCE_END.test(text)) return text;
  const end = Math.max(text.lastIndexOf('. '), text.lastIndexOf('! '), text.lastIndexOf('? '));
  return end > 0 ? text.slice(0, end + 1) : null;
}

export type NarrativeCheck =
  | { readonly ok: true; readonly text: string }
  | {
      readonly ok: false;
      readonly reason: 'empty' | 'unsourced' | 'markup' | 'cut';
      readonly unsourced: number[];
    };

/**
 * Checks an LLM narrative against the figures the tools returned (TDD §6.8, "numbers by code,
 * words by LLM"): markdown is stripped, an over-long answer is trimmed at a sentence, and the
 * answer is rejected when it is empty or mentions a number that no source contains.
 */
export function checkNarrative(text: string | null, sourceFacts: unknown): NarrativeCheck {
  const cleaned = (text ?? '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0) return { ok: false, reason: 'empty', unsourced: [] };
  if (TOOL_MARKUP.test(cleaned)) return { ok: false, reason: 'markup', unsourced: [] };
  const finished = finishSentence(cleaned);
  if (finished === null) return { ok: false, reason: 'cut', unsourced: [] };
  const fitted = fitLength(finished);
  const unsourced = unsourcedNumbers(fitted, sourceFacts);
  return unsourced.length === 0
    ? { ok: true, text: fitted }
    : { ok: false, reason: 'unsourced', unsourced };
}

/** The checked narrative, or null when it is empty or has a number without a source. */
export function guardNarrative(text: string | null, sourceFacts: unknown): string | null {
  const result = checkNarrative(text, sourceFacts);
  return result.ok ? result.text : null;
}
