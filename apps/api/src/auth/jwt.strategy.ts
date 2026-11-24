import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';
import { Request } from 'express';
import { environment } from '../environments/environment';
import { JwtPayload, SESSION_COOKIE } from '../session/session.constants';
import { AuthService } from './auth.service';

const fromBearerHeader = ExtractJwt.fromAuthHeaderAsBearerToken();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // The website sends the session cookie; the mobile app sends the same JWT as a Bearer token.
      // A header has to be added on purpose, so the cookie's SameSite CSRF protection isn't needed for it.
      jwtFromRequest: (req: Request) => req.cookies?.[SESSION_COOKIE] ?? fromBearerHeader(req) ?? null,
      ignoreExpiration: false,
      secretOrKey: environment.secretKey,
    });
  }

  // Looks the user up on every request so deleted or banned accounts lose access immediately.
  async validate(payload: JwtPayload): Promise<SessionUser | false> {
    return (await this.authService.findSessionUser(payload)) ?? false;
  }
}
