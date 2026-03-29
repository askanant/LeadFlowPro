import { Router } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { twoFactorService } from './two-factor.service';
import { sendSuccess } from '../../shared/utils/response';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { config } from '../../config';
import { generateCsrfToken, setCsrfCookie, clearCsrfCookie } from '../../shared/middleware/csrf.middleware';

export const authRouter = Router();

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const,
  path: '/',
};

function setAuthCookies(res: import('express').Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth', // Only sent to auth endpoints
  });
  // Set CSRF token for double-submit cookie protection
  setCsrfCookie(res, generateCsrfToken());
}

function clearAuthCookies(res: import('express').Response) {
  res.clearCookie('accessToken', { ...COOKIE_OPTIONS });
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, path: '/api/v1/auth' });
  clearCsrfCookie(res);
}

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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new company and admin user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Company created, tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       409:
 *         description: Email already registered
 */
authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  // Set httpOnly cookies for secure token storage
  if (result.accessToken && result.refreshToken) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
  }
  sendSuccess(res, result, undefined, 201);
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful (or 2FA challenge returned)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid credentials or account locked
 */
authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  // Set httpOnly cookies if login succeeded (not 2FA challenge)
  if ('accessToken' in result && result.accessToken && result.refreshToken) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
  }
  sendSuccess(res, result);
});

/**
 * @swagger
 * /auth/2fa/validate:
 *   post:
 *     tags: [Auth]
 *     summary: Complete login with TOTP 2FA code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [twoFactorToken, code]
 *             properties:
 *               twoFactorToken: { type: string }
 *               code: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200:
 *         description: 2FA validated, tokens issued
 *       401:
 *         description: Invalid code or token
 */
authRouter.post('/2fa/validate', async (req, res) => {
  const { twoFactorToken, code } = z.object({
    twoFactorToken: z.string(),
    code: z.string().length(6),
  }).parse(req.body);
  const result = await authService.loginWith2FA(twoFactorToken, code);
  // Set httpOnly cookies after successful 2FA
  if (result.accessToken && result.refreshToken) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
  }
  sendSuccess(res, result);
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     description: Accepts refresh token from httpOnly cookie or request body
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or revoked refresh token
 */
authRouter.post('/refresh', async (req, res) => {
  // Accept refresh token from cookie or body
  const bodyToken = req.body?.refreshToken;
  const cookieToken = req.cookies?.refreshToken;
  const refreshToken = bodyToken || cookieToken;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: { message: 'Refresh token required' } });
  }

  const tokens = await authService.refreshToken(refreshToken);
  // Set new httpOnly cookies
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  sendSuccess(res, tokens);
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await authService.getMe(req.auth.userId);
  sendSuccess(res, user);
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out, cookies cleared
 */
authRouter.post('/logout', requireAuth, async (req, res) => {
  // Accept refresh token from cookie or body
  const bodyToken = req.body?.refreshToken;
  const cookieToken = req.cookies?.refreshToken;
  const refreshToken = bodyToken || cookieToken;

  if (refreshToken) {
    await authService.revokeToken(req.auth.userId, refreshToken, req.auth.tenantId);
  }

  // Clear httpOnly cookies
  clearAuthCookies(res);
  
  sendSuccess(res, { message: 'Logged out successfully' });
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
