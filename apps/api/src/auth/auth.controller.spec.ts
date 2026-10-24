import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SessionService } from '../session/session.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  const sessionService = { start: jest.fn(), end: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: SessionService, useValue: sessionService }],
    })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('starts a session for the admin on login', () => {
    const user = { id: '1', role: 'admin' as const, displayName: 'Devin' };
    const res = {};
    expect(controller.adminLogin(user, res as never)).toEqual({ user });
    expect(sessionService.start).toHaveBeenCalledWith(res, user);
  });

  it('returns a null user when nobody is signed in', () => {
    expect(controller.me(null)).toEqual({ user: null });
  });
});
