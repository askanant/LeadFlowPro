import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { TaskService } from './task.service';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task list
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *               leadId:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *   patch:
 *     tags: [Tasks]
 *     summary: Update a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task updated
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */

// GET /api/v1/tasks — list tasks with filters
tasksRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const { status, priority, assigneeId, leadId, page, limit } = req.query;

  const result = await TaskService.list(tenantId, {
    status: status as string | undefined,
    priority: priority as string | undefined,
    assigneeId: assigneeId as string | undefined,
    leadId: leadId as string | undefined,
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json(result);
});

// GET /api/v1/tasks/my — current user's active tasks
tasksRouter.get('/my', async (req: Request, res: Response) => {
  const { tenantId, userId } = req.auth;
  const tasks = await TaskService.getMyTasks(tenantId, userId);
  res.json({ data: tasks });
});

// GET /api/v1/tasks/overdue — overdue tasks
tasksRouter.get('/overdue', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const tasks = await TaskService.getOverdue(tenantId);
  res.json({ data: tasks });
});

// GET /api/v1/tasks/stats — task counts by status
tasksRouter.get('/stats', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const stats = await TaskService.getStats(tenantId);
  res.json(stats);
});

// GET /api/v1/tasks/:id — single task
tasksRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const task = await TaskService.getById(req.params.id, tenantId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ data: task });
});

// POST /api/v1/tasks — create task
tasksRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId, userId } = req.auth;
  const { title, description, priority, dueDate, assigneeId, leadId } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const task = await TaskService.create({
    tenantId,
    title: title.trim(),
    description,
    priority,
    dueDate,
    assigneeId,
    leadId,
    createdBy: userId,
  });

  res.status(201).json({ data: task });
});

// PATCH /api/v1/tasks/:id — update task
tasksRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const { title, description, status, priority, dueDate, assigneeId } = req.body;

  const task = await TaskService.update(req.params.id, tenantId, {
    title,
    description,
    status,
    priority,
    dueDate,
    assigneeId,
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ data: task });
});

// DELETE /api/v1/tasks/:id — remove task
tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req.auth;
  const task = await TaskService.delete(req.params.id, tenantId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ data: task });
});
