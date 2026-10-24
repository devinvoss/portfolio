import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, SessionUser } from '@portfolio/models';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function run(roles: Role[] | undefined, user: SessionUser | undefined): boolean {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) })
    } as unknown as ExecutionContext;
    return new RolesGuard(reflector).canActivate(context);
  }

  const admin: SessionUser = { id: 'a', role: 'admin', displayName: 'Devin' };
  const member: SessionUser = { id: 'm', role: 'member', displayName: 'Sam' };

  it('only lets admins through admin routes', () => {
    expect(run(['admin'], admin)).toBe(true);
    expect(run(['admin'], member)).toBe(false);
  });

  it('lets any signed-in user through when no role is required', () => {
    expect(run([], member)).toBe(true);
    expect(run(undefined, admin)).toBe(true);
  });

  it('rejects requests without a user', () => {
    expect(run([], undefined)).toBe(false);
  });
});
