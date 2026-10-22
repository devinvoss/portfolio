import { CookieStateStore } from './cookie-state.store';
import { safeReturnTo } from './providers';

describe('CookieStateStore', () => {
  function createRequest() {
    const cookies: Record<string, string> = {};
    const res = {
      cookie: jest.fn((name: string, value: string) => { cookies[name] = value; }),
      clearCookie: jest.fn()
    };
    return { req: { res, signedCookies: cookies } as never, res };
  }

  function storeState(req: never, verifier: string | undefined, returnTo?: string): string {
    let state = '';
    new CookieStateStore().store(req, verifier, { returnTo }, {}, (_err, value) => { state = value; });
    return state;
  }

  function verifyState(req: never, state: unknown): unknown[] {
    let result: unknown[] = [];
    new CookieStateStore().verify(req, state, {}, (...args) => { result = args; });
    return result;
  }

  // passport-oauth2 picks which signature to call by argument count.
  it('exposes the argument counts passport-oauth2 expects for PKCE', () => {
    expect(CookieStateStore.prototype.store.length).toBe(5);
    expect(CookieStateStore.prototype.verify.length).toBe(4);
  });

  it('round-trips the PKCE verifier and return path', () => {
    const { req, res } = createRequest();
    const state = storeState(req, 'verifier-123', '/movie/detail/1');
    expect(verifyState(req, state)).toEqual([null, 'verifier-123', { returnTo: '/movie/detail/1' }]);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('rejects a state that does not match the cookie', () => {
    const { req } = createRequest();
    storeState(req, 'verifier-123');
    expect(verifyState(req, 'forged')[1]).toBe(false);
  });

  it('rejects a callback without a state cookie', () => {
    const { req } = createRequest();
    expect(verifyState(req, 'anything')[1]).toBe(false);
  });

  it('never stores an off-site return path', () => {
    const { req } = createRequest();
    const state = storeState(req, undefined, 'https://evil.example');
    expect(verifyState(req, state)).toEqual([null, true, { returnTo: '/' }]);
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/movie/detail/1?tab=comments', '/movie/detail/1?tab=comments'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['/path with space', '/'],
    [undefined, '/'],
    [['/a'], '/']
  ])('%p -> %p', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
