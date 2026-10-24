import { CookieOptions } from 'express';
import { Role } from '@portfolio/models';
import { environment } from '../environments/environment';

export const SESSION_COOKIE = 'session';
export const OAUTH_STATE_COOKIE = 'oauth_state';

const HOUR = 60 * 60 * 1000;

export const SESSION_TTL: Record<Role, number> = {
  admin: 12 * HOUR,
  member: 7 * 24 * HOUR
};

export interface JwtPayload {
  sub: string;
  role: Role;
}

const secure = environment.publicUrl.startsWith('https://');

// SameSite=Lax keeps the cookie off cross-site POST/PUT/DELETE requests, which is the CSRF protection.
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: 'lax',
  path: '/api'
};

export const oauthStateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: 'lax',
  path: '/api/auth',
  signed: true
};
