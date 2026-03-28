import { ITriggerExecutor, TriggerExecutionContext, TimeSinceTriggerConfig } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';

/**
 * Triggers workflow for leads where X days have passed since a specific event.
 * Typically run on a schedule (hourly/daily) to check for eligible leads.
 */
export class TimeSinceEventTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId } = context;
    const { days, eventType } = config as TimeSinceTriggerConfig;

    if (!days || !eventType) {
      console.warn('TimeSinceEventTrigger: missing days or eventType');
      return;
    }

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    let leads: any[] = [];

    switch (eventType) {
      case 'created':
        leads = await prisma.lead.findMany({
          where: {
            tenantId,
            createdAt: { lte: thresholdDate },
            status: { notIn: ['junk', 'converted'] },
          },
          take: 100,
        });
        break;

      case 'last_contact':
        // Leads with no calls after threshold date
        leads = await prisma.lead.findMany({
          where: {
            tenantId,
            status: { notIn: ['junk', 'converted'] },
            callLogs: {
              every: {
                createdAt: { lte: thresholdDate },
              },
            },
          },
          take: 100,
        });
        break;

      case 'status_change':
        // Leads that haven't been updated since threshold
        leads = await prisma.lead.findMany({
          where: {
            tenantId,
            createdAt: { lte: thresholdDate },
            status: { notIn: ['junk', 'converted'] },
          },
          take: 100,
        });
        break;
    }

    console.log('TimeSinceEventTrigger: found leads', {
      count: leads.length,
      days,
      eventType,
    });

    for (const lead of leads) {
      try {
        await WorkflowEngine.executeWorkflow(workflowId, lead.id, tenantId, {
          triggerType: 'time_since_event',
          triggerId,
          eventType,
          days,
        });
      } catch (error) {
        console.error('TimeSinceEventTrigger: failed for lead', {
          leadId: lead.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}
