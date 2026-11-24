import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionUser } from '@portfolio/models';
import { Response } from 'express';
import { JwtPayload, SESSION_COOKIE, SESSION_TTL, sessionCookieOptions } from './session.constants';

@Injectable()
export class SessionService {
  constructor(private jwtService: JwtService) {}

  /** Sets the session cookie, for the website. */
  start(res: Response, user: SessionUser) {
    res.cookie(SESSION_COOKIE, this.issueToken(user), { ...sessionCookieOptions, maxAge: SESSION_TTL[user.role] });
  }

  /** The session JWT. The website gets it in a cookie; the mobile app keeps it and sends it as a Bearer token. */
  issueToken(user: SessionUser): string {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload, { expiresIn: SESSION_TTL[user.role] / 1000 });
  }

  end(res: Response) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  }
}
