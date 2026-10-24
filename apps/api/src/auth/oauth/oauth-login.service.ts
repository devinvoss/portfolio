import { ForbiddenException, Injectable } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';
import { AccountsService, ProviderProfile, toMemberSession } from '../../accounts/accounts.service';

@Injectable()
export class OAuthLoginService {
  constructor(private accountsService: AccountsService) {}

  async signIn(profile: ProviderProfile): Promise<SessionUser> {
    const account = await this.accountsService.upsertFromProvider(profile);
    if (account.status !== 'active') {
      throw new ForbiddenException('This account has been suspended.');
    }
    return toMemberSession(account);
  }
}
