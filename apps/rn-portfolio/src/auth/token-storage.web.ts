// SecureStore has no web version. The web build is a development target (the website is ng-portfolio),
// so the token goes in localStorage; storage can be blocked, which just means signing in again.
const TOKEN_KEY = 'dvoss-session-token';

export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string): Promise<void> {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Still signed in for this visit
    }
  },
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing to clear
    }
  }
};
