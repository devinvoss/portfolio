import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AppTokenResponse, SessionResponse, SessionUser, SsoProvider } from '@portfolio/models';
import { Request, Response } from 'express';
import { environment } from '../environments/environment';
import { SessionService } from '../session/session.service';
import { AppAuthCodeService } from './app-auth/app-auth-code.service';
import { appRedirectUrl } from './app-auth/app-redirect';
import { AppTokenDto } from './app-auth/app-token.dto';
import { CurrentUser } from './current-user.decorator';
import { OptionalJwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { OAuthAppState, pendingAppRedirect } from './oauth/cookie-state.store';
import { OAUTH_ERROR, OAuthGuard } from './oauth/oauth.guard';
import { enabledProviders, safeReturnTo } from './oauth/providers';

const GoogleAuthGuard = OAuthGuard('google');
const GithubAuthGuard = OAuthGuard('github');

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {

  constructor(private sessionService: SessionService, private appAuthCodeService: AppAuthCodeService) {}

  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: SessionUser | null): SessionResponse {
    return { user };
  }

  @SkipThrottle()
  @Get('providers')
  providers(): { providers: SsoProvider[] } {
    return { providers: enabledProviders };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('admin/login')
  @HttpCode(200)
  adminLogin(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) res: Response): SessionResponse {
    this.sessionService.start(res, user);
    return { user };
  }

  /** The mobile app trades the one-time code from its sign-in redirect, plus its PKCE verifier, for a session token. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('app/token')
  @HttpCode(200)
  appToken(@Body() { code, codeVerifier }: AppTokenDto): AppTokenResponse {
    const user = this.appAuthCodeService.redeem(code, codeVerifier);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired sign-in code.');
    }
    return { token: this.sessionService.issueToken(user), user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.sessionService.end(res);
  }

  // The start routes never reach their handler: the guard redirects to the provider.
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  google(): void {
    return;
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response): void {
    this.finishSignIn(req, res);
  }

  @UseGuards(GithubAuthGuard)
  @Get('github')
  github(): void {
    return;
  }

  @UseGuards(GithubAuthGuard)
  @Get('github/callback')
  githubCallback(@Req() req: Request, @Res() res: Response): void {
    this.finishSignIn(req, res);
  }

  private finishSignIn(req: Request, res: Response) {
    const user = req.user as SessionUser | null;
    const appState = (req.authInfo as { state?: OAuthAppState } | undefined)?.state;

    if (!user) {
      const error = req[OAUTH_ERROR] ?? 'failed';
      // A cancelled sign-in fails before the state is checked, so look at the state cookie for the app's redirect.
      // Only an error goes there, never a code.
      const appRedirect = appState?.appRedirect ?? pendingAppRedirect(req);
      return res.redirect(appRedirect
        ? appRedirectUrl(appRedirect, { error })
        : `${environment.publicUrl}/login?error=${error}`);
    }

    // The mobile app gets a one-time code to exchange for its token; the website gets the session cookie.
    if (appState?.appRedirect && appState.codeChallenge) {
      const code = this.appAuthCodeService.issue(user, appState.codeChallenge);
      return res.redirect(appRedirectUrl(appState.appRedirect, { code }));
    }

    this.sessionService.start(res, user);
    res.redirect(`${environment.publicUrl}${safeReturnTo(appState?.returnTo)}`);
  }
}
