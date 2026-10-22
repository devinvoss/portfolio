import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  let service: AccountsService;
  const exec = jest.fn();
  const accountModel = {
    findOne: jest.fn(() => ({ exec })),
    create: jest.fn()
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    exec.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountsService, { provide: getModelToken('Account'), useValue: accountModel }],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('creates an account on first sign-in', async () => {
    exec.mockResolvedValue(null);
    accountModel.create.mockImplementation(async doc => doc);

    const account = await service.upsertFromProvider({ provider: 'google', providerId: 'g-1', displayName: '  Sam  ', email: 'sam@example.com' });

    expect(accountModel.findOne).toHaveBeenCalledWith({ identities: { $elemMatch: { provider: 'google', providerId: 'g-1' } } });
    expect(account.displayName).toBe('Sam');
    expect(account.identities).toEqual([expect.objectContaining({ provider: 'google', providerId: 'g-1' })]);
  });

  it('falls back to a default display name', async () => {
    exec.mockResolvedValue(null);
    accountModel.create.mockImplementation(async doc => doc);
    const account = await service.upsertFromProvider({ provider: 'github', providerId: '7', displayName: '   ' });
    expect(account.displayName).toBe('Movie Fan');
  });

  it('keeps the chosen display name on later sign-ins', async () => {
    const existing = { displayName: 'Custom', avatarUrl: 'old', lastLoginDate: undefined, save: jest.fn() };
    existing.save.mockReturnValue(existing);
    exec.mockResolvedValue(existing);

    const account = await service.upsertFromProvider({ provider: 'google', providerId: 'g-1', displayName: 'Google Name', avatarUrl: 'new' });

    expect(accountModel.create).not.toHaveBeenCalled();
    expect(account.displayName).toBe('Custom');
    expect(account.avatarUrl).toBe('new');
    expect(account.lastLoginDate).toBeInstanceOf(Date);
  });

  it('returns the winner when two first sign-ins race', async () => {
    const winner = { id: 'm1' };
    exec.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    accountModel.create.mockRejectedValue({ code: 11000 });

    expect(await service.upsertFromProvider({ provider: 'google', providerId: 'g-1' })).toBe(winner);
  });

  it('does not query with an invalid id', async () => {
    expect(await service.findActive('not-an-id')).toBeNull();
    expect(accountModel.findOne).not.toHaveBeenCalled();
  });
});
