import { createHash } from 'node:crypto';
import { SessionUser } from '@portfolio/models';
import { environment } from '../../environments/environment';
import { CookieStateStore, pendingAppRedirect } from '../oauth/cookie-state.store';
import { APP_CODE_TTL, AppAuthCodeService } from './app-auth-code.service';
import { appRedirectUrl, isAllowedCorsOrigin, isCodeChallenge, safeAppRedirect } from './app-redirect';

const verifier = 'a'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const user: SessionUser = { id: '1', role: 'member', displayName: 'Visitor' };

function withPublicUrl(publicUrl: string, run: () => void) {
  const original = environment.publicUrl;
  environment.publicUrl = publicUrl;
  try {
    run();
  } finally {
    environment.publicUrl = original;
  }
}

describe('safeAppRedirect', () => {
  it.each([
    'rnportfolio://auth',
    'exp://192.168.1.20:8081/--/auth',
    'exp://10.0.2.2:8081/--/auth',
    'exp://172.20.0.5:8081/--/auth',
    'exp://localhost:8081/--/auth'
  ])('allows %p', value => {
    expect(safeAppRedirect(value)).toBe(value);
  });

  it.each([
    'https://evil.example/auth',
    'exp://evil.example:8081/--/auth',
    'exp://8.8.8.8:8081/--/auth',
    'exp://172.32.0.1:8081/--/auth',
    'rnportfolio://auth?code=planted',
    'rnportfolio://auth#fragment',
    'javascript:alert(1)',
    'rnportfolio://auth with space',
    'not a url',
    undefined,
    ['rnportfolio://auth']
  ])('rejects %p', value => {
    expect(safeAppRedirect(value)).toBeNull();
  });

  it('allows the Expo web dev server on localhost only in development', () => {
    withPublicUrl('http://localhost:4200', () => expect(safeAppRedirect('http://localhost:8081/auth')).toBe('http://localhost:8081/auth'));
    withPublicUrl('https://example.com', () => expect(safeAppRedirect('http://localhost:8081/auth')).toBeNull());
  });
});

describe('isAllowedCorsOrigin', () => {
  it('allows localhost and LAN origins only in development', () => {
    withPublicUrl('http://localhost:4200', () => {
      expect(isAllowedCorsOrigin('http://localhost:8081')).toBe(true);
      expect(isAllowedCorsOrigin('http://192.168.1.20:8081')).toBe(true);
      expect(isAllowedCorsOrigin('http://8.8.8.8:8081')).toBe(false);
      expect(isAllowedCorsOrigin('https://192.168.1.20:8081')).toBe(false);
      expect(isAllowedCorsOrigin('https://evil.example')).toBe(false);
      expect(isAllowedCorsOrigin(undefined)).toBe(false);
    });
    withPublicUrl('https://example.com', () => {
      expect(isAllowedCorsOrigin('http://localhost:8081')).toBe(false);
      expect(isAllowedCorsOrigin('http://192.168.1.20:8081')).toBe(false);
    });
  });
});

describe('isCodeChallenge', () => {
  it('accepts an S256 challenge and nothing else', () => {
    expect(isCodeChallenge(challenge)).toBe(true);
    expect(isCodeChallenge('short')).toBe(false);
    expect(isCodeChallenge(`${challenge}=`)).toBe(false);
    expect(isCodeChallenge(undefined)).toBe(false);
  });
});

describe('appRedirectUrl', () => {
  it('adds the params as a query string', () => {
    expect(appRedirectUrl('rnportfolio://auth', { code: 'a b' })).toBe('rnportfolio://auth?code=a+b');
  });
});

describe('AppAuthCodeService', () => {
  it('trades a code and the matching verifier for the user once', () => {
    const service = new AppAuthCodeService();
    const code = service.issue(user, challenge);
    expect(service.redeem(code, verifier)).toEqual(user);
    expect(service.redeem(code, verifier)).toBeNull();
  });

  it('burns the code when the verifier is wrong', () => {
    const service = new AppAuthCodeService();
    const code = service.issue(user, challenge);
    expect(service.redeem(code, 'b'.repeat(43))).toBeNull();
    expect(service.redeem(code, verifier)).toBeNull();
  });

  it('rejects an expired code', () => {
    const service = new AppAuthCodeService();
    const code = service.issue(user, challenge, 0);
    expect(service.redeem(code, verifier, APP_CODE_TTL + 1)).toBeNull();
  });

  it('rejects an unknown code', () => {
    expect(new AppAuthCodeService().redeem('nope', verifier)).toBeNull();
  });
});

describe('CookieStateStore app sign-in', () => {
  function createRequest() {
    const cookies: Record<string, string> = {};
    const res = {
      cookie: jest.fn((name: string, value: string) => { cookies[name] = value; }),
      clearCookie: jest.fn()
    };
    return { req: { res, signedCookies: cookies } as never };
  }

  function storeAndVerify(appRedirect: string, codeChallenge: string): unknown[] {
    const { req } = createRequest();
    let state = '';
    new CookieStateStore().store(req, 'pkce', { returnTo: '/', appRedirect, codeChallenge }, {}, (_err, value) => { state = value; });
    let result: unknown[] = [];
    new CookieStateStore().verify(req, state, {}, (...args) => { result = args; });
    return result;
  }

  it('keeps a valid app redirect and challenge', () => {
    expect(storeAndVerify('rnportfolio://auth', challenge)).toEqual([null, 'pkce', { returnTo: '/', appRedirect: 'rnportfolio://auth', codeChallenge: challenge }]);
  });

  it('drops an app redirect that is not allowed', () => {
    expect(storeAndVerify('https://evil.example', challenge)).toEqual([null, 'pkce', { returnTo: '/' }]);
  });

  it('drops an app redirect without a valid challenge', () => {
    expect(storeAndVerify('rnportfolio://auth', 'short')).toEqual([null, 'pkce', { returnTo: '/' }]);
  });

  it('finds the app redirect of a cancelled sign-in', () => {
    const { req } = createRequest();
    new CookieStateStore().store(req, 'pkce', { appRedirect: 'rnportfolio://auth', codeChallenge: challenge }, {}, () => undefined);
    expect(pendingAppRedirect(req)).toBe('rnportfolio://auth');
  });

  it('finds nothing for a web sign-in', () => {
    const { req } = createRequest();
    new CookieStateStore().store(req, 'pkce', { returnTo: '/' }, {}, () => undefined);
    expect(pendingAppRedirect(req)).toBeNull();
  });
});
