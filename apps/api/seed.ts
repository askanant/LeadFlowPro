import { prisma } from './src/shared/database/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  console.log('🌱 Starting comprehensive seeding...\n');

  // Create test company
  const timestamp = Date.now();
  const company = await prisma.company.create({
    data: {
      tenantId: 'demo-tenant-' + Math.random().toString(36).slice(7),
      name: 'Acme Corp',
      industry: 'Technology',
      businessType: 'B2B SaaS',
      description: 'Demo company for lead generation',
      status: 'active',
      settings: { maxAgents: 10 },
    },
  });
  console.log(`✅ Created company: ${company.name}`);

  // Create users/agents with unique emails
  const users = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: company.tenantId,
        email: `admin+${timestamp}@acme.test`,
        passwordHash: '$2a$12$nT/6m1JGbevMIrK1d0oJ8Oqci1ztsGvvdMP8UXfKCP.7o38xMLSma',
        firstName: 'Admin',
        lastName: 'User',
        role: 'company_admin',
      },
    }),
    prisma.user.create({
      data: {
        tenantId: company.tenantId,
        email: `sales1+${timestamp}@acme.test`,
        passwordHash: '$2a$12$nT/6m1JGbevMIrK1d0oJ8Oqci1ztsGvvdMP8UXfKCP.7o38xMLSma',
        firstName: 'John',
        lastName: 'Sales',
        role: 'viewer',
      },
    }),
    prisma.user.create({
      data: {
        tenantId: company.tenantId,
        email: `sales2+${timestamp}@acme.test`,
        passwordHash: '$2a$12$nT/6m1JGbevMIrK1d0oJ8Oqci1ztsGvvdMP8UXfKCP.7o38xMLSma',
        firstName: 'Jane',
        lastName: 'Sales',
        role: 'viewer',
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} agents`);

  // Create campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        tenantId: company.tenantId,
        name: 'Google Search - Tech Leads',
        platform: 'google',
        status: 'active',
        dailyBudget: new Prisma.Decimal('250'),
        totalBudget: new Prisma.Decimal('5000'),
        leadTargetDaily: 20,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-31'),
      },
    }),
    prisma.campaign.create({
      data: {
        tenantId: company.tenantId,
        name: 'LinkedIn B2B Campaign',
        platform: 'linkedin',
        status: 'active',
        dailyBudget: new Prisma.Decimal('150'),
        totalBudget: new Prisma.Decimal('3000'),
        leadTargetDaily: 12,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-31'),
      },
    }),
    prisma.campaign.create({
      data: {
        tenantId: company.tenantId,
        name: 'Meta Lead Gen',
        platform: 'meta',
        status: 'paused',
        dailyBudget: new Prisma.Decimal('200'),
        totalBudget: new Prisma.Decimal('4000'),
        leadTargetDaily: 15,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-31'),
      },
    }),
  ]);
  console.log(`✅ Created ${campaigns.length} campaigns`);

  // Create campaign metrics
  const metricsData = [
    { impressions: 45000, clicks: 1200, leadsCount: 87, spend: '2341.50' },
    { impressions: 28000, clicks: 560, leadsCount: 42, spend: '1850.75' },
    { impressions: 120000, clicks: 3400, leadsCount: 156, spend: '3200.00' },
  ];
  for (let i = 0; i < campaigns.length; i++) {
    const metrics = metricsData[i];
    await prisma.campaignMetric.create({
      data: {
        tenantId: company.tenantId,
        campaignId: campaigns[i].id,
        date: new Date('2026-03-10'),
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        leadsCount: metrics.leadsCount,
        spend: new Prisma.Decimal(metrics.spend),
      },
    });
  }
  console.log(`✅ Created campaign metrics`);

  // Create leads
  const leadStatuses = ['new', 'contacted', 'qualified', 'disqualified', 'converted'];
  const cities = ['New York', 'San Francisco', 'Austin', 'Seattle', 'Boston'];
  const states = ['NY', 'CA', 'TX', 'WA', 'MA'];
  const names = { first: ['John', 'Jane', 'Mike', 'Sarah', 'David'], last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'] };

  const leads = [];
  for (let i = 0; i < 40; i++) {
    const lead = await prisma.lead.create({
      data: {
        tenantId: company.tenantId,
        campaignId: campaigns[i % campaigns.length].id,
        platform: campaigns[i % campaigns.length].platform,
        firstName: names.first[i % names.first.length],
        lastName: names.last[i % names.last.length],
        email: `lead.${i}+${timestamp}@example.com`,
        phone: `+1${String(Math.floor(Math.random() * 9000000000) + 1000000000).padStart(10, '0')}`,
        city: cities[i % cities.length],
        state: states[i % states.length],
        status: leadStatuses[i % leadStatuses.length],
        qualityScore: Math.floor((i % 100) * 1.2),
        sourceUrl: `https://ads.google.com/lead-${i}`,
      },
    });
    leads.push(lead);
  }
  console.log(`✅ Created ${leads.length} leads`);

  // Create call logs
  for (let i = 0; i < 25; i++) {
    const lead = leads[i];
    await prisma.callLog.create({
      data: {
        tenantId: company.tenantId,
        leadId: lead.id,
        fromNumber: '+14155552671',
        toNumber: lead.phone!,
        direction: 'inbound',
        status: ['completed', 'no-answer', 'busy'][i % 3],
        durationSeconds: 120 + (i * 15),
        startedAt: new Date(Date.now() - (i * 60 * 60 * 1000)),
      },
    });
  }
  console.log(`✅ Created 25 call logs`);

  // Create lead notes using raw query since model might not be in client
  try {
    for (let i = 0; i < 15; i++) {
      await prisma.$executeRaw`
        INSERT INTO lead_notes (id, lead_id, content, created_by, created_at)
        VALUES (${crypto.randomUUID()}, ${leads[i].id}, ${'Demo note ' + i + ': Lead showed strong interest in our product. Follow up scheduled.'}, ${users[0].id}, NOW())
      `;
    }
    console.log(`✅ Created 15 lead notes`);
  } catch (e) {
    console.log(`⚠️  Lead notes creation skipped (model may not be accessible)`);
  }

  console.log(`\n✅ SEEDING COMPLETE!\n`);
  console.log(`📊 Summary:`);
  console.log(`  Company: ${company.name}`);
  console.log(`  Tenant ID: ${company.tenantId}`);
  console.log(`  Agents: ${users.length}`);
  console.log(`  Campaigns: ${campaigns.length}`);
  console.log(`  Leads: ${leads.length}`);
  console.log(`  Call Logs: 25`);
  console.log(`  Notes: 15`);
  console.log(`\n🔑 Login Credentials:`);
  console.log(`  Email: admin+${timestamp}@acme.test`);
  console.log(`  Password: password`);
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
