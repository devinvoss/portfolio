import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionUser } from '@portfolio/models';
import { Response } from 'express';
import { JwtPayload, SESSION_COOKIE, SESSION_TTL, sessionCookieOptions } from './session.constants';

@Injectable()
export class SessionService {
  constructor(private jwtService: JwtService) {}

  start(res: Response, user: SessionUser) {
    const ttl = SESSION_TTL[user.role];
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload, { expiresIn: ttl / 1000 });
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge: ttl });
  }

  end(res: Response) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  }
}
