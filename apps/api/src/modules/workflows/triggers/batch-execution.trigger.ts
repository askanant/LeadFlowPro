import { ITriggerExecutor, TriggerExecutionContext, BatchTriggerConfig } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Bulk-executes a workflow on a filtered set of leads.
 * Used for batch operations like re-scoring or campaign assignments.
 */
export class BatchExecutionTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId } = context;
    const { filters } = config as BatchTriggerConfig;

    if (!filters || typeof filters !== 'object') {
      LoggerService.logWarn('BatchExecutionTrigger: no filters provided');
      return;
    }

    const where: Record<string, any> = { tenantId };

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.platform && filters.platform.length > 0) {
      where.platform = { in: filters.platform };
    }

    if (filters.minScore !== undefined) {
      where.qualityScore = { ...(where.qualityScore || {}), gte: filters.minScore };
    }

    if (filters.maxScore !== undefined) {
      where.qualityScore = { ...(where.qualityScore || {}), lte: filters.maxScore };
    }

    if (filters.createdAfter) {
      where.createdAt = { gte: new Date(filters.createdAfter) };
    }

    const leads = await prisma.lead.findMany({
      where,
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    LoggerService.logInfo('BatchExecutionTrigger: found leads', {
      count: leads.length,
      filters,
    });

    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      try {
        await WorkflowEngine.executeWorkflow(workflowId, lead.id, tenantId, {
          triggerType: 'batch_execution',
          triggerId,
          batchSize: leads.length,
        });
        successCount++;
      } catch (error) {
        failCount++;
        LoggerService.logError('BatchExecutionTrigger: failed for lead', undefined, {
          leadId: lead.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    LoggerService.logInfo('BatchExecutionTrigger: completed', {
      total: leads.length,
      successCount,
      failCount,
    });
  }
}
