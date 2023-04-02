import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@portfolio/models';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findUser(username);
    if (user && user.password === pass) {
      const { password, ...result } = user.toJSON();
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id, isAdmin: user.isAdmin };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateToken(user: User): Promise<User | null> {
    const dbUser = await this.usersService.findUser(user.username);
    if (dbUser && dbUser.password === user.password && dbUser.id === user.id) {
      return dbUser;
    }
    return null;
  }
}
