import { Injectable } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';
import { AccountsService, toMemberSession } from '../accounts/accounts.service';
import { JwtPayload } from '../session/session.constants';
import { toAdminSession, UsersService } from '../users/users.service';
import { verifyPassword } from './password';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private accountsService: AccountsService) {}

  async validateAdmin(username: string, password: string): Promise<SessionUser | null> {
    const admin = await this.usersService.findAdmin(username);
    if (admin && typeof password === 'string' && await verifyPassword(password, admin.password)) {
      return toAdminSession(admin);
    }
    return null;
  }

  async findSessionUser(payload: JwtPayload): Promise<SessionUser | null> {
    if (payload.role === 'admin') {
      const admin = await this.usersService.findAdminById(payload.sub);
      return admin ? toAdminSession(admin) : null;
    }
    if (payload.role === 'member') {
      const account = await this.accountsService.findActive(payload.sub);
      return account ? toMemberSession(account) : null;
    }
    return null;
  }
}
