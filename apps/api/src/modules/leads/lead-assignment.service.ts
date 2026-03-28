import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';
import { NotificationService } from '../notifications/notification.service';

export class LeadAssignmentService {
  /**
   * Get all active users (agents) for a tenant with their current lead assignment counts
   */
  static async getAvailableAgents(tenantId: string) {
    const agents = await prisma.user.findMany({
      where: { tenantId, isActive: true, role: { in: ['agent', 'admin'] } },
      include: {
        auditLogs: {
          where: { action: 'assigned_to_agent', resource: 'lead' },
          select: { resourceId: true },
        },
      },
    });
    return agents.map((agent) => ({
      ...agent,
      _count: { assignedLeads: agent.auditLogs.length },
    }));
  }

  /**
   * Assign a lead to a specific agent (user)
   */
  static async assignLeadToAgent(leadId: string, agentId: string, tenantId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundError('Lead');

    const agent = await prisma.user.findFirst({ where: { id: agentId, tenantId } });
    if (!agent) throw new NotFoundError('Agent');

    // Create audit log to track the assignment
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'assigned_to_agent',
        resource: 'lead',
        resourceId: leadId,
        metadata: {
          agentId,
          agentName: [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email,
        },
      },
    });

    return lead;
  }

  /**
   * Round-robin assignment: assign to agent with fewest leads
   */
  static async assignLeadRoundRobin(leadId: string, tenantId: string) {
    const agents = await this.getAvailableAgents(tenantId);
    if (agents.length === 0) {
      throw new Error('No available agents for assignment');
    }

    // Find agent with fewest assigned leads
    const selectedAgent = agents.reduce(
      (min: typeof agents[0], agent: typeof agents[0]) => {
        const minCount = min._count.assignedLeads;
        const currentCount = agent._count.assignedLeads;
        return currentCount < minCount ? agent : min;
      }
    );

    return this.assignLeadToAgent(leadId, selectedAgent.id, tenantId);
  }

  /**
   * Assign lead based on skill match — falls back to round-robin since User model
   * doesn't have a `skills` field. The requiredSkills parameter is kept for interface
   * compatibility.
   */
  static async assignLeadBySkills(leadId: string, _requiredSkills: string[], tenantId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundError('Lead');

    // Fallback to round-robin (User model has no skills field)
    return this.assignLeadRoundRobin(leadId, tenantId);
  }

  /**
   * Get leads assigned to a specific agent via audit logs
   */
  static async getAgentLeads(agentId: string, tenantId: string) {
    // Find lead IDs assigned to this agent via audit logs
    const assignments = await prisma.auditLog.findMany({
      where: {
        tenantId,
        action: 'assigned_to_agent',
        resource: 'lead',
        metadata: { path: ['agentId'], equals: agentId },
      },
      select: { resourceId: true },
      orderBy: { createdAt: 'desc' },
    });

    const leadIds = assignments
      .map((a) => a.resourceId)
      .filter((id): id is string => id !== null);

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, tenantId },
      orderBy: { receivedAt: 'desc' },
      include: {
        campaign: { select: { name: true } },
      },
    });
    return leads;
  }

  /**
   * Unassign a lead from an agent
   */
  static async unassignLead(leadId: string, tenantId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundError('Lead');

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'unassigned_from_agent',
        resource: 'lead',
        resourceId: leadId,
        metadata: {},
      },
    });

    return lead;
  }

  /**
   * Get assignment stats for tenant
   */
  static async getAssignmentStats(tenantId: string) {
    const agents = await this.getAvailableAgents(tenantId);

    const stats = {
      totalAgents: agents.length,
      averageLeadsPerAgent: agents.length > 0
        ? agents.reduce((sum: number, a: typeof agents[0]) => sum + a._count.assignedLeads, 0) / agents.length
        : 0,
      agents: agents.map((a: typeof agents[0]) => ({
        id: a.id,
        name: [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email,
        assignedLeads: a._count.assignedLeads,
      })),
    };

    return stats;
  }
}
