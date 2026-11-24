import { environment } from '../../environments/environment';

/** The mobile app's custom URL scheme (rn-portfolio's app.json). */
export const APP_SCHEME = 'rnportfolio:';

// The API runs over plain http only in development
const isDev = () => !environment.publicUrl.startsWith('https://');

// Expo Go is served from the dev machine, so its URLs carry a loopback or private LAN address.
// Limiting it to those keeps a sign-in from being sent to a host on the internet.
function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/**
 * Where an app sign-in may send its one-time code: the app's own scheme, Expo Go on the local
 * network, or (in development only) the Expo web dev server on localhost. Returns null otherwise.
 */
export function safeAppRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512 || /[\s\\]/.test(value)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  // A code in the fragment or a pre-filled query would be easy to confuse with ours
  if (url.hash || url.search || url.username || url.password) {
    return null;
  }

  if (url.protocol === APP_SCHEME) {
    return value;
  }
  if (url.protocol === 'exp:' && isPrivateHost(url.hostname)) {
    return value;
  }
  if (url.protocol === 'http:' && url.hostname === 'localhost' && isDev()) {
    return value;
  }
  return null;
}

/**
 * Origins allowed to call the API from a browser on another origin: the Expo web dev server, in
 * development only. That's localhost on the dev machine, or its LAN address from a phone's browser.
 */
export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin || !isDev()) {
    return false;
  }
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && isPrivateHost(url.hostname);
  } catch {
    return false;
  }
}

/** A PKCE S256 code challenge: 43 base64url characters. */
export function isCodeChallenge(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** Adds the sign-in result to the app's redirect URI. */
export function appRedirectUrl(redirectUri: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${redirectUri}?${query}`;
}
