import * as SecureStore from 'expo-secure-store';

// The session token lives in the iOS Keychain / Android Keystore. The web build uses token-storage.web.ts.
const TOKEN_KEY = 'dvoss-session-token';

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY)
};
