const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const DB_CONFIG = {
  host: process.env.PGHOST || '10.0.0.16',
  port: parseInt(process.env.PGPORT || '54320', 10),
  user: process.env.PGUSER || 'postgres.your-tenant-id',
  password: process.env.PGPASSWORD || 'a6UAzV7BJSdNjPiLUFZ3NfDoS5kj12',
  database: process.env.PGDATABASE || 'postgres',
};

async function getAvailableBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: stat.mtime,
        sizeKb: (stat.size / 1024).toFixed(1)
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

async function runRestore() {
  const backups = await getAvailableBackups();

  if (backups.length === 0) {
    console.error('[Restore Error] No backups found in directory:', BACKUP_DIR);
    process.exit(1);
  }

  console.log('\n=== Available Database Backups ===');
  backups.forEach((b, idx) => {
    console.log(`[${idx + 1}] ${b.name} (${b.mtime.toLocaleString('he-IL')} - ${b.sizeKb} KB)`);
  });

  // Check if a specific file or index was passed via command line argument
  const arg = process.argv[2];
  let selectedBackup = null;

  if (arg) {
    const num = parseInt(arg, 10);
    if (!isNaN(num) && num >= 1 && num <= backups.length) {
      selectedBackup = backups[num - 1];
    } else {
      selectedBackup = backups.find(b => b.name === arg || b.path === arg);
    }
  }

  if (!selectedBackup) {
    // Interactive prompt
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`\nSelect backup to restore (1-${backups.length}, default 1): `, ans => {
        rl.close();
        resolve(ans.trim());
      });
    });

    const choice = parseInt(answer, 10) || 1;
    selectedBackup = backups[choice - 1] || backups[0];
  }

  console.log(`\n[Restore] Selected backup: ${selectedBackup.name}`);
  console.log(`[Restore] Connecting to PostgreSQL at ${DB_CONFIG.host}:${DB_CONFIG.port}...`);

  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log(`[Restore] Reading SQL backup file...`);
  const sqlContent = fs.readFileSync(selectedBackup.path, 'utf8');

  console.log(`[Restore] Executing restoration transaction on PostgreSQL...`);
  await client.query(sqlContent);

  const countRes = await client.query('SELECT count(*) as total FROM public.reports;');
  console.log(`[Restore] SUCCESS! Restoration complete. Total reports in DB: ${countRes.rows[0].total}`);

  await client.end();
}

runRestore().catch(err => {
  console.error('[Restore Error]', err);
  process.exit(1);
});
