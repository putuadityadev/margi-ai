const MAX_TEXT_CHARS = 700;
/** Numbers this small are counts ("two options", "3 stops") and never need a source. */
const FREE_NUMBER_LIMIT = 3;

/** Every integer token in `text`, so "09:42" yields 9 and 42 and "81%" yields 81. */
export function numbersIn(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map((token) => Number.parseInt(token, 10));
}

/**
 * Checks an LLM narrative against the figures the tools returned (TDD §6.8, "numbers by code,
 * words by LLM"). Returns the cleaned text, or null when the narrative is empty, too long, or
 * mentions a number that no tool produced, in which case the caller uses the template text.
 */
export function guardNarrative(text: string | null, sourceFacts: unknown): string | null {
  if (!text) return null;
  const cleaned = text
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0 || cleaned.length > MAX_TEXT_CHARS) return null;

  const allowed = new Set(numbersIn(JSON.stringify(sourceFacts)));
  for (const value of numbersIn(cleaned)) {
    if (value > FREE_NUMBER_LIMIT && !allowed.has(value)) return null;
  }
  return cleaned;
}
