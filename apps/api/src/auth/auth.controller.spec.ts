import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { environment } from '../environments/environment';
import { SessionService } from '../session/session.service';
import { AppAuthCodeService } from './app-auth/app-auth-code.service';
import { AuthController } from './auth.controller';
import { OAUTH_ERROR } from './oauth/oauth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  const sessionService = { start: jest.fn(), end: jest.fn(), issueToken: jest.fn(() => 'jwt') };
  const appAuthCodeService = { issue: jest.fn(() => 'one-time-code'), redeem: jest.fn() };
  const member = { id: '2', role: 'member' as const, displayName: 'Visitor' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: AppAuthCodeService, useValue: appAuthCodeService }
      ],
    })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('starts a session for the admin on login', () => {
    const user = { id: '1', role: 'admin' as const, displayName: 'Devin' };
    const res = {};
    expect(controller.adminLogin(user, res as never)).toEqual({ user });
    expect(sessionService.start).toHaveBeenCalledWith(res, user);
  });

  it('returns a null user when nobody is signed in', () => {
    expect(controller.me(null)).toEqual({ user: null });
  });

  describe('provider callback', () => {
    function callback(req: Record<string, unknown>) {
      const res = { redirect: jest.fn() };
      controller.googleCallback(req as never, res as never);
      return res.redirect.mock.calls[0][0];
    }

    it('sets the cookie and returns to the site for a web sign-in', () => {
      const url = callback({ user: member, authInfo: { state: { returnTo: '/movie' } } });
      expect(url).toBe(`${environment.publicUrl}/movie`);
      expect(sessionService.start).toHaveBeenCalled();
      expect(appAuthCodeService.issue).not.toHaveBeenCalled();
    });

    it('sends the app a one-time code instead of setting the cookie', () => {
      const url = callback({ user: member, authInfo: { state: { returnTo: '/', appRedirect: 'rnportfolio://auth', codeChallenge: 'challenge' } } });
      expect(url).toBe('rnportfolio://auth?code=one-time-code');
      expect(appAuthCodeService.issue).toHaveBeenCalledWith(member, 'challenge');
      expect(sessionService.start).not.toHaveBeenCalled();
    });

    it('sends a failed app sign-in back to the app with the error', () => {
      const url = callback({ user: null, [OAUTH_ERROR]: 'cancelled', authInfo: { state: { appRedirect: 'rnportfolio://auth', codeChallenge: 'c' } } });
      expect(url).toBe('rnportfolio://auth?error=cancelled');
    });

    it('sends a failed web sign-in to the login page', () => {
      const url = callback({ user: null, [OAUTH_ERROR]: 'suspended', signedCookies: {}, res: { clearCookie: jest.fn() } });
      expect(url).toBe(`${environment.publicUrl}/login?error=suspended`);
    });
  });

  describe('app token', () => {
    it('trades a valid code for a token', () => {
      appAuthCodeService.redeem.mockReturnValue(member);
      expect(controller.appToken({ code: 'code', codeVerifier: 'verifier' })).toEqual({ token: 'jwt', user: member });
      expect(sessionService.issueToken).toHaveBeenCalledWith(member);
    });

    it('rejects an invalid code', () => {
      appAuthCodeService.redeem.mockReturnValue(null);
      expect(() => controller.appToken({ code: 'code', codeVerifier: 'verifier' })).toThrow(UnauthorizedException);
    });
  });
});
