import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | null => context.switchToHttp().getRequest().user ?? null
);
