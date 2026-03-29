import { AuditService } from '../../shared/services/audit.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/database/prisma';
import { config } from '../../config';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/utils/errors';
import { AuthPayload } from '../../shared/middleware/auth.middleware';
import { LoggerService } from '../../shared/services/logger.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class AuthService {
  async register(data: {
    companyName: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already registered');

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          tenantId: crypto.randomUUID(),
        },
      });

      const passwordHash = await bcrypt.hash(data.password, 12);
      // Audit log: registration
      AuditService.logSuccess({
        tenantId: company.tenantId,
        action: 'register',
        resource: 'user',
        resourceId: '', // Will be set after user creation
      }).catch(err => LoggerService.logError('Audit log failed', err));
      const user = await tx.user.create({
        data: {
          tenantId: company.tenantId,
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'super_admin',
        },
      });

      return { company, user };
    });

    const tokens = this.generateTokens(result.user);
    return { user: this.sanitizeUser(result.user), company: result.company, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedError('Account is disabled');

    // SECURITY: Account lockout check — prevent brute force attacks
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedError(
        `Account is temporarily locked. Try again in ${remainingMin} minute${remainingMin === 1 ? '' : 's'}.`
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // SECURITY: Increment failed login attempts and lock if threshold reached
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: Record<string, any> = { failedLoginAttempts: newFailedAttempts };

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        AuditService.logSuccess({
          tenantId: user.tenantId,
          userId: user.id,
          action: 'account_locked',
          resource: 'user',
          resourceId: user.id,
          metadata: { reason: 'max_failed_attempts', attempts: newFailedAttempts },
        }).catch(err => LoggerService.logError('Audit log failed', err));
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedError('Invalid credentials');
    }

    // SECURITY: Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // If 2FA is enabled, return a temporary token for the second step
    if (user.twoFactorEnabled && user.totpSecret) {
      const twoFactorToken = jwt.sign(
        { userId: user.id, purpose: '2fa' },
        config.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return { requiresTwoFactor: true, twoFactorToken };
    }

    // Audit log: successful login
    AuditService.logSuccess({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'login',
      resource: 'user',
      resourceId: user.id,
    }).catch(err => LoggerService.logError('Audit log failed', err));

    const tokens = this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  /** Complete login after 2FA verification */
  async loginWith2FA(twoFactorToken: string, totpCode: string) {
    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(twoFactorToken, config.JWT_SECRET) as any;
      if (payload.purpose !== '2fa') throw new Error();
    } catch {
      throw new UnauthorizedError('Invalid or expired 2FA token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive || !user.totpSecret) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const { twoFactorService } = await import('./two-factor.service');
    const valid = twoFactorService.validateLogin(user.totpSecret, totpCode);
    if (!valid) throw new UnauthorizedError('Invalid verification code');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    AuditService.logSuccess({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'login_2fa',
      resource: 'user',
      resourceId: user.id,
    }).catch(err => LoggerService.logError('Audit log failed', err));

    const tokens = this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(token: string) {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload & { type: string; iat: number; exp: number };
      if (payload.type !== 'refresh') throw new UnauthorizedError('Invalid token type');

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

      // CRITICAL SECURITY FIX: Check if this refresh token has been blacklisted (revoked)
      // This prevents use of compromised or intentionally revoked tokens
      const isBlacklisted = await prisma.tokenBlacklist.findUnique({
        where: {
          userId_tokenJti: {
            userId: payload.userId,
            tokenJti: token,
          }
        }
      });

      if (isBlacklisted) {
        throw new UnauthorizedError('Refresh token has been revoked');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /** Revoke a refresh token (logout) */
  async revokeToken(userId: string, refreshToken: string, tenantId: string) {
    try {
      const payload = jwt.verify(refreshToken, config.JWT_SECRET) as AuthPayload & { exp: number };
      
      // Create blacklist entry with expiration matching the token's expiration
      const expiresAt = new Date(payload.exp * 1000);
      
      await prisma.tokenBlacklist.create({
        data: {
          userId,
          tenantId,
          tokenJti: refreshToken,
          reason: 'logout',
          expiresAt,
        },
      });
    } catch (error) {
      // Even if token verification fails, we still want to log it as an attempt
      LoggerService.logError('Error revoking token', error);
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        company: { select: { name: true, status: true } },
      },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  private generateTokens(user: { id: string; tenantId: string; email: string; role: string }) {
    const payload: AuthPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
