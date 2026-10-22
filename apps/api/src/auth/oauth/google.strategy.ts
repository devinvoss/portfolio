import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { SessionUser } from '@portfolio/models';
import { Profile, Strategy } from 'passport-google-oauth20';
import { environment } from '../../environments/environment';
import { OAuthLoginService } from './oauth-login.service';
import { createCookieStateStore } from './cookie-state.store';
import { callbackUrl } from './providers';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private oauthLoginService: OAuthLoginService) {
    super({
      clientID: environment.googleClientId,
      clientSecret: environment.googleClientSecret,
      callbackURL: callbackUrl('google'),
      scope: ['openid', 'email', 'profile'],
      store: createCookieStateStore(),
      pkce: true
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<SessionUser> {
    return this.oauthLoginService.signIn({
      provider: 'google',
      providerId: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
      email: profile.emails?.find(email => email.verified)?.value
    });
  }
}
