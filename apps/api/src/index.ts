import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { httpsEnforcement } from './shared/middleware/https.middleware';
import { requestIdMiddleware } from './shared/middleware/request-id.middleware';
import { globalLimiter, authLimiter, apiLimiter, registerLimiter } from './shared/middleware/rate-limit.middleware';
import { requestTimeout } from './shared/middleware/timeout.middleware';
import { timingMiddleware } from './shared/middleware/timing.middleware';
import { errorMiddleware } from './shared/middleware/error.middleware';
import { authRouter } from './modules/auth/auth.router';
import { companiesRouter } from './modules/companies/companies.router';
import { campaignsRouter } from './modules/campaigns/campaigns.router';
import { leadsRouter } from './modules/leads/leads.router';
import { leadAssignmentRouter } from './modules/leads/lead-assignment.router';
import { telephonyRouter } from './modules/telephony/telephony.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { webhooksRouter } from './modules/webhooks/webhooks.router';
import { settingsRouter } from './modules/settings/settings.router';
import { aiRouter } from './modules/ai/ai.router';
import { optimizationRouter } from './modules/optimization/optimization.router';
import { billingRouter } from './modules/billing/billing.router';
import { agentsRouter } from './modules/agents/agents.router';
import { workflowsRouter } from './modules/workflows/workflows.router';
import { notificationRouter } from './modules/notifications/notification.router';
import { tasksRouter } from './modules/tasks/tasks.router';
import { activitiesRouter } from './modules/tasks/activities.router';
import { reportsRouter } from './modules/reports/reports.router';
import { auditRouter } from './modules/audit/audit.router';
import { growthRouter } from './modules/growth/growth.router';
import { scheduledReportService } from './modules/reports/scheduled-report.service';
import { initializeTriggers, shutdownTriggers } from './modules/workflows/triggers';
import { initializeWebSocket, getIO } from './shared/websocket/socket';

const app = express();

// ─── HTTPS Enforcement ────────────────────────────────────────────────────────
app.use(httpsEnforcement);

// ─── Request Tracking ─────────────────────────────────────────────────────────
app.use(requestIdMiddleware);

// ─── Rate Limiting (Global) ───────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({ origin: config.NODE_ENV === 'development' ? '*' : process.env['FRONTEND_URL'] }));
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));

// ─── Request Timeout ──────────────────────────────────────────────────────────
app.use(requestTimeout(30000)); // 30 seconds

// ─── Request Timing ───────────────────────────────────────────────────────────
app.use(timingMiddleware);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Capture raw body for webhook signature verification, while still parsing JSON
app.use(
  express.json({
    limit: '1mb', // Request size limit
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: config.NODE_ENV });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Apply API-wide rate limiting
app.use('/api/v1', apiLimiter);

// Auth endpoints with stricter limiting
app.post('/api/v1/auth/login', authLimiter, (_req, res, next) => next());
app.post('/api/v1/auth/register', registerLimiter, (_req, res, next) => next());

// Mount all routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/assignments', leadAssignmentRouter);
app.use('/api/v1/telephony', telephonyRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/optimization', optimizationRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/workflows', workflowsRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/activities', activitiesRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/growth', growthRouter);
app.use('/api/v1/webhooks', webhooksRouter);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorMiddleware);

// Development: Create super admin if configured
if (config.NODE_ENV === 'development') {
  import('../scripts/create-dev-admin').then(({ createDevAdmin }) => {
    createDevAdmin().catch(err => console.error('Dev admin setup error:', err));
  }).catch(err => console.error('Dev admin module load error:', err));
}

const server = app.listen(config.PORT, async () => {
  // Initialize WebSocket server
  initializeWebSocket(server);

  console.log(`🚀 LeadFlow Pro API running on port ${config.PORT} [${config.NODE_ENV}]`);

  // Initialize workflow triggers
  try {
    await initializeTriggers();
  } catch (error) {
    console.error('Failed to initialize workflow triggers:', error);
  }

  // Start scheduled report cron
  scheduledReportService.startReportCron();

  // ⚠️  Warn if Stripe is not configured in production
  if (config.NODE_ENV === 'production' && !process.env['STRIPE_SECRET_KEY']) {
    console.warn(
      '⚠️  WARNING: Stripe is not configured. Billing features will not work. ' +
      'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables.'
    );
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await shutdownTriggers();
  scheduledReportService.stopReportCron();
  const socketIO = getIO();
  if (socketIO) socketIO.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
