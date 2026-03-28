import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { ActivityService } from './activity.service';

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

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
