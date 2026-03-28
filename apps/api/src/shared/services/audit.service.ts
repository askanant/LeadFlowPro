import { prisma } from '../database/prisma';
import { LoggerService } from './logger.service';

export class AuditService {
  /**
   * Log an audit event to the database
   * Records security-relevant actions for compliance and forensics
   */
  static async log(context: {
    tenantId: string;
    userId?: string;
    action: string; // 'login', 'create_campaign', 'update_credentials', 'delete_user', etc
    resource: string; // 'campaign', 'lead', 'credential', 'user', etc
    resourceId: string;
    metadata?: Record<string, any>; // Additional context
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId,
          action: context.action,
          resource: context.resource,
          resourceId: context.resourceId,
          metadata: context.metadata,
          ipAddress: context.ip,
        },
      });
    } catch (err) {
      // Don't throw error - audit logging failure shouldn't break the operation
      LoggerService.error({
        code: 'AUDIT_LOG_FAILED',
        message: `Failed to log audit: ${context.action} on ${context.resource}/${context.resourceId}`,
        statusCode: 500,
        tenantId: context.tenantId,
        userId: context.userId,
      });
    }
  }

  /**
   * Log a successful action
   */
  static async logSuccess(context: Omit<Parameters<typeof AuditService.log>[0], never>): Promise<void> {
    return this.log(context);
  }

  /**
   * Log a failed action
   */
  static async logFailure(context: Parameters<typeof AuditService.log>[0] & { errorMessage?: string }): Promise<void> {
    const { errorMessage, ...auditContext } = context;
    const metadata = auditContext.metadata || {};
    return this.log({
      ...auditContext,
      metadata: { ...metadata, error: errorMessage },
    });
  }

  /**
   * Get audit logs for a tenant
   */
  static async getTenantLogs(
    tenantId: string,
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    return prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.action && { action: filters.action }),
        ...(filters?.resource && { resource: filters.resource }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserLogs(
    tenantId: string,
    userId: string,
    filters?: { limit?: number; offset?: number }
  ) {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    return prisma.auditLog.findMany({
      where: {
        tenantId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get specific resource audit trail
   */
  static async getResourceTrail(tenantId: string, resourceId: string) {
    return prisma.auditLog.findMany({
      where: {
        tenantId,
        resourceId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
