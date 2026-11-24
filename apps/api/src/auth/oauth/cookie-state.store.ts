import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import type { StateStore } from 'passport-oauth2';
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions } from '../../session/session.constants';
import { isCodeChallenge, safeAppRedirect } from '../app-auth/app-redirect';
import { safeReturnTo } from './providers';

const STATE_TTL = 10 * 60 * 1000;

export interface OAuthAppState {
  returnTo?: string;
  /** Set when the mobile app started the sign-in: where to send its one-time code. */
  appRedirect?: string;
  /** The app's PKCE challenge, which its token exchange has to answer. */
  codeChallenge?: string;
}

interface SavedState {
  state: string;
  verifier?: string;
  returnTo: string;
  appRedirect?: string;
  codeChallenge?: string;
}

// An app sign-in needs both a redirect it may use and a challenge; anything less is a web sign-in.
function appSignIn(appState: OAuthAppState | undefined): Pick<OAuthAppState, 'appRedirect' | 'codeChallenge'> {
  const appRedirect = safeAppRedirect(appState?.appRedirect);
  const codeChallenge = appState?.codeChallenge;
  return appRedirect && isCodeChallenge(codeChallenge) ? { appRedirect, codeChallenge } : {};
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
      returnTo: safeReturnTo(appState?.returnTo),
      ...appSignIn(appState)
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

    callback(null, saved.verifier ?? true, { returnTo: saved.returnTo, ...appSignIn(saved) });
  }
}

/**
 * The app redirect saved by a sign-in that failed before passport checked the state (the user cancelled
 * at the provider), so the error can go back to the app. Clears the cookie.
 */
export function pendingAppRedirect(req: Request): string | null {
  const raw = req.signedCookies?.[OAUTH_STATE_COOKIE];
  if (typeof raw !== 'string') {
    return null;
  }
  req.res?.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions);
  try {
    return appSignIn(JSON.parse(raw)).appRedirect ?? null;
  } catch {
    return null;
  }
}

// @types/passport-oauth2 leaves out the PKCE store signature that passport-oauth2 calls, hence the cast.
export function createCookieStateStore(): StateStore {
  return new CookieStateStore() as unknown as StateStore;
}
