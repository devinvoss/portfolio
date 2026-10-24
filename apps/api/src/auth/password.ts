import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Stored as scrypt$N$r$p$salt$hash so the cost can be raised later without breaking old hashes.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer, cost: number, blockSize: number, parallelization: number, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options = { N: cost, r: blockSize, p: parallelization, maxmem: 256 * cost * blockSize };
    scrypt(password, salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, COST, BLOCK_SIZE, PARALLELIZATION, KEY_LENGTH);
  return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const parts = stored?.split('$');
  if (!parts || parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, cost, blockSize, parallelization, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await deriveKey(password, Buffer.from(salt, 'base64'), Number(cost), Number(blockSize), Number(parallelization), expected.length);
  return timingSafeEqual(key, expected);
}
