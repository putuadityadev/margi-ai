import {
  expandAbbreviations,
  isGenericQuery,
  matchScore,
  queryVariants,
  tokensOf,
} from './place-query';

describe('place query clean-up', () => {
  it('expands school abbreviations without adding any region', () => {
    expect(expandAbbreviations('sma n bali mandara')).toBe('sma Negeri bali mandara');
    expect(expandAbbreviations('SMAN 1 Ubud')).toBe('SMA Negeri 1 Ubud');
    expect(expandAbbreviations('smp n 2 sanur')).toBe('smp Negeri 2 sanur');
    expect(expandAbbreviations('rs sanglah')).toBe('Rumah Sakit sanglah');
    for (const text of ['sma n bali mandara', 'sd n 1 ubud']) {
      expect(expandAbbreviations(text).toLowerCase()).not.toMatch(/denpasar|buleleng|badung/);
    }
  });

  it('drops leading filler and offers the original wording as a second try', () => {
    expect(queryVariants('ke sma n bali mandara')).toEqual([
      'sma Negeri bali mandara',
      'sma n bali mandara',
    ]);
    expect(queryVariants('Pura Kehen')).toEqual(['Pura Kehen']);
  });

  it('compares names regardless of abbreviation style', () => {
    expect(tokensOf('SMAN Bali Mandara')).toEqual(tokensOf('sma n bali mandara'));
    const exact = matchScore('sma n bali mandara', 'SMA Negeri Bali Mandara', 'Kubutambahan');
    expect(exact.nameScore).toBe(1);
    const other = matchScore('sma n bali mandara', 'SMA Negeri 1 Denpasar', 'Denpasar');
    expect(other.nameScore).toBeLessThan(0.7);
  });

  it('lets the address carry a region word the traveller added', () => {
    const score = matchScore(
      'SMA Negeri Bali Mandara Buleleng',
      'SMA Negeri Bali Mandara',
      'Kubutambahan, Kabupaten Buleleng, Bali',
    );
    expect(score.nameScore).toBeLessThan(1);
    expect(score.fullScore).toBe(1);
  });
});

describe('generic queries', () => {
  it('rejects words that name a kind of place, not one place', () => {
    expect(isGenericQuery('warung makan terdekat')).toBe(true);
    expect(isGenericQuery('nearest restaurant')).toBe(true);
    expect(isGenericQuery('pantai')).toBe(true);
    expect(isGenericQuery('Warung Bale Nikmat')).toBe(false);
    expect(isGenericQuery('SMA Negeri Bali Mandara')).toBe(false);
  });

  it('treats a kind of place plus an area as generic, but not a named place in an area', () => {
    expect(isGenericQuery('hotel in Ubud')).toBe(true);
    expect(isGenericQuery('warung makan di Canggu')).toBe(true);
    expect(isGenericQuery('Hotel Tugu in Canggu')).toBe(false);
    expect(isGenericQuery('SMA Negeri Bali Mandara di Kubutambahan')).toBe(false);
  });
});
