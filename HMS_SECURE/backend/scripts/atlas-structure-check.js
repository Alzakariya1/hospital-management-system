require('dotenv').config();
const { connectDB, mongoose, getMongoDbStructureWarnings, getMasterDbName } = require('../src/config/db');
const { getExpectedStructure } = require('../src/config/tenantDb');

async function listCollections(dbName) {
  try {
    const db = mongoose.connection.client.db(dbName);
    return (await db.listCollections().toArray()).map((x) => x.name).sort();
  } catch (_) {
    return [];
  }
}

(async () => {
  await connectDB();
  const expected = getExpectedStructure();
  const dbInfo = getMongoDbStructureWarnings();
  const listed = await mongoose.connection.db.admin().listDatabases();
  const dbs = listed.databases.map((d) => d.name).sort();
  const tenantDbs = dbs.filter((name) => name.startsWith(`${expected.tenant_db_prefix}_`));
  const legacyDbs = dbs.filter((name) => ['test', 'hms_db', 'hms_secure'].includes(name));
  const masterDb = getMasterDbName();
  const masterCollections = await listCollections(masterDb);

  const tenantOnlyCollections = [
    'patients','doctors','appointments','billings','medicines','suppliers','inventory_items','purchase_orders',
    'supplier_bills','stock_receivings','stock_returns','lab_tests','radiology_tests','sop_documents','templates','dynamic_fields'
  ];
  const masterHasTenantCollections = masterCollections.filter((c) => tenantOnlyCollections.includes(c));
  const warnings = [...dbInfo.warnings];
  if (!dbs.includes(masterDb)) warnings.push(`Master DB ${masterDb} is not visible yet. It appears after the first write.`);
  if (dbs.includes('test')) warnings.push('Database test exists. Do not delete until backup + migration verification is complete.');
  if (!tenantDbs.length) warnings.push('No hms_tenant_* databases found. Provision a tenant DB and create one tenant document.');
  if (masterHasTenantCollections.length) warnings.push(`Master DB contains tenant collections: ${masterHasTenantCollections.join(', ')}. This can be legacy/shared data; migrate before cleanup.`);

  console.log('MongoDB Atlas Structure Check');
  console.log('Connected DB:', mongoose.connection.name);
  console.log('Expected master DB:', expected.master_db_name);
  console.log('Tenant DB prefix:', expected.tenant_db_prefix);
  console.log('URI DB name:', expected.uri_db_name || '(none)');
  console.log('\nDatabases:');
  dbs.forEach((d) => console.log(`- ${d}`));
  console.log('\nTenant databases:');
  (tenantDbs.length ? tenantDbs : ['(none)']).forEach((d) => console.log(`- ${d}`));
  console.log('\nLegacy/shared databases:');
  (legacyDbs.length ? legacyDbs : ['(none)']).forEach((d) => console.log(`- ${d}`));
  console.log('\nMaster collections:');
  (masterCollections.length ? masterCollections : ['(none)']).forEach((c) => console.log(`- ${c}`));
  console.log('\nWarnings:');
  (warnings.length ? warnings : ['No structure warnings found.']).forEach((w) => console.log(`- ${w}`));
  process.exit(warnings.some((w) => w.includes('MASTER_DB_NAME is test') || w.includes('cannot be a system DB')) ? 1 : 0);
})().catch((err) => { console.error('Atlas structure check failed:', err.message); process.exit(1); });
