import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function insertLeads() {
  const client = await pool.connect();
  try {
    console.log('🔗 Connected to database');

    // Get first company and campaign
    const companyResult = await client.query('SELECT id FROM public.companies LIMIT 1');
    const campaignResult = await client.query('SELECT id, "tenantId" FROM public.campaigns LIMIT 1');
    
    if (companyResult.rows.length === 0) {
      console.log('❌ No company found');
      return;
    }
    if (campaignResult.rows.length === 0) {
      console.log('❌ No campaign found');
      return;
    }

    const campaignId = campaignResult.rows[0].id;
    const tenantId = campaignResult.rows[0].tenantId;
    
    console.log(`📊 Using campaign: ${campaignId}`);
    console.log(`👤 Using tenant: ${tenantId}\n`);

    const leads = [
      {
        email: 'john.smith@techcorp.com',
        firstName: 'John',
        lastName: 'Smith',
        phone: '+1-555-0101',
        company: 'TechCorp Inc',
        position: 'VP Sales',
        platform: 'meta',
        status: 'new',
        quality: 85,
        engagement: 75,
        intent: 80,
        firmographic: 90,
        risk: 20
      },
      {
        email: 'sarah.johnson@innovate.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+1-555-0102',
        company: 'Innovate Solutions',
        position: 'Marketing Director',
        platform: 'meta',
        status: 'new',
        quality: 70,
        engagement: 65,
        intent: 75,
        firmographic: 68,
        risk: 30
      },
      {
        email: 'michael.brown@enterprise.com',
        firstName: 'Michael',
        lastName: 'Brown',
        phone: '+1-555-0103',
        company: 'Enterprise Corp',
        position: 'CEO',
        platform: 'linkedin',
        status: 'new',
        quality: 95,
        engagement: 88,
        intent: 92,
        firmographic: 96,
        risk: 10
      },
      {
        email: 'emily.davis@startup.io',
        firstName: 'Emily',
        lastName: 'Davis',
        phone: '+1-555-0104',
        company: 'Startup IO',
        position: 'Founder',
        platform: 'google',
        status: 'qualified',
        quality: 88,
        engagement: 82,
        intent: 85,
        firmographic: 85,
        risk: 15
      },
      {
        email: 'david.wilson@fortune500.com',
        firstName: 'David',
        lastName: 'Wilson',
        phone: '+1-555-0105',
        company: 'Fortune 500 Co',
        position: 'CTO',
        platform: 'linkedin',
        status: 'new',
        quality: 92,
        engagement: 85,
        intent: 88,
        firmographic: 95,
        risk: 12
      }
    ];

    for (const lead of leads) {
      const result = await client.query(
        `INSERT INTO public.leads (
          id, email, "firstName", "lastName", "phoneNumber", "companyName", position,
          "campaignId", "tenantId", platform, status,
          "qualityScore", "engagementScore", "intentScore", "firmographicScore", "riskScore",
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        ) RETURNING id`,
        [
          lead.email, lead.firstName, lead.lastName, lead.phone, 
          lead.company, lead.position, campaignId, tenantId, lead.platform, 
          lead.status, lead.quality, lead.engagement, lead.intent, 
          lead.firmographic, lead.risk
        ]
      );
      console.log(`✅ Created: ${lead.firstName} ${lead.lastName} (${lead.email})`);
      console.log(`   Scores: Quality=${lead.quality}, Engagement=${lead.engagement}, Intent=${lead.intent}, Firmographic=${lead.firmographic}`);
    }

    // Get stats
    const countResult = await client.query('SELECT COUNT(*) as count FROM public.leads');
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG("qualityScore")) as avg_quality,
        ROUND(AVG("engagementScore")) as avg_engagement,
        ROUND(AVG("intentScore")) as avg_intent,
        ROUND(AVG("firmographicScore")) as avg_firmographic,
        ROUND(AVG("riskScore")) as avg_risk
      FROM public.leads
    `);

    console.log('\n📈 Database Statistics:');
    console.log(`Total leads: ${statsResult.rows[0].total}`);
    console.log(`Avg Quality Score: ${statsResult.rows[0].avg_quality}`);
    console.log(`Avg Engagement Score: ${statsResult.rows[0].avg_engagement}`);
    console.log(`Avg Intent Score: ${statsResult.rows[0].avg_intent}`);
    console.log(`Avg Firmographic Score: ${statsResult.rows[0].avg_firmographic}`);
    console.log(`Avg Risk Score: ${statsResult.rows[0].avg_risk}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

insertLeads();
