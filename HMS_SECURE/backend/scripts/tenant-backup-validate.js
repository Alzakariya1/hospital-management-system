require('dotenv').config();
const fs = require('fs');
const { connectDB } = require('../src/config/db');
const { TenantBackup } = require('../src/models');

async function main() {
  await connectDB();
  const backupId = process.argv[2] ? Number(process.argv[2]) : null;
  const q = backupId ? { id: backupId } : {};
  const backups = await TenantBackup.find(q).sort({ id: -1 }).limit(backupId ? 1 : 50);
  if (!backups.length) throw new Error('No backup records found');
  const rows = [];
  for (const backup of backups) {
    const exists = backup.backup_path && fs.existsSync(backup.backup_path);
    if (exists && backup.status === 'completed') {
      backup.status = 'verified';
      backup.verified_at = new Date();
      await backup.save();
    }
    rows.push({ id: backup.id, hospital: backup.hospital_name, db: backup.tenant_db_name, status: backup.status, file_exists: Boolean(exists), file: backup.file_name });
  }
  console.table(rows);
}
main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
