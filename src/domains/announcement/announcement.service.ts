import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const announcements = await this.prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const reads = await this.prisma.announcementRead.findMany({
      where: { userId, announcementId: { in: announcements.map((a) => a.id) } },
      select: { announcementId: true },
    });
    const readSet = new Set(reads.map((r) => r.announcementId));
    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      createdAt: a.createdAt,
      read: readSet.has(a.id),
    }));
  }

  async unreadCount(userId: string) {
    const active = await this.prisma.announcement.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    if (!active.length) return { count: 0 };
    const read = await this.prisma.announcementRead.findMany({
      where: { userId, announcementId: { in: active.map((a) => a.id) } },
      select: { announcementId: true },
    });
    const readSet = new Set(read.map((r) => r.announcementId));
    const count = active.filter((a) => !readSet.has(a.id)).length;
    return { count };
  }

  async markRead(userId: string, announcementId: string) {
    const a = await this.prisma.announcement.findFirst({
      where: { id: announcementId, isActive: true },
    });
    if (!a) throw new NotFoundException('Announcement not found');
    await this.prisma.announcementRead.upsert({
      where: {
        userId_announcementId: { userId, announcementId },
      },
      create: { userId, announcementId },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  staffList() {
    return this.prisma.announcement.findMany({ 
      orderBy: { createdAt: 'desc' },  // Fixed: added colon and braces
      take: 100 
    });
  }

  async staffCreate(data: { title: string; body: string }) {  // Fixed: added semicolon
    return this.prisma.announcement.create({
      data: { title: data.title, body: data.body, isActive: true },
    });
  }

  async staffUpdate(id: string, data: Partial<{ title: string; body: string; isActive: boolean }>) {
    return this.prisma.announcement.update({ where: { id }, data });
  }
  
  async staffDelete(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  async dashboardBanner(userId: string) {
    const settings = await this.prisma.platformSettings.findUnique({ where: { id: 'platform' } });
    const items = await this.listForUser(userId);
    const unread = items.filter((n) => !n.read);
    return {
      welcomeMessage:
        settings?.welcomeMessage?.trim() ||
        'Welcome to I-Invest — your smart investment platform.',
      urgentAdminNote: settings?.urgentAdminNote?.trim() || null,
      unreadCount: unread.length,
      latestUnread: unread[0] ?? null,
    };
  }
}