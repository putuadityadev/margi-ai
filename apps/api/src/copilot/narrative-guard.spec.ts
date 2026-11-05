import { guardNarrative, numbersIn } from './narrative-guard';

const FACTS = [{ crowdPercent: 88, arrive: '09:42', after: 31 }];

describe('guardNarrative', () => {
  it('extracts integer tokens from clock times and percentages', () => {
    expect(numbersIn('Tiba 09:42, ramai 81%')).toEqual([9, 42, 81]);
  });

  it('accepts a narrative whose numbers all come from the facts', () => {
    const text = 'Tirta Empul 88% ramai pukul 09:42; berangkat lebih awal menurunkannya ke 31%.';
    expect(guardNarrative(text, FACTS)).toBe(text);
  });

  it('rejects a narrative with a number no tool produced', () => {
    expect(guardNarrative('Antreannya sekitar 120 menit.', FACTS)).toBeNull();
  });

  it('allows small counts and strips markdown', () => {
    expect(guardNarrative('**Ada 2 pilihan** untukmu.', FACTS)).toBe('Ada 2 pilihan untukmu.');
  });

  it('rejects empty text', () => {
    expect(guardNarrative(null, FACTS)).toBeNull();
    expect(guardNarrative('   ', FACTS)).toBeNull();
  });

  it('rejects tool-call markup printed as text', () => {
    expect(guardNarrative('<｜DSML｜ invoke name="show_places">', FACTS)).toBeNull();
  });

  it('cuts an answer that stopped mid-sentence back to its last full sentence', () => {
    expect(guardNarrative('Ada 2 pilihan untukmu. Yang pertama adalah T', FACTS)).toBe(
      'Ada 2 pilihan untukmu.',
    );
    expect(guardNarrative('Yang pertama adalah T', FACTS)).toBeNull();
  });

  it('trims an over-long answer at a sentence instead of failing', () => {
    const sentence = 'Tirta Empul is calm in the morning. ';
    const long = sentence.repeat(30);
    const result = guardNarrative(long, FACTS);
    expect(result).not.toBeNull();
    expect((result ?? '').length).toBeLessThanOrEqual(700);
    expect(result?.endsWith('.')).toBe(true);
  });
});

describe('numbers the traveller wrote', () => {
  it('are not treated as invented by the model', () => {
    const facts = [{ askedFor: '16:00 today', crowdPercent: 82 }, 'is Tegallalang busy at 5 pm?'];
    expect(guardNarrative('Around 5 pm Tegallalang is at 82 percent.', facts)).not.toBeNull();
    expect(guardNarrative('Around 5 pm Tegallalang is at 64 percent.', facts)).toBeNull();
  });
});
