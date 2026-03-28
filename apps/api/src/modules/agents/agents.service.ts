import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/database/prisma';
import { getTenantFilter } from '../../shared/utils/tenant-filter';

export const agentsService = {
  async list(tenantId: string, role: string | undefined) {
    const tenantFilter = getTenantFilter(tenantId, role);
    const agents = await prisma.user.findMany({
      where: { ...tenantFilter, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return agents.map((a) => ({
      id: a.id,
      name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email,
      email: a.email,
      phone: '', // Users don't have phone numbers, would need PhoneNumber model
      status: 'active',
      assignedNumbers: [],
      leadsThisMonth: 0,
      callsThisMonth: 0,
    }));
  },

  async getById(id: string, tenantId: string, role: string | undefined) {
    const tenantFilter = getTenantFilter(tenantId, role);
    const agent = await prisma.user.findFirst({
      where: { id, ...tenantFilter, isActive: true },
    });
    if (!agent) throw new Error('Agent not found');
    return {
      id: agent.id,
      name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email,
      email: agent.email,
      phone: '',
      status: 'active',
      assignedNumbers: [],
      leadsThisMonth: 0,
      callsThisMonth: 0,
    };
  },

  async create(tenantId: string, data: { email: string; firstName?: string; lastName?: string; role?: string }) {
    // Check if user already exists
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new Error('Agent with this email already exists');

    // Generate temporary password (12 char random)
    const tempPassword = Math.random().toString(36).slice(2, 14);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'viewer',
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      agent: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        phone: '',
        status: 'active',
        role: user.role,
      },
      tempPassword, // Return for user to see
    };
  },

  async deactivate(id: string, tenantId: string, role: string | undefined) {
    const tenantFilter = getTenantFilter(tenantId, role);
    const agent = await prisma.user.findFirst({ where: { id, ...tenantFilter } });
    if (!agent) throw new Error('Agent not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    return {
      id: updated.id,
      name: `${updated.firstName || ''} ${updated.lastName || ''}`.trim() || updated.email,
      email: updated.email,
      status: updated.isActive ? 'active' : 'inactive',
    };
  },
};
