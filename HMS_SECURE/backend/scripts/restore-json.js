require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, mongoose } = require('../src/config/db');
const models = require('../src/models');

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: npm run restore -- ./backups/hms-backup-file.json');
  process.exit(1);
}
if (process.env.RESTORE_CONFIRMATION !== 'I_UNDERSTAND_RESTORE_OVERWRITES_DATA') {
  console.error('Set RESTORE_CONFIRMATION=I_UNDERSTAND_RESTORE_OVERWRITES_DATA before restore. This protects production data.');
  process.exit(1);
}
const inputFile = path.resolve(process.cwd(), fileArg);

(async () => {
  if (!fs.existsSync(inputFile)) throw new Error(`Backup file not found: ${inputFile}`);
  const payload = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  await connectDB();
  for (const [name, docs] of Object.entries(payload.collections || {})) {
    const Model = models[name];
    if (!Model?.deleteMany || !Array.isArray(docs)) continue;
    await Model.deleteMany({});
    if (docs.length) await Model.insertMany(docs, { ordered: false });
    console.log(`Restored ${name}: ${docs.length}`);
  }
  console.log('Restore completed. Run npm run verify-backup and test login immediately.');
  await mongoose.connection.close();
})().catch(async (error) => {
  console.error('Restore failed:', error.message);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
