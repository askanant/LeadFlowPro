import { Router, Request, Response, NextFunction } from 'express';
import { WorkflowService } from './service';
import { TriggerService } from './trigger.service';
import { TemplateService } from './template.service';
import { getTriggerExecutor } from './triggers';
import { requireAuth } from '../../shared/middleware/auth.middleware';

const router = Router();

function getTenantId(req: Request) {
  return (req as any).auth?.tenantId;
}

// ─── Workflow Templates ──────────────────────────────────────────────────────

/**
 * List workflow templates
 */
router.get('/templates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;
    const featured = req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : undefined;

    const templates = await TemplateService.listTemplates(category, featured);
    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
});

/**
 * Get template by ID
 */
router.get('/templates/:templateId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await TemplateService.getTemplate(req.params.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ data: template });
  } catch (error) {
    next(error);
  }
});

/**
 * Create workflow from template
 */
router.post('/from-template', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { templateId, name, description } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }

    const workflow = await TemplateService.createFromTemplate(templateId, tenantId, {
      name,
      description,
    });

    res.status(201).json({ data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * Seed templates (admin only)
 */
router.post('/templates/seed', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await TemplateService.seedTemplates();
    res.json({ data: { message: 'Templates seeded successfully' } });
  } catch (error) {
    next(error);
  }
});

/**
 * Cross-workflow analytics dashboard
 */
router.get('/analytics/dashboard', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const periodDays = req.query.period ? Number(req.query.period) : 7;
    const analytics = await WorkflowService.getDashboardAnalytics(tenantId, (req as any).auth?.role, periodDays);
    res.json({ data: analytics });
  } catch (error) {
    next(error);
  }
});

/**
 * Create workflow
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { name, description, triggerConfig, conditions, isDefault } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const workflow = await WorkflowService.createWorkflow(tenantId, (req as any).auth?.role, {
      name,
      description,
      triggerConfig,
      conditions,
      isDefault,
    });

    res.status(201).json({ data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * Get workflow
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const workflow = await WorkflowService.getWorkflow(req.params.id, tenantId, (req as any).auth?.role);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * List workflows
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

    const workflows = await WorkflowService.listWorkflows(tenantId, (req as any).auth?.role, active);
    res.json({ data: workflows });
  } catch (error) {
    next(error);
  }
});

/**
 * Update workflow
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, status, triggerConfig, conditions } = req.body;

    const workflow = await WorkflowService.updateWorkflow(req.params.id, {
      name,
      description,
      status,
      triggerConfig,
      conditions,
    });

    res.json({ data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete workflow
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await WorkflowService.deleteWorkflow(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Clone workflow (deep copy including steps)
 */
router.post('/:id/clone', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { name } = req.body;

    const cloned = await WorkflowService.cloneWorkflow(req.params.id, tenantId, name);
    res.status(201).json({ data: cloned });
  } catch (error) {
    next(error);
  }
});

// ─── Workflow Versioning ────────────────────────────────────────────────────

/**
 * List version history for a workflow
 */
router.get('/:id/versions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const versions = await WorkflowService.listVersions(req.params.id);
    res.json({ data: versions });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific version snapshot
 */
router.get('/:id/versions/:versionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await WorkflowService.getVersion(req.params.versionId);
    if (!version || version.workflowId !== req.params.id) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json({ data: version });
  } catch (error) {
    next(error);
  }
});

/**
 * Restore workflow to a previous version
 */
router.post('/:id/versions/:versionId/restore', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflow = await WorkflowService.restoreVersion(req.params.id, req.params.versionId);
    res.json({ data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * Add step to workflow
 */
router.post('/:id/steps', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order, actionType, config, isEnabled } = req.body;

    if (!order || !actionType) {
      return res.status(400).json({ error: 'order and actionType are required' });
    }

    const step = await WorkflowService.addStep(req.params.id, {
      order,
      actionType,
      config,
      isEnabled,
    });

    res.status(201).json({ data: step });
  } catch (error) {
    next(error);
  }
});

/**
 * Update step
 */
