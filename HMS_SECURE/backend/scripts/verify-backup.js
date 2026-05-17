require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, mongoose } = require('../src/config/db');
const { BackupVerification } = require('../src/models');

const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR || './backups');
(async () => {
  await connectDB();
  const files = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter((x) => x.endsWith('.json')).sort() : [];
  const latest = files.at(-1);
  if (!latest) throw new Error(`No JSON backup files found in ${backupDir}`);
  const full = path.join(backupDir, latest);
  const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
  const collectionCount = Object.keys(payload.collections || {}).length;
  const documentCount = Object.values(payload.collections || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  const status = collectionCount > 0 ? 'passed' : 'failed';
  await BackupVerification.create({
    hospital_id: 1,
    verification_number: `BKP-VERIFY-${Date.now()}`,
    backup_type: 'json_export',
    backup_location: full,
    restore_tested: false,
    status,
    notes: `Automated verification: ${collectionCount} collections, ${documentCount} documents. Restore test must be performed separately in staging.`,
    verified_at: new Date(),
  });
  console.log(`Backup verification ${status}: ${latest}`);
  console.log({ collectionCount, documentCount });
  await mongoose.connection.close();
  process.exit(status === 'passed' ? 0 : 1);
})().catch(async (error) => {
  console.error('Backup verification failed:', error.message);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
