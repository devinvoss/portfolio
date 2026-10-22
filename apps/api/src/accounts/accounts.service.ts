import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SessionUser, SsoProvider } from '@portfolio/models';
import { isValidObjectId, Model } from 'mongoose';
import { Account, DISPLAY_NAME_MAX_LENGTH } from './account.schema';

export interface ProviderProfile {
  provider: SsoProvider;
  providerId: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

const DUPLICATE_KEY_ERROR = 11000;

export function toMemberSession(account: Account): SessionUser {
  return {
    id: account.id,
    role: 'member',
    displayName: account.displayName,
    avatarUrl: account.avatarUrl
  };
}

@Injectable()
export class AccountsService {

  constructor(@InjectModel('Account') private accountModel: Model<Account>) {}

  async findActive(id: string): Promise<Account | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.accountModel.findOne({ _id: id, status: 'active' }).exec();
  }

  // Signs in an existing account or creates one on first sign-in.
  async upsertFromProvider(profile: ProviderProfile): Promise<Account> {
    const now = new Date();
    const existing = await this.findByIdentity(profile.provider, profile.providerId);
    if (existing) {
      existing.avatarUrl = profile.avatarUrl ?? existing.avatarUrl;
      existing.email = profile.email ?? existing.email;
      existing.lastLoginDate = now;
      return existing.save();
    }

    try {
      return await this.accountModel.create({
        displayName: this.cleanDisplayName(profile.displayName),
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        identities: [{ provider: profile.provider, providerId: profile.providerId, linkedDate: now }],
        createdDate: now,
        updatedDate: now,
        lastLoginDate: now
      });
    } catch (err) {
      // Two sign-ins racing to create the same account: the unique index lets one win.
      if (err?.code === DUPLICATE_KEY_ERROR) {
        return this.findByIdentity(profile.provider, profile.providerId);
      }
      throw err;
    }
  }

  async updateDisplayName(id: string, displayName: string): Promise<Account> {
    const account = await this.findActive(id);
    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    account.displayName = displayName;
    account.updatedDate = new Date();
    return account.save();
  }

  async delete(id: string): Promise<void> {
    if (isValidObjectId(id)) {
      await this.accountModel.deleteOne({ _id: id }).exec();
    }
  }

  private findByIdentity(provider: SsoProvider, providerId: string): Promise<Account | null> {
    return this.accountModel.findOne({ identities: { $elemMatch: { provider, providerId } } }).exec();
  }

  private cleanDisplayName(name: string | undefined): string {
    const trimmed = name?.trim().slice(0, DISPLAY_NAME_MAX_LENGTH).trim();
    return trimmed || 'Movie Fan';
  }
}
