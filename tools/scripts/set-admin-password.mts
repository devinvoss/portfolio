/**
 * Sets the admin password, stored as a scrypt hash. Needed once to replace the old plain-text
 * password, and any time the password should change.
 *
 * Usage (Node 24 runs TypeScript directly):
 *   MONGODB_URI="<connection string>" node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/scripts/set-admin-password.mts <username> [--create]
 *
 * --create adds the admin if no user with that username exists (handy for a fresh dev database).
 */
import mongoose from 'mongoose';
import { createInterface } from 'node:readline';
import { hashPassword } from '../../apps/api/src/auth/password.ts';

const MIN_LENGTH = 12;

function readHidden(prompt: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          return resolve(value);
        }
        if (char === '\u0003') {
          cleanup();
          return reject(new Error('Cancelled.'));
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

// Without a terminal, read the password and its confirmation as the first two lines of stdin.
async function readPiped(): Promise<[string, string]> {
  const lines: string[] = [];
  for await (const line of createInterface({ input: process.stdin })) {
    lines.push(line);
    if (lines.length === 2) {
      break;
    }
  }
  return [lines[0] ?? '', lines[1] ?? ''];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const username = process.argv[2];
  const create = process.argv.includes('--create');
  if (!uri || !username || username.startsWith('--')) {
    throw new Error('Usage: MONGODB_URI="<connection string>" node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/scripts/set-admin-password.mts <username> [--create]');
  }

  const [password, confirmation] = process.stdin.isTTY
    ? [await readHidden('New admin password: '), await readHidden('Confirm password: ')]
    : await readPiped();

  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }
  if (password.length < MIN_LENGTH) {
    throw new Error(`Use at least ${MIN_LENGTH} characters.`);
  }

  await mongoose.connect(uri);
  try {
    const result = await mongoose.connection.collection('users').updateOne(
      { username },
      { $set: { password: await hashPassword(password), isAdmin: 1 } },
      { upsert: create }
    );
    if (result.matchedCount === 0 && result.upsertedCount === 0) {
      throw new Error(`No user named "${username}". Pass --create to add one.`);
    }
    console.log(result.upsertedCount ? `Created admin "${username}".` : `Updated the password for "${username}".`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
