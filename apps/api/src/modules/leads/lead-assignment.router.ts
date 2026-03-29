import { Router, Request, Response, NextFunction } from 'express';
import { LeadAssignmentService } from './lead-assignment.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';

const router = Router();

function getTenantId(req: Request) {
  return (req as any).auth?.tenantId;
}

/**
 * @swagger
 * /lead-assignment/agents:
 *   get:
 *     tags: [Lead Assignment]
 *     summary: Get available agents for assignment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agents
 * /lead-assignment/config:
 *   get:
 *     tags: [Lead Assignment]
 *     summary: Get assignment configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assignment config
 *   put:
 *     tags: [Lead Assignment]
 *     summary: Update assignment configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Config updated
 * /lead-assignment/assign:
 *   post:
 *     tags: [Lead Assignment]
 *     summary: Manually assign leads to agents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leadIds, agentId]
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               agentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leads assigned
 * /lead-assignment/auto-assign:
 *   post:
 *     tags: [Lead Assignment]
 *     summary: Auto-assign unassigned leads
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-assignment result
 * /lead-assignment/stats:
 *   get:
 *     tags: [Lead Assignment]
 *     summary: Get assignment statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assignment statistics
 */

/**
 * Get available agents
 */
router.get('/agents', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const agents = await LeadAssignmentService.getAvailableAgents(tenantId);
    res.json({ data: agents });
  } catch (error) {
    next(error);
  }
});

/**
 * Get assignment stats
 */
router.get('/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const stats = await LeadAssignmentService.getAssignmentStats(tenantId);
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * Assign lead to specific agent
 */
router.post('/:leadId/assign', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const lead = await LeadAssignmentService.assignLeadToAgent(req.params.leadId, agentId, tenantId);
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});

/**
 * Auto-assign lead (round-robin)
 */
router.post('/:leadId/auto-assign', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const lead = await LeadAssignmentService.assignLeadRoundRobin(req.params.leadId, tenantId);
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});

/**
 * Unassign lead
 */
router.post('/:leadId/unassign', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const lead = await LeadAssignmentService.unassignLead(req.params.leadId, tenantId);
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});

/**
 * Get leads for agent
 */
router.get('/agent/:agentId/leads', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const leads = await LeadAssignmentService.getAgentLeads(req.params.agentId, tenantId);
    res.json({ data: leads });
  } catch (error) {
    next(error);
  }
});

export const leadAssignmentRouter = router;
