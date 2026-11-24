import { SsoProvider } from '@portfolio/models';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../api/endpoints';
import { API_URL } from '../config';
import { startSession } from './session';

// base64url's alphabet: 64 characters, so a random byte masked to 6 bits picks one without bias
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface Pkce {
  verifier: string;
  challenge: string;
}

/** A PKCE pair: the challenge goes to the API with the sign-in, the verifier only with the token exchange. */
export async function createPkce(): Promise<Pkce> {
  const bytes = Crypto.getRandomBytes(64);
  const verifier = Array.from(bytes, byte => ALPHABET[byte & 63]).join('');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64
  });
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

/** Where the API sends the browser back to: rnportfolio://auth in the app, exp://<dev machine>/--/auth in Expo Go. */
export function authRedirectUri(): string {
  return Linking.createURL('auth');
}

export type SignInResult = { type: 'success' } | { type: 'cancelled' } | { type: 'error'; error: string };

/**
 * Signs in with Google or GitHub in an in-app browser. The API sends the browser back to the app with
 * a one-time code, and the app trades the code and its PKCE verifier for a session token.
 * The PKCE pair is made ahead of time so the browser opens straight from the tap (the web build opens
 * a popup, which browsers only allow right after a click).
 */
export async function signIn(provider: SsoProvider, pkce: Pkce): Promise<SignInResult> {
  const redirectUri = authRedirectUri();
  const query = new URLSearchParams({ redirectUri, codeChallenge: pkce.challenge }).toString();
  const result = await WebBrowser.openAuthSessionAsync(`${API_URL}/auth/${provider}?${query}`, redirectUri);
  if (result.type !== 'success') {
    return { type: 'cancelled' };
  }

  const params = Linking.parse(result.url).queryParams ?? {};
  const code = typeof params.code === 'string' ? params.code : null;
  if (!code) {
    const error = typeof params.error === 'string' ? params.error : 'failed';
    return error === 'cancelled' ? { type: 'cancelled' } : { type: 'error', error };
  }

  try {
    const { token, user } = await authApi.exchangeCode(code, pkce.verifier);
    await startSession(token, user);
    return { type: 'success' };
  } catch {
    return { type: 'error', error: 'failed' };
  }
}
