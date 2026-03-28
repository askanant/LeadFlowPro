import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { NotificationService } from './notification.service';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/preferences', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.auth!;
    const prefs = await NotificationService.getPreferences(tenantId, userId);
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

notificationRouter.post('/preferences', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.auth!;
    const { notificationType, channel, enabled, slackChannel, slackWebhook } = req.body;

    const pref = await NotificationService.setPreference(
      tenantId,
      userId,
      notificationType,
      channel,
      { enabled, slackChannel, slackWebhook }
    );

    res.json(pref);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

notificationRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.auth!;
    const limit = parseInt((req.query.limit as string) || '50', 10);

    const history = await NotificationService.getHistory(tenantId, userId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

notificationRouter.post('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    
    const notif = await NotificationService.markAsRead(notificationId);
    res.json(notif);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

notificationRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.auth!;
    const { type, channel, subject, message, recipients, metadata } = req.body;

    const notifId = await NotificationService.sendNotification({
      tenantId,
      userId,
      type,
      channel,
      subject,
      message,
      recipients,
      metadata,
    });

    res.json({ id: notifId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

notificationRouter.post('/retry-failed', async (req: Request, res: Response) => {
  try {
    const count = await NotificationService.retryFailedNotifications();
    res.json({ retriedCount: count });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

notificationRouter.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.auth!;
    const count = await NotificationService.getUnreadCount(tenantId, userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
