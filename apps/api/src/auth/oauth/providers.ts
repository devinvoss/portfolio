import { SsoProvider } from '@portfolio/models';
import { environment } from '../../environments/environment';

const configured: Record<SsoProvider, boolean> = {
  google: !!(environment.googleClientId && environment.googleClientSecret),
  github: !!(environment.githubClientId && environment.githubClientSecret)
};

export const enabledProviders = (Object.keys(configured) as SsoProvider[]).filter(provider => configured[provider]);

export function callbackUrl(provider: SsoProvider): string {
  return `${environment.publicUrl}/api/auth/${provider}/callback`;
}

/** Only same-site paths are allowed so the post-login redirect can't send users to another site. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 512 || !value.startsWith('/') || value.startsWith('//')
    || /[\\\s]/.test(value)) {
    return '/';
  }
  return value;
}
