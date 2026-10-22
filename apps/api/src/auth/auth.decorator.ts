import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Role } from '@portfolio/models';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from './roles.guard';

/** Requires a signed-in user; when roles are given, the user must have one of them. */
export const Auth = (...roles: Role[]) => applyDecorators(
  SetMetadata(ROLES_KEY, roles),
  UseGuards(JwtAuthGuard, RolesGuard)
);
