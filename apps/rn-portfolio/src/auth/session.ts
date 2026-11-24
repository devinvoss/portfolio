import { SessionUser } from '@portfolio/models';
import { create } from 'zustand';
import { setAuthToken } from '../api/client';
import { accountApi, authApi } from '../api/endpoints';
import { tokenStorage } from './token-storage';

interface SessionState {
  user: SessionUser | null;
  /** Whether the saved session has been checked with the API yet. */
  ready: boolean;
}

/** Who is signed in, like ng-portfolio's UserService.user$. */
export const useSession = create<SessionState>(() => ({ user: null, ready: false }));

export const useUser = () => useSession(state => state.user);
export const useIsAdmin = () => useSession(state => state.user?.role === 'admin');

let session: Promise<SessionUser | null> | null = null;

/**
 * Checks the saved token with the API once and shares the answer, like UserService.loadSession().
 * A token the API no longer accepts (expired, banned, deleted account) is thrown away.
 */
export function loadSession(): Promise<SessionUser | null> {
  session ??= (async () => {
    const token = await tokenStorage.get();
    if (!token) {
      useSession.setState({ user: null, ready: true });
      return null;
    }

    setAuthToken(token);
    let user: SessionUser | null = null;
    try {
      user = (await authApi.me()).user;
      if (!user) {
        await forgetToken();
      }
    } catch {
      // Offline or the API is down: signed out for now, but keep the token to try again next launch
      setAuthToken(null);
    }
    useSession.setState({ user, ready: true });
    return user;
  })();
  return session;
}

/** Saves the session the sign-in flow got from the API. */
export async function startSession(token: string, user: SessionUser) {
  await tokenStorage.set(token);
  setAuthToken(token);
  session = Promise.resolve(user);
  useSession.setState({ user, ready: true });
}

async function forgetToken() {
  setAuthToken(null);
  await tokenStorage.clear();
}

async function endSession() {
  await forgetToken();
  session = Promise.resolve(null);
  useSession.setState({ user: null, ready: true });
}

/** The token is stateless, so signing out just forgets it. The API call clears any cookie as well. */
export async function logout() {
  authApi.logout().catch(() => undefined);
  await endSession();
}

export async function updateDisplayName(displayName: string): Promise<SessionUser> {
  const user = await accountApi.updateDisplayName(displayName);
  useSession.setState({ user });
  session = Promise.resolve(user);
  return user;
}

export async function deleteAccount(): Promise<void> {
  await accountApi.deleteAccount();
  await endSession();
}
