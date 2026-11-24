import { useGlobalSearchParams, usePathname, useSegments } from 'expo-router';

/** The current path with its query, for sending people back after they sign in (Angular's Location.path(true)). */
export function useCurrentPath(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const segments = useSegments() as string[];

  // Route params like [id] are already in the pathname; only the real query goes back on
  const routeParams = new Set(segments.map(segment => /^\[(?:\.\.\.)?(.+)\]$/.exec(segment)?.[1]).filter(Boolean));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!routeParams.has(key) && typeof value === 'string') {
      query.append(key, value);
    }
  }
  const search = query.toString();
  return `${pathname}${search ? `?${search}` : ''}`;
}

/** The sign-in page, set to come back to the given path. */
export function loginHref(returnTo: string) {
  return { pathname: '/login' as const, params: { returnTo } };
}
