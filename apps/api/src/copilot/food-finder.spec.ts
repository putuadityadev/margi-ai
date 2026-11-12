import { dishFilter } from './food-finder';

describe('dishFilter', () => {
  it('keeps the dish words and drops words that only say "food"', () => {
    expect(dishFilter('nasi babi guling yang enak')).toEqual({
      kind: 'words',
      words: ['babi', 'guling'],
    });
  });

  it('reads coffee in Indonesian slang and English as a cafe search', () => {
    expect(dishFilter('ngopi dulu')).toEqual({ kind: 'coffee' });
    expect(dishFilter('Coffee shop')).toEqual({ kind: 'coffee' });
  });

  it('means any local food when no dish is named', () => {
    expect(dishFilter(undefined)).toEqual({ kind: 'any' });
    expect(dishFilter('warung makan lokal')).toEqual({ kind: 'any' });
  });
});
