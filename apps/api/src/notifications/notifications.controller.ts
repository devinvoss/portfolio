import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ReplyNotification, SessionUser } from '@portfolio/models';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Auth()
export class NotificationsController {

  constructor(private notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser): Promise<ReplyNotification[]> {
    return this.notificationsService.list(user);
  }

  // Polled by the header, so it only counts.
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: SessionUser): Promise<{ count: number }> {
    return { count: await this.notificationsService.unreadCount(user) };
  }

  @Post('read')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: SessionUser): Promise<void> {
    return this.notificationsService.markAllRead(user);
  }
}
