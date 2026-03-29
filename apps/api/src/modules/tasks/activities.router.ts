import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { ActivityService } from './activity.service';

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

/**
 * @swagger
 * /activities/lead/{leadId}:
 *   get:
 *     tags: [Activities]
 *     summary: Activity timeline for a lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity timeline entries
 * /activities:
 *   post:
 *     tags: [Activities]
 *     summary: Log a new activity
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, leadId]
 *             properties:
 *               type:
 *                 type: string
 *               leadId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Activity logged
 * /activities/recent:
 *   get:
 *     tags: [Activities]
 *     summary: Get recent activities across all leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recent activity list
 */

// GET /api/v1/activities/lead/:leadId — activity timeline for a lead
activitiesRouter.get('/lead/:leadId', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const { leadId } = req.params;
  const { page, limit } = req.query;

  const result = await ActivityService.getTimeline(tenantId, leadId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json(result);
});

// GET /api/v1/activities/recent — recent activities across tenant
activitiesRouter.get('/recent', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const data = await ActivityService.getRecent(tenantId, limit);
  res.json({ data });
});

// POST /api/v1/activities — log a new activity
activitiesRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId, userId } = req.auth;
  const { leadId, type, summary, metadata } = req.body;

  if (!type || !summary) {
    return res.status(400).json({ error: 'Type and summary are required' });
  }

  const activity = await ActivityService.create({
    tenantId,
    leadId,
    userId,
    type,
    summary,
    metadata,
  });

  res.status(201).json({ data: activity });
});
