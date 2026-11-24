import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The live site, which serves the API and the resume. */
export const SITE_URL = 'https://devinvoss.dev';

const DEV_API_PORT = 3333;

// In development the API runs on the dev machine. Both Expo Go and the web build reach it at the
// address they loaded the app from: Metro's host for Expo Go, the page's host in a browser (localhost
// on the dev machine, its LAN address in a phone's browser).
function devApiUrl(): string {
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `http://${host}:${DEV_API_PORT}/api`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:${DEV_API_PORT}/api`;
}

/**
 * The API's base URL, without a trailing slash. EXPO_PUBLIC_API_URL overrides it, for example
 * `EXPO_PUBLIC_API_URL=https://devinvoss.dev/api` to try the app against the live site.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? devApiUrl() : `${SITE_URL}/api`)).replace(/\/$/, '');

export const RESUME_URL = `${SITE_URL}/assets/resume.pdf`;
export const LINKEDIN_URL = 'https://www.linkedin.com/in/devin-voss-18548911a/';
