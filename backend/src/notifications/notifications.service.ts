import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notificaciones in-app. El correo electrónico está pospuesto (decisión D-003):
 * cuando se integre SMTP, esta clase es el punto único de envío.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  notifyUser(
    userId: string,
    tenantId: string,
    title: string,
    body: string,
    applicationId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, tenantId, title, body, applicationId },
    });
  }

  /** Notifica a todos los usuarios activos de un rol dentro del tenant. */
  async notifyRole(
    tenantId: string,
    role: UserRole,
    title: string,
    body: string,
    applicationId?: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role, status: 'ACTIVE' },
      select: { id: true },
    });
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        tenantId,
        userId: u.id,
        title,
        body,
        applicationId,
      })),
    });
  }

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
