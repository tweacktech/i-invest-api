import { Body, Controller, Get, Param, Post, UseGuards, Delete, } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AnnouncementService } from './announcement.service';

@Controller('notifications')
export class AnnouncementController {
  constructor(private readonly announcements: AnnouncementService) {}

  @UseGuards(JwtGuard)
  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.announcements.listForUser(user.sub);
  }

  @UseGuards(JwtGuard)
  @Get('unread-count')
  unread(@CurrentUser() user: { sub: string }) {
    return this.announcements.unreadCount(user.sub);
  }

  @UseGuards(JwtGuard)
  @Get('dashboard-banner')
  dashboardBanner(@CurrentUser() user: { sub: string }) {
    return this.announcements.dashboardBanner(user.sub);
  }

  @UseGuards(JwtGuard)
  @Post(':id/read')
  read(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.announcements.markRead(user.sub, id);
  }
   // Option 1: Remove this endpoint if users shouldn't delete read receipts
  // @UseGuards(JwtGuard)
  // @Delete(':id/read')
  // delete(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
  //   return this.announcements.markUnread(user.sub, id);
  // }
}
