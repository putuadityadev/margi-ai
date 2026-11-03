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

  it('rejects empty or oversized text', () => {
    expect(guardNarrative(null, FACTS)).toBeNull();
    expect(guardNarrative('a'.repeat(701), FACTS)).toBeNull();
  });
});
