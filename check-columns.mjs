import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log('=== CAMPAIGNS Table ===');
    const campaignCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='campaigns'
      ORDER BY ordinal_position
    `);
    campaignCols.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));

    console.log('\n=== LEADS Table ===');
    const leadCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='leads'
      ORDER BY ordinal_position
    `);
    leadCols.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));

    console.log('\n=== First Campaign (to see structure) ===');
    const campaign = await client.query('SELECT * FROM campaigns LIMIT 1');
    if (campaign.rows.length > 0) {
      console.log(JSON.stringify(campaign.rows[0], null, 2));
    }
  } finally {
    await client.end();
  }
}

checkSchema();
