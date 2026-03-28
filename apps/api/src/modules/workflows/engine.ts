import { prisma } from '../../shared/database/prisma';
import { ActionType, ActionExecutionContext, StepExecutionResult } from './types';
import { getActionExecutor } from './executors';
import { emitToTenant } from '../../shared/websocket/socket';

export class WorkflowEngine {
  /**
   * Evaluates if a workflow should be triggered for a lead
   */
  static async shouldTriggerWorkflow(
    workflow: any,
    lead: any,
    triggerType: string
  ): Promise<boolean> {
    const triggerConfig = workflow.triggerConfig as Record<string, any>;

    // Check if trigger type matches
    if (triggerConfig?.type && triggerConfig.type !== triggerType) {
      return false;
    }

    // Evaluate conditions if present
    if (workflow.conditions) {
      return this.evaluateConditions(lead, workflow.conditions);
    }

    return true;
  }

  /**
   * Evaluates workflow conditions against lead data
   */
  private static evaluateConditions(lead: any, conditions: Record<string, any>): boolean {
    // Simple condition evaluation logic
    // Supports: qualityScore, status, customFields matching

    if (conditions.minQualityScore && lead.qualityScore < conditions.minQualityScore) {
      return false;
    }

    if (conditions.status && lead.status !== conditions.status) {
      return false;
    }

    if (conditions.customFields) {
      for (const [key, value] of Object.entries(conditions.customFields)) {
        if (lead.customFields?.[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Executes a workflow for a given lead with branching support
   */
  static async executeWorkflow(
    workflowId: string,
    leadId: string,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const executionId = crypto.randomUUID();

    try {
      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          id: executionId,
          tenantId,
          workflowId,
          leadId,
          status: 'running',
          triggeredAt: new Date(),
          metadata: metadata || {},
        },
        include: { workflow: true, lead: true },
      });

      // Emit execution started event
      emitToTenant(tenantId, 'workflow:execution', {
        type: 'started',
        executionId,
        workflowId,
        leadId,
      });

      // Get workflow steps
      const steps = await prisma.workflowStep.findMany({
        where: { workflowId },
      });

      if (steps.length === 0) {
        // No steps, mark as completed
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { status: 'completed', completedAt: new Date() },
        });
        return executionId;
      }

      // Create a map of steps by ID for easy lookup
      const stepsMap = new Map(steps.map(step => [step.id, step]));

      // Execute workflow with branching
      const result = await this.executeWorkflowWithBranching(
        stepsMap,
        execution,
        executionId,
        metadata
      );

      // Mark execution as completed or failed
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: result.hasError ? 'failed' : 'completed',
          completedAt: new Date(),
        },
      });

      // Emit execution completed/failed event
      emitToTenant(tenantId, 'workflow:execution', {
        type: result.hasError ? 'failed' : 'completed',
        executionId,
        workflowId,
        leadId,
      });

      return executionId;
    } catch (error) {
      // Mark execution as failed
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      }).catch(() => {
        // Silently fail if update fails (execution record might not exist)
      });

      console.error('Workflow execution failed', { executionId, error });
      throw error;
    }
  }

  /**
   * Execute workflow with branching logic
   */
  private static async executeWorkflowWithBranching(
    stepsMap: Map<string, any>,
    execution: any,
    executionId: string,
    metadata?: Record<string, any>
  ): Promise<{ hasError: boolean }> {
    let hasError = false;
    const executedSteps = new Set<string>();
    const pendingSteps = new Set<string>();

    // Find the first step (order = 0 or the step with no predecessors)
    const firstStep = Array.from(stepsMap.values()).find(step => step.order === 0) ||
                     Array.from(stepsMap.values()).sort((a, b) => a.order - b.order)[0];

    if (!firstStep) {
      return { hasError: false };
    }

// Determine starting step (support resume from a failed step)
      const resumeFromStepId = (metadata as any)?.resumeFromStepId;
      const startStep = resumeFromStepId && stepsMap.has(resumeFromStepId)
        ? stepsMap.get(resumeFromStepId)
        : firstStep;

      if (!startStep) {
        return { hasError: false };
      }

      // If we're resuming from a step, mark earlier steps as skipped to keep the execution trace readable.
      if (resumeFromStepId && startStep) {
        const skippedSteps = Array.from(stepsMap.values()).filter(
          (step) => step.order < startStep.order
        );
        for (const step of skippedSteps) {
          await prisma.workflowStepExecution.create({
            data: {
              id: crypto.randomUUID(),
              executionId,
              stepId: step.id,
              status: 'skipped',
              result: { reason: 'resumed' },
              completedAt: new Date(),
            },
          });
        }
      }

      // Start execution from the first/resumed step
      pendingSteps.add(startStep.id);

    while (pendingSteps.size > 0) {
      // Get next step to execute
      const currentStepId = pendingSteps.values().next().value!;
      pendingSteps.delete(currentStepId);

      if (executedSteps.has(currentStepId)) {
        // Avoid infinite loops
        continue;
      }

      const currentStep = stepsMap.get(currentStepId);
      if (!currentStep) continue;

      executedSteps.add(currentStepId);

      // Check step conditions before execution
      if (currentStep.conditions) {
        const conditionsMet = this.evaluateConditions(execution.lead, currentStep.conditions);
        if (!conditionsMet) {
          // Skip this step
          await prisma.workflowStepExecution.create({
            data: {
              id: crypto.randomUUID(),
              executionId,
              stepId: currentStep.id,
              status: 'skipped',
              result: { reason: 'conditions_not_met' },
              completedAt: new Date(),
            },
          });
          continue;
        }
      }

      // Execute the step
      const stepExecution = await this.executeStep(
        currentStep,
        execution,
        executionId
      );

      if (stepExecution.status === 'failed') {
        hasError = true;
        // On failure, follow nextStepOnFailure or stop
        if (currentStep.nextStepOnFailure) {
          pendingSteps.add(currentStep.nextStepOnFailure);
        }
        // Continue to allow other branches to execute
        continue;
      }

      // On success, follow nextStepOnSuccess or continue with next ordered step
      if (currentStep.nextStepOnSuccess) {
        pendingSteps.add(currentStep.nextStepOnSuccess);
      } else {
        // Find next step by order
        const nextStep = Array.from(stepsMap.values())
          .filter(step => step.order > currentStep.order && !executedSteps.has(step.id))
          .sort((a, b) => a.order - b.order)[0];

        if (nextStep) {
          pendingSteps.add(nextStep.id);
        }
      }
    }

    return { hasError };
  }

  /**
   * Executes a single workflow step
   */
  private static async executeStep(
    step: any,
    execution: any,
    executionId: string
  ): Promise<{ status: string; error?: string }> {
    const stepExecutionId = crypto.randomUUID();
    const startedAt = new Date();

    try {
      // Create step execution record
      const stepExecution = await prisma.workflowStepExecution.create({
        data: {
          id: stepExecutionId,
          executionId,
          stepId: step.id,
          status: 'running',
          startedAt,
        },
      });

      // Get action executor
      const executor = getActionExecutor(step.actionType as ActionType);
      if (!executor) {
        throw new Error(`Unknown action type: ${step.actionType}`);
      }

      // Build execution context
      const context: ActionExecutionContext = {
        tenantId: execution.tenantId,
        leadId: execution.leadId,
        executionId,
        stepId: step.id,
        workflowId: execution.workflowId,
      };

      // Execute action
      const result = await executor.execute(step.config || {}, context);

      // Update step execution with result
      await prisma.workflowStepExecution.update({
        where: { id: stepExecutionId },
        data: {
          status: result.success ? 'completed' : 'failed',
          result: result.data,
          error: result.error,
          completedAt: new Date(),
        },
      });

      // Emit step execution event
      emitToTenant(execution.tenantId, 'workflow:step', {
        type: result.success ? 'completed' : 'failed',
        executionId,
        stepId: step.id,
        actionType: step.actionType,
        error: result.error,
      });

      return {
        status: result.success ? 'completed' : 'failed',
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Update step execution as failed
      await prisma.workflowStepExecution.update({
        where: { id: stepExecutionId },
        data: {
          status: 'failed',
          error: errorMsg,
          completedAt: new Date(),
        },
      }).catch(() => {
        // Silently fail if update fails
      });

      return { status: 'failed', error: errorMsg };
    }
  }
}
