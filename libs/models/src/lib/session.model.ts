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
