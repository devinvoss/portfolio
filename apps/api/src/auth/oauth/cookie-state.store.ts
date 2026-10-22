import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import type { StateStore } from 'passport-oauth2';
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions } from '../../session/session.constants';
import { safeReturnTo } from './providers';

const STATE_TTL = 10 * 60 * 1000;

export interface OAuthAppState {
  returnTo?: string;
}

interface SavedState {
  state: string;
  verifier?: string;
  returnTo: string;
}

type StoreCallback = (err: Error | null, state?: string) => void;
type VerifyCallback = (err: Error | null, ok: string | boolean, info?: OAuthAppState | { message: string }) => void;

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * passport-oauth2 state store that keeps the state, PKCE verifier and return path in a
 * short-lived signed cookie, so the API doesn't need server-side sessions.
 * passport-oauth2 picks the call signature by argument count, so keep these parameter lists as they are.
 */
export class CookieStateStore {
  store(req: Request, verifier: string | undefined, appState: OAuthAppState | undefined, _meta: unknown, callback: StoreCallback) {
    const saved: SavedState = {
      state: randomBytes(24).toString('base64url'),
      verifier,
      returnTo: safeReturnTo(appState?.returnTo)
    };
    req.res.cookie(OAUTH_STATE_COOKIE, JSON.stringify(saved), { ...oauthStateCookieOptions, maxAge: STATE_TTL });
    callback(null, saved.state);
  }

  verify(req: Request, providedState: unknown, _meta: unknown, callback: VerifyCallback) {
    const raw = req.signedCookies?.[OAUTH_STATE_COOKIE];
    req.res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions);

    let saved: SavedState | null = null;
    try {
      saved = typeof raw === 'string' ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }

    if (!saved?.state || typeof providedState !== 'string' || !sameString(saved.state, providedState)) {
      return callback(null, false, { message: 'Invalid or expired sign-in request.' });
    }

    callback(null, saved.verifier ?? true, { returnTo: saved.returnTo });
  }
}

// @types/passport-oauth2 leaves out the PKCE store signature that passport-oauth2 calls, hence the cast.
export function createCookieStateStore(): StateStore {
  return new CookieStateStore() as unknown as StateStore;
}
