export type Role = 'admin' | 'member';

export type SsoProvider = 'google' | 'github';

export interface SessionUser {
  id: string;
  role: Role;
  displayName: string;
  avatarUrl?: string;
}

export interface SessionResponse {
  user: SessionUser | null;
}

/** What the mobile app gets for the one-time code from its sign-in redirect. */
export interface AppTokenResponse {
  /** Sent back as `Authorization: Bearer <token>`. */
  token: string;
  user: SessionUser;
}