router.patch('/:workflowId/steps/:stepId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order, actionType, config, isEnabled } = req.body;

    const step = await WorkflowService.updateStep(req.params.stepId, {
      order,
      actionType,
      config,
      isEnabled,
    });

    res.json({ data: step });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete step
 */
router.delete('/:workflowId/steps/:stepId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await WorkflowService.deleteStep(req.params.stepId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Trigger workflow manually
 */
router.post('/:id/execute', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    const result = await WorkflowService.triggerWorkflow(
      req.params.id,
      leadId,
      tenantId,
      (req as any).auth?.role,
      'manual'
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * Get workflow execution
 */
router.get('/executions/:executionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const execution = await WorkflowService.getExecution(req.params.executionId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (tenantId && execution.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ data: execution });
  } catch (error) {
    next(error);
  }
});

/**
 * Retry workflow execution
 */
router.post('/executions/:executionId/retry', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const result = await WorkflowService.retryExecution(req.params.executionId, tenantId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * Retry from a specific failed step
 */
router.post('/executions/:executionId/retry-step', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { stepId } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    const result = await WorkflowService.retryExecution(req.params.executionId, tenantId, stepId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * Workflow analytics
 */
router.get('/:id/analytics', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periodDays = req.query.period ? Number(req.query.period) : 7;
    const analytics = await WorkflowService.getAnalytics(req.params.id, periodDays);
    res.json({ data: analytics });
  } catch (error) {
    next(error);
  }
});

/**
 * List executions for workflow
 */
router.get('/:id/executions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const executions = await WorkflowService.listExecutions(req.params.id);
    res.json({ data: executions });
  } catch (error) {
    next(error);
  }
});

// ─── Workflow Triggers ──────────────────────────────────────────────────────

/**
 * Create trigger for workflow
 */
router.post('/:workflowId/triggers', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const { type, config, webhookUrl, webhookSecret } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const trigger = await TriggerService.createTrigger(req.params.workflowId, tenantId, {
      type,
      config,
      webhookUrl,
      webhookSecret,
    });

    res.status(201).json({ data: trigger });
  } catch (error) {
    next(error);
  }
});

/**
 * List triggers for workflow
 */
router.get('/:workflowId/triggers', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const triggers = await TriggerService.listTriggers(req.params.workflowId, tenantId);
    res.json({ data: triggers });
  } catch (error) {
    next(error);
  }
});

/**
 * Get trigger
 */
router.get('/:workflowId/triggers/:triggerId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const trigger = await TriggerService.getTrigger(req.params.triggerId, tenantId);

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    res.json({ data: trigger });
  } catch (error) {
    next(error);
  }
});

/**
 * Update trigger
 */
router.patch('/:workflowId/triggers/:triggerId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const { type, config, webhookUrl, webhookSecret, isActive } = req.body;

    const trigger = await TriggerService.updateTrigger(req.params.triggerId, tenantId, {
      type,
      config,
      webhookUrl,
      webhookSecret,
      isActive,
    });

    res.json({ data: trigger });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete trigger
 */
router.delete('/:workflowId/triggers/:triggerId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    await TriggerService.deleteTrigger(req.params.triggerId, tenantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Activate trigger
 */
router.post('/:workflowId/triggers/:triggerId/activate', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const trigger = await TriggerService.activateTrigger(req.params.triggerId, tenantId);
    res.json({ data: trigger });
  } catch (error) {
    next(error);
  }
});

/**
 * Deactivate trigger
 */
router.post('/:workflowId/triggers/:triggerId/deactivate', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const trigger = await TriggerService.deactivateTrigger(req.params.triggerId, tenantId);
    res.json({ data: trigger });
  } catch (error) {
    next(error);
  }
});

/**
 * Test trigger execution
 */
router.post('/:workflowId/triggers/:triggerId/test', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).auth?.tenantId;
    const result = await TriggerService.testTrigger(req.params.triggerId, tenantId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * Get trigger schedule status
 */
router.get('/:workflowId/triggers/:triggerId/schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const trigger = await TriggerService.getTrigger(req.params.triggerId, tenantId);

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    if (trigger.type !== 'scheduled') {
      return res.status(400).json({ error: 'Trigger is not a scheduled trigger' });
    }

    const schedule = await TriggerService.getTriggerSchedule(req.params.triggerId);

    res.json({
      data: {
        triggerId: trigger.id,
        type: trigger.type,
        isActive: trigger.isActive,
        schedule: schedule ? {
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          lastRunAt: schedule.lastRunAt,
          nextRunAt: schedule.nextRunAt,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Webhook Endpoints ──────────────────────────────────────────────────────

/**
 * Handle webhook trigger
 * Note: This endpoint is public (no auth required) but validates signature
 */
router.post('/webhook/:triggerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId } = req.params;
    const payload = req.body;
    const signature = req.headers['x-webhook-signature'] as string;
    const eventType = req.headers['x-webhook-event'] as string;

    // Get trigger to determine tenant
    const trigger = await TriggerService.getTrigger(triggerId, undefined);
    if (!trigger) {
      return res.status(404).json({ error: 'Webhook trigger not found' });
    }

    if (!trigger.isActive) {
      return res.status(200).json({ message: 'Trigger is not active' });
    }

    // Execute webhook trigger
    const executor = getTriggerExecutor('webhook');
    if (!executor) {
      return res.status(500).json({ error: 'Webhook executor not available' });
    }

    await executor.execute(trigger.config || {}, {
      tenantId: trigger.tenantId,
      workflowId: trigger.workflowId,
      triggerId: trigger.id,
      metadata: {
        payload,
        signature,
        eventType,
      },
    });

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing failed', {
      triggerId: req.params.triggerId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return 200 to prevent webhook retries for validation errors
    if (error instanceof Error && error.message.includes('signature')) {
      return res.status(200).json({ message: 'Webhook signature validation failed' });
    }

    next(error);
  }
});

export const workflowsRouter = router;
