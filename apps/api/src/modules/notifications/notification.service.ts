import { prisma, Prisma } from '../../shared/database/prisma';
import { emitToUser, emitToTenant } from '../../shared/websocket/socket';

interface SendNotificationInput {
  tenantId: string;
  userId?: string;
  type: string;
  channel: string;
  subject?: string;
  message: string;
  recipients?: string[];
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  static async getPreferences(tenantId: string, userId: string) {
    return prisma.notificationPreference.findMany({
      where: { tenantId, userId },
    });
  }

  static async setPreference(
    tenantId: string,
    userId: string,
    notificationType: string,
    channel: string,
    options: { enabled?: boolean; slackChannel?: string; slackWebhook?: string }
  ) {
    return prisma.notificationPreference.upsert({
      where: {
        tenantId_userId_notationType_channel: {
          tenantId,
          userId,
          notationType: notificationType,
          channel,
        },
      },
      create: {
        tenantId,
        userId,
        notationType: notificationType,
        channel,
        enabled: options.enabled ?? true,
        slackChannel: options.slackChannel,
        slackWebhook: options.slackWebhook,
      },
      update: {
        enabled: options.enabled,
        slackChannel: options.slackChannel,
        slackWebhook: options.slackWebhook,
      },
    });
  }

  static async getHistory(tenantId: string, userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'read', sentAt: new Date() },
    });
  }

  static async sendNotification(input: SendNotificationInput): Promise<string> {
    const notification = await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId || null,
        type: input.type,
        channel: input.channel,
        subject: input.subject,
        message: input.message,
        recipients: input.recipients || [],
        status: input.channel === 'in_app' ? 'sent' : 'pending',
        sentAt: input.channel === 'in_app' ? new Date() : null,
        metadata: (input.metadata || Prisma.DbNull) as any,
      },
    });

    // Emit real-time notification for in_app channel
    if (input.userId) {
      emitToUser(input.userId, 'notification:new', {
        id: notification.id,
        type: input.type,
        subject: input.subject,
        message: input.message,
        createdAt: notification.createdAt,
      });
    } else {
      emitToTenant(input.tenantId, 'notification:new', {
        id: notification.id,
        type: input.type,
        subject: input.subject,
        message: input.message,
        createdAt: notification.createdAt,
      });
    }

    return notification.id;
  }

  static async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        tenantId,
        userId,
        status: { in: ['pending', 'sent'] },
      },
    });
  }

  static async retryFailedNotifications(): Promise<number> {
    const failed = await prisma.notification.findMany({
      where: { status: 'failed' },
      take: 50,
    });

    let retried = 0;
    for (const notif of failed) {
      await prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'pending' },
      });
      retried++;
    }

    return retried;
  }
}
