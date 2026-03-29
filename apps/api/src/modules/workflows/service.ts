import { prisma } from '../../shared/database/prisma';
import { WorkflowEngine } from './engine';
import { getTenantFilter } from '../../shared/utils/tenant-filter';
import { LoggerService } from '../../shared/services/logger.service';

export class WorkflowService {
  /**
   * Create a new workflow
   */
  static async createWorkflow(
    tenantId: string,
    role: string | undefined,
    data: {
      name: string;
      description?: string;
      triggerConfig?: Record<string, any>;
      conditions?: Record<string, any>;
      isDefault?: boolean;
    }
  ) {
    const workflow = await prisma.workflow.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        triggerConfig: data.triggerConfig,
        conditions: data.conditions,
        isDefault: data.isDefault || false,
        status: 'active',
      },
    });

    LoggerService.logInfo('Created workflow', { tenantId, workflowId: workflow.id });
    return workflow;
  }

  /**
   * Get workflow by ID
   */
  static async getWorkflow(workflowId: string, tenantId: string, role: string | undefined) {
    const tenantFilter = getTenantFilter(tenantId, role);
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, ...tenantFilter },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    return workflow;
  }

  /**
   * List workflows for a tenant
   */
  static async listWorkflows(tenantId: string, role: string | undefined, active?: boolean) {
    const tenantFilter = getTenantFilter(tenantId, role);
    return prisma.workflow.findMany({
      where: {
        ...tenantFilter,
        ...(active !== undefined && { status: active ? 'active' : undefined }),
      },
      include: {
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update workflow
   */
  static async updateWorkflow(
    workflowId: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      triggerConfig?: Record<string, any>;
      conditions?: Record<string, any>;
    }
  ) {
    // Create a version snapshot before updating
    await this.createVersionSnapshot(workflowId, 'Workflow updated');

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...data,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    LoggerService.logInfo('Updated workflow', { workflowId, version: workflow.version });
    return workflow;
  }

  /**
   * Delete workflow
   */
  static async deleteWorkflow(workflowId: string) {
    const workflow = await prisma.workflow.delete({
      where: { id: workflowId },
    });

    LoggerService.logInfo('Deleted workflow', { workflowId });
    return workflow;
  }

  /**
   * Clone a workflow (deep copy including all steps)
   */
  static async cloneWorkflow(workflowId: string, tenantId: string, newName?: string) {
    const original = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!original) {
      throw new Error('Workflow not found');
    }

    // Create cloned workflow
    const cloned = await prisma.workflow.create({
      data: {
        tenantId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        triggerConfig: original.triggerConfig ?? undefined,
        conditions: original.conditions ?? undefined,
        isDefault: false,
        status: 'inactive',
      },
    });

    // Clone steps — map old step IDs to new ones for branching references
    const idMap = new Map<string, string>();

    for (const step of original.steps) {
      const newStep = await prisma.workflowStep.create({
        data: {
          workflowId: cloned.id,
          order: step.order,
          actionType: step.actionType,
          config: step.config ?? undefined,
          isEnabled: step.isEnabled,
          conditions: step.conditions ?? undefined,
        },
      });
      idMap.set(step.id, newStep.id);
    }

    // Update branching references in cloned steps
    for (const step of original.steps) {
      const newStepId = idMap.get(step.id);
      if (!newStepId) continue;

      const updates: Record<string, string> = {};
      if (step.nextStepOnSuccess && idMap.has(step.nextStepOnSuccess)) {
        updates.nextStepOnSuccess = idMap.get(step.nextStepOnSuccess)!;
      }
      if (step.nextStepOnFailure && idMap.has(step.nextStepOnFailure)) {
        updates.nextStepOnFailure = idMap.get(step.nextStepOnFailure)!;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.workflowStep.update({
          where: { id: newStepId },
          data: updates,
        });
      }
    }

    LoggerService.logInfo('Cloned workflow', { originalId: workflowId, cloneId: cloned.id });

    return prisma.workflow.findUnique({
      where: { id: cloned.id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  /**
   * Add step to workflow
   */
  static async addStep(
    workflowId: string,
    data: {
      order: number;
      actionType: string;
      config?: Record<string, any>;
      isEnabled?: boolean;
    }
  ) {
    const step = await prisma.workflowStep.create({
      data: {
        workflowId,
        order: data.order,
        actionType: data.actionType,
        config: data.config,
        isEnabled: data.isEnabled !== false,
      },
    });

    LoggerService.logInfo('Added workflow step', { workflowId, stepId: step.id });
    return step;
  }

  /**
   * Update step
   */
  static async updateStep(
    stepId: string,
    data: {
      order?: number;
      actionType?: string;
      config?: Record<string, any>;
      isEnabled?: boolean;
    }
  ) {
    const step = await prisma.workflowStep.update({
      where: { id: stepId },
      data,
    });

    LoggerService.logInfo('Updated workflow step', { stepId });
    return step;
  }

  /**
   * Delete step
   */
  static async deleteStep(stepId: string) {
    const step = await prisma.workflowStep.delete({
      where: { id: stepId },
    });

    LoggerService.logInfo('Deleted workflow step', { stepId });
    return step;
  }

  /**
   * Trigger workflow for a lead
   */
  static async triggerWorkflow(
    workflowId: string,
    leadId: string,
    tenantId: string,
    role: string | undefined,
    triggerType: string = 'manual'
  ) {
    try {
      const workflow = await this.getWorkflow(workflowId, tenantId, role);
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Check if workflow should trigger
      const shouldTrigger = await WorkflowEngine.shouldTriggerWorkflow(
        workflow,
        lead,
        triggerType
      );

      if (!shouldTrigger) {
        LoggerService.logInfo('Workflow did not match conditions', { workflowId, leadId });
        return { triggered: false, reason: 'Conditions not met' };
      }

      // Execute workflow
      const executionId = await WorkflowEngine.executeWorkflow(
        workflowId,
        leadId,
        tenantId
      );

      LoggerService.logInfo('Triggered workflow', { workflowId, leadId, executionId });
      return { triggered: true, executionId };
    } catch (error) {
      LoggerService.logError('Failed to trigger workflow', error instanceof Error ? error : undefined, { workflowId, leadId });
      throw error;
    }
  }

  /**
   * Get workflow execution
   */
  static async getExecution(executionId: string) {
    return prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        steps: {
          orderBy: { completedAt: 'asc' },
          include: { step: true },
        },
        workflow: true,
        lead: true,
      },
    });
  }

  /**
   * List executions for a workflow
   */
  static async listExecutions(workflowId: string, limit: number = 50) {
    return prisma.workflowExecution.findMany({
      where: { workflowId },
      include: { lead: true },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get execution analytics for a workflow
   */
  static async getAnalytics(workflowId: string, periodDays: number = 7) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const executions = await prisma.workflowExecution.findMany({
      where: {
        workflowId,
        triggeredAt: { gte: since },
      },
    });

    const total = executions.length;
    const byStatus = executions.reduce(
      (acc, exec) => {
        acc[exec.status] = (acc[exec.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const successCount = byStatus['completed'] ?? 0;
    const failedCount = byStatus['failed'] ?? 0;

    const durations = executions
      .filter((e) => e.completedAt)
      .map((e) => (new Date(e.completedAt!).getTime() - new Date(e.triggeredAt).getTime()) / 1000);

    const avgDurationSeconds = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    return {
      total,
      byStatus,
      successRate: total ? successCount / total : 0,
      failedCount,
      avgDurationSeconds,
      periodDays,
    };
  }

  /**
   * Cross-workflow analytics dashboard data
   */
  static async getDashboardAnalytics(tenantId: string, role: string | undefined, periodDays: number = 7) {
    const tenantFilter = getTenantFilter(tenantId, role);
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // All workflows
    const workflows = await prisma.workflow.findMany({
      where: tenantFilter,
      select: { id: true, name: true, status: true },
    });

    // All executions in the period
    const executions = await prisma.workflowExecution.findMany({
      where: {
        ...tenantFilter,
        triggeredAt: { gte: since },
      },
      include: { workflow: { select: { name: true } } },
    });

    const total = executions.length;
    const byStatus: Record<string, number> = {};
    for (const e of executions) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    }

    const successCount = byStatus['completed'] ?? 0;
    const failedCount = byStatus['failed'] ?? 0;

    const durations = executions
      .filter((e) => e.completedAt)
      .map((e) => (new Date(e.completedAt!).getTime() - new Date(e.triggeredAt).getTime()) / 1000);

    const avgDurationSeconds = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    // Per-workflow breakdown
    const perWorkflow: Record<string, { name: string; total: number; completed: number; failed: number; avgDuration: number | null }> = {};

    for (const w of workflows) {
      const wExecs = executions.filter((e) => e.workflowId === w.id);
      const wTotal = wExecs.length;
      const wCompleted = wExecs.filter((e) => e.status === 'completed').length;
      const wFailed = wExecs.filter((e) => e.status === 'failed').length;
      const wDurations = wExecs
        .filter((e) => e.completedAt)
        .map((e) => (new Date(e.completedAt!).getTime() - new Date(e.triggeredAt).getTime()) / 1000);
      const wAvg = wDurations.length ? wDurations.reduce((a, b) => a + b, 0) / wDurations.length : null;

      perWorkflow[w.id] = { name: w.name, total: wTotal, completed: wCompleted, failed: wFailed, avgDuration: wAvg };
    }

    // Daily trend (day-by-day counts)
    const dailyTrend: { date: string; completed: number; failed: number; total: number }[] = [];
    for (let d = 0; d < periodDays; d++) {
      const dayStart = new Date(since.getTime() + d * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayExecs = executions.filter((e) => {
        const t = new Date(e.triggeredAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      dailyTrend.push({
        date: dayStart.toISOString().slice(0, 10),
        completed: dayExecs.filter((e) => e.status === 'completed').length,
        failed: dayExecs.filter((e) => e.status === 'failed').length,
        total: dayExecs.length,
      });
    }

    // Recent failures
    const recentFailures = executions
      .filter((e) => e.status === 'failed')
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow?.name ?? 'Unknown',
        triggeredAt: e.triggeredAt,
        error: e.error,
      }));

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter((w) => w.status === 'active').length,
      totalExecutions: total,
      byStatus,
      successRate: total ? successCount / total : 0,
      failedCount,
      avgDurationSeconds,
      periodDays,
      perWorkflow,
      dailyTrend,
      recentFailures,
    };
  }

  /**
   * Retry / replay a workflow execution
   */
  static async retryExecution(executionId: string, tenantId?: string, resumeFromStepId?: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { workflow: true, lead: true },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (tenantId && execution.tenantId !== tenantId) {
      throw new Error('Not authorized to retry this execution');
    }

    if (resumeFromStepId) {
      const stepExec = await prisma.workflowStepExecution.findUnique({
        where: { id: resumeFromStepId },
      });
      if (!stepExec || stepExec.executionId !== executionId) {
        throw new Error('Step execution not found for this execution');
      }
    }

    const metadata = {
      ...(execution.metadata as Record<string, any> || {}),
      parentExecutionId: execution.id,
      retryCount: ((execution.metadata as Record<string, any>)?.retryCount ?? 0) + 1,
      ...(resumeFromStepId ? { resumeFromStepId } : {}),
    };

    const newExecutionId = await WorkflowEngine.executeWorkflow(
      execution.workflowId,
      execution.leadId,
      execution.tenantId,
      metadata
    );

    return { executionId: newExecutionId };
  }

  // ─── Versioning ──────────────────────────────────────────────────────────

  /**
   * Create a snapshot of the current workflow state
   */
  static async createVersionSnapshot(workflowId: string, changeDescription?: string, createdBy?: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!workflow) return null;

    const snapshot = {
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      triggerConfig: workflow.triggerConfig,
      conditions: workflow.conditions,
      steps: workflow.steps.map((s) => ({
        order: s.order,
        actionType: s.actionType,
        config: s.config,
        isEnabled: s.isEnabled,
        nextStepOnSuccess: s.nextStepOnSuccess,
        nextStepOnFailure: s.nextStepOnFailure,
        conditions: s.conditions,
      })),
    };

    return prisma.workflowVersion.create({
      data: {
        workflowId,
        version: workflow.version,
        snapshot,
        changeDescription,
        createdBy,
      },
    });
  }

  /**
   * List version history for a workflow
   */
  static async listVersions(workflowId: string) {
    return prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        changeDescription: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get a specific version snapshot
   */
  static async getVersion(versionId: string) {
    return prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
  }

  /**
   * Restore a workflow to a previous version
   */
  static async restoreVersion(workflowId: string, versionId: string) {
    const version = await prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.workflowId !== workflowId) {
      throw new Error('Version not found');
    }

    const snapshot = version.snapshot as any;

    // Create snapshot of current state first
    await this.createVersionSnapshot(workflowId, `Before restore to v${version.version}`);

    // Delete existing steps
    await prisma.workflowStep.deleteMany({ where: { workflowId } });

    // Restore workflow fields
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: snapshot.name,
        description: snapshot.description,
        status: snapshot.status,
        triggerConfig: snapshot.triggerConfig ?? undefined,
        conditions: snapshot.conditions ?? undefined,
        version: { increment: 1 },
      },
    });

    // Restore steps
    if (snapshot.steps?.length) {
      for (const step of snapshot.steps) {
        await prisma.workflowStep.create({
          data: {
            workflowId,
            order: step.order,
            actionType: step.actionType,
            config: step.config ?? undefined,
            isEnabled: step.isEnabled,
            conditions: step.conditions ?? undefined,
          },
        });
      }
    }

    return prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }
}

