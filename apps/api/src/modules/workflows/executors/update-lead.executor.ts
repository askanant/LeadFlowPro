import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';

export class UpdateLeadExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId, tenantId } = context;
      const { status, customFields, tags, qualityScore } = config;

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      const updateData: Record<string, any> = {};
      const changes: string[] = [];

      if (status) {
        updateData.status = status;
        changes.push(`status → ${status}`);
      }

      if (qualityScore !== undefined && typeof qualityScore === 'number') {
        updateData.qualityScore = Math.max(0, Math.min(100, qualityScore));
        changes.push(`qualityScore → ${updateData.qualityScore}`);
      }

      if (customFields && typeof customFields === 'object') {
        const existingFields = (lead.customFields as Record<string, any>) || {};
        updateData.customFields = { ...existingFields, ...customFields };
        if (tags && Array.isArray(tags)) {
          updateData.customFields._tags = tags;
        }
        changes.push('customFields updated');
      } else if (tags && Array.isArray(tags)) {
        const existingFields = (lead.customFields as Record<string, any>) || {};
        updateData.customFields = { ...existingFields, _tags: tags };
        changes.push(`tags → [${tags.join(', ')}]`);
      }

      if (Object.keys(updateData).length === 0) {
        return { success: true, data: { message: 'No changes to apply' } };
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'lead:updated_by_workflow',
          resource: 'lead',
          resourceId: leadId,
          metadata: { changes, workflowId: context.workflowId },
        },
      });

      console.log('UpdateLeadExecutor: updated lead', { leadId, changes });

      return {
        success: true,
        data: { leadId, changes },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('UpdateLeadExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
