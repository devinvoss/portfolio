import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';

/** How long the app has to exchange a code after the browser hands it over. */
export const APP_CODE_TTL = 60 * 1000;

interface PendingCode {
  user: SessionUser;
  codeChallenge: string;
  expires: number;
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * One-time codes for signing in to the mobile app. After the provider's callback, the browser
 * goes back to the app with a code, never the session token itself. The app exchanges the code
 * for a token along with the PKCE verifier only it knows, so a code read from the redirect is useless
 * on its own. Codes live in memory: they last a minute and the API runs as a single instance.
 */
@Injectable()
export class AppAuthCodeService {
  private codes = new Map<string, PendingCode>();

  issue(user: SessionUser, codeChallenge: string, now = Date.now()): string {
    this.prune(now);
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, { user, codeChallenge, expires: now + APP_CODE_TTL });
    return code;
  }

  /** The signed-in user for a valid code and verifier. Each code works once, even when the verifier is wrong. */
  redeem(code: string, codeVerifier: string, now = Date.now()): SessionUser | null {
    const pending = this.codes.get(code);
    this.codes.delete(code);
    if (!pending || pending.expires < now) {
      return null;
    }
    const challenge = createHash('sha256').update(codeVerifier).digest('base64url');
    return sameString(challenge, pending.codeChallenge) ? pending.user : null;
  }

  private prune(now: number) {
    for (const [code, pending] of this.codes) {
      if (pending.expires < now) {
        this.codes.delete(code);
      }
    }
  }
}
