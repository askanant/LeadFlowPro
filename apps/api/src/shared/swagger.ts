import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'LeadFlow Pro API',
      version: '1.0.0',
      description:
        'Multi-tenant lead management platform with AI-powered scoring, campaign management, workflow automation, and billing.',
      contact: { name: 'LeadFlow Pro Team' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            data: { type: 'object' },
            meta: { type: 'object', nullable: true },
          },
        },
        // ── Auth ──
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['companyName', 'email', 'password'],
          properties: {
            companyName: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['super_admin', 'admin', 'manager', 'agent'] },
            tenantId: { type: 'string' },
            isActive: { type: 'boolean' },
            lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        // ── Leads ──
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string' },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'lost', 'duplicate'] },
            source: { type: 'string', nullable: true },
            qualityScore: { type: 'integer', nullable: true },
            campaignId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Campaigns ──
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string' },
            name: { type: 'string' },
            platform: { type: 'string', enum: ['meta', 'google', 'linkedin', 'microsoft', 'taboola'] },
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed'] },
            dailyBudget: { type: 'number', nullable: true },
            totalBudget: { type: 'number', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Billing ──
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tenantId: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'starter', 'professional', 'enterprise'] },
            status: { type: 'string' },
            currentPeriodStart: { type: 'string', format: 'date-time' },
            currentPeriodEnd: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Companies', description: 'Company/tenant management' },
      { name: 'Campaigns', description: 'Ad campaign management' },
      { name: 'Leads', description: 'Lead management & scoring' },
      { name: 'Lead Assignment', description: 'Lead routing & assignment' },
      { name: 'Telephony', description: 'Call management' },
      { name: 'Analytics', description: 'Dashboards & metrics' },
      { name: 'Settings', description: 'Company & integration settings' },
      { name: 'AI', description: 'AI-powered scoring & insights' },
      { name: 'Optimization', description: 'Budget & campaign optimization' },
      { name: 'Billing', description: 'Subscription & payment management' },
      { name: 'Agents', description: 'Team member management' },
      { name: 'Workflows', description: 'Automation workflows & triggers' },
      { name: 'Notifications', description: 'Notification preferences & history' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Activities', description: 'Activity tracking' },
      { name: 'Reports', description: 'Report generation & scheduling' },
      { name: 'Audit', description: 'Audit log access' },
      { name: 'Growth', description: 'Growth optimization insights' },
      { name: 'Webhooks', description: 'External webhook endpoints (Stripe, Meta, Telephony)' },
    ],
  },
  // Scan path annotations from router files
  apis: ['./src/modules/*/*.router.ts', './src/modules/*/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
