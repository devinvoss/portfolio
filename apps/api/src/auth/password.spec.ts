import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('verifies a hashed password', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong horse', hash)).toBe(false);
  });

  it('salts each hash', async () => {
    expect(await hashPassword('same')).not.toEqual(await hashPassword('same'));
  });

  it('rejects missing or malformed hashes', async () => {
    expect(await verifyPassword('x', undefined)).toBe(false);
    expect(await verifyPassword('x', 'x')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$1$2$3$4$5')).toBe(false);
  });
});
