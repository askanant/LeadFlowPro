import { Router } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { twoFactorService } from './two-factor.service';
import { sendSuccess } from '../../shared/utils/response';
import { requireAuth } from '../../shared/middleware/auth.middleware';

export const authRouter = Router();

const registerSchema = z.object({
  companyName: z.string().min(2).max(200),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().max(128),
});

// POST /api/v1/auth/register
authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  sendSuccess(res, result, undefined, 201);
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  sendSuccess(res, result);
});

// POST /api/v1/auth/2fa/validate — Complete login with TOTP code
authRouter.post('/2fa/validate', async (req, res) => {
  const { twoFactorToken, code } = z.object({
    twoFactorToken: z.string(),
    code: z.string().length(6),
  }).parse(req.body);
  const result = await authService.loginWith2FA(twoFactorToken, code);
  sendSuccess(res, result);
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  const tokens = await authService.refreshToken(refreshToken);
  sendSuccess(res, tokens);
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await authService.getMe(req.auth.userId);
  sendSuccess(res, user);
});

// ─── 2FA Endpoints ────────────────────────────────────────────────────────────

// GET /api/v1/auth/2fa/status
authRouter.get('/2fa/status', requireAuth, async (req, res) => {
  const status = await twoFactorService.getStatus(req.auth.userId);
  sendSuccess(res, status);
});

// POST /api/v1/auth/2fa/setup — Generate secret + QR code
authRouter.post('/2fa/setup', requireAuth, async (req, res) => {
  const result = await twoFactorService.setup(req.auth.userId);
  sendSuccess(res, result);
});

// POST /api/v1/auth/2fa/verify — Verify code and enable 2FA
authRouter.post('/2fa/verify', requireAuth, async (req, res) => {
  const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
  const result = await twoFactorService.verify(req.auth.userId, code);
  sendSuccess(res, result);
});

// POST /api/v1/auth/2fa/disable — Disable 2FA
authRouter.post('/2fa/disable', requireAuth, async (req, res) => {
  const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
  const result = await twoFactorService.disable(req.auth.userId, code);
  sendSuccess(res, result);
});
