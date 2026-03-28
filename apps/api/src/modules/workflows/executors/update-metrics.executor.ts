import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';


export class UpdateMetricsExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { tenantId, leadId } = context;
      const { customMetrics = {} } = config;

      // Get lead to update custom fields with metrics
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      // Merge custom metrics into lead's customFields
      const updatedCustomFields = {
        ...(lead.customFields as Record<string, any> || {}),
        _metrics: {
          ...((lead.customFields as Record<string, any>)?._metrics || {}),
          ...customMetrics,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      // Update lead
      const updated = await prisma.lead.update({
        where: { id: leadId },
        data: { customFields: updatedCustomFields },
      });

      console.log('Updated lead metrics', {
        leadId,
        metricsCount: Object.keys(customMetrics).length,
      });

      return {
        success: true,
        data: { metrics: customMetrics, updated: true },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('UpdateMetricsExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
