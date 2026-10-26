const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 2; // Always keep 2 daily backups (yesterday and day before yesterday)

const DB_CONFIG = {
  host: process.env.PGHOST || '10.0.0.16',
  port: parseInt(process.env.PGPORT || '54320', 10),
  user: process.env.PGUSER || 'postgres.your-tenant-id',
  password: process.env.PGPASSWORD || 'a6UAzV7BJSdNjPiLUFZ3NfDoS5kj12',
  database: process.env.PGDATABASE || 'postgres',
};

const TABLES = ['profiles', 'workday_standards', 'reports', 'employment_terms'];

function escapeSqlValue(val) {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    if (val.getHours() === 0 && val.getMinutes() === 0 && val.getSeconds() === 0) {
      return `'${y}-${m}-${d}'`;
    }
    return `'${val.toISOString()}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
  const backupFileName = `backup-${dateStr}-${timeStr}.sql`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  console.log(`[Backup] Connecting to PostgreSQL at ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log(`[Backup] Generating backup file: ${backupFileName}`);
  const lines = [
    `-- ============================================================`,
    `-- Employee Work Hours Dashboard Database Backup`,
    `-- Date: ${now.toISOString()}`,
    `-- Server: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
    `-- ============================================================`,
    `BEGIN;`,
    ``
  ];

  let totalRecordsDumped = 0;

  for (const table of TABLES) {
    console.log(`[Backup] Dumping table: ${table}...`);
    const colsRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    if (colsRes.rows.length === 0) {
      console.warn(`[Backup] Warning: Table ${table} not found in public schema.`);
      continue;
    }

    const colNames = colsRes.rows.map(r => r.column_name);
    const dataRes = await client.query(`SELECT * FROM public.${table};`);
    console.log(`[Backup] Found ${dataRes.rows.length} rows in ${table}.`);
    totalRecordsDumped += dataRes.rows.length;

    lines.push(`-- Table: public.${table} (${dataRes.rows.length} rows)`);

    if (table === 'profiles') {
      for (const row of dataRes.rows) {
        const values = colNames.map(col => escapeSqlValue(row[col])).join(', ');
        const colsEscaped = colNames.map(c => `"${c}"`).join(', ');
        lines.push(`INSERT INTO public."${table}" (${colsEscaped}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${
          colNames.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')
        };`);
      }
    } else {
      lines.push(`DELETE FROM public."${table}";`);
      for (const row of dataRes.rows) {
        const values = colNames.map(col => escapeSqlValue(row[col])).join(', ');
        const colsEscaped = colNames.map(c => `"${c}"`).join(', ');
        lines.push(`INSERT INTO public."${table}" (${colsEscaped}) VALUES (${values});`);
      }
    }
    lines.push(``);
  }

  lines.push(`COMMIT;`);
  lines.push(`-- Backup completed successfully: ${totalRecordsDumped} total rows.`);

  fs.writeFileSync(backupFilePath, lines.join('\n'), 'utf8');
  console.log(`[Backup] Backup successfully written to ${backupFilePath} (${(fs.statSync(backupFilePath).size / 1024).toFixed(1)} KB)`);

  await client.end();

  // Retention management: keep only the latest MAX_BACKUPS files
  cleanOldBackups();
}

function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time); // newest first

  console.log(`[Backup Retention] Total existing backups found: ${files.length}. Policy: keep latest ${MAX_BACKUPS}.`);

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      console.log(`[Backup Retention] Deleting older backup: ${file.name}`);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error(`[Backup Retention] Failed to delete ${file.name}:`, e);
      }
    }
  }

  const remaining = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-') && f.endsWith('.sql'));
  console.log(`[Backup Retention] Active backups kept:`, remaining);
}

runBackup().catch(err => {
  console.error('[Backup Error]', err);
  process.exit(1);
});
