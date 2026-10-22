import * as mongoose from 'mongoose';
import { SsoProvider } from '@portfolio/models';

export const SSO_PROVIDERS: SsoProvider[] = ['google', 'github'];
export const ACCOUNT_STATUSES = ['active', 'banned'] as const;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export interface AccountIdentity {
  provider: SsoProvider;
  providerId: string;
  linkedDate: Date;
}

export interface Account extends mongoose.Document {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  identities: AccountIdentity[];
  status: typeof ACCOUNT_STATUSES[number];
  createdDate: Date;
  updatedDate: Date;
  lastLoginDate: Date;
}

export const AccountSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: DISPLAY_NAME_MAX_LENGTH },
  avatarUrl: String,
  email: String,
  identities: [{
    _id: false,
    provider: { type: String, enum: SSO_PROVIDERS, required: true },
    providerId: { type: String, required: true },
    linkedDate: Date
  }],
  status: { type: String, enum: ACCOUNT_STATUSES, default: 'active' },
  createdDate: Date,
  updatedDate: Date,
  lastLoginDate: Date
}, {
  toJSON: {
    virtuals: true
  },
  toObject: {
    virtuals: true
  }
});

// Accounts are matched on the provider's stable user id, never on email.
AccountSchema.index({ 'identities.provider': 1, 'identities.providerId': 1 }, { unique: true });

AccountSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
