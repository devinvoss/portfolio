import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { hashPassword } from './password';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = { findAdmin: jest.fn(), findAdminById: jest.fn() };
  const accountsService = { findActive: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AccountsService, useValue: accountsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateAdmin', () => {
    it('returns an admin session for the right password', async () => {
      usersService.findAdmin.mockResolvedValue({ id: 'a1', username: 'devin', password: await hashPassword('secret') });
      expect(await service.validateAdmin('devin', 'secret')).toEqual({ id: 'a1', role: 'admin', displayName: 'devin' });
    });

    it('rejects a wrong password', async () => {
      usersService.findAdmin.mockResolvedValue({ id: 'a1', username: 'devin', password: await hashPassword('secret') });
      expect(await service.validateAdmin('devin', 'nope')).toBeNull();
    });

    it('rejects a password that was never hashed', async () => {
      usersService.findAdmin.mockResolvedValue({ id: 'a1', username: 'devin', password: 'secret' });
      expect(await service.validateAdmin('devin', 'secret')).toBeNull();
    });

    it('rejects an unknown user', async () => {
      usersService.findAdmin.mockResolvedValue(null);
      expect(await service.validateAdmin('someone', 'secret')).toBeNull();
    });
  });

  describe('findSessionUser', () => {
    it('loads admins from the users collection', async () => {
      usersService.findAdminById.mockResolvedValue({ id: 'a1', username: 'devin', displayName: 'Devin' });
      expect(await service.findSessionUser({ sub: 'a1', role: 'admin' })).toEqual({ id: 'a1', role: 'admin', displayName: 'Devin' });
      expect(accountsService.findActive).not.toHaveBeenCalled();
    });

    it('loads members from the accounts collection', async () => {
      accountsService.findActive.mockResolvedValue({ id: 'm1', displayName: 'Sam', avatarUrl: 'https://img' });
      expect(await service.findSessionUser({ sub: 'm1', role: 'member' }))
        .toEqual({ id: 'm1', role: 'member', displayName: 'Sam', avatarUrl: 'https://img' });
      expect(usersService.findAdminById).not.toHaveBeenCalled();
    });

    it('returns null for a deleted or banned member', async () => {
      accountsService.findActive.mockResolvedValue(null);
      expect(await service.findSessionUser({ sub: 'm1', role: 'member' })).toBeNull();
    });
  });
});
