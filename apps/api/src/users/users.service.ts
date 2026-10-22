import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { SessionUser, User } from '@portfolio/models';

const ADMIN_FILTER = { isAdmin: { $gt: 0 } };

export function toAdminSession(user: User): SessionUser {
  return {
    id: user.id,
    role: 'admin',
    displayName: user.displayName || user.username
  };
}

@Injectable()
export class UsersService {

  constructor(@InjectModel('User') private userModel: Model<User>) { }

  async findAdmin(username: string): Promise<User | null> {
    if (typeof username !== 'string') {
      return null;
    }
    return this.userModel.findOne({ ...ADMIN_FILTER, username }).exec();
  }

  async findAdminById(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.userModel.findOne({ ...ADMIN_FILTER, _id: id }).exec();
  }
}
