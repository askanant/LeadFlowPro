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
    console.log('🔗 Connected to database\n');

    // Get first campaign with its tenant_id
    const campaignResult = await client.query('SELECT id, tenant_id FROM campaigns LIMIT 1');
    
    if (campaignResult.rows.length === 0) {
      console.log('❌ No campaign found');
      return;
    }

    const campaignId = campaignResult.rows[0].id;
    const tenantId = campaignResult.rows[0].tenant_id;
    
    console.log(`📊 Campaign ID: ${campaignId}`);
    console.log(`👤 Tenant ID: ${tenantId}\n`);

    const leads = [
      {
        email: 'john.smith@techcorp.com',
        first_name: 'John',
        last_name: 'Smith',
        phone: '+1-555-0101',
        quality_score: 85,
        platform: 'meta',
        status: 'new'
      },
      {
        email: 'sarah.johnson@innovate.com',
        first_name: 'Sarah',
        last_name: 'Johnson',
        phone: '+1-555-0102',
        quality_score: 70,
        platform: 'meta',
        status: 'new'
      },
      {
        email: 'michael.brown@enterprise.com',
        first_name: 'Michael',
        last_name: 'Brown',
        phone: '+1-555-0103',
        quality_score: 95,
        platform: 'linkedin',
        status: 'new'
      },
      {
        email: 'emily.davis@startup.io',
        first_name: 'Emily',
        last_name: 'Davis',
        phone: '+1-555-0104',
        quality_score: 88,
        platform: 'google',
        status: 'qualified'
      },
      {
        email: 'david.wilson@fortune500.com',
        first_name: 'David',
        last_name: 'Wilson',
        phone: '+1-555-0105',
        quality_score: 92,
        platform: 'linkedin',
        status: 'new'
      }
    ];

    console.log('📝 Inserting leads:\n');
    for (const lead of leads) {
      const result = await client.query(
        `INSERT INTO leads (
          id, tenant_id, campaign_id, platform, first_name, last_name,
          email, phone, quality_score, status, created_at, received_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
        ) RETURNING id, email`,
        [
          tenantId, campaignId, lead.platform, lead.first_name, lead.last_name,
          lead.email, lead.phone, lead.quality_score, lead.status
        ]
      );
      console.log(`✅ ${lead.first_name} ${lead.last_name}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Platform: ${lead.platform} | Quality Score: ${lead.quality_score}`);
      console.log('');
    }

    // Get stats
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG(quality_score)) as avg_quality,
        COUNT(CASE WHEN quality_score >= 80 THEN 1 END) as hot_leads,
        COUNT(CASE WHEN quality_score >= 60 AND quality_score < 80 THEN 1 END) as warm_leads,
        COUNT(CASE WHEN quality_score >= 40 AND quality_score < 60 THEN 1 END) as cold_leads
      FROM leads
    `);

    const stats = statsResult.rows[0];
    console.log('📈 Database Statistics:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total Leads:       ${stats.total}`);
    console.log(`Avg Quality Score: ${stats.avg_quality}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔥 Hot Leads (≥80):    ${stats.hot_leads}`);
    console.log(`🌡️  Warm Leads (60-79): ${stats.warm_leads}`);
    console.log(`❄️  Cold Leads (40-59): ${stats.cold_leads}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

insertLeads();
