import { API_URL } from '../config';

/** A failed API call, with the status and parsed body so screens can pick their message. */
export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API request failed with status ${status}`);
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** The message the API sent with an error, if any. */
export function errorMessage(error: unknown): string | undefined {
  const body = error instanceof ApiError ? error.body : null;
  return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : undefined;
}

export function errorStatus(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

let authToken: string | null = null;

/** The session token sent with every request. Set by the session store. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

/**
 * Calls the API, like ng-portfolio's HttpClient with its ApiInterceptor. The website relies on its
 * session cookie; the app sends the same session as a Bearer token instead.
 */
export async function api<T>(path: string, { method = 'GET', body, query, signal }: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  const url = `${API_URL}/${path}${search ? `?${search}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      // Never send the website's cookie along; the token is the session here
      credentials: 'omit'
    });
  } catch (error) {
    // Screens show a friendly message, so say what really happened where the developer can see it:
    // the Metro terminal for Expo Go, the browser console on the web
    if (__DEV__ && !isAbortError(error)) {
      console.warn(`Couldn't reach the API at ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data as T;
}
