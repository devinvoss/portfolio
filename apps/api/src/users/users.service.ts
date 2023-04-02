import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@portfolio/models';

@Injectable()
export class UsersService {

  constructor(@InjectModel('User') private userModel: Model<User>) { }

  async findUser(username: string): Promise<User> {
    const foundUser = await this.userModel.findOne({ 'username': username }).exec();
    if (!foundUser) {
      return null;
    }
    return foundUser;
  }
}
