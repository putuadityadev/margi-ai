import { safeNextPath } from './google-auth.service';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/app/trip?x=1')).toBe('/app/trip?x=1');
    expect(safeNextPath('/chat')).toBe('/chat');
  });

  it('rejects anything that could leave the app', () => {
    for (const bad of [
      'https://evil.test',
      '//evil.test',
      `/${String.fromCharCode(92)}evil`,
      'javascript:alert(1)',
      undefined,
      42,
      '',
    ]) {
      expect(safeNextPath(bad)).toBe('/app');
    }
  });
});
