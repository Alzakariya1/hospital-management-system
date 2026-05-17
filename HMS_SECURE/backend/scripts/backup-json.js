require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, mongoose } = require('../src/config/db');
const models = require('../src/models');

const skip = new Set(['Counter']);
const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR || './backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(backupDir, `hms-backup-${stamp}.json`);

(async () => {
  await connectDB();
  fs.mkdirSync(backupDir, { recursive: true });
  const payload = { created_at: new Date().toISOString(), db_name: mongoose.connection.name, collections: {} };
  for (const [name, Model] of Object.entries(models)) {
    if (skip.has(name) || !Model?.find) continue;
    payload.collections[name] = await Model.find({}).lean();
    console.log(`${name}: ${payload.collections[name].length}`);
  }
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  console.log(`Backup written: ${outputFile}`);
  await mongoose.connection.close();
})().catch(async (error) => {
  console.error('Backup failed:', error.message);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
