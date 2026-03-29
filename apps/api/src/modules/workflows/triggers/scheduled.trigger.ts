import { ITriggerExecutor, TriggerExecutionContext, ScheduledTriggerConfig } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';
import cron from 'node-cron';
import * as parser from 'cron-parser';
import { LoggerService } from '../../../shared/services/logger.service';

interface ScheduleEntry {
  triggerId: string;
  task: ReturnType<typeof cron.schedule>;
}

/**
 * Manages scheduled workflow triggers using cron expressions
 * Executes workflows on a schedule and tracks last run times
 */
export class ScheduledTriggerExecutor implements ITriggerExecutor {
  private static schedules: Map<string, ScheduleEntry> = new Map();

  /**
   * Start a scheduled trigger
   */
  async execute(config: ScheduledTriggerConfig, context: TriggerExecutionContext): Promise<void> {
    const { triggerId, workflowId, tenantId } = context;
    const { cronExpression, timezone } = config;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Get the trigger from database to verify it exists
    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id: triggerId },
      include: { schedule: true },
    });

    if (!trigger) {
      throw new Error(`Trigger not found: ${triggerId}`);
    }

    // Stop existing schedule if any
    if (ScheduledTriggerExecutor.schedules.has(triggerId)) {
      const existing = ScheduledTriggerExecutor.schedules.get(triggerId)!;
      existing.task.stop();
      ScheduledTriggerExecutor.schedules.delete(triggerId);
    }

    // Create new scheduled task
    const task = cron.schedule(cronExpression, async () => {
      try {
        await this.executeScheduledWorkflow(
          workflowId,
          tenantId,
          triggerId,
          cronExpression,
          timezone
        );
      } catch (error) {
        LoggerService.logError('Scheduled workflow execution failed', undefined, {
          triggerId,
          workflowId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Store the schedule
    ScheduledTriggerExecutor.schedules.set(triggerId, { triggerId, task });

    // Calculate and store next run time
    await this.updateNextRunTime(triggerId, cronExpression, timezone);

    LoggerService.logInfo('Scheduled trigger started', {
      triggerId,
      workflowId,
      cronExpression,
      timezone,
    });
  }

  /**
   * Stop a scheduled trigger
   */
  static async stop(triggerId: string): Promise<void> {
    const entry = ScheduledTriggerExecutor.schedules.get(triggerId);
    if (entry) {
      entry.task.stop();
      ScheduledTriggerExecutor.schedules.delete(triggerId);
      LoggerService.logInfo('Scheduled trigger stopped', { triggerId });
    }
  }

  /**
   * Stop all scheduled triggers (useful for graceful shutdown)
   */
  static async stopAll(): Promise<void> {
    for (const [triggerId, entry] of ScheduledTriggerExecutor.schedules) {
      entry.task.stop();
      LoggerService.logInfo('Stopped scheduled trigger on shutdown', { triggerId });
    }
    ScheduledTriggerExecutor.schedules.clear();
  }

  /**
   * Execute all leads matching workflow conditions
   */
  private async executeScheduledWorkflow(
    workflowId: string,
    tenantId: string,
    triggerId: string,
    cronExpression: string,
    timezone: string
  ): Promise<void> {
    try {
      // Get workflow with steps
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: true },
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (workflow.status !== 'active') {
        LoggerService.logInfo('Workflow is not active, skipping execution', { workflowId });
        return;
      }

      // Get all leads for this tenant that match workflow conditions
      const leads = await prisma.lead.findMany({
        where: {
          tenantId,
          // Add workflow conditions if any
          ...this.buildLeadFilter(workflow.conditions as Record<string, any> | null),
        },
      });

      if (leads.length === 0) {
        LoggerService.logInfo('No leads match workflow conditions', { workflowId });
        return;
      }

      // Execute workflow for each lead
      const executionIds: string[] = [];
      for (const lead of leads) {
        try {
          const executionId = await WorkflowEngine.executeWorkflow(
            workflowId,
            lead.id,
            tenantId,
            { triggeredBy: 'scheduled', triggerId }
          );
          executionIds.push(executionId);
        } catch (error) {
          LoggerService.logError('Failed to execute workflow for lead', undefined, {
            workflowId,
            leadId: lead.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with next lead
        }
      }

      LoggerService.logInfo('Scheduled workflow execution completed', {
        workflowId,
        triggerId,
        leadsProcessed: leads.length,
        executionsCreated: executionIds.length,
      });

      // Update schedule record with last run and next run times
      await this.updateNextRunTime(triggerId, cronExpression, timezone, new Date());

      LoggerService.logInfo('Scheduled trigger executed and rescheduled', {
        triggerId,
        workflowId,
        lastRunAt: new Date().toISOString(),
        nextRunAt: parser.default.parse(cronExpression, { tz: timezone, currentDate: new Date() }).next().toISOString(),
      });
    } catch (error) {
      LoggerService.logError('Scheduled workflow execution failed', error instanceof Error ? error : undefined, {
        workflowId,
        triggerId,
      });
      throw error;
    }
  }

  /**
   * Build Prisma filter from workflow conditions
   */
  private buildLeadFilter(conditions: Record<string, any> | null): Record<string, any> {
    if (!conditions) return {};

    const filter: Record<string, any> = {};

    if (conditions.minQualityScore !== undefined) {
      filter.qualityScore = { gte: conditions.minQualityScore };
    }

    if (conditions.maxQualityScore !== undefined) {
      filter.qualityScore = {
        ...filter.qualityScore,
        lte: conditions.maxQualityScore,
      };
    }

    if (conditions.status) {
      filter.status = conditions.status;
    }

    if (conditions.platform) {
      filter.platform = conditions.platform;
    }

    return filter;
  }

  /**
   * Calculate next run time and update database
   */
  private async updateNextRunTime(
    triggerId: string,
    cronExpression: string,
    timezone: string,
    lastRunAt?: Date
  ): Promise<void> {
    try {
      const interval = parser.default.parse(cronExpression, {
        tz: timezone,
        currentDate: lastRunAt ?? new Date(),
      });
      const nextDate = interval.next();

      const data: Record<string, any> = {
        nextRunAt: nextDate.toDate(),
      };

      if (lastRunAt) {
        data.lastRunAt = lastRunAt;
      }

      await prisma.workflowSchedule.update({
        where: { triggerId },
        data,
      });
    } catch (error) {
      LoggerService.logError('Failed to update next run time', undefined, {
        triggerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Initialize all active scheduled triggers on server startup
   */
  static async initializeSchedules(): Promise<void> {
    try {
      const triggers = await prisma.workflowTrigger.findMany({
        where: {
          type: 'scheduled',
          isActive: true,
        },
        include: {
          schedule: true,
          workflow: true,
        },
      });

      LoggerService.logInfo(`Initializing ${triggers.length} scheduled triggers...`);

      for (const trigger of triggers) {
        if (!trigger.schedule) continue;

        try {
          const executor = new ScheduledTriggerExecutor();
          await executor.execute(
            {
              cronExpression: trigger.schedule.cronExpression,
              timezone: trigger.schedule.timezone,
            },
            {
              tenantId: trigger.tenantId,
              workflowId: trigger.workflowId,
              triggerId: trigger.id,
            }
          );
        } catch (error) {
          LoggerService.logError('Failed to initialize scheduled trigger', undefined, {
            triggerId: trigger.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      LoggerService.logInfo('Scheduled triggers initialized');
    } catch (error) {
      LoggerService.logError('Failed to initialize scheduled triggers', error instanceof Error ? error : undefined);
    }
  }
}
