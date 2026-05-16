require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');

(async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const collection = db.collection('security_settings');
  const indexes = await collection.indexes().catch(() => []);
  const hasOldGlobal = indexes.some((idx) => idx.name === 'setting_key_1');
  if (hasOldGlobal) {
    console.log('Dropping old global security setting index: setting_key_1');
    await collection.dropIndex('setting_key_1');
  }
  await collection.createIndex(
    { hospital_id: 1, setting_key: 1 },
    { unique: true, name: 'security_setting_hospital_key_unique' },
  );
  console.log('Security settings indexes are safe for multi-tenant use.');
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Security index fix failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) { }
  process.exit(1);
});
