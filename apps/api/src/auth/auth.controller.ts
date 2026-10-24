import { Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SessionResponse, SessionUser, SsoProvider } from '@portfolio/models';
import { Request, Response } from 'express';
import { environment } from '../environments/environment';
import { SessionService } from '../session/session.service';
import { CurrentUser } from './current-user.decorator';
import { OptionalJwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { OAuthAppState } from './oauth/cookie-state.store';
import { OAUTH_ERROR, OAuthGuard } from './oauth/oauth.guard';
import { enabledProviders, safeReturnTo } from './oauth/providers';

const GoogleAuthGuard = OAuthGuard('google');
const GithubAuthGuard = OAuthGuard('github');

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {

  constructor(private sessionService: SessionService) {}

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
    if (!user) {
      return res.redirect(`${environment.publicUrl}/login?error=${req[OAUTH_ERROR] ?? 'failed'}`);
    }

    this.sessionService.start(res, user);
    const appState = (req.authInfo as { state?: OAuthAppState } | undefined)?.state;
    res.redirect(`${environment.publicUrl}${safeReturnTo(appState?.returnTo)}`);
  }
}
