import { prisma } from '../../shared/database/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors';
import { getTenantFilter } from '../../shared/utils/tenant-filter';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class CompaniesService {
  async list(tenantId: string, role: string | undefined) {
    const tenantFilter = getTenantFilter(tenantId, role);
    return prisma.company.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { leads: true, campaigns: true } },
        subscription: { select: { plan: true, status: true } },
        adPlatformCredentials: { select: { platform: true, isValid: true } },
      },
    });
  }

  async getById(tenantId: string, callerTenantId: string, callerRole: string | undefined) {
    if (callerRole !== 'super_admin' && callerTenantId !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
    const company = await prisma.company.findUnique({
      where: { tenantId },
      include: {
        subscription: true,
        adPlatformCredentials: { select: { platform: true, isValid: true } },
      },
    });
    if (!company) throw new NotFoundError('Company');
    return company;
  }

  async create(tenantId: string, role: string | undefined, data: {
    name: string;
    industry?: string;
    businessType?: string;
    description?: string;
    targetGeo?: any;
    leadCriteria?: any;
    pricingDetails?: any;
    offerDetails?: string;
  }) {
    // Only super admin or the tenant itself can create companies
    if (role !== 'super_admin' && role !== 'company_admin') {
      throw new ForbiddenError('Only company admins can create company records');
    }
    return prisma.company.create({
      data: { ...data, tenantId },
    });
  }

  async update(
    tenantId: string,
    data: Record<string, any>,
    callerTenantId: string,
    callerRole: string | undefined
  ) {
    if (callerRole !== 'super_admin' && callerTenantId !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
    const company = await prisma.company.findUnique({ where: { tenantId } });
    if (!company) throw new NotFoundError('Company');
    return prisma.company.update({ where: { tenantId }, data });
  }

  async storeCredentials(
    tenantId: string,
    callerTenantId: string,
    callerRole: string | undefined,
    data: {
      platform: string;
      accountId?: string;
      accessToken?: string;
      refreshToken?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
      tokenExpiresAt?: Date;
    }
  ) {
    if (callerRole !== 'super_admin' && callerTenantId !== tenantId) {
      throw new ForbiddenError('Access denied');
    }

    // Encrypt sensitive tokens before storing
    const { EncryptionService } = await import('../../shared/services/encryption.service');
    const sensitiveData = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      appSecret: data.appSecret,
    };
    const { encrypted, iv } = await EncryptionService.encryptObject(sensitiveData);

    return prisma.adPlatformCredential.upsert({
      where: { tenantId_platform: { tenantId, platform: data.platform } },
      create: {
        tenantId,
        platform: data.platform,
        accountId: data.accountId,
        appId: data.appId,
        extraConfig: data.extraConfig,
        tokenExpiresAt: data.tokenExpiresAt,
        // Store encrypted credentials
        encryptedCredentials: encrypted,
        credentialsIV: iv,
        isValid: true,
      },
      update: {
        accountId: data.accountId,
        appId: data.appId,
        extraConfig: data.extraConfig,
        tokenExpiresAt: data.tokenExpiresAt,
        encryptedCredentials: encrypted,
        credentialsIV: iv,
        isValid: true,
      },
    });
  }

  async generateAdminCredentials(
    tenantId: string,
    callerTenantId: string,
    callerRole: string | undefined
  ) {
    if (callerRole !== 'super_admin' && callerTenantId !== tenantId) {
      throw new ForbiddenError('Access denied');
    }

    // Generate a secure random password and hash it for storage.
    const password = Array.from({ length: 12 }, () =>
      'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'[Math.floor(Math.random() * 64)]
    ).join('');
    const passwordHash = await bcrypt.hash(password, 12);

    // Find existing company admin user for this tenant.
    const existingAdmin = await prisma.user.findFirst({
      where: { tenantId, role: 'company_admin' },
    });

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash },
      });
      return { email: existingAdmin.email, password };
    }

    // Create a deterministic email address for the generated admin user.
    const email = `admin+${tenantId}@leadflow.local`;
    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        role: 'company_admin',
        firstName: 'Company',
        lastName: 'Admin',
      },
    });

    return { email: user.email, password };
  }

  async getCredentials(tenantId: string, callerTenantId: string, callerRole: string | undefined) {
    if (callerRole !== 'super_admin' && callerTenantId !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
    // Never return tokens — only metadata
    return prisma.adPlatformCredential.findMany({
      where: { tenantId },
      select: {
        id: true,
        platform: true,
        accountId: true,
        appId: true,
        isValid: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });
  }
}

export const companiesService = new CompaniesService();
