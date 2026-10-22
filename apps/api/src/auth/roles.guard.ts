import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, SessionUser } from '@portfolio/models';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const user: SessionUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) {
      return false;
    }
    return !roles?.length || roles.includes(user.role);
  }
}
