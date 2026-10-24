import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';
import { Request } from 'express';
import { environment } from '../environments/environment';
import { JwtPayload, SESSION_COOKIE } from '../session/session.constants';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: (req: Request) => req.cookies?.[SESSION_COOKIE] ?? null,
      ignoreExpiration: false,
      secretOrKey: environment.secretKey,
    });
  }

  // Looks the user up on every request so deleted or banned accounts lose access immediately.
  async validate(payload: JwtPayload): Promise<SessionUser | false> {
    return (await this.authService.findSessionUser(payload)) ?? false;
  }
}
