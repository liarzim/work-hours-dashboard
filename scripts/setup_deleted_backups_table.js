const { Client } = require('pg');

const client = new Client({
  host: process.env.PGHOST || '10.0.0.16',
  port: parseInt(process.env.PGPORT || '54320', 10),
  user: process.env.PGUSER || 'postgres.your-tenant-id',
  password: process.env.PGPASSWORD || 'a6UAzV7BJSdNjPiLUFZ3NfDoS5kj12',
  database: process.env.PGDATABASE || 'postgres',
});

async function run() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.deleted_user_backups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      email TEXT,
      reports_count INTEGER DEFAULT 0,
      backup_data JSONB,
      backup_sql TEXT,
      deleted_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ DEFAULT (now() + interval '6 months')
    );
    CREATE INDEX IF NOT EXISTS idx_deleted_user_backups_expires ON public.deleted_user_backups(expires_at);

    -- Also create automatic cleanup function for expired backups older than 6 months
    CREATE OR REPLACE FUNCTION public.cleanup_expired_deleted_user_backups()
    RETURNS INTEGER AS $$
    DECLARE
      deleted_rows INTEGER;
    BEGIN
      DELETE FROM public.deleted_user_backups
      WHERE expires_at < now();
      GET DIAGNOSTICS deleted_rows = ROW_COUNT;
      RETURN deleted_rows;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  console.log('Successfully set up public.deleted_user_backups table and cleanup function');
  await client.end();
}

run().catch(console.error);
