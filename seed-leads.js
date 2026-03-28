require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedLeads() {
  try {
    // Find an existing tenant (company) and campaign
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('No company found. Please seed a company first.');
      process.exit(1);
    }

    const campaign = await prisma.campaign.findFirst({
      where: { tenantId: company.tenantId },
    });

    if (!campaign) {
      console.log('No campaign found for tenant:', company.tenantId);
      process.exit(1);
    }

    console.log('Found tenant:', company.tenantId);
    console.log('Found campaign:', campaign.id);

    const mockLeads = [
      {
        email: 'john.smith@techcorp.com',
        firstName: 'John',
        lastName: 'Smith',
        phone: '+1-555-0101',
        campaignId: campaign.id,
        tenantId: company.tenantId,
        platform: 'meta',
        platformLeadId: 'meta-0001',
        status: 'new',
        qualityScore: 85,
      },
      {
        email: 'sarah.johnson@innovate.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+1-555-0102',
        campaignId: campaign.id,
        tenantId: company.tenantId,
        platform: 'meta',
        platformLeadId: 'meta-0002',
        status: 'new',
        qualityScore: 70,
      },
      {
        email: 'michael.brown@enterprise.com',
        firstName: 'Michael',
        lastName: 'Brown',
        phone: '+1-555-0103',
        campaignId: campaign.id,
        tenantId: company.tenantId,
        platform: 'linkedin',
        platformLeadId: 'linkedin-0001',
        status: 'new',
        qualityScore: 95,
      },
      {
        email: 'emily.davis@startup.io',
        firstName: 'Emily',
        lastName: 'Davis',
        phone: '+1-555-0104',
        campaignId: campaign.id,
        tenantId: company.tenantId,
        platform: 'google',
        platformLeadId: 'google-0001',
        status: 'new',
        qualityScore: 88,
      },
    ];

    for (const leadData of mockLeads) {
      const lead = await prisma.lead.create({
        data: leadData,
      });
      console.log(`Created lead: ${lead.email}`);
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLeads();
