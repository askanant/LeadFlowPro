import { prisma } from '../../shared/database/prisma';

export class TemplateService {
  /**
   * List all workflow templates, optionally filtered by category
   */
  static async listTemplates(category?: string, featured?: boolean) {
    const where: Record<string, any> = {};
    if (category) where.category = category;
    if (featured !== undefined) where.isFeatured = featured;

    return prisma.workflowTemplate.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { usageCount: 'desc' }],
    });
  }

  /**
   * Get template by ID
   */
  static async getTemplate(templateId: string) {
    return prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });
  }

  /**
   * Create a workflow from a template
   */
  static async createFromTemplate(
    templateId: string,
    tenantId: string,
    customizations: {
      name?: string;
      description?: string;
    }
  ) {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const definition = template.workflowDefinition as Record<string, any>;

    // Generate a unique workflow name
    let workflowName = customizations.name || template.name;
    const existing = await prisma.workflow.findUnique({
      where: { tenantId_name: { tenantId, name: workflowName } },
    });
    if (existing) {
      // Find next available number
      const like = `${workflowName} (%)`;
      const copies = await prisma.workflow.findMany({
        where: { tenantId, name: { startsWith: workflowName } },
        select: { name: true },
      });
      let n = 2;
      while (copies.some((w) => w.name === `${workflowName} (${n})`)) {
        n++;
      }
      workflowName = `${workflowName} (${n})`;
    }

    // Create workflow
    const workflow = await prisma.workflow.create({
      data: {
        tenantId,
        name: workflowName,
        description: customizations.description || template.description,
        triggerConfig: definition.triggerConfig || {},
        conditions: definition.conditions || {},
        status: 'inactive', // Start inactive so user can configure
        isDefault: false,
      },
    });

    // Create steps from template definition
    if (definition.steps && Array.isArray(definition.steps)) {
      for (const step of definition.steps) {
        await prisma.workflowStep.create({
          data: {
            workflowId: workflow.id,
            order: step.order,
            actionType: step.actionType,
            config: step.config || {},
            isEnabled: step.isEnabled !== false,
          },
        });
      }
    }

    // Increment usage count
    await prisma.workflowTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    // Return workflow with steps
    return prisma.workflow.findUnique({
      where: { id: workflow.id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  /**
   * Seed default templates
   */
  static async seedTemplates() {
    const templates = [
      {
        name: 'Lead Scoring & Routing',
        description: 'Automatically evaluate lead quality, update scores, and assign high-value leads to agents. Low-quality leads are flagged for review.',
        category: 'lead-management',
        isFeatured: true,
        workflowDefinition: {
          triggerConfig: { type: 'lead_created' },
          conditions: {},
          steps: [
            {
              order: 0,
              actionType: 'condition-check',
              config: {
                conditionGroups: [
                  {
                    operator: 'AND',
                    rules: [
                      { field: 'qualityScore', operator: '>=', value: 70 },
                      { field: 'email', operator: '!=', value: '' },
                    ],
                  },
                ],
              },
            },
            {
              order: 1,
              actionType: 'assign-agent',
              config: { roundRobin: true },
            },
            {
              order: 2,
              actionType: 'notify-agents',
              config: { message: 'New high-quality lead assigned to you: {{firstName}} {{lastName}}' },
            },
            {
              order: 3,
              actionType: 'log-event',
              config: { eventType: 'lead_scored_and_routed' },
            },
          ],
        },
      },
      {
        name: 'New Lead Welcome',
        description: 'Send a welcome email, create a follow-up task, and assign an agent when a new lead arrives.',
        category: 'engagement',
        isFeatured: true,
        workflowDefinition: {
          triggerConfig: { type: 'lead_created' },
          conditions: {},
          steps: [
            {
              order: 0,
              actionType: 'send-email',
              config: {
                subject: 'Welcome, {{firstName}}!',
                body: 'Hi {{firstName}},\n\nThank you for your interest. A team member will reach out shortly.\n\nBest regards,\nThe Team',
              },
            },
            {
              order: 1,
              actionType: 'assign-agent',
              config: { roundRobin: true },
            },
            {
              order: 2,
              actionType: 'create-task',
              config: {
                title: 'Follow up with {{firstName}} {{lastName}}',
                description: 'New lead received. Please make initial contact.',
                dueInDays: 1,
                priority: 'high',
              },
            },
            {
              order: 3,
              actionType: 'add-note',
              config: { content: 'Welcome email sent automatically via workflow.' },
            },
          ],
        },
      },
      {
        name: 'Inactive Lead Re-engagement',
        description: 'Detect leads with no activity for 7+ days and trigger a re-engagement campaign with notifications.',
        category: 'engagement',
        isFeatured: true,
        workflowDefinition: {
          triggerConfig: { type: 'time_since_event' },
          conditions: {},
          steps: [
            {
              order: 0,
              actionType: 'condition-check',
              config: {
                conditionGroups: [
                  {
                    operator: 'AND',
                    rules: [
                      { field: 'status', operator: '!=', value: 'converted' },
                      { field: 'status', operator: '!=', value: 'junk' },
                    ],
                  },
                ],
              },
            },
            {
              order: 1,
              actionType: 'update-lead',
              config: { customFields: { _reEngaged: true } },
            },
            {
              order: 2,
              actionType: 'send-email',
              config: {
                subject: "We haven't heard from you, {{firstName}}",
                body: 'Hi {{firstName}},\n\nWe noticed we haven\'t been in touch for a while. Would you like to reconnect?\n\nBest regards,\nThe Team',
              },
            },
            {
              order: 3,
              actionType: 'notify-agents',
              config: { message: 'Inactive lead re-engaged: {{firstName}} {{lastName}}' },
            },
          ],
        },
      },
      {
        name: 'Campaign Performance Monitor',
        description: 'Monitor campaign cost-per-lead (CPL) and notify when it exceeds thresholds. Automatically flags underperforming campaigns.',
        category: 'campaign-monitoring',
        isFeatured: false,
        workflowDefinition: {
          triggerConfig: { type: 'campaign_performance' },
          conditions: {},
          steps: [
            {
              order: 0,
              actionType: 'create-event',
              config: { eventType: 'campaign_alert', eventData: { alert: 'cpl_threshold_exceeded' } },
            },
            {
              order: 1,
              actionType: 'notify-agents',
              config: { message: 'Campaign performance alert: CPL has exceeded threshold.' },
            },
            {
              order: 2,
              actionType: 'log-event',
              config: { eventType: 'campaign_performance_alert' },
            },
          ],
        },
      },
      {
        name: 'Lead Deduplication & Merge',
        description: 'Detect potential duplicate leads, add notes, update quality scores, and notify agents for manual review.',
        category: 'lead-management',
        isFeatured: false,
        workflowDefinition: {
          triggerConfig: { type: 'lead_created' },
          conditions: {},
          steps: [
            {
              order: 0,
              actionType: 'condition-check',
              config: {
                conditionGroups: [
                  {
                    operator: 'OR',
                    rules: [
                      { field: 'email', operator: '!=', value: '' },
                      { field: 'phone', operator: '!=', value: '' },
                    ],
                  },
                ],
              },
            },
            {
              order: 1,
              actionType: 'add-note',
              config: { content: 'Automated duplicate check performed on lead {{firstName}} {{lastName}}.' },
            },
            {
              order: 2,
              actionType: 'update-quality',
              config: { scoreAdjustment: -5 },
            },
            {
              order: 3,
              actionType: 'notify-agents',
              config: { message: 'Potential duplicate lead detected: {{firstName}} {{lastName}}. Please review.' },
            },
          ],
        },
      },
    ];

    for (const template of templates) {
      await prisma.workflowTemplate.upsert({
        where: { name: template.name },
        update: {
          description: template.description,
          category: template.category,
          isFeatured: template.isFeatured,
          workflowDefinition: template.workflowDefinition,
        },
        create: template,
      });
    }

    console.log(`Seeded ${templates.length} workflow templates`);
  }
}
