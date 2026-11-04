import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('Passw0rdOK');
    expect(stored.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('Passw0rdOK', stored)).resolves.toBe(true);
    await expect(verifyPassword('passw0rdok', stored)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('Passw0rdOK')).not.toBe(await hashPassword('Passw0rdOK'));
  });

  it('rejects malformed stored values', async () => {
    await expect(verifyPassword('x', 'plain')).resolves.toBe(false);
  });
});
