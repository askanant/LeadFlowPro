import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';


export class AssignAgentExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { tenantId, leadId } = context;
      const { agentId, roundRobin } = config;

      let targetAgentId = agentId;

      // If round-robin, select agent with fewest leads
      if (roundRobin) {
        const agents = await prisma.user.findMany({
          where: { tenantId, isActive: true },
          include: { auditLogs: { where: { action: 'lead:assigned' } } },
        });

        if (agents.length === 0) {
          return { success: false, error: 'No active agents available' };
        }

        // Select agent with fewest leads
        const selectedAgent = agents.reduce((prev, curr) =>
          (curr.auditLogs.length < prev.auditLogs.length) ? curr : prev
        );
        targetAgentId = selectedAgent.id;
      }

      // Verify agent exists
      const agent = await prisma.user.findUnique({
        where: { id: targetAgentId },
      });

      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }

      // Create audit log entry for assignment
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: agent.id,
          action: 'lead:assigned',
          resource: 'lead',
          resourceId: leadId,
          metadata: { assignedAt: new Date().toISOString() },
        },
      });

      console.log('Assigned lead to agent', {
        leadId,
        agentId: targetAgentId,
        agent: agent.email,
      });

      return {
        success: true,
        data: { agentId: targetAgentId, agentEmail: agent.email },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('AssignAgentExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
