import { ExecutionContext, ForbiddenException, Injectable, Logger, mixin, NotFoundException, Type } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';
import { SsoProvider } from '@portfolio/models';
import { OAuthAppState } from './cookie-state.store';
import { enabledProviders } from './providers';

export type OAuthError = 'cancelled' | 'suspended' | 'failed';

export const OAUTH_ERROR = 'oauthError';

const logger = new Logger('OAuthGuard');

/**
 * Runs a provider's passport strategy. On the start route passport redirects to the provider;
 * on the callback route a failed sign-in is recorded on the request instead of throwing,
 * so the controller can send the browser back to the login page.
 */
export function OAuthGuard(provider: SsoProvider): Type<IAuthGuard> {
  @Injectable()
  class ProviderOAuthGuard extends AuthGuard(provider) {
    canActivate(context: ExecutionContext) {
      if (!enabledProviders.includes(provider)) {
        throw new NotFoundException();
      }
      return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const state: OAuthAppState = { returnTo: req.query?.returnTo };
      return { session: false, state };
    }

    handleRequest<TUser>(err: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser | null {
      if (user) {
        return user;
      }
      const req = context.switchToHttp().getRequest();
      let error: OAuthError = 'failed';
      if (err instanceof ForbiddenException) {
        error = 'suspended';
      } else if (!err && req.query?.error === 'access_denied') {
        error = 'cancelled';
      } else if (err) {
        logger.warn(`${provider} sign-in failed: ${err instanceof Error ? err.message : err}`);
      }
      req[OAUTH_ERROR] = error;
      return null;
    }
  }

  return mixin(ProviderOAuthGuard);
}
