require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

function sanitizeDbName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

const MASTER_DB = sanitizeDbName(
  process.env.MONGODB_MASTER_DB_NAME || process.env.MONGODB_DB_NAME || 'hms_super_admin'
) || 'hms_super_admin';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@nexora.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin@12345';
const TENANT_PREFIX = sanitizeDbName(process.env.TENANT_DB_PREFIX || 'hms_tenant') || 'hms_tenant';

function shouldDropDatabase(name) {
  if (['admin', 'local', 'config'].includes(name)) return false;
  if (name === MASTER_DB) return true;
  if (name === 'test') return true;
  if (name === 'hms_secure') return true;
  if (name.startsWith(`${TENANT_PREFIX}_`)) return true;
  if (name.startsWith('hms_tenant_')) return true;
  return false;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing.');
  if (process.env.CONFIRM_FRESH_RESET !== 'YES_DELETE_HMS_DATABASES') {
    throw new Error('Safety lock active. Set CONFIRM_FRESH_RESET=YES_DELETE_HMS_DATABASES to run this destructive reset.');
  }

  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();

  const adminDb = client.db('admin');
  const { databases } = await adminDb.admin().listDatabases();
  const targets = databases.map((db) => db.name).filter(shouldDropDatabase);

  console.log('Fresh reset target databases:', targets.length ? targets.join(', ') : '(none)');
  for (const dbName of targets) {
    console.log(`Dropping database: ${dbName}`);
    await client.db(dbName).dropDatabase();
  }

  const db = client.db(MASTER_DB);
  const now = new Date();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, Number(process.env.BCRYPT_ROUNDS || 12));

  await db.collection('counters').updateOne(
    { _id: 'users' },
    { $set: { seq: 1, updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true }
  );

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        id: 1,
        full_name: 'Nexora Super Admin',
        email: ADMIN_EMAIL,
        password: passwordHash,
        role: 'super_admin',
        status: 'active',
        hospital_id: null,
        phone: '9999999999',
        permissions: ['*'],
        password_changed_at: now,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  );

  await db.collection('security_settings').updateOne(
    { setting_key: 'backup_frequency' },
    { $set: { setting_value: 'Atlas automated backup + on-demand tenant backups', updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true }
  );

  await db.collection('platform_settings').updateOne(
    { setting_key: 'master_database' },
    { $set: { setting_value: MASTER_DB, updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true }
  );

  console.log('Fresh master database ready:', MASTER_DB);
  console.log('Super-admin login:', ADMIN_EMAIL);
  console.log('Temporary password:', ADMIN_PASSWORD);
  console.log('Change this password immediately after login.');

  await client.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
