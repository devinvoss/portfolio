import { Body, Controller, Delete, HttpCode, Patch, Res } from '@nestjs/common';
import { SessionUser } from '@portfolio/models';
import { Response } from 'express';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionService } from '../session/session.service';
import { AccountsService, toMemberSession } from './accounts.service';
import { UpdateAccountDto } from './update-account.dto';

@Controller('account')
@Auth('member')
export class AccountsController {

  constructor(private accountsService: AccountsService, private sessionService: SessionService) {}

  @Patch('me')
  async update(@CurrentUser() user: SessionUser, @Body() dto: UpdateAccountDto): Promise<SessionUser> {
    const account = await this.accountsService.updateDisplayName(user.id, dto.displayName);
    return toMemberSession(account);
  }

  @Delete('me')
  @HttpCode(204)
  async delete(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.accountsService.delete(user.id);
    this.sessionService.end(res);
  }
}
