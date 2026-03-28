import { prisma } from './src/shared/database/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  console.log('🌱 Starting comprehensive seeding for Super Admin...\n');

  const tenantId = 'dev-tenant-local';

  // Create or fetch company
  let company = await prisma.company.findFirst({
    where: { tenantId },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        tenantId,
        name: 'Demo Corp',
        industry: 'Technology',
        businessType: 'B2B SaaS',
        description: 'Demo company for lead generation',
        status: 'active',
        settings: { maxAgents: 10 },
      },
    });
    console.log(`✅ Created company: ${company.name}`);
  } else {
    console.log(`✅ Using existing company: ${company.name}`);
  }

  // Create campaigns
  const campaigns = [];
  const campaignData = [
    { name: 'Google Search Campaigns', platform: 'google', budget: 5000 },
    { name: 'LinkedIn B2B Outreach', platform: 'linkedin', budget: 3000 },
    { name: 'Meta Lead Gen Ads', platform: 'meta', budget: 2500 },
  ];

  console.log('\n🎯 Creating campaigns...');
  for (const data of campaignData) {
    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name: data.name,
        platform: data.platform,
        status: 'active',
        totalBudget: new Prisma.Decimal(data.budget),
      },
    });
    campaigns.push(campaign);
    console.log(`✅ ${campaign.name}`);
  }

  // Create 40 leads
  console.log('\n📝 Creating 40 leads...');
  const leads = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const statuses = ['new', 'contacted', 'qualified', 'in_progress', 'closed_won', 'closed_lost'];
  const cities = ['San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Boston'];
  const states = ['CA', 'NY', 'CA', 'IL', 'MA'];

  for (let i = 0; i < 40; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const campaign = campaigns[i % campaigns.length];
    const platform = campaign.platform;

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        campaignId: campaign.id,
        platform,
        platformLeadId: `${platform}-${i}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `+1-555-${String(1000 + i).slice(-4)}`,
        city: cities[i % cities.length],
        state: states[i % states.length],
        status: statuses[i % statuses.length],
        qualityScore: (i * 11) % 100,
        receivedAt: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)),
      },
    });
    leads.push(lead);
  }
  console.log(`✅ Created 40 leads`);

  // Create 25 call logs
  console.log('\n📞 Creating 25 call logs...');
  const callStatuses = ['completed', 'missed', 'voicemail'];
  for (let i = 0; i < 25; i++) {
    const lead = leads[i % leads.length];
    await prisma.callLog.create({
      data: {
        tenantId,
        leadId: lead.id,
        fromNumber: '+1-555-0100',
        toNumber: lead.phone || '+1-555-0000',
        status: callStatuses[i % callStatuses.length],
        durationSeconds: 120 + (i * 15),
        startedAt: new Date(Date.now() - (i * 7 * 60 * 60 * 1000)),
        endedAt: new Date(Date.now() - (i * 7 * 60 * 60 * 1000) + 300000),
      },
    });
  }
  console.log(`✅ Created 25 call logs`);

  // Create 15 lead notes
  console.log('\n📝 Creating 15 lead notes...');
  const noteContent = [
    'Good prospect, interested in demo',
    'Follow up next week',
    'Budget approved, moving to contract',
    'Price negotiation in progress',
    'Waiting for decision from management',
    'Very interested, high priority',
    'No response to email, try call',
    'Requested detailed proposal',
    'Competitor evaluation, losing',
    'Ready to sign contract',
    'Initial discovery call scheduled',
    'ROI analysis requested',
    'Referred by existing customer',
    'Technical evaluation in progress',
    'Final approval pending',
  ];

  for (let i = 0; i < 15; i++) {
    const lead = leads[i % leads.length];
    await prisma.$executeRaw`
      INSERT INTO lead_notes (id, lead_id, content, created_by, created_at)
      VALUES (${`note-${i}-${Date.now()}`}, ${lead.id}, ${noteContent[i]}, ${'admin'}, NOW())
    `;
  }
  console.log(`✅ Created 15 lead notes`);

  // Create campaign metrics
  console.log('\n📊 Creating campaign metrics...');
  for (const campaign of campaigns) {
    for (let day = 0; day < 7; day++) {
      await prisma.campaignMetric.create({
        data: {
          tenantId,
          campaignId: campaign.id,
          date: new Date(Date.now() - (6 - day) * 24 * 60 * 60 * 1000),
          impressions: 2000 + (day * 300),
          clicks: 150 + (day * 25),
          leadsCount: 12 + (day * 3),
          spend: new Prisma.Decimal(250 + (day * 40)),
          cpl: new Prisma.Decimal(20 + (day * 2)),
        },
      });
    }
  }
  console.log(`✅ Created campaign metrics`);

  console.log('\n✅ SEEDING COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`  ✓ Tenant: ${tenantId}`);
  console.log(`  ✓ Company: ${company.name}`);
  console.log(`  ✓ Campaigns: 3`);
  console.log(`  ✓ Leads: 40`);
  console.log(`  ✓ Call Logs: 25`);
  console.log(`  ✓ Notes: 15`);
  console.log(`  ✓ Metrics: 21 (3 campaigns × 7 days)`);
  console.log(`\n🎉 All dummy data has been added to the Super Admin's dashboard!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✓ Database seeding complete!');
  })
  .catch(async (e) => {
    console.error('\n❌ Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
