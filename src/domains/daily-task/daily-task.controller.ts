import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DailyTaskService } from './daily-task.service';

@Controller('daily-tasks')
export class DailyTaskController {
  constructor(private readonly dailyTaskService: DailyTaskService) {}

  @Get()
  list() {
    return this.dailyTaskService.listActive();
  }

  @UseGuards(JwtGuard)
  @Get('status')
  status(@CurrentUser() user: { sub: string }) {
    return this.dailyTaskService.myStatus(user.sub);
  }

  @UseGuards(JwtGuard)
  @Post(':taskId/start')
  start(@CurrentUser() user: { sub: string }, @Param('taskId') taskId: string) {
    return this.dailyTaskService.start(user.sub, taskId);
  }

  @UseGuards(JwtGuard)
  @Post(':taskId/claim')
  claim(@CurrentUser() user: { sub: string }, @Param('taskId') taskId: string) {
    return this.dailyTaskService.claim(user.sub, taskId);
  }
}
