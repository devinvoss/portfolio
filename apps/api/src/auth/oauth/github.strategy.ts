import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { SessionUser } from '@portfolio/models';
import { Profile, Strategy } from 'passport-github2';
import { environment } from '../../environments/environment';
import { OAuthLoginService } from './oauth-login.service';
import { createCookieStateStore } from './cookie-state.store';
import { callbackUrl } from './providers';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private oauthLoginService: OAuthLoginService) {
    // No scopes: the public profile is all we need. GitHub doesn't mark public emails as verified, so none is stored.
    super({
      clientID: environment.githubClientId,
      clientSecret: environment.githubClientSecret,
      callbackURL: callbackUrl('github'),
      store: createCookieStateStore(),
      pkce: true
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<SessionUser> {
    return this.oauthLoginService.signIn({
      provider: 'github',
      providerId: profile.id,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value
    });
  }
}
