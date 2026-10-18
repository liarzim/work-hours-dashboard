const { Client } = require('pg');

const DB_CONFIG = {
  host: process.env.PGHOST || '10.0.0.16',
  port: parseInt(process.env.PGPORT || '54320', 10),
  user: process.env.PGUSER || 'postgres.your-tenant-id',
  password: process.env.PGPASSWORD || 'a6UAzV7BJSdNjPiLUFZ3NfDoS5kj12',
  database: process.env.PGDATABASE || 'postgres',
};

async function testRestore() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  const backupRes = await client.query("SELECT id, filename, reports_count FROM public.system_backups ORDER BY created_at DESC LIMIT 1;");
  const latestBackup = backupRes.rows[0];
  console.log('[Test Restore] Testing restoration of backup:', latestBackup);

  const restoreRes = await client.query("SELECT public.restore_system_backup_by_id($1) as result;", [latestBackup.id]);
  console.log('[Test Restore] Result:', JSON.stringify(restoreRes.rows[0].result, null, 2));

  const countRes = await client.query("SELECT count(*) as total FROM public.reports;");
  console.log('[Test Restore] Current reports in DB after restore:', countRes.rows[0].total);

  // Check system_backups to verify the safety backup was created
  const allBackups = await client.query("SELECT id, filename, backup_type, reports_count, created_at FROM public.system_backups ORDER BY created_at DESC;");
  console.log('[Test Restore] Backups list in NAS:', allBackups.rows);

  await client.end();
}

testRestore().catch(console.error);
