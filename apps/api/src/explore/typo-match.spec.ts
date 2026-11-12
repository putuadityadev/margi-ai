import { withinOneEdit } from './explore.service';

describe('withinOneEdit', () => {
  it('accepts one changed, missing or extra letter', () => {
    expect(withinOneEdit('botania', 'botanic')).toBe(true);
    expect(withinOneEdit('tanalot', 'tanahlot')).toBe(true);
    expect(withinOneEdit('beratann', 'beratan')).toBe(true);
    expect(withinOneEdit('same', 'same')).toBe(true);
  });

  it('rejects two edits or a length gap above one', () => {
    expect(withinOneEdit('botani', 'botanic garden')).toBe(false);
    expect(withinOneEdit('sanur', 'sanyx')).toBe(false);
    expect(withinOneEdit('kuta', 'kutaaa')).toBe(false);
  });
});
